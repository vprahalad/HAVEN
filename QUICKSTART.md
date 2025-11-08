# HAVEN Backend - Quick Start Guide

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit .env and add your API keys:
# - ROBOFLOW_API_KEY (optional for testing, fallback available)
# - GOOGLE_MAPS_API_KEY (optional for testing)
# - DATABASE_URL (defaults to SQLite)
```

### 3. Initialize Database

```bash
python init_db.py
python seed_db.py
```

### 4. Run the Server

```bash
python app.py
```

The API will be available at **http://localhost:5000**

## Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### List Incidents
```bash
curl http://localhost:5000/incidents
```

### Create Safe Zone
```bash
curl -X POST http://localhost:5000/safe-zones \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Safe Zone",
    "address": "New York, NY"
  }'
```

### Submit Report (with image)
```bash
curl -X POST http://localhost:5000/reports \
  -F "image=@/path/to/image.jpg" \
  -F "latitude=40.758" \
  -F "longitude=-73.9855" \
  -F "description=Test hazard report"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/reports` | Create hazard report |
| GET | `/incidents` | List incidents |
| GET | `/incidents/<id>` | Get incident by ID |
| GET | `/safe-zones` | List safe zones |
| POST | `/safe-zones` | Create safe zone |
| GET | `/route?fromLat=X&fromLng=Y` | Get route to nearest safe zone |

## Next Steps

1. **Configure Roboflow** (for image classification):
   - Sign up at https://roboflow.com
   - Get your API key and model URL
   - Add to `.env`

2. **Configure Google Maps** (for geocoding):
   - Get API key from https://console.cloud.google.com
   - Enable Geocoding API
   - Add to `.env`

3. **Connect Frontend**:
   - Frontend should connect to `http://localhost:5000`
   - Update `NEXT_PUBLIC_API_BASE_URL` in frontend `.env.local`

## Troubleshooting

### Import Errors
- Make sure you're in the virtual environment
- Run: `pip install -r requirements.txt`

### Database Errors
- Run: `python init_db.py`
- Check database file permissions

### API Key Errors
- Check `.env` file exists and has correct keys
- Fallback behavior available for testing without keys

## Project Structure

```
HAVEN/
├── app/
│   ├── __init__.py      # App factory
│   ├── config.py        # Configuration
│   ├── models.py        # Database models
│   ├── routes.py        # API routes
│   └── utils/           # Utilities
├── uploads/             # Image uploads
├── app.py              # Main entry point
├── init_db.py          # Database init
├── seed_db.py          # Demo data
└── requirements.txt    # Dependencies
```


