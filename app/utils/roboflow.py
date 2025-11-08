"""
Roboflow image classification utilities using Inference SDK
"""
import os
import cv2
from flask import current_app

# Cache the model to avoid reloading on every request
_model_cache = None

def classify_image(image_path: str) -> tuple:
    """
    Classify an image using Roboflow Inference SDK.
    
    Args:
        image_path: Path to the image file
    
    Returns:
        Tuple of (hazard_type, severity, confidence) or (None, None, None) if failed
    """
    global _model_cache
    
    api_key = current_app.config.get('ROBOFLOW_API_KEY')
    model_id = current_app.config.get('ROBOFLOW_MODEL_ID')
    
    if not api_key or not model_id:
        current_app.logger.warning("Roboflow API key or model ID not set, using fallback classification")
        current_app.logger.warning(f"ROBOFLOW_API_KEY: {'SET' if api_key else 'NOT SET'}, ROBOFLOW_MODEL_ID: {'SET' if model_id else 'NOT SET'}")
        return _fallback_classify()
    
    # Validate that the image file exists
    if not os.path.exists(image_path):
        current_app.logger.error(f"Image file not found: {image_path}")
        return _fallback_classify()
    
    try:
        # Import inference SDK
        from inference import get_model
        
        # Load model (cache it to avoid reloading on every request)
        if _model_cache is None:
            current_app.logger.info(f"Loading Roboflow model: {model_id}")
            try:
                _model_cache = get_model(model_id=model_id, api_key=api_key)
                current_app.logger.info(f"Successfully loaded model: {model_id}")
            except Exception as e:
                current_app.logger.error(f"Error loading Roboflow model: {str(e)}")
                current_app.logger.error("Please check your MODEL_ID and API_KEY in .env file")
                return _fallback_classify()
        
        model = _model_cache
        
        # Read image using OpenCV
        image = cv2.imread(image_path)
        if image is None:
            current_app.logger.error(f"Error: Could not read image from {image_path}")
            return _fallback_classify()
        
        current_app.logger.info(f"Running inference on image: {os.path.basename(image_path)}")
        
        # Run inference
        try:
            raw_results = model.infer(image)
            
            # Log raw results for debugging
            current_app.logger.info(f"Raw inference results type: {type(raw_results)}")
            current_app.logger.debug(f"Raw inference results: {raw_results}")
            
            # Handle different return formats from Roboflow SDK
            results = None
            if isinstance(raw_results, dict):
                # If it's a dict, use it directly
                results = raw_results
                current_app.logger.info("Results are in dict format")
            elif isinstance(raw_results, list):
                # If it's a list, get first element
                if len(raw_results) == 0:
                    current_app.logger.warning("Inference returned an empty list")
                    return _fallback_classify()
                results = raw_results[0]
                current_app.logger.info(f"Results are in list format, using first element (type: {type(results)})")
            else:
                # Assume it's a result object
                results = raw_results
                current_app.logger.info(f"Results are in object format (type: {type(results)})")
            
            if results is None:
                current_app.logger.warning("Could not extract results from inference output")
                return _fallback_classify()
            
            # Log results structure for debugging
            if hasattr(results, '__dict__'):
                current_app.logger.debug(f"Results attributes: {dir(results)}")
            elif isinstance(results, dict):
                current_app.logger.debug(f"Results keys: {list(results.keys())}")
            
            # Extract predictions - try multiple formats
            predictions = []
            if isinstance(results, dict):
                # Dict format: check for 'predictions' key or direct class info
                if 'predictions' in results:
                    predictions = results['predictions'] if isinstance(results['predictions'], list) else [results['predictions']]
                elif 'top' in results or 'class_name' in results or 'class' in results:
                    # Single prediction in dict
                    predictions = [results]
            elif hasattr(results, 'predictions'):
                # Object with predictions attribute
                preds = results.predictions
                predictions = preds if isinstance(preds, list) else [preds] if preds else []
            
            # Log all predictions for debugging
            if predictions:
                current_app.logger.info(f"Found {len(predictions)} prediction(s)")
                for i, pred in enumerate(predictions):
                    if isinstance(pred, dict):
                        class_name = pred.get('class_name') or pred.get('class') or pred.get('top') or 'unknown'
                        conf = pred.get('confidence', pred.get('conf', 0.0))
                    else:
                        class_name = getattr(pred, 'class_name', getattr(pred, 'class', getattr(pred, 'top', 'unknown')))
                        conf = getattr(pred, 'confidence', getattr(pred, 'conf', 0.0))
                    current_app.logger.info(f"Prediction {i+1}: Class={class_name}, Confidence={conf:.2%}")
            
            # Get top prediction - try multiple ways to access it
            top_class = None
            confidence = 0.0
            
            # Method 1: Get from predictions list (highest confidence)
            if predictions:
                if isinstance(predictions[0], dict):
                    # Sort by confidence if available
                    sorted_preds = sorted(predictions, key=lambda p: p.get('confidence', p.get('conf', 0.0)), reverse=True)
                    best_pred = sorted_preds[0]
                    top_class = best_pred.get('class_name') or best_pred.get('class') or best_pred.get('top')
                    confidence = best_pred.get('confidence', best_pred.get('conf', 0.0))
                else:
                    # Object format
                    best_pred = max(predictions, key=lambda p: getattr(p, 'confidence', getattr(p, 'conf', 0.0)))
                    top_class = getattr(best_pred, 'class_name', getattr(best_pred, 'class', getattr(best_pred, 'top', None)))
                    confidence = getattr(best_pred, 'confidence', getattr(best_pred, 'conf', 0.0))
                current_app.logger.info(f"Best prediction (from predictions list): {top_class} with {confidence:.2%} confidence")
            # Method 2: Check for 'top' attribute directly on results
            elif isinstance(results, dict):
                top_class = results.get('top') or results.get('class_name') or results.get('class')
                confidence = results.get('confidence', results.get('conf', 0.0))
                if top_class:
                    current_app.logger.info(f"Top prediction (via dict): {top_class} with {confidence:.2%} confidence")
            elif hasattr(results, 'top') and results.top:
                top_class = results.top
                confidence = getattr(results, 'confidence', getattr(results, 'conf', 0.0))
                current_app.logger.info(f"Top prediction (via .top): {top_class} with {confidence:.2%} confidence")
            # Method 3: Check if results has class_name directly
            elif hasattr(results, 'class_name') or hasattr(results, 'class'):
                top_class = getattr(results, 'class_name', getattr(results, 'class', None))
                confidence = getattr(results, 'confidence', getattr(results, 'conf', 0.0))
                if top_class:
                    current_app.logger.info(f"Top prediction (direct attribute): {top_class} with {confidence:.2%} confidence")
            
            # Map class name to hazard type and severity
            if top_class and str(top_class).lower() != 'unknown' and top_class:
                hazard_type, severity = _map_class_to_hazard(str(top_class), confidence)
                current_app.logger.info(f"Successfully classified image: {hazard_type} ({severity}) with {confidence:.2%} confidence")
                return hazard_type, severity, confidence
            else:
                current_app.logger.warning(f"Top class is None, empty, or 'unknown': {top_class}")
                current_app.logger.warning(f"Full results structure for debugging: {results}")
                return _fallback_classify()
                
        except Exception as e:
            current_app.logger.error(f"Error during inference: {str(e)}", exc_info=True)
            return _fallback_classify()
            
    except ImportError:
        current_app.logger.error("Roboflow inference SDK not installed. Install with: pip install inference opencv-python")
        return _fallback_classify()
    except Exception as e:
        current_app.logger.error(f"Unexpected error classifying image: {str(e)}", exc_info=True)
        return _fallback_classify()


