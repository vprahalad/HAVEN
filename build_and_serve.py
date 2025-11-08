#!/usr/bin/env python3
"""
Build Next.js frontend and serve everything from Flask on one port
"""
import subprocess
import sys
import os
import time
import shutil
from pathlib import Path

def find_command(commands):
    """Find the first available command"""
    for cmd in commands:
        result = subprocess.run(['which', cmd] if sys.platform != 'win32' else ['where', cmd], 
                              capture_output=True)
        if result.returncode == 0:
            return cmd
    return None

def build_nextjs():
    """Build Next.js frontend for production"""
    frontend_dir = Path('haven-frontend')
    
    if not frontend_dir.exists():
        print("❌ Error: haven-frontend directory not found!")
        return False
    
    # Check if node_modules exists
    if not (frontend_dir / 'node_modules').exists():
        print("📦 Installing Next.js dependencies...")
        package_manager = find_command(['pnpm', 'npm', 'yarn'])
        if not package_manager:
            print("❌ Error: No package manager found (pnpm, npm, or yarn)")
            return False
        
        print(f"Running {package_manager} install...")
        install_process = subprocess.run(
            [package_manager, 'install', '--legacy-peer-deps'],
            cwd=frontend_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        if install_process.returncode != 0:
            print("❌ Error installing dependencies")
            return False
        print("✅ Dependencies installed!")
    
    # Create .env.local if it doesn't exist
    env_local = frontend_dir / '.env.local'
    if not env_local.exists():
        print("📝 Creating frontend .env.local file...")
        env_content = """# HAVEN Frontend Environment Variables
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
"""
        env_local.write_text(env_content)
        print("✅ Created .env.local")
    
    # Build Next.js
    print("🏗️  Building Next.js frontend...")
    package_manager = find_command(['pnpm', 'npm', 'yarn'])
    if not package_manager:
        print("❌ Error: No package manager found")
        return False
    
    # Use standalone output for easier serving
    build_process = subprocess.run(
        [package_manager, 'run', 'build'],
        cwd=frontend_dir,
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    
    if build_process.returncode != 0:
        print("❌ Error building Next.js app")
        return False
    
    print("✅ Next.js app built successfully!")
    return True

def main():
    """Main function"""
    print("=" * 60)
    print("🚀 Building and Serving HAVEN Application")
    print("=" * 60)
    print("")
    
    # Build Next.js
    if not build_nextjs():
        print("❌ Failed to build Next.js app")
        sys.exit(1)
    
    print("")
    print("=" * 60)
    print("✅ Build complete! Starting Flask server...")
    print("=" * 60)
    print("")
    print("🌐 Application will be available at: http://localhost:5000")
    print("   (Frontend and API on the same port)")
    print("")
    print("Press Ctrl+C to stop")
    print("=" * 60)
    print("")
    
    # Start Flask
    try:
        subprocess.run([sys.executable, 'app.py'])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        sys.exit(0)

if __name__ == '__main__':
    main()


