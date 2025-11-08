# 🚀 HAVEN Setup Guide

## Prerequisites

You need **Node.js** installed to run the frontend. If you don't have it, install it first.

## Quick Setup

### Step 1: Install Node.js

**On Mac (recommended):**
```bash
# Option 1: Using Homebrew (if you have it)
brew install node

# Option 2: Download from website
# Visit https://nodejs.org/ and download the LTS version
# Run the installer and restart your terminal
```

**Verify installation:**
```bash
node --version
npm --version
```

You should see version numbers. If not, Node.js isn't installed or isn't in your PATH.

### Step 2: Install Python Dependencies

```bash
# Create virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Initialize Database

```bash
python init_db.py
python seed_db.py
```

### Step 4: Run the Application

```bash
python run_unified.py
```

This will:
1. Install Next.js dependencies automatically
2. Start Flask backend on port 5000
3. Start Next.js frontend on port 3000
4. Make everything available at **http://localhost:3000**

## Access the Application

Open your browser to: **http://localhost:3000**

You'll see the full HAVEN UI with:
- Map view
- Incident reports
- Safe zones
- All functionality

## Troubleshooting

### "No package manager found" Error

**Solution:** Install Node.js first (see Step 1 above)

### Port 3000 Already in Use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill

# Or change the port in haven-frontend/package.json
# Add to "dev" script: "next dev -p 3001"
```

### Port 5000 Already in Use

```bash
# Find and kill the process using port 5000
lsof -ti:5000 | xargs kill

# Or change the port in app.py
# Change: app.run(host='0.0.0.0', port=5001, debug=True)
```

### Frontend Can't Connect to Backend

- Make sure Flask is running (check terminal output)
- Check that `.env.local` has `NEXT_PUBLIC_API_BASE_URL=/api`
- Check browser console (F12) for errors
- Make sure Next.js rewrites are configured (already done in `next.config.mjs`)

### Dependencies Won't Install

```bash
# Try clearing cache and reinstalling
cd haven-frontend
rm -rf node_modules package-lock.json
npm install
```

## Alternative: Manual Setup

If the automated script doesn't work, you can run servers manually:

**Terminal 1 - Backend:**
```bash
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd haven-frontend
npm install
npm run dev
```

Then access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Need Help?

- Check `INSTALL_NODE.md` for detailed Node.js installation instructions
- Check `README.md` for full documentation
- Check browser console (F12) for errors


