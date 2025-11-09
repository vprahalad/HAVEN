"""
Google Maps Directions API utility for route planning
"""
import os
import re
import math
import requests
from flask import current_app


def decode_polyline(encoded_polyline):
    """
    Helper to decode Google's encoded polyline format into list of (lat, lng) tuples/coords
    
    Args:
        encoded_polyline: String from Google's 'overview_polyline.points'
    
    Returns:
        List of (lat, lng) tuples: [(33.7490, -84.3880), (33.7491, -84.3881), ...]
    """
    coordinates = []
    index = 0
    lat = 0
    lng = 0
    
    while index < len(encoded_polyline):
        # Decode latitude change
        result = 0
        shift = 0
        while True:
            b = ord(encoded_polyline[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat
        
        result = 0
        shift = 0
        while True:
            b = ord(encoded_polyline[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng
        
        coordinates.append((lat / 1e5, lng / 1e5))
    
    return coordinates


def haversine_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371000  # Earth radius in meters
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def route_intersects_obstacles(route_path, obstacles, step_size=50):
    """
    Check if a route path intersects any obstacles (including their radius).
    
    Args:
        route_path: List of (lat, lng) tuples representing the route
        obstacles: List of obstacles, each with 'lat', 'lng', and 'radius' (in meters)
        step_size: Distance in meters between samples along route (larger = faster, less thorough)
    
    Returns:
        True if route intersects any obstacle, False otherwise
    """
    if not obstacles or not route_path or len(route_path) < 2:
        current_app.logger.debug("No obstacles or invalid route path - no intersection")
        return False
    
    current_app.logger.debug(
        f"Checking route with {len(route_path)} points against {len(obstacles)} obstacles"
    )
    

    # Check each point in the route path directly (Google Maps already provides dense enough points)
    # This is more efficient and accurate than interpolating
    intersection_count = 0
    for point_idx, point in enumerate(route_path):
        point_lat, point_lng = point
        
        # Check if this route point is within any obstacle's radius
        for obstacle_idx, obstacle in enumerate(obstacles):
            if 'lat' not in obstacle or 'lng' not in obstacle:
                continue
            
            obs_lat = obstacle['lat']
            obs_lng = obstacle['lng']
            radius = obstacle.get('radius', 100)  # Default 100m if not specified
            # Cap radius at 500m maximum
            radius = min(radius, 500.0)
            
            # Check if route point is within obstacle radius
            distance = haversine_distance(point_lat, point_lng, obs_lat, obs_lng)
            
            # Only consider it an intersection if the point is clearly within the radius
            # Use strict < to avoid edge cases with floating point precision
            if distance < radius:
                intersection_count += 1
                current_app.logger.info(
                    f"INTERSECTION FOUND: Route point {point_idx} ({point_lat:.6f}, {point_lng:.6f}) is "
                    f"{distance:.1f}m from obstacle {obstacle_idx} ({obs_lat:.6f}, {obs_lng:.6f}) "
                    f"with radius {radius}m"
                )
                return True
    
    # Also check segments between points for routes that might pass through obstacles
    # but don't have points directly in them (only for longer segments)
    for i in range(len(route_path) - 1):
        lat1, lng1 = route_path[i]
        lat2, lng2 = route_path[i + 1]
        
        # Calculate distance of this segment
        segment_dist = haversine_distance(lat1, lng1, lat2, lng2)
        
        # Only sample if segment is longer than step_size
        if segment_dist > step_size:
            # Number of samples along this segment
            num_samples = max(2, int(segment_dist / step_size))
            
            # Check sample points along the segment
            for j in range(1, num_samples):  # Skip first and last (already checked above)
                t = j / num_samples
                sample_lat = lat1 + t * (lat2 - lat1)
                sample_lng = lng1 + t * (lng2 - lng1)
                
                # Check if this sample point is within any obstacle's radius
                for obstacle_idx, obstacle in enumerate(obstacles):
                    if 'lat' not in obstacle or 'lng' not in obstacle:
                        continue
                    
                    obs_lat = obstacle['lat']
                    obs_lng = obstacle['lng']
                    radius = obstacle.get('radius', 100)
                    # Cap radius at 500m maximum
                    radius = min(radius, 500.0)
                    
                    distance = haversine_distance(sample_lat, sample_lng, obs_lat, obs_lng)
                    if distance < radius:
                        current_app.logger.info(
                            f"INTERSECTION FOUND: Route segment sample ({sample_lat:.6f}, {sample_lng:.6f}) is "
                            f"{distance:.1f}m from obstacle {obstacle_idx} ({obs_lat:.6f}, {obs_lng:.6f}) "
                            f"with radius {radius}m"
                        )
                        return True
    
    current_app.logger.debug(
        f"Route check complete: {len(route_path)} points checked, no intersections found"
    )
    return False


def get_shortest_path(start_lat, start_lng, end_lat, end_lng):
    """
    Use Google Maps Directions API to get shortest path (road-based route)
    
    Args:
        start_lat, start_lng: Starting coordinates
        end_lat, end_lng: Ending coordinates
    
    Returns:
        {
            'path': [(lat1, lng1), (lat2, lng2), ...],  # List of coordinates for drawing
            'distance_meters': int,
            'distance_text': str,
            'duration_seconds': int,
            'duration_text': str,
            'steps': [
                {
                    'instruction': 'Turn left onto Main St',
                    'distance': 500,  # meters
                    'duration': 120  # seconds
                },
                ...
            ],
            'polyline': str  # JSON-encoded string of coordinates for frontend
        }
    """
    api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    
    if not api_key:
        raise ValueError(
            "GOOGLE_MAPS_API_KEY not configured. "
            "Please set GOOGLE_MAPS_API_KEY in your .env file or environment variables."
        )
    
    # Log API key status (without exposing the key itself)
    if api_key and len(api_key) > 0:
        current_app.logger.debug(f"Using Google Maps API key (length: {len(api_key)})")
    else:
        current_app.logger.error("Google Maps API key is empty or not set")
    
    # Google Directions API request
    url = 'https://maps.googleapis.com/maps/api/directions/json'
    params = {
        'origin': f'{start_lat},{start_lng}',
        'destination': f'{end_lat},{end_lng}',
        'mode': 'walking',  # walking mode
        'alternatives': 'false',  # only generate single shortest route, not multiple
        'key': api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data['status'] != 'OK':
        error_message = data.get('error_message', 'No error message provided')
        status = data.get('status', 'UNKNOWN')
        
        # Provide more helpful error messages
        if status == 'REQUEST_DENIED':
            raise Exception(
                f"Google Maps API REQUEST_DENIED: {error_message}. "
                "Check: 1) API key is set correctly, 2) Directions API is enabled, "
                "3) API key restrictions allow this request, 4) Billing is enabled on your Google Cloud project."
            )
        elif status == 'INVALID_REQUEST':
            raise Exception(f"Google Maps API INVALID_REQUEST: {error_message}")
        elif status == 'OVER_QUERY_LIMIT':
            raise Exception(f"Google Maps API OVER_QUERY_LIMIT: {error_message}")
        elif status == 'ZERO_RESULTS':
            raise Exception(f"Google Maps API ZERO_RESULTS: {error_message}")
        else:
            raise Exception(f"Google Maps API error ({status}): {error_message}")
    
    # Extract first route (shortest route)
    route = data['routes'][0]
    leg = route['legs'][0]
    
    # Convert into list of coords
    encoded_polyline = route['overview_polyline']['points']
    path_coordinates = decode_polyline(encoded_polyline)
    
    # Step-by-step instructions
    steps = []
    for step in leg['steps']:
        # Clean HTML from instructions (remove HTML tags)
        instruction = step['html_instructions']
        # Simple HTML tag removal
        instruction = re.sub('<[^<]+?>', '', instruction)
        
        steps.append({
            'instruction': instruction,
            'distance': step['distance']['value'],  # meters
            'duration': step['duration']['value']  # seconds
        })
    
    # Format polyline as JSON string for frontend (array of {lat, lng} objects)
    polyline_json = [
        {'lat': lat, 'lng': lng} for lat, lng in path_coordinates
    ]
    
    return {
        'path': path_coordinates,
        'distance_meters': leg['distance']['value'],
        'distance_text': leg['distance']['text'],
        'duration_seconds': leg['duration']['value'],
        'duration_text': leg['duration']['text'],
        'steps': steps,
        'polyline': polyline_json  # Already formatted as list of dicts for JSON serialization
    }

