"""
Distance calculation utilities
"""
import math

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth.
    
    Args:
        lat1, lon1: Latitude and longitude of first point in decimal degrees
        lat2, lon2: Latitude and longitude of second point in decimal degrees
    
    Returns:
        Distance in meters
    """
    # Earth radius in meters
    R = 6371000
    
    # Convert to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (
        math.sin(dphi / 2) ** 2 +
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def impact_radius_for_severity(severity: str) -> float:
    """
    Map severity to impact radius in meters.
    Maximum radius is capped at 500 meters.
    
    Args:
        severity: Severity level (low, medium, high)
    
    Returns:
        Impact radius in meters (capped at 500m)
    """
    severity = (severity or "").lower()
    severity_map = {
        'low': 100,
        'medium': 300,
        'high': 500,  # Capped at 500m
        'critical': 500  # Capped at 500m
    }
    radius = severity_map.get(severity, 300)  # Default to medium
    # Ensure radius never exceeds 500m
    return min(radius, 500.0)


def get_radius_for_hazard_type(hazard_type: str, incident_id) -> float:
    """
    Get radius for hazard type based on the same logic as frontend heatmap outer loop.
    Uses a seeded random based on incident ID to ensure consistency.
    This matches the frontend's getRadiusForHazardType function exactly.
    
    Args:
        hazard_type: Type of hazard (fire, earthquake, sinkhole, flood, etc.)
        incident_id: Incident ID for seeded random calculation
    
    Returns:
        Radius in meters (capped at 500m)
    """
    import math
    
    normalized_type = (hazard_type or "").lower().strip()
    
    # Create a simple seeded random function based on incident ID (matches frontend exactly)
    # Frontend: const seed = String(incidentId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    seed = sum(ord(char) for char in str(incident_id))
    # Frontend: const seededRandom = () => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }
    x = math.sin(seed) * 10000
    seeded_random = x - math.floor(x)
    
    # Set min/max radius based on hazard type (matches frontend)
    min_radius = 100
    max_radius = 1000
    
    if "forestfire" in normalized_type or "forest fire" in normalized_type or "fire" in normalized_type:
        min_radius = 100
        max_radius = 1000
    elif "earthquake" in normalized_type:
        min_radius = 100
        max_radius = 1000
    elif "sinkhole" in normalized_type:
        min_radius = 25
        max_radius = 100
    elif "flooding" in normalized_type or "flood" in normalized_type:
        min_radius = 100
        max_radius = 1000
    
    # Calculate radius using seeded random (matches frontend)
    # Frontend: return seededRandom() * (maxRadius - minRadius) + minRadius
    radius = seeded_random * (max_radius - min_radius) + min_radius
    
    # Cap at 500m maximum (as per user requirement)
    return min(radius, 500.0)


