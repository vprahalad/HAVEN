"""
Configuration classes for Flask app
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database
    # Handle both postgres:// and postgresql:// connection strings
    database_url = os.environ.get('DATABASE_URL') or 'sqlite:///haven.db'
    # Convert postgres:// to postgresql:// for SQLAlchemy compatibility
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    # Handle comma-separated origins or single origin
    frontend_origin = os.environ.get('FRONTEND_ORIGIN', '*')
    if frontend_origin == '*':
        CORS_ORIGINS = '*'
    else:
        # Split by comma and strip whitespace
        origins = [origin.strip() for origin in frontend_origin.split(',')]
        # If origin doesn't have protocol, add https:// (for Render host property)
        CORS_ORIGINS = []
        for origin in origins:
            if origin and not origin.startswith(('http://', 'https://')):
                origin = f'https://{origin}'
            CORS_ORIGINS.append(origin)
    
    # Roboflow
    ROBOFLOW_API_KEY = os.environ.get('ROBOFLOW_API_KEY', '')
    ROBOFLOW_MODEL_ID = os.environ.get('ROBOFLOW_MODEL_ID', '')
    
    # Google Maps
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')
    
    # File uploads
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


