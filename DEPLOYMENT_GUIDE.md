# Doctorino Deployment Guide

This guide will help you deploy your Doctorino application to the cloud, allowing you to access it from anywhere and connect to your cloud MongoDB database.

## Backend Deployment to Render

### Prerequisites

1. Create a [Render](https://render.com/) account if you don't have one
2. Make sure your code is in a Git repository (GitHub, GitLab, etc.)

### Steps to Deploy the Backend

1. **Log in to Render**
   - Go to [render.com](https://render.com/) and log in to your account

2. **Create a New Web Service**
   - Click on "New" and select "Web Service"
   - Connect your Git repository
   - Select the repository containing your Doctorino application

3. **Configure the Web Service**
   - Name: `doctorino-api` (or any name you prefer)
   - Environment: `Python 3`
   - Region: Choose the region closest to your users
   - Branch: `main` (or your default branch)
   - Build Command: `pip install -r app/backend/requirements.txt`
   - Start Command: `cd app/backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: Choose the Free plan for testing or a paid plan for production

4. **Add Environment Variables**
   - Click on "Environment" tab
   - Add the following environment variables:
     - `MONGODB_URL`: `mongodb+srv://ahmed:ahmed123@cluster0.lq3uj.mongodb.net/`
     - `MONGODB_DB_NAME`: `doctorino`
     - `JWT_SECRET_KEY`: `your_secure_secret_key` (use a strong, random string)
     - `ENVIRONMENT`: `production`
     - `CORS_ORIGINS`: `https://your-frontend-url.com,http://localhost:5173,*` (update with your frontend URL)

5. **Deploy the Service**
   - Click "Create Web Service"
   - Render will build and deploy your application
   - Once deployed, you'll get a URL like `https://doctorino-api.onrender.com`

6. **Test the API**
   - Visit `https://your-api-url.onrender.com/` to see if the API is running
   - You should see a welcome message with the API version

## Frontend Deployment to Render

### Steps to Deploy the Frontend

1. **Update the .env File**
   - In your local project, update `app/frontend/.env`:
     ```
     VITE_API_URL=https://your-doctorino-api.onrender.com
     VITE_API_PORT=443
     ```

2. **Create a New Static Site on Render**
   - Click on "New" and select "Static Site"
   - Connect your Git repository
   - Select the repository containing your Doctorino application

3. **Configure the Static Site**
   - Name: `doctorino-app` (or any name you prefer)
   - Root Directory: `app/frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables: Add the same VITE_API_URL and VITE_API_PORT as in your .env file

4. **Deploy the Static Site**
   - Click "Create Static Site"
   - Render will build and deploy your frontend
   - Once deployed, you'll get a URL like `https://doctorino-app.onrender.com`

## Mobile App Configuration

To connect your mobile app to the cloud backend:

1. **Update API Configuration**
   - Open your mobile app code
   - Find the API configuration file (usually in `lib/services/api_service.dart` or similar)
   - Update the base URL to point to your cloud API:
     ```dart
     static const String baseUrl = 'https://your-doctorino-api.onrender.com';
     ```

2. **Rebuild and Deploy the Mobile App**
   - Rebuild your Flutter app with the updated configuration
   - Test to ensure it connects to the cloud backend correctly

## Troubleshooting

### CORS Issues
If you encounter CORS issues:
1. Make sure your backend's CORS settings include your frontend URL
2. Update the `CORS_ORIGINS` environment variable on Render to include all necessary origins

### Connection Issues
If the frontend can't connect to the backend:
1. Check that the API URL is correct in your .env file
2. Ensure the backend is running and accessible
3. Check for any network restrictions or firewall issues

### Database Connection Issues
If the backend can't connect to MongoDB:
1. Verify the MongoDB connection string is correct
2. Ensure your IP address is whitelisted in MongoDB Atlas
3. Check MongoDB Atlas logs for any connection errors

## Conclusion

Your Doctorino application is now deployed to the cloud! You can access it from anywhere, and it's connected to your cloud MongoDB database. This setup allows you to use the application from different devices and platforms.

For any issues or questions, please refer to the [Render documentation](https://render.com/docs) or the [MongoDB Atlas documentation](https://docs.atlas.mongodb.com/).
