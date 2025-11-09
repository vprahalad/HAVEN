"""
Vercel Serverless Function for Flask App
This wraps the Flask application to work as a Vercel serverless function
"""
import sys
import os

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import Config

# Create Flask app instance
app = create_app(Config)

# Export the Flask app for Vercel
# Vercel's Python runtime automatically handles WSGI apps
# The app will be available at /api/* routes

