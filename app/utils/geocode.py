"""
Geocoding utilities using Google Maps Geocoding API
"""
import requests
from flask import current_app

def geocode_address(address: str) -> tuple:
    """
    Geocode an address using Google Maps Geocoding API.
    
    Args:
        address: Address string to geocode
    
    Returns:
        Tuple of (latitude, longitude, normalized_address) or (None, None, None) if failed
    """
    api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        current_app.logger.warning("GOOGLE_MAPS_API_KEY not set, cannot geocode")
        return None, None, None
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': address,
        'key': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            result = data['results'][0]
            location = result['geometry']['location']
            lat = location['lat']
            lng = location['lng']
            normalized_address = result.get('formatted_address', address)
            return lat, lng, normalized_address
        else:
            current_app.logger.warning(f"Geocoding failed: {data.get('status')}")
            return None, None, None
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Geocoding request failed: {str(e)}")
        return None, None, None

def reverse_geocode(lat: float, lon: float) -> str:
    """
    Reverse geocode coordinates to get an address.
    
    Args:
        lat: Latitude
        lon: Longitude
    
    Returns:
        Address string or None if failed
    """
    api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        return None
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'latlng': f"{lat},{lon}",
        'key': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            return data['results'][0].get('formatted_address')
        else:
            return None
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Reverse geocoding request failed: {str(e)}")
        return None


