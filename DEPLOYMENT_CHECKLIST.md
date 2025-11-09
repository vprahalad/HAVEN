# Quick Deployment Checklist

## Before Deploying

- [ ] Push all code to GitHub
- [ ] Have your API keys ready:
  - [ ] Google Maps API Key
  - [ ] Roboflow API Key (if using)
  - [ ] Roboflow Model ID (if using)

## Deployment Steps

1. **Go to Render Dashboard** → "New +" → "Blueprint"
2. **Connect your GitHub repository**
3. **Render will auto-detect `render.yaml`**
4. **Set these environment variables** (after services are created):

   **Backend Service:**
   - `ROBOFLOW_API_KEY` = Your Roboflow API key
   - `ROBOFLOW_MODEL_ID` = Your Roboflow model ID (format: workspace/project/version)
   - `GOOGLE_MAPS_API_KEY` = Your Google Maps API key

   **Frontend Service:**
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = Your Google Maps API key

5. **Click "Apply" to deploy**

## After Deployment

- [ ] Verify backend health: `https://your-backend.onrender.com/api/health`
- [ ] Verify frontend loads: `https://your-frontend.onrender.com`
- [ ] Test creating a report
- [ ] Check that incidents appear on the map

## If CORS Errors Occur

If you see CORS errors, manually set `FRONTEND_ORIGIN` in the backend service:
- Go to backend service → Environment
- Set `FRONTEND_ORIGIN` = `https://your-frontend-url.onrender.com`
- Save and redeploy

## Files Created for Deployment

- ✅ `render.yaml` - Infrastructure as code configuration
- ✅ `wsgi.py` - Production WSGI entry point
- ✅ Updated `requirements.txt` - Added gunicorn and psycopg2-binary
- ✅ Updated `app/config.py` - PostgreSQL and CORS support
- ✅ Updated `next.config.mjs` - Environment-based backend URL
- ✅ `RENDER_DEPLOYMENT.md` - Full deployment guide

