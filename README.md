# HAVEN - Hazard Alert & Visual Emergency Network

Real-time hazard detection through crowdsourced image intelligence and AI classification.

## Architecture

- **Backend**: Flask REST API (Python) - Port 5000
- **Frontend**: Next.js (React/TypeScript) - Port 3000
- **Database**: SQLite (default) or PostgreSQL/MySQL via DATABASE_URL
- **AI Classification**: Roboflow disaster detection models
- **Geocoding**: Google Maps Geocoding API

## 🚀 Quick Start

> **📌 IMPORTANT**: The Flask backend (`app.py`) only runs the API. To see the full UI, you need to run both the backend AND frontend together.

### Option 1: Run Both Servers Automatically (Recommended)

```bash
# Using Python script (works on all platforms)
python run.py

# OR using bash script (Mac/Linux)
./start.sh
```

This will:
1. ✅ Start the Flask API backend on http://localhost:5000
2. ✅ Install Next.js dependencies if needed
3. ✅ Start the Next.js frontend on http://localhost:3000
4. 🌐 **Open http://localhost:3000 in your browser to see the UI**

### Option 2: Manual Startup

#### 1. Start Flask API Backend

```bash
# Activate virtual environment (if using one)
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start Flask server
python app.py
```

The API will be available at http://localhost:5000

#### 2. Start Next.js Frontend

```bash
cd haven-frontend

# Install dependencies (first time only)
npm install
# or
pnpm install
# or
yarn install

# Start development server
npm run dev
# or
pnpm dev
# or
yarn dev
```

The frontend will be available at http://localhost:3000

## First Time Setup

### 1. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies

```bash
cd haven-frontend
npm install
```

### 3. Initialize Database

```bash
python init_db.py
python seed_db.py
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` and set the following (optional for testing):

```env
# Flask Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database (SQLite by default)
DATABASE_URL=sqlite:///haven.db

# CORS
FRONTEND_ORIGIN=http://localhost:3000

# Roboflow API (optional - fallback available)
ROBOFLOW_API_KEY=your-roboflow-api-key
ROBOFLOW_MODEL_URL=https://detect.roboflow.com/your-model/version

# Google Maps API (optional - for geocoding)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

The frontend `.env.local` will be created automatically by `run.py`, or create it manually:

```bash
cd haven-frontend
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:5000" > .env.local
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here" >> .env.local
```

## Project Structure

```
HAVEN/
├── app/
│   ├── __init__.py          # Application factory
│   ├── config.py            # Configuration classes
│   ├── models.py            # SQLAlchemy models
│   ├── routes.py            # API routes/endpoints
│   └── utils/
│       ├── __init__.py
│       ├── distance.py      # Haversine distance calculations
│       ├── geocode.py       # Google Maps geocoding
│       └── roboflow.py      # Roboflow image classification
├── haven-frontend/          # Next.js frontend
├── uploads/                 # Uploaded images directory
├── app.py                   # Main application entry point
├── run.py                   # Run both backend and frontend
├── start.sh                 # Bash script to start both servers
├── init_db.py              # Database initialization script
├── seed_db.py              # Seed demo data
├── requirements.txt        # Python dependencies
├── env.example            # Environment variables template
└── README.md
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Reports
- `POST /reports` - Create a hazard report
  - multipart/form-data: image, description, address, latitude, longitude, user_external_id, source
  - Returns: report, incident, and classification results

### Incidents
- `GET /incidents` - List all incidents
  - Query params: `status` (verified/unverified), `limit` (default: 100)
- `GET /incidents/<id>` - Get a single incident by ID

### Safe Zones
- `GET /safe-zones` - List safe zones
  - Query params: `active` (true/false, default: true)
- `POST /safe-zones` - Create a new safe zone
  - JSON body: name (required), address (required), latitude (optional), longitude (optional), accessible (optional, default: true)
  - If latitude/longitude are provided, they will be used; otherwise, address will be geocoded

### Routes
- `GET /route?fromLat=<lat>&fromLng=<lng>` - Get route to nearest safe zone
  - Returns: safe zone info and Google Maps directions URL

