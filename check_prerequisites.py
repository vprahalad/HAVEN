#!/usr/bin/env python3
"""
Check prerequisites for HAVEN and provide installation instructions
"""
import subprocess
import sys
import os

def check_command(cmd, name):
    """Check if a command exists"""
    try:
        result = subprocess.run(['which', cmd] if sys.platform != 'win32' else ['where', cmd], 
                              capture_output=True, timeout=2)
        if result.returncode == 0:
            # Try to get version
            try:
                version_result = subprocess.run([cmd, '--version'], capture_output=True, timeout=2)
                version = version_result.stdout.decode().strip().split('\n')[0]
                return True, version
            except:
                return True, "installed"
        return False, None
    except:
        return False, None

def check_homebrew():
    """Check if Homebrew is installed"""
    try:
        result = subprocess.run(['which', 'brew'], capture_output=True, timeout=2)
        return result.returncode == 0
    except:
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("🔍 HAVEN Prerequisites Check")
    print("=" * 60)
    print("")
    
    # Check Python
    python_ok, python_version = check_command('python3', 'Python 3')
    print(f"Python 3: {'✅' if python_ok else '❌'} {python_version if python_ok else 'Not found'}")
    
    # Check Node.js
    node_ok, node_version = check_command('node', 'Node.js')
    print(f"Node.js:  {'✅' if node_ok else '❌'} {node_version if node_ok else 'Not found'}")
    
    # Check npm
    npm_ok, npm_version = check_command('npm', 'npm')
    print(f"npm:      {'✅' if npm_ok else '❌'} {npm_version if npm_ok else 'Not found'}")
    
    # Check Homebrew
    brew_ok = check_homebrew()
    print(f"Homebrew: {'✅' if brew_ok else '❌'} {'Installed' if brew_ok else 'Not installed'}")
    
    print("")
    print("=" * 60)
    
    # Provide installation instructions
    if not node_ok or not npm_ok:
        print("")
        print("❌ Node.js is required but not installed!")
        print("")
        print("Installation Options:")
        print("")
        
        if brew_ok:
            print("1. Install via Homebrew (Recommended):")
            print("   brew install node")
            print("")
            print("   Then restart your terminal and run this check again.")
            print("")
        else:
            print("1. Install Homebrew first (Mac):")
            print("   /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"")
            print("")
            print("   Then install Node.js:")
            print("   brew install node")
            print("")
        
        print("2. Download from Node.js website:")
        print("   Visit: https://nodejs.org/")
        print("   Download the LTS version and run the installer")
        print("   Restart your terminal after installation")
        print("")
        
        print("3. Install via NVM (Node Version Manager):")
        print("   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash")
        print("   source ~/.zshrc  # or ~/.bashrc")
        print("   nvm install --lts")
        print("   nvm use --lts")
        print("")
        
        print("After installing Node.js, verify with:")
        print("   node --version")
        print("   npm --version")
        print("")
        print("Then run: python run_unified.py")
        print("")
        sys.exit(1)
    
    if not python_ok:
        print("")
        print("❌ Python 3 is required but not found!")
        print("")
        print("Please install Python 3.8 or higher.")
        print("")
        sys.exit(1)
    
    print("")
    print("✅ All prerequisites are installed!")
    print("")
    print("Next steps:")
    print("1. Install Python dependencies: pip install -r requirements.txt")
    print("2. Initialize database: python init_db.py && python seed_db.py")
    print("3. Run application: python run_unified.py")
    print("")
    print("=" * 60)

if __name__ == '__main__':
    main()


