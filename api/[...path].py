"""
Vercel Serverless Function for Flask App
Catch-all route handler for /api/* requests

Based on Vercel's Python runtime format
"""
import sys
import os
import json

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.config import Config

# Create Flask app instance (singleton pattern for serverless)
_app = None

def get_app():
    """Get or create Flask app instance"""
    global _app
    if _app is None:
        _app = create_app(Config)
    return _app

# Vercel serverless function handler
# Vercel Python runtime passes (req, res) objects
def handler(req, res):
    """
    Vercel serverless function handler
    This handles all /api/* requests
    
    Args:
        req: Vercel request object with .method, .url, .headers, .body
        res: Vercel response object with .status(), .send(), .json() methods
    """
    app = get_app()
    
    # Parse request URL to get path
    from urllib.parse import urlparse, parse_qs
    parsed_url = urlparse(req.url)
    path = parsed_url.path
    
    # Remove /api prefix if present (Vercel routes /api/* to this function)
    if path.startswith('/api'):
        path = path[4:] or '/'
    
    # Get query string
    query_string = parsed_url.query
    
    # Get request body
    body = req.body if hasattr(req, 'body') else b''
    if isinstance(body, str):
        body = body.encode('utf-8')
    
    # Create WSGI environment
    environ = {
        'REQUEST_METHOD': req.method,
        'SCRIPT_NAME': '',
        'PATH_INFO': path,
        'QUERY_STRING': query_string,
        'CONTENT_TYPE': req.headers.get('content-type', ''),
        'CONTENT_LENGTH': str(len(body)) if body else '',
        'SERVER_NAME': req.headers.get('host', 'localhost'),
        'SERVER_PORT': '443',
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': 'https',
        'wsgi.input': None,  # Will be set below
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': True,
        'wsgi.run_once': False,
    }
    
    # Add headers
    for key, value in req.headers.items():
        key = key.upper().replace('-', '_')
        if key not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            key = f'HTTP_{key}'
        environ[key] = value
    
    # Create a file-like object for wsgi.input
    from io import BytesIO
    environ['wsgi.input'] = BytesIO(body)
    
    # Response data
    status_code = 200
    response_headers = {}
    body_parts = []
    
    def start_response(status, headers):
        nonlocal status_code, response_headers
        status_code = int(status.split(' ')[0])
        response_headers = dict(headers)
    
    # Call Flask app
    try:
        result = app(environ, start_response)
        
        # Collect response body
        for part in result:
            if isinstance(part, bytes):
                body_parts.append(part)
            else:
                body_parts.append(str(part).encode('utf-8'))
        
        body = b''.join(body_parts)
        
        # Set response status
        res.status(status_code)
        
        # Set response headers
        for key, value in response_headers.items():
            res.setHeader(key, value)
        
        # Send response body
        # Check if it's JSON
        content_type = response_headers.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                res.json(json.loads(body.decode('utf-8')))
            except:
                res.send(body.decode('utf-8'))
        else:
            res.send(body.decode('utf-8'))
            
    except Exception as e:
        # Error handling
        res.status(500)
        res.json({'error': str(e)})

