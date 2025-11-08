# 🚀 HAVEN - Quick Start Guide

## ⚠️ IMPORTANT: Install Node.js First!

**Node.js is required to run the frontend. You don't have it installed yet.**

### Quick Install (Mac with Homebrew)

Since you have Homebrew installed, run:

```bash
brew install node
```

After installation, **restart your terminal** and verify:

```bash
node --version
npm --version
```

### Alternative Installation Methods

See `INSTALL_NODE.md` for detailed instructions including:
- Downloading from nodejs.org
- Installing via NVM
- Installing via Conda

## 🎯 Unified Access (Everything on One Port)

Once Node.js is installed, run:

```bash
python run_unified.py
```

This will:
1. ✅ Install Next.js dependencies automatically
2. ✅ Start Flask backend on port 5000 (internal)
3. ✅ Start Next.js frontend on port 3000
4. 🌐 **Access everything at: http://localhost:3000**

**You only need to go to one URL!** The frontend and API are unified.

## How It Works

- **Frontend UI**: http://localhost:3000 (Next.js)
- **API Calls**: http://localhost:3000/api/* (proxied to Flask on 5000)
- **Flask Backend**: http://localhost:5000 (internal, not directly accessed)

Next.js rewrites all `/api/*` requests to Flask, so from your browser's perspective, everything comes from port 3000.

## First Time Setup

### 1. Install Node.js

```bash
# Using Homebrew (recommended)
brew install node

# OR check prerequisites
python check_prerequisites.py
```

### 2. Install Python Dependencies

```bash
# Create virtual environment (if not already created)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Initialize Database

```bash
python init_db.py
python seed_db.py
```

### 4. Run the Application

```bash
python run_unified.py
```

The script will automatically:
- Install Next.js dependencies if needed
- Create frontend `.env.local` if needed
- Start both servers

## Troubleshooting

### "No package manager found" Error

**Solution:** Install Node.js first:
```bash
brew install node
# Then restart terminal
python run_unified.py
```

### Port 3000 says "This site can't be reached"
- Make sure Next.js started successfully
- Check the terminal output for errors
- Make sure port 3000 is not already in use
- Try: `lsof -ti:3000 | xargs kill` (Mac/Linux)

### API calls not working
- Make sure Flask is running on port 5000
- Check that Next.js rewrites are configured (already done in `next.config.mjs`)
- Check browser console for errors
- Verify `.env.local` has `NEXT_PUBLIC_API_BASE_URL=/api`

### "Cannot find module" errors
- Run `npm install` in `haven-frontend/` directory
- Make sure you're using Node.js 18+ 

## What You'll See

When you open http://localhost:3000, you'll see:
- ✅ Full HAVEN UI with map, incidents, reports, safe zones
- ✅ All API calls work seamlessly (proxied through Next.js)
- ✅ No CORS issues
- ✅ Everything on one port

## Need More Help?

- Run: `python check_prerequisites.py` to check what's installed
- Check `INSTALL_NODE.md` for Node.js installation details
- Check `README.md` for detailed documentation
- Check browser console (F12) for any errors