def _map_class_to_hazard(class_name: str, confidence: float) -> tuple:
    """
    Map Roboflow class name to hazard type and severity.
    
    Adjust this mapping based on your specific disaster detection model classes.
    """
    class_name_lower = class_name.lower().strip()
    current_app.logger.info(f"Mapping class name: '{class_name}' (normalized: '{class_name_lower}') with confidence {confidence:.2%}")
    
    # Derive severity from confidence
    if confidence > 0.8:
        severity = 'high'
    elif confidence > 0.6:
        severity = 'medium'
    else:
        severity = 'low'
    
    # Comprehensive disaster/hazard class mappings (case-insensitive)
    # Map various possible class names to standardized hazard types
    flood_keywords = ['flood', 'flooding', 'flood_damage', 'flood-damage', 'water', 'inundation']
    fire_keywords = ['fire', 'wildfire', 'forest_fire', 'forest-fire', 'blaze', 'burning']
    earthquake_keywords = ['earthquake', 'seismic', 'quake', 'tremor', 'earthquake_damage']
    sinkhole_keywords = ['sinkhole', 'sink_hole', 'sink-hole', 'cavity', 'collapse']
    building_damage_keywords = ['building', 'damage', 'structural', 'building_damage', 'building-damage', 'destruction', 'debris']
    
    # Check for flood
    if any(keyword in class_name_lower for keyword in flood_keywords):
        current_app.logger.info(f"Mapped '{class_name}' to Flood Damage")
        return 'Flood Damage', severity
    
    # Check for fire
    if any(keyword in class_name_lower for keyword in fire_keywords):
        current_app.logger.info(f"Mapped '{class_name}' to Forest Fire")
        return 'Forest Fire', severity
    
    # Check for earthquake
    if any(keyword in class_name_lower for keyword in earthquake_keywords):
        current_app.logger.info(f"Mapped '{class_name}' to Earthquake")
        return 'Earthquake', severity
    
    # Check for sinkhole
    if any(keyword in class_name_lower for keyword in sinkhole_keywords):
        current_app.logger.info(f"Mapped '{class_name}' to Sinkhole")
        return 'Sinkhole', severity
    
    # Check for building damage
    if any(keyword in class_name_lower for keyword in building_damage_keywords):
        current_app.logger.info(f"Mapped '{class_name}' to Building Damage")
        return 'Building Damage', severity
    
    # If no match found, log warning and use the class name as-is (normalized)
    # Convert to snake_case for database consistency
    hazard_type = class_name_lower.replace(' ', '_').replace('-', '_')
    current_app.logger.warning(f"No keyword match found for class '{class_name}', using as-is: '{hazard_type}'")
    return hazard_type.title().replace('_', ' '), severity

def _fallback_classify() -> tuple:
    """
    Fallback classification when Roboflow is unavailable.
    Returns a generic classification for testing.
    """
    return 'building_damage', 'medium', 0.75


