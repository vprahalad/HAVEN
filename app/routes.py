"""
API routes for HAVEN
"""
import os
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models import User, Incident, HazardReport, SafeZone
from app.utils.distance import haversine, impact_radius_for_severity
from app.utils.geocode import geocode_address, reverse_geocode
from app.utils.roboflow import classify_image

bp = Blueprint('api', __name__)  # No url_prefix here - we add it in __init__.py

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def save_uploaded_file(file):
    """Save uploaded file and return the file path"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Ensure upload directory exists
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        file.save(filepath)
        return filepath, unique_filename
    return None, None

def get_or_create_user(external_id: str):
    """Get or create a user by external_id"""
    if not external_id:
        return None
    
    user = User.query.filter_by(external_id=external_id).first()
    if not user:
        user = User(external_id=external_id)
        db.session.add(user)
        db.session.commit()
    return user

def find_or_create_incident(lat: float, lon: float, hazard_type: str, severity: str, 
                           address: str = None, max_distance_m: float = 10, 
                           time_window_hours: int = 1):
    """
    Find existing incident within distance and time window, or create new one.
    
    This function is intentionally conservative - it only groups reports if they are:
    - Very close together (10m default, reduced from 400m to allow multiple incidents at same address)
    - Same hazard type
    - Within a short time window (1 hour default, reduced from 12 hours)
    
    This allows multiple distinct incidents at the same address while still preventing
    duplicate reports of the exact same incident.
    
    Args:
        lat: Latitude
        lon: Longitude
        hazard_type: Type of hazard
        severity: Severity level
        address: Address string
        max_distance_m: Maximum distance in meters to consider same incident (default: 50m)
        time_window_hours: Time window in hours to consider same incident (default: 1 hour)
    
    Returns:
        Incident object
    """
    # Calculate time threshold
    time_threshold = datetime.utcnow() - timedelta(hours=time_window_hours)
    
    # Find existing incidents with same hazard type within time window
    existing_incidents = Incident.query.filter(
        Incident.hazard_type == hazard_type,
        Incident.created_at >= time_threshold
    ).all()
    
    # Check distance for each incident - only group if very close (likely same exact incident)
    for incident in existing_incidents:
        distance = haversine(lat, lon, incident.latitude, incident.longitude)
        if distance <= max_distance_m:
            # Found existing incident very close by - likely the same incident
            current_app.logger.info(f"Grouping report with existing incident {incident.id} (distance: {distance:.1f}m)")
            return incident
    
    # No existing incident found, create new one
    # This allows multiple incidents at the same address if they're different hazards or far enough apart
    impact_radius = impact_radius_for_severity(severity)
    incident = Incident(
        hazard_type=hazard_type,
        severity=severity,
        status='unverified',
        latitude=lat,
        longitude=lon,
        address=address,
        impact_radius_m=impact_radius
    )
    db.session.add(incident)
    db.session.commit()
    current_app.logger.info(f"Created new incident {incident.id} for {hazard_type} at {address or f'{lat},{lon}'}")
    return incident

def verify_incident(incident: Incident):
    """
    Verify incident if it has 2+ distinct users.
    
    Args:
        incident: Incident object to verify
    """
    distinct_user_count = incident.get_distinct_user_count()
    if distinct_user_count >= 2 and incident.status != 'verified':
        incident.status = 'verified'
        db.session.commit()

@bp.route('/', methods=['GET'])
def index():
    """Root API endpoint - API information"""
    return jsonify({
        'service': 'HAVEN Backend API',
        'status': 'running',
        'version': '1.0.0',
        'message': 'API is available at /api endpoints',
        'endpoints': {
            'health': 'GET /api/health',
            'create_report': 'POST /api/reports',
            'list_incidents': 'GET /api/incidents',
            'get_incident': 'GET /api/incidents/<id>',
            'list_safe_zones': 'GET /api/safe-zones',
            'create_safe_zone': 'POST /api/safe-zones',
            'get_route': 'GET /api/route?fromLat=<lat>&fromLng=<lng>'
        }
    })

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'HAVEN-backend',
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'API is running and healthy'
    })

@bp.route('/reports', methods=['POST'])
def create_report():
    """
    Create a hazard report and possibly a new incident.
    
    Request: multipart/form-data
    - image (file, required)
    - description (string, optional)
    - address (string, optional) - Either address OR coordinates required
    - latitude (float, optional) - Either address OR coordinates required
    - longitude (float, optional) - Either address OR coordinates required
    - user_external_id (string, optional)
    - source (string, optional; default "citizen")
    
    Note: Location can be provided as either:
    - Coordinates (latitude + longitude), OR
    - Address (will be geocoded to coordinates)
    """
    try:
        # Get form data
        image_file = request.files.get('image')
        if not image_file:
            return jsonify({'error': 'Image file is required'}), 400
        
        description = request.form.get('description', '')
        address = request.form.get('address', '')
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        user_external_id = request.form.get('user_external_id', '')
        source = request.form.get('source', 'citizen')
        
        # Save image
        filepath, filename = save_uploaded_file(image_file)
        if not filepath:
            return jsonify({'error': 'Invalid file type'}), 400
        
        image_url = f'/uploads/{filename}'
        
        # Determine location - either coordinates OR address is required (not both)
        lat = None
        lon = None
        
        # Check if coordinates are provided
        if latitude and longitude:
            try:
                lat = float(latitude)
                lon = float(longitude)
            except ValueError:
                return jsonify({'error': 'Invalid latitude/longitude values'}), 400
        
        # If we have address but no coordinates, geocode the address
        if address and (lat is None or lon is None):
            geocoded_lat, geocoded_lon, normalized_address = geocode_address(address)
            if geocoded_lat and geocoded_lon:
                lat = geocoded_lat
                lon = geocoded_lon
                # Use normalized address if available
                if normalized_address:
                    address = normalized_address
            else:
                return jsonify({
                    'error': 'Could not geocode the provided address. Please provide valid coordinates (latitude/longitude) instead, or check that your address is correct.'
                }), 400
        
        # If we have coordinates but no address, optionally reverse geocode
        if lat and lon and not address:
            # Optional: uncomment to enable reverse geocoding
            # address = reverse_geocode(lat, lon) or ''
            pass
        
        # Final validation: must have coordinates at this point (either provided directly or from geocoding)
        if lat is None or lon is None:
            return jsonify({
                'error': 'Location is required. Please provide either coordinates (latitude/longitude) OR an address.'
            }), 400
        
        # Get or create user
        user = get_or_create_user(user_external_id) if user_external_id else None
        
        # Classify image using Roboflow
        try:
            hazard_type, severity, confidence = classify_image(filepath)
            if not hazard_type:
                current_app.logger.error("Image classification returned None - this should not happen with fallback")
                return jsonify({
                    'error': 'Failed to classify image. Please check server logs for details.',
                    'details': 'Roboflow classification failed and fallback also failed. Check that ROBOFLOW_API_KEY and ROBOFLOW_MODEL_URL are set correctly in your .env file.'
                }), 500
        except Exception as e:
            current_app.logger.error(f"Exception during image classification: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Failed to classify image',
                'details': f'Classification error: {str(e)}'
            }), 500
        
        # Find or create incident
        incident = find_or_create_incident(lat, lon, hazard_type, severity, address)
        
        # Check if incident was just created (for response)
        incident_created = len(incident.reports) == 0
        
        # Create hazard report
        report = HazardReport(
            incident_id=incident.id,
            user_id=user.id if user else None,
            source=source,
            hazard_type=hazard_type,
            severity=severity,
            confidence=confidence,
            description=description,
            latitude=lat,
            longitude=lon,
            address=address,
            image_url=image_url
        )
        db.session.add(report)
        db.session.commit()
        
        # Run verification logic
        verify_incident(incident)
        
        # Refresh incident to get updated status
        db.session.refresh(incident)
        
        # Format response to match frontend ClassificationResult interface
        severity_normalized = severity.lower()
        hazard_type_display = hazard_type.replace('_', ' ').title()
        
        response = {
            'report': report.to_dict(),
            'incident': incident.to_dict(),
            'classification': {
                'hazard_type': hazard_type_display,
                'severity': severity_normalized,
                'incident_created': incident_created,
                'message': (
                    f'New {hazard_type_display} incident created and verified.' if incident_created
                    else f'Report added to existing {hazard_type_display} incident.'
                )
            }
        }
        
        return jsonify(response), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating report: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/incidents', methods=['GET'])
def list_incidents():
    """
    List incidents with optional filtering.
    
    Query params:
    - status: "verified" or "unverified"
    - limit: integer, default 100
    """
    try:
        status = request.args.get('status')
        limit = request.args.get('limit', 100, type=int)
        
        query = Incident.query
        
        if status:
            query = query.filter(Incident.status == status)
        
        query = query.order_by(Incident.created_at.desc()).limit(limit)
        incidents = query.all()
        
        return jsonify([incident.to_dict() for incident in incidents])
    except Exception as e:
        current_app.logger.error(f"Error listing incidents: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/incidents/<int:incident_id>', methods=['GET'])
def get_incident(incident_id):
    """Get a single incident by ID"""
    try:
        incident = Incident.query.get_or_404(incident_id)
        return jsonify(incident.to_dict(include_reports=True))
    except Exception as e:
        current_app.logger.error(f"Error getting incident: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/incidents/<int:incident_id>', methods=['PATCH'])
def verify_incident(incident_id):
    """Verify an incident (admin only)"""
    try:
        incident = Incident.query.get(incident_id)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        data = request.get_json() or {}
        status = data.get('status', 'verified')
        
        if status not in ['verified', 'unverified']:
            return jsonify({'error': 'Invalid status. Must be "verified" or "unverified"'}), 400
        
        incident.status = status
        db.session.commit()
        
        current_app.logger.info(f"Updated incident {incident_id} status to {status}")
        return jsonify(incident.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error verifying incident {incident_id}: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/incidents/<int:incident_id>', methods=['DELETE'])
def delete_incident(incident_id):
    """Delete an incident and all associated reports"""
    try:
        incident = Incident.query.get(incident_id)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        
        # Delete the incident (cascade will handle reports due to cascade='all, delete-orphan')
        db.session.delete(incident)
        db.session.commit()
        
        current_app.logger.info(f"Deleted incident {incident_id}")
        return jsonify({'message': 'Incident deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting incident {incident_id}: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/safe-zones', methods=['GET'])
def list_safe_zones():
    """List safe zones (active only by default)"""
    try:
        active_only = request.args.get('active', 'true').lower() == 'true'
        
        query = SafeZone.query
        if active_only:
            query = query.filter(SafeZone.active == True)
        
        safe_zones = query.all()
        return jsonify([zone.to_dict() for zone in safe_zones])
    except Exception as e:
        current_app.logger.error(f"Error listing safe zones: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/safe-zones', methods=['POST'])
def create_safe_zone():
    """
    Create a new safe zone.
    
    JSON body:
    - name (string, required)
    - address (string, required)
    - latitude (float, optional) - if provided, will be used instead of geocoding
    - longitude (float, optional) - if provided, will be used instead of geocoding
    - accessible (boolean, optional, default True)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body is required'}), 400
        
        name = data.get('name')
        address = data.get('address')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        accessible = data.get('accessible', True)
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        if not address:
            return jsonify({'error': 'Address is required'}), 400
        
        # Use provided coordinates or geocode address
        lat = None
        lon = None
        
        if latitude is not None and longitude is not None:
            try:
                lat = float(latitude)
                lon = float(longitude)
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid latitude/longitude'}), 400
        
        # If no coordinates provided, geocode address
        if lat is None or lon is None:
            geocoded_lat, geocoded_lon, normalized_address = geocode_address(address)
            if not geocoded_lat or not geocoded_lon:
                return jsonify({'error': 'Could not geocode address. Please provide coordinates.'}), 400
            lat = geocoded_lat
            lon = geocoded_lon
            # Use normalized address if available
            if normalized_address:
                address = normalized_address
        
        # Create safe zone
        safe_zone = SafeZone(
            name=name,
            address=address,
            latitude=lat,
            longitude=lon,
            accessible=accessible,
            active=True
        )
        db.session.add(safe_zone)
        db.session.commit()
        
        return jsonify(safe_zone.to_dict()), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating safe zone: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/safe-zones/<int:safe_zone_id>', methods=['PATCH'])
