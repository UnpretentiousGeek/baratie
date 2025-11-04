# Deploying Caption Server to Railway

This guide will help you deploy the Python caption server to Railway.app so it's available online for your Vercel app.

## Prerequisites

- A GitHub account
- A Railway account (sign up at https://railway.app with your GitHub account)

## Step 1: Prepare Your Repository

The necessary files are already in your repo:
- `caption-server.py` - The Python server
- `requirements.txt` - Python dependencies
- `Procfile` - Tells Railway how to run the server

## Step 2: Deploy to Railway

### Method 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add caption-server.py requirements.txt Procfile
   git commit -m "Add caption server for Railway deployment"
   git push
   ```

2. **Go to Railway.app** and sign in: https://railway.app

3. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Baratie repository
   - Railway will automatically detect it's a Python app

4. **Configure the deployment**:
   - Railway will automatically:
     - Install dependencies from `requirements.txt`
     - Run the command from `Procfile`: `python caption-server.py`
     - Assign a public URL

5. **Get your deployment URL**:
   - Once deployed, go to your project settings
   - Click "Generate Domain" under the Networking section
   - Copy your URL (e.g., `https://your-app.railway.app`)

### Method 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Step 3: Update Your Vercel App

Once deployed, update the caption API URL in your app:

1. **Open `app/app.js`**

2. **Find the `fetchYouTubeCaptions` function** (around line 1640)

3. **Update the fetch URL** from:
   ```javascript
   const response = await fetch('/api/youtube-captions', {
   ```

   To your Railway URL:
   ```javascript
   const response = await fetch('https://your-app.railway.app/api/youtube-captions', {
   ```

4. **Deploy to Vercel**:
   ```bash
   git add app/app.js
   git commit -m "Update caption server URL to Railway"
   git push
   ```

## Step 4: Test the Integration

1. Go to your Vercel app
2. Try extracting a recipe from a YouTube video
3. Check Railway logs if there are issues: `railway logs`

## Troubleshooting

### Server not responding
- Check Railway logs for errors
- Verify the server is running in Railway dashboard
- Make sure you're using the correct Railway URL

### CORS errors
- The caption server already has CORS enabled (`Access-Control-Allow-Origin: *`)
- If you still see CORS errors, check Railway logs

### Port issues
- Railway assigns a dynamic PORT environment variable
- The server is configured to use `os.environ.get('PORT', 8000)`

## Environment Variables

Railway automatically provides:
- `PORT` - The port your server should listen on

No additional environment variables are needed.

## Monitoring

- **View logs**: Click on your deployment in Railway dashboard
- **Restart server**: Click "Restart" in the dashboard
- **View metrics**: Railway shows CPU and memory usage

## Cost

Railway's free tier includes:
- $5 worth of usage per month
- Should be plenty for a caption server (very lightweight)
- No credit card required to start

## Alternative: Render.com

If you prefer Render:

1. Go to https://render.com
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python caption-server.py`
5. Deploy and copy the URL

Then update `app/app.js` with your Render URL.
