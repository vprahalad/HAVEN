#!/usr/bin/env python3
"""
HAVEN Application Runner
Starts both Flask backend and Next.js frontend
"""
import subprocess
import sys
import os
import time
import signal
from pathlib import Path

def find_command(commands):
    """Find the first available command"""
    for cmd in commands:
        if subprocess.run(['which', cmd], capture_output=True).returncode == 0:
            return cmd
    return None

def start_flask():
    """Start Flask backend"""
    print("📡 Starting Flask API backend on http://localhost:5000...")
    return subprocess.Popen(
        [sys.executable, 'app.py'],
        stdout=None,  # Show output in console
        stderr=None
    )

def start_nextjs():
    """Start Next.js frontend"""
    frontend_dir = Path('haven-frontend')
    
    if not frontend_dir.exists():
        print("❌ Error: haven-frontend directory not found!")
        return None
    
    # Create .env.local if it doesn't exist
    env_local = frontend_dir / '.env.local'
    if not env_local.exists():
        print("📝 Creating frontend .env.local file...")
        env_content = """# HAVEN Frontend Environment Variables
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
"""
        env_local.write_text(env_content)
        print("✅ Created .env.local (you can edit it to add your Google Maps API key)")
    
    # Check if node_modules exists
    if not (frontend_dir / 'node_modules').exists():
        print("📦 Installing Next.js dependencies...")
        package_manager = find_command(['pnpm', 'npm', 'yarn'])
        if not package_manager:
            print("❌ Error: No package manager found (pnpm, npm, or yarn)")
            return None
        
        install_process = subprocess.run(
            [package_manager, 'install', '--legacy-peer-deps'],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        if install_process.returncode != 0:
            print(f"❌ Error installing dependencies: {install_process.stderr.decode()}")
            return None
        print("✅ Dependencies installed!")
    
    # Start Next.js dev server
    print("🎨 Starting Next.js frontend on http://localhost:3000...")
    package_manager = find_command(['pnpm', 'npm', 'yarn'])
    if not package_manager:
        print("❌ Error: No package manager found")
        return None
    
    return subprocess.Popen(
        [package_manager, 'run', 'dev'],
        cwd=frontend_dir,
        stdout=None,  # Show output in console
        stderr=None
    )

def main():
    """Main function"""
    print("🚀 Starting HAVEN Application...")
    print("")
    
    processes = []
    
    try:
        # Start Flask
        flask_process = start_flask()
        processes.append(flask_process)
        time.sleep(3)  # Wait for Flask to start
        
        # Start Next.js
        nextjs_process = start_nextjs()
        if nextjs_process:
            processes.append(nextjs_process)
        else:
            print("⚠️  Frontend not started. Backend is still running.")
        
        print("")
        print("=" * 60)
        print("✅ HAVEN is running!")
        print("=" * 60)
        print("🌐 Frontend UI: http://localhost:3000")
        print("🔌 Backend API: http://localhost:5000")
        print("")
        print("Press Ctrl+C to stop both servers")
        print("=" * 60)
        print("")
        
        # Wait for processes
        for process in processes:
            process.wait()
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        for process in processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        print("✅ Servers stopped")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        for process in processes:
            try:
                process.terminate()
            except:
                pass
        sys.exit(1)

if __name__ == '__main__':
    main()

