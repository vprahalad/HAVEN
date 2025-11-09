"""
Google Maps Directions API utility for route planning
"""
import os
import re
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

