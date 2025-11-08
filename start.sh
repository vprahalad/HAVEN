#!/bin/bash

# Start script for HAVEN application
# This starts both the Flask API backend and Next.js frontend

echo "🚀 Starting HAVEN Application..."
echo ""

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found. Please run this script from the HAVEN directory."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $FLASK_PID $NEXTJS_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d "haven-backend/venv" ]; then
    source haven-backend/venv/bin/activate
fi

# Start Flask API (port 5000)
echo "📡 Starting Flask API on http://localhost:5000..."
python app.py &
FLASK_PID=$!

# Wait a moment for Flask to start
sleep 3

# Check if Next.js dependencies are installed
if [ ! -d "haven-frontend/node_modules" ]; then
    echo "📦 Installing Next.js dependencies..."
    cd haven-frontend
    if command -v pnpm &> /dev/null; then
        pnpm install --legacy-peer-deps
    elif command -v npm &> /dev/null; then
        npm install --legacy-peer-deps
    elif command -v yarn &> /dev/null; then
        yarn install --legacy-peer-deps
    else
        echo "❌ Error: No package manager found (pnpm, npm, or yarn)"
        kill $FLASK_PID
        exit 1
    fi
    cd ..
fi

# Start Next.js frontend (port 3000)
echo "🎨 Starting Next.js frontend on http://localhost:3000..."
cd haven-frontend
if command -v pnpm &> /dev/null; then
    pnpm dev &
elif command -v npm &> /dev/null; then
    npm run dev &
elif command -v yarn &> /dev/null; then
    yarn dev &
fi
NEXTJS_PID=$!
cd ..

echo ""
echo "✅ HAVEN is running!"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔌 API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait

