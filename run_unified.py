#!/usr/bin/env python3
"""
Run HAVEN with unified access on port 3000
Next.js frontend on 3000, proxying API requests to Flask on 5000
"""
import subprocess
import sys
import os
import time
from pathlib import Path

def find_command(commands):
    """Find the first available command"""
    # Common Node.js installation paths
    common_paths = [
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/usr/bin',
        os.path.expanduser('~/.nvm/versions/node/*/bin'),
        os.path.expanduser('~/.local/bin'),
    ]
    
    # Try to find command in PATH first
    for cmd in commands:
        # Try multiple methods to find the command
        methods = [
            ['which', cmd],
            ['command', '-v', cmd],
            ['/usr/bin/which', cmd],
        ]
        
        for method in methods:
            try:
                result = subprocess.run(method, capture_output=True, timeout=2, shell=False)
                if result.returncode == 0:
                    return cmd
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
        
        # Try running the command directly
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, timeout=2)
            if result.returncode == 0:
                return cmd
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        
        # Try common installation paths
        for base_path in common_paths:
            if '*' in base_path:
                # Handle glob patterns
                import glob
                for path in glob.glob(base_path):
                    cmd_path = os.path.join(path, cmd)
                    if os.path.isfile(cmd_path) and os.access(cmd_path, os.X_OK):
                        return cmd_path
            else:
                cmd_path = os.path.join(base_path, cmd)
                if os.path.isfile(cmd_path) and os.access(cmd_path, os.X_OK):
                    return cmd_path
    
    return None

def setup_frontend():
    """Setup frontend environment"""
    frontend_dir = Path('haven-frontend')
    
    if not frontend_dir.exists():
        print("❌ Error: haven-frontend directory not found!")
        return False
    
    # Create .env.local if it doesn't exist
    env_local = frontend_dir / '.env.local'
    if not env_local.exists():
        print("📝 Creating frontend .env.local file...")
        env_content = """# HAVEN Frontend Environment Variables
# API will be proxied through Next.js rewrites
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
"""
        env_local.write_text(env_content)
        print("✅ Created .env.local")
    
    # Check if node_modules exists
    if not (frontend_dir / 'node_modules').exists():
        print("📦 Installing Next.js dependencies...")
        package_manager = find_command(['pnpm', 'npm', 'yarn'])
        if not package_manager:
            print("")
            print("❌ Error: No Node.js package manager found!")
            print("")
            print("Please install Node.js first:")
            print("  1. Visit https://nodejs.org/ and download Node.js (LTS version)")
            print("  2. OR install via Homebrew: brew install node")
            print("  3. OR install via nvm: nvm install --lts")
            print("")
            print("After installing Node.js, restart this script.")
            print("")
            return False
        
        print(f"Running {package_manager} install...")
        # Use --legacy-peer-deps to handle React 19 compatibility issues
        install_cmd = [package_manager, 'install', '--legacy-peer-deps']
        install_process = subprocess.run(
            install_cmd,
            cwd=frontend_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        if install_process.returncode != 0:
            print("❌ Error installing dependencies")
            return False
        print("✅ Dependencies installed!")
    
    return True

def start_flask():
    """Start Flask backend on port 5000"""
    print("📡 Starting Flask API backend on http://localhost:5000...")
    return subprocess.Popen(
        [sys.executable, 'app.py'],
        stdout=None,
        stderr=None
    )

def start_nextjs():
    """Start Next.js frontend on port 3000"""
    frontend_dir = Path('haven-frontend')
    package_manager = find_command(['pnpm', 'npm', 'yarn'])
    if not package_manager:
        print("")
        print("❌ Error: No Node.js package manager found!")
        print("")
        print("Please install Node.js first:")
        print("  1. Visit https://nodejs.org/ and download Node.js (LTS version)")
        print("  2. OR install via Homebrew: brew install node")
        print("  3. OR install via nvm: nvm install --lts")
        print("")
        return None
    
    print("🎨 Starting Next.js frontend on http://localhost:3000...")
    print("   (API requests will be proxied to Flask backend)")
    return subprocess.Popen(
        [package_manager, 'run', 'dev'],
        cwd=frontend_dir,
        stdout=None,
        stderr=None
    )

def main():
    """Main function"""
    print("=" * 60)
    print("🚀 Starting HAVEN Application (Unified Access)")
    print("=" * 60)
    print("")
    print("🌐 Access everything at: http://localhost:3000")
    print("   (Frontend on 3000, API proxied from Flask on 5000)")
    print("")
    
    processes = []
    
    try:
        # Setup frontend
        if not setup_frontend():
            print("❌ Failed to setup frontend")
            sys.exit(1)
        
        # Start Flask
        flask_process = start_flask()
        processes.append(flask_process)
        time.sleep(3)  # Wait for Flask to start
        
        # Start Next.js
        nextjs_process = start_nextjs()
        if nextjs_process:
            processes.append(nextjs_process)
        else:
            print("❌ Failed to start Next.js")
            flask_process.terminate()
            sys.exit(1)
        
        print("")
        print("=" * 60)
        print("✅ HAVEN is running!")
        print("=" * 60)
        print("🌐 Open your browser to: http://localhost:3000")
        print("")
        print("   - Frontend UI: http://localhost:3000")
        print("   - API (proxied): http://localhost:3000/api")
        print("   - Flask backend: http://localhost:5000/api (internal)")
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

