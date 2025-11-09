"""
HAVEN Flask Application Factory
"""
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from app.config import Config

# Initialize extensions
db = SQLAlchemy()

def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS
    cors_origins = app.config.get('CORS_ORIGINS', '*')
    if cors_origins == '*':
        CORS(app, origins='*')
    else:
        CORS(app, origins=cors_origins)

    # Import models to ensure they're registered with SQLAlchemy
    # This must happen after db.init_app() but before db.create_all()
    from app import models  # noqa: F401
    
    # Register blueprints - API routes under /api prefix
    from app.routes import bp as routes_bp
    app.register_blueprint(routes_bp, url_prefix='/api')
    
    # Register uploads route at root level (for direct access)
    @app.route('/uploads/<filename>', methods=['GET'])
    def serve_upload(filename):
        """Serve uploaded image files"""
        try:
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        except Exception as e:
            app.logger.error(f"Error serving upload: {str(e)}", exc_info=True)
            from flask import jsonify
            return jsonify({'error': 'File not found'}), 404

    # Create database tables
    with app.app_context():
        db.create_all()

    return app

