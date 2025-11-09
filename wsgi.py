"""
Production WSGI entry point for HAVEN Flask application
Used by gunicorn on Render
"""
import os
from app import create_app
from app.config import ProductionConfig

# Create application instance with production config
app = create_app(ProductionConfig)

if __name__ == '__main__':
    # This is for local testing only
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

