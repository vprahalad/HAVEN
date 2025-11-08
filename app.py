"""
HAVEN Flask Application
Main entry point for the application

RECOMMENDED: Run with unified access (everything on port 3000):
  - python run_unified.py

This starts Flask on 5000 (internal) and Next.js on 3000.
Next.js proxies /api/* requests to Flask, so you only access port 3000.

Alternative: Development mode (separate ports):
  - python run.py (starts Flask on 5000 and Next.js on 3000)
  - OR ./start.sh
"""
from app import create_app
from app.config import DevelopmentConfig

# Create application instance
app = create_app(DevelopmentConfig)

if __name__ == '__main__':
    print("=" * 60)
    print("🚨 HAVEN Backend API Starting...")
    print("=" * 60)
    print("📡 Backend API: http://localhost:5000/api")
    print("")
    print("ℹ️  NOTE: This is the backend API server.")
    print("   For unified access (frontend + API on one port), run:")
    print("   → python run_unified.py")
    print("")
    print("   This will start Next.js on port 3000 and proxy API calls here.")
    print("=" * 60)
    print("")
    
    # Run the application
    app.run(host='0.0.0.0', port=5000, debug=True)