def update_safe_zone(safe_zone_id):
    """
    Update a safe zone (admin only).
    
    JSON body (all fields optional):
    - name (string)
    - address (string)
    - latitude (float)
    - longitude (float)
    - accessible (boolean)
    - active (boolean)
    """
    try:
        safe_zone = SafeZone.query.get(safe_zone_id)
        if not safe_zone:
            return jsonify({'error': 'Safe zone not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body is required'}), 400
        
        # Update fields if provided
        if 'name' in data:
            safe_zone.name = data['name']
        if 'address' in data:
            safe_zone.address = data['address']
        if 'accessible' in data:
            safe_zone.accessible = bool(data['accessible'])
        if 'active' in data:
            safe_zone.active = bool(data['active'])
        
        # Handle coordinates - if either is provided, both must be provided
        if 'latitude' in data or 'longitude' in data:
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            
            if latitude is not None and longitude is not None:
                try:
                    lat = float(latitude)
                    lon = float(longitude)
                    safe_zone.latitude = lat
                    safe_zone.longitude = lon
                except (ValueError, TypeError):
                    return jsonify({'error': 'Invalid latitude/longitude'}), 400
            else:
                return jsonify({'error': 'Both latitude and longitude must be provided together'}), 400
        
        # If address changed but coordinates not provided, geocode the new address
        if 'address' in data and 'latitude' not in data and 'longitude' not in data:
            geocoded_lat, geocoded_lon, normalized_address = geocode_address(safe_zone.address)
            if geocoded_lat and geocoded_lon:
                safe_zone.latitude = geocoded_lat
                safe_zone.longitude = geocoded_lon
                if normalized_address:
                    safe_zone.address = normalized_address
        
        db.session.commit()
        
        current_app.logger.info(f"Updated safe zone {safe_zone_id}")
        return jsonify(safe_zone.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating safe zone {safe_zone_id}: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/safe-zones/<int:safe_zone_id>', methods=['DELETE'])
def delete_safe_zone(safe_zone_id):
    """Delete a safe zone (admin only)"""
    try:
        safe_zone = SafeZone.query.get(safe_zone_id)
        if not safe_zone:
            return jsonify({'error': 'Safe zone not found'}), 404
        
        db.session.delete(safe_zone)
        db.session.commit()
        
        current_app.logger.info(f"Deleted safe zone {safe_zone_id}")
        return jsonify({'message': 'Safe zone deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting safe zone {safe_zone_id}: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/route', methods=['GET'])
def get_route():
    """
    Get route to safe zone.
    
    Query params:
    - fromLat (float, required)
    - fromLng (float, required)
    - safeZoneId (int, optional) - If provided, route to this specific safe zone. Otherwise, find nearest.
    """
    try:
        from_lat = request.args.get('fromLat')
        from_lng = request.args.get('fromLng')
        safe_zone_id = request.args.get('safeZoneId')
        
        if not from_lat or not from_lng:
            return jsonify({'error': 'fromLat and fromLng are required'}), 400
        
        try:
            from_lat = float(from_lat)
            from_lng = float(from_lng)
        except ValueError:
            return jsonify({'error': 'Invalid fromLat/fromLng'}), 400
        
        # Find target safe zone
        best_zone = None
        best_dist = None
        
        if safe_zone_id:
            # Route to specific safe zone
            try:
                safe_zone_id = int(safe_zone_id)
                best_zone = SafeZone.query.filter(
                    SafeZone.id == safe_zone_id,
                    SafeZone.active == True
                ).first()
                if not best_zone:
                    return jsonify({'error': 'Safe zone not found or not active'}), 404
                best_dist = haversine(from_lat, from_lng, best_zone.latitude, best_zone.longitude)
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid safeZoneId'}), 400
        else:
            # Find nearest safe zone
            safe_zones = SafeZone.query.filter(SafeZone.active == True).all()
            if not safe_zones:
                return jsonify({'error': 'No active safe zones available'}), 404
            
            best_dist = float('inf')
            for zone in safe_zones:
                dist = haversine(from_lat, from_lng, zone.latitude, zone.longitude)
                if dist < best_dist:
                    best_dist = dist
                    best_zone = zone
        
        # Construct Google Maps URL
        google_maps_url = (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={from_lat},{from_lng}"
            f"&destination={best_zone.latitude},{best_zone.longitude}"
        )
        
        # Calculate distance and estimated duration
        distance_m = best_dist
        distance_km = distance_m / 1000.0
        # Estimate duration: walking speed ~5 km/h
        duration_seconds = int((distance_km / 5.0) * 3600)
        duration_minutes = int(duration_seconds / 60)
        
        # Format response to match frontend Route interface
        response = {
            'safe_zone': best_zone.to_dict(),
            'route': {
                'distance': distance_m,  # meters
                'duration': duration_seconds,  # seconds
                'distance_text': f'{distance_km:.2f} km',
                'duration_text': f'{duration_minutes} min',
                'steps': [
                    {
                        'instruction': f'Head towards {best_zone.name}',
                        'distance': distance_m,
                        'duration': duration_seconds
                    },
                    {
                        'instruction': 'Follow Google Maps directions',
                        'distance': 0,
                        'duration': 0
                    },
                    {
                        'instruction': f'Arrive at {best_zone.name}',
                        'distance': 0,
                        'duration': 0
                    }
                ],
                'google_maps_url': google_maps_url
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        current_app.logger.error(f"Error getting route: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/uploads/<filename>', methods=['GET'])
def serve_upload_api(filename):
    """Serve uploaded image files via API route"""
    try:
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        current_app.logger.error(f"Error serving upload: {str(e)}", exc_info=True)
        return jsonify({'error': 'File not found'}), 404

