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
    
    Args:
        severity: Severity level (low, medium, high)
    
    Returns:
        Impact radius in meters
    """
    severity = (severity or "").lower()
    severity_map = {
        'low': 100,
        'medium': 300,
        'high': 1000,
        'critical': 1500
    }
    return severity_map.get(severity, 300)  # Default to medium


