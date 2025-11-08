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
    if not address or not address.strip():
        current_app.logger.warning("Empty address provided for geocoding")
        return None, None, None
    
    api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        current_app.logger.warning("GOOGLE_MAPS_API_KEY not set, cannot geocode")
        return None, None, None
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': address.strip(),
        'key': api_key
    }
    
    try:
        current_app.logger.info(f"Geocoding address: {address[:50]}...")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        status = data.get('status')
        if status == 'OK' and data.get('results'):
            result = data['results'][0]
            location = result['geometry']['location']
            lat = location['lat']
            lng = location['lng']
            normalized_address = result.get('formatted_address', address)
            current_app.logger.info(f"Successfully geocoded to: {lat}, {lng} -> {normalized_address}")
            return lat, lng, normalized_address
        else:
            error_message = data.get('error_message', 'Unknown error')
            current_app.logger.warning(f"Geocoding failed for '{address}': status={status}, error={error_message}")
            return None, None, None
    except requests.exceptions.Timeout:
        current_app.logger.error(f"Geocoding request timed out for address: {address}")
        return None, None, None
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Geocoding request failed for '{address}': {str(e)}")
        return None, None, None
    except Exception as e:
        current_app.logger.error(f"Unexpected error during geocoding for '{address}': {str(e)}", exc_info=True)
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


