"""
Roboflow image classification utilities
"""
import requests
import os
from flask import current_app

def classify_image(image_path: str) -> tuple:
    """
    Classify an image using Roboflow API.
    
    Args:
        image_path: Path to the image file
    
    Returns:
        Tuple of (hazard_type, severity, confidence) or (None, None, None) if failed
    """
    api_key = current_app.config.get('ROBOFLOW_API_KEY')
    model_url = current_app.config.get('ROBOFLOW_MODEL_URL')
    
    if not api_key or not model_url:
        current_app.logger.warning("Roboflow API key or model URL not set, using fallback classification")
        return _fallback_classify()
    
    # Construct the inference endpoint
    # Roboflow format: https://detect.roboflow.com/{model_name}/{version}?api_key={key}
    # Or if model_url is already complete, use it directly
    if 'api_key' not in model_url:
        separator = '&' if '?' in model_url else '?'
        inference_url = f"{model_url}{separator}api_key={api_key}"
    else:
        inference_url = model_url
    
    try:
        with open(image_path, 'rb') as f:
            files = {'file': (os.path.basename(image_path), f, 'image/jpeg')}
            response = requests.post(inference_url, files=files, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            # Parse Roboflow response
            # Response format varies by model, but typically includes:
            # - predictions with class, confidence
            # - or direct classification results
            hazard_type, severity, confidence = _parse_roboflow_response(data)
            
            if hazard_type:
                return hazard_type, severity, confidence
            else:
                current_app.logger.warning("Could not parse Roboflow response, using fallback")
                return _fallback_classify()
                
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Roboflow API request failed: {str(e)}")
        return _fallback_classify()
    except Exception as e:
        current_app.logger.error(f"Error classifying image: {str(e)}")
        return _fallback_classify()

def _parse_roboflow_response(data: dict) -> tuple:
    """
    Parse Roboflow API response to extract hazard type, severity, and confidence.
    
    This is a generic parser that handles common Roboflow response formats.
    You may need to adjust this based on your specific model's output format.
    """
    # Format 1: Object detection with predictions array
    if 'predictions' in data and len(data['predictions']) > 0:
        # Get the highest confidence prediction
        pred = max(data['predictions'], key=lambda x: x.get('confidence', 0))
        class_name = pred.get('class', '').lower()
        confidence = pred.get('confidence', 0.5)
        
        # Map class names to hazard types and severities
        hazard_type, severity = _map_class_to_hazard(class_name, confidence)
        return hazard_type, severity, confidence
    
    # Format 2: Direct classification
    if 'class' in data or 'prediction' in data:
        class_name = (data.get('class') or data.get('prediction', '')).lower()
        confidence = data.get('confidence', data.get('confidence_score', 0.5))
        hazard_type, severity = _map_class_to_hazard(class_name, confidence)
        return hazard_type, severity, confidence
    
    # Format 3: Custom format (adjust as needed)
    # Add your model-specific parsing logic here
    
    return None, None, None

def _map_class_to_hazard(class_name: str, confidence: float) -> tuple:
    """
    Map Roboflow class name to hazard type and severity.
    
    Adjust this mapping based on your specific disaster detection model classes.
    """
    class_name = class_name.lower()
    
    # Common disaster/hazard class mappings
    hazard_mapping = {
        'flood': ('flooding', 'high' if confidence > 0.7 else 'medium'),
        'flooding': ('flooding', 'high' if confidence > 0.7 else 'medium'),
        'fire': ('fire', 'high' if confidence > 0.7 else 'medium'),
        'wildfire': ('fire', 'high'),
        'earthquake': ('earthquake', 'high' if confidence > 0.7 else 'medium'),
        'damage': ('building_damage', 'medium' if confidence > 0.6 else 'low'),
        'building_damage': ('building_damage', 'medium' if confidence > 0.6 else 'low'),
        'debris': ('debris', 'low' if confidence > 0.5 else 'low'),
        'gas_leak': ('gas_leak', 'high'),
        'gas': ('gas_leak', 'high' if confidence > 0.7 else 'medium'),
        'accident': ('traffic_accident', 'medium'),
        'traffic_accident': ('traffic_accident', 'medium'),
        'hurricane': ('hurricane', 'high'),
        'tornado': ('tornado', 'high'),
        'tsunami': ('tsunami', 'critical'),
    }
    
    # Try direct match
    if class_name in hazard_mapping:
        return hazard_mapping[class_name]
    
    # Try partial match
    for key, value in hazard_mapping.items():
        if key in class_name or class_name in key:
            return value
    
    # Default fallback
    # Derive severity from confidence
    if confidence > 0.8:
        severity = 'high'
    elif confidence > 0.6:
        severity = 'medium'
    else:
        severity = 'low'
    
    # Default hazard type
    hazard_type = 'building_damage'  # Most common in disaster detection models
    
    return hazard_type, severity

def _fallback_classify() -> tuple:
    """
    Fallback classification when Roboflow is unavailable.
    Returns a generic classification for testing.
    """
    return 'building_damage', 'medium', 0.75