### Uploads
- `GET /uploads/<filename>` - Serve uploaded images

## Features

### Image Classification
- Accepts image uploads via multipart/form-data
- Uses Roboflow API for hazard classification
- Supports fallback classification when API is unavailable
- Maps classification results to hazard types and severities

### Location Handling
- Supports latitude/longitude coordinates
- Supports address geocoding via Google Maps API
- Optional reverse geocoding for coordinates

### Incident Grouping
- Groups reports into incidents based on:
  - Distance threshold (400m default)
  - Time window (12 hours default)
  - Hazard type matching
- Automatically creates new incidents when no match is found

### Verification Logic
- Incidents are verified when 2+ distinct users report them
- Prevents false positives through multi-source verification
- Status automatically updates from "unverified" to "verified"

### Impact Radius
- Calculated based on severity:
  - Low: 100m
  - Medium: 300m
  - High: 1000m
  - Critical: 1500m

### Safe Zone Routing
- Finds nearest active safe zone using Haversine distance
- Returns Google Maps directions URL
- Supports accessible/non-accessible zones

## Database Models

### User
- `id` (int, primary key)
- `external_id` (string, unique) - Frontend or device ID
- `created_at` (datetime)

### Incident
- `id` (int, primary key)
- `hazard_type` (string)
- `severity` (string) - low, medium, high
- `status` (string) - unverified, verified
- `latitude` (float)
- `longitude` (float)
- `address` (string, nullable)
- `impact_radius_m` (float) - in meters
- `created_at` (datetime)

### HazardReport
- `id` (int, primary key)
- `incident_id` (foreign key)
- `user_id` (foreign key, nullable)
- `source` (string) - citizen, device
- `hazard_type` (string)
- `severity` (string)
- `confidence` (float)
- `description` (text, nullable)
- `latitude` (float)
- `longitude` (float)
- `address` (string, nullable)
- `image_url` (string)
- `created_at` (datetime)

### SafeZone
- `id` (int, primary key)
- `name` (string)
- `address` (string)
- `latitude` (float)
- `longitude` (float)
- `accessible` (boolean)
- `active` (boolean)
- `created_at` (datetime)

## Development

### Running in Development Mode

```bash
# Run both servers
python run.py

# OR run separately
# Terminal 1: Backend
python app.py

# Terminal 2: Frontend
cd haven-frontend
npm run dev
```

### Database Management

```bash
# Initialize database
python init_db.py

# Seed demo data
python seed_db.py

# Reset database (WARNING: deletes all data)
# Edit init_db.py to uncomment db.drop_all()
python init_db.py
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:5000/health

# List incidents
curl http://localhost:5000/incidents

# Create safe zone
curl -X POST http://localhost:5000/safe-zones \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Zone", "address": "New York, NY"}'

# Get route
curl "http://localhost:5000/route?fromLat=40.758&fromLng=-73.9855"
```

## Troubleshooting

### "Cannot find module" errors
- Make sure you've run `npm install` in the `haven-frontend` directory
- Make sure you've run `pip install -r requirements.txt` for Python dependencies

### Frontend can't connect to backend
- Make sure Flask is running on port 5000
- Check that `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000` in `haven-frontend/.env.local`
- Check browser console for CORS errors

### Port already in use
- Stop other processes using port 5000 or 3000
- Or change the ports in `app.py` and `haven-frontend/package.json`

### Database errors
- Run: `python init_db.py`
- Check database file permissions

### API key errors
- Check `.env` file exists and has correct keys
- Fallback behavior available for testing without keys

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Flask secret key | No | `dev-secret-key-change-in-production` |
| `DATABASE_URL` | Database connection URL | No | `sqlite:///haven.db` |
| `FRONTEND_ORIGIN` | CORS allowed origins | No | `*` |
| `ROBOFLOW_API_KEY` | Roboflow API key | No* | - |
| `ROBOFLOW_MODEL_URL` | Roboflow model URL | No* | - |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | No* | - |

*Required for full functionality, but fallback behavior available

## Need More Help?

- See `START_HERE.md` for a quick start guide
- See `QUICKSTART.md` for API usage examples

## License

MIT License
