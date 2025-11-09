# HAVEN Deployment Guide for Render

This guide will help you deploy your HAVEN application to Render with a fully functioning frontend, backend, and database.

## Prerequisites

1. A GitHub account with your HAVEN repository
2. A Render account (sign up at https://render.com)
3. API keys for:
   - Google Maps API
   - Roboflow API (if using image classification)

## Deployment Steps

### Option 1: Using render.yaml (Recommended - Infrastructure as Code)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Connect to Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` in the root directory

3. **Set Environment Variables**
   After the blueprint is created, you'll need to set these environment variables in the Render dashboard:

   **For Backend Service (haven-backend):**
   - `ROBOFLOW_API_KEY` - Your Roboflow API key
   - `ROBOFLOW_MODEL_ID` - Your Roboflow model ID (format: workspace/project/version)
   - `GOOGLE_MAPS_API_KEY` - Your Google Maps API key

   **For Frontend Service (haven-frontend):**
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (same as above)

4. **Deploy**
   - Click "Apply" to deploy all services
   - Render will create:
     - PostgreSQL database
     - Flask backend service
     - Next.js frontend service

### Option 2: Manual Setup (Alternative)

If you prefer to set up services manually:

#### 1. Create PostgreSQL Database

1. Go to Render Dashboard → "New +" → "PostgreSQL"
2. Name: `haven-database`
3. Plan: Free
4. Click "Create Database"
5. Note the **Internal Database URL** (you'll need this)

#### 2. Create Backend Service

1. Go to Render Dashboard → "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `haven-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && mkdir -p uploads && python init_db.py`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 wsgi:app`
   - **Plan**: Free

4. **Environment Variables**:
   - `PYTHON_VERSION`: `3.12.0`
   - `SECRET_KEY`: Generate a random secret key (or use Render's auto-generate)
   - `DATABASE_URL`: Use the Internal Database URL from step 1
   - `FRONTEND_ORIGIN`: Will be set after frontend is deployed (format: `https://haven-frontend.onrender.com`)
   - `ROBOFLOW_API_KEY`: Your Roboflow API key
   - `ROBOFLOW_MODEL_ID`: Your Roboflow model ID
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key

5. Click "Create Web Service"

#### 3. Create Frontend Service

1. Go to Render Dashboard → "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `haven-frontend`
   - **Root Directory**: `haven-frontend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables**:
   - `NODE_VERSION`: `20.x`
   - `NEXT_PUBLIC_API_BASE_URL`: `/api`
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend service URL (e.g., `https://haven-backend.onrender.com`)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps API key

5. Click "Create Web Service"

#### 4. Update Backend CORS

After the frontend is deployed, update the backend's `FRONTEND_ORIGIN` environment variable:
- Go to backend service → Environment
- Set `FRONTEND_ORIGIN` to your frontend URL (e.g., `https://haven-frontend.onrender.com`)
- Save and redeploy

## Post-Deployment

### Verify Deployment

1. **Check Backend Health**:
   - Visit: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status": "ok", ...}`

2. **Check Frontend**:
   - Visit: `https://your-frontend-url.onrender.com`
   - Should load the HAVEN dashboard

3. **Test API Endpoints**:
   - Try creating a report through the frontend
   - Check that incidents are being created in the database

### Database Initialization

The database tables are automatically created during the build process via `init_db.py`. If you need to reinitialize:

1. Go to backend service → Shell
2. Run: `python init_db.py`

### File Uploads

Uploaded images are stored in the `uploads/` directory. On Render's free tier, this directory is ephemeral and will be cleared on each deploy. For production, consider:

- Using a cloud storage service (AWS S3, Cloudinary, etc.)
- Updating the upload handler to save files to cloud storage

## Troubleshooting

### Backend Issues

1. **Database Connection Errors**:
   - Verify `DATABASE_URL` is set correctly
   - Check that the database service is running
   - Ensure the connection string uses `postgresql://` (not `postgres://`)

2. **Import Errors**:
   - Check that all dependencies are in `requirements.txt`
   - Verify Python version matches (3.12.0)

3. **CORS Errors**:
   - Verify `FRONTEND_ORIGIN` is set to the correct frontend URL
   - Check that the URL includes `https://` protocol

### Frontend Issues

1. **API Connection Errors**:
   - Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
   - Check that the backend service is running
   - Ensure the URL includes `https://` protocol

2. **Build Errors**:
   - Check Node version (should be 20.x)
   - Verify all dependencies are in `package.json`
   - Check build logs for specific errors

3. **Google Maps Not Loading**:
   - Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
   - Check browser console for API key errors
   - Ensure Google Maps API is enabled in Google Cloud Console

## Environment Variables Summary

### Backend (`haven-backend`)
- `SECRET_KEY` - Flask secret key (auto-generated by Render)
- `DATABASE_URL` - PostgreSQL connection string (auto-set from database service)
- `FRONTEND_ORIGIN` - Frontend URL for CORS (auto-set from frontend service)
- `ROBOFLOW_API_KEY` - Your Roboflow API key
- `ROBOFLOW_MODEL_ID` - Your Roboflow model ID
- `GOOGLE_MAPS_API_KEY` - Your Google Maps API key

### Frontend (`haven-frontend`)
- `NEXT_PUBLIC_BACKEND_URL` - Backend service URL (auto-set from backend service)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Your Google Maps API key

## Notes

- **Free Tier Limitations**: 
  - Services spin down after 15 minutes of inactivity
  - First request after spin-down may take 30-60 seconds
  - Consider upgrading to a paid plan for production use

- **Database Persistence**: 
  - PostgreSQL database persists data across deployments
  - File uploads in `uploads/` directory are ephemeral on free tier

- **Custom Domains**: 
  - You can add custom domains in Render dashboard
  - Update `FRONTEND_ORIGIN` and `NEXT_PUBLIC_BACKEND_URL` accordingly

## Support

If you encounter issues:
1. Check Render service logs
2. Verify all environment variables are set
3. Ensure all services are running (not sleeping)
4. Check that database is accessible from backend service

