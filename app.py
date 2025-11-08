import os
import math
import uuid
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*")  # for hackathon mode, allow all; tighten later

# -----------------------
# In-memory "database"
# -----------------------

INCIDENTS = []      # list of dicts
SAFE_ZONES = []     # list of dicts
REPORTS = []        # list of dicts

# Helper: haversine distance in meters
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

# Map severity → impact radius (meters)
def impact_radius_for_severity(severity: str) -> int:
    severity = (severity or "").lower()
    if severity == "high":
        return 1000
    if severity == "medium":
        return 400
    return 150  # low/default

# -----------------------
# Simple "AI" placeholder
# -----------------------

def fake_classify_image():
    """
    TEMP: stub hazard classification.
    Replace this with a real Roboflow call later.
    """
    # For demo purposes, just return something deterministic-ish
    return {
        "hazard_type": "building_damage",
        "severity": "medium",
        "confidence": 0.87,
    }

# -----------------------
# Incident grouping
# -----------------------

def find_or_create_incident(lat, lon, hazard_type, severity, address=None):
    """
    Very simple incident grouping: if there is an incident of same hazard_type
    within 400m, attach to it; otherwise create a new one.
    """
    now = datetime.utcnow().isoformat()
    radius_threshold_m = 400

    for inc in INCIDENTS:
        if inc["hazard_type"] != hazard_type:
            continue
        dist = haversine(lat, lon, inc["latitude"], inc["longitude"])
        if dist <= radius_threshold_m:
            return inc  # attach to this one

    # No existing incident found → create new
    new_incident = {
        "id": str(uuid.uuid4()),
        "hazard_type": hazard_type,
        "severity": severity,
        "status": "unverified",
        "latitude": lat,
        "longitude": lon,
        "address": address,
        "impact_radius_m": impact_radius_for_severity(severity),
        "created_at": now,
        "report_user_ids": set(),  # for verification logic
    }
    INCIDENTS.append(new_incident)
    return new_incident

def recompute_incident_verification(incident):
    """
    If an incident has 2+ distinct user_ids, mark as verified.
    """
    if len(incident.get("report_user_ids", [])) >= 2:
        incident["status"] = "verified"

# -----------------------
# Routes
# -----------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "HAVEN-backend-temp"})

@app.route("/reports", methods=["POST"])
def create_report():
    """
    TEMP implementation:
    - Accepts multipart/form-data
    - image (ignored for now)
    - description, latitude, longitude, address, user_external_id
    - Returns fake AI classification + incident info
    """
    form = request.form

    # Grab fields
    user_external_id = form.get("user_external_id") or "anon-user"
    description = form.get("description") or ""
    address = form.get("address") or ""
    lat = form.get("latitude")
    lon = form.get("longitude")

    # Basic validation
    if lat is None or lon is None:
        return jsonify({"error": "latitude and longitude are required for now"}), 400

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return jsonify({"error": "invalid latitude/longitude"}), 400

    # Image file (we won't actually save it in this temp version)
    image_file = request.files.get("image")
    image_url = ""
    if image_file:
        # Optional: save to ./uploads
        os.makedirs("uploads", exist_ok=True)
        filename = f"{uuid.uuid4()}_{image_file.filename}"
        filepath = os.path.join("uploads", filename)
        image_file.save(filepath)
        image_url = f"/uploads/{filename}"  # in real deployment you'd serve this

    # Fake AI classification (replace with Roboflow later)
    ai_result = fake_classify_image()
    hazard_type = ai_result["hazard_type"]
    severity = ai_result["severity"]
    confidence = ai_result["confidence"]

    # Find or create incident
    incident = find_or_create_incident(lat, lon, hazard_type, severity, address)

    # Attach user id for verification
    incident["report_user_ids"].add(user_external_id)
    recompute_incident_verification(incident)

    now = datetime.utcnow().isoformat()
    report = {
        "id": str(uuid.uuid4()),
        "incident_id": incident["id"],
        "user_external_id": user_external_id,
        "source": "citizen",
        "hazard_type": hazard_type,
        "severity": severity,
        "confidence": confidence,
        "description": description,
        "latitude": lat,
        "longitude": lon,
        "address": address,
        "image_url": image_url,
        "created_at": now,
    }
    REPORTS.append(report)

    # Convert set to list for JSON
    incident_json = {**incident, "report_user_ids": list(incident["report_user_ids"])}

    return jsonify({
        "report": report,
        "incident": incident_json,
    })

@app.route("/incidents", methods=["GET"])
def list_incidents():
    status = request.args.get("status")
    result = []
    for inc in INCIDENTS:
        if status and inc["status"] != status:
            continue
        # Copy and convert set → list
        inc_copy = {**inc, "report_user_ids": list(inc["report_user_ids"])}
        result.append(inc_copy)
    # Sort newest first
    result.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(result)

@app.route("/safe-zones", methods=["GET"])
def list_safe_zones():
    active_only = request.args.get("active", "true").lower() == "true"
    zones = []
    for z in SAFE_ZONES:
        if active_only and not z["active"]:
            continue
        zones.append(z)
    return jsonify(zones)

@app.route("/safe-zones", methods=["POST"])
def create_safe_zone():
    """
    TEMP:
    - Accepts JSON: { name, address, latitude, longitude, accessible }
      For now, require lat/lon to avoid geocoding complexity.
    """
    data = request.get_json(force=True)
    name = data.get("name")
    address = data.get("address")
    lat = data.get("latitude")
    lon = data.get("longitude")
    accessible = bool(data.get("accessible", False))

    if not name or lat is None or lon is None:
        return jsonify({"error": "name, latitude, and longitude are required"}), 400

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return jsonify({"error": "invalid latitude/longitude"}), 400

    zone = {
        "id": str(uuid.uuid4()),
        "name": name,
        "address": address,
        "latitude": lat,
        "longitude": lon,
        "accessible": accessible,
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    }
    SAFE_ZONES.append(zone)
    return jsonify(zone), 201

@app.route("/route", methods=["GET"])
def get_route():
    """
    TEMP:
    - Takes fromLat, fromLng
    - Finds nearest active safe zone
    - Returns a Google Maps URL for directions
    """
    from_lat = request.args.get("fromLat")
    from_lng = request.args.get("fromLng")

    if from_lat is None or from_lng is None:
        return jsonify({"error": "fromLat and fromLng are required"}), 400

    try:
        from_lat = float(from_lat)
        from_lng = float(from_lng)
    except ValueError:
        return jsonify({"error": "invalid fromLat/fromLng"}), 400

    active_zones = [z for z in SAFE_ZONES if z["active"]]
    if not active_zones:
        return jsonify({"error": "no active safe zones available"}), 404

    # Find nearest safe zone
    best_zone = None
    best_dist = float("inf")
    for z in active_zones:
        dist = haversine(from_lat, from_lng, z["latitude"], z["longitude"])
        if dist < best_dist:
            best_dist = dist
            best_zone = z

    # Construct vanilla Google Maps directions URL
    google_maps_url = (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={from_lat},{from_lng}"
        f"&destination={best_zone['latitude']},{best_zone['longitude']}"
    )

    response = {
        "safe_zone": best_zone,
        "route": {
            "google_maps_url": google_maps_url,
            "distance_m": best_dist,
        },
    }
    return jsonify(response)

if __name__ == "__main__":
    # For local dev
    app.run(host="0.0.0.0", port=5000, debug=True)
