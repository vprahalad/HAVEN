#!/bin/bash

# HAVEN Backend Setup Script

echo "🚀 Setting up HAVEN Backend..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "⚠️  Please edit .env and add your API keys!"
    else
        echo "⚠️  .env.example not found. Please create .env manually."
    fi
fi

# Create uploads directory
mkdir -p uploads

# Initialize database
echo "🗄️  Initializing database..."
python init_db.py

# Seed demo data
echo "🌱 Seeding demo data..."
python seed_db.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys (Roboflow, Google Maps)"
echo "2. Run: source venv/bin/activate"
echo "3. Run: python app.py"
echo ""
echo "The API will be available at http://localhost:5000"


