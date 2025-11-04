# Deploying Caption Server to Render

This guide will help you deploy the Python caption server to Render.com for free.

## Prerequisites

- A GitHub account
- A Render account (sign up at https://render.com with your GitHub account)

## Step 1: Files Already Prepared

The necessary files are already in your repo:
- `caption-server.py` - The Python server
- `requirements.txt` - Python dependencies (`youtube-transcript-api==0.6.2`)

## Step 2: Deploy to Render

### Quick Deploy Steps

1. **Go to Render.com** and sign in: https://render.com

2. **Create a New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your `baratie` repository

3. **Configure the Service**:

   **Basic Settings:**
   - **Name**: `baratie-caption-server` (or any name you prefer)
   - **Region**: Choose closest to your users
   - **Branch**: `master`
   - **Root Directory**: Leave blank (uses repo root)

   **Build & Deploy:**
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python caption-server.py`

   **Instance Type:**
   - Select **"Free"** (completely free, no credit card required)

4. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Wait 2-3 minutes for the first deployment

5. **Get Your URL**:
   - Once deployed, you'll see your service URL at the top
   - It will look like: `https://baratie-caption-server.onrender.com`
   - Copy this URL!

## Step 3: Update Your Vercel App

Once deployed, update the caption API URL in your app:

1. **Update `app/app.js`** around line 1640

   Change from:
   ```javascript
   const response = await fetch('/api/youtube-captions', {
   ```

   To your Render URL:
   ```javascript
   const response = await fetch('https://baratie-caption-server.onrender.com/api/youtube-captions', {
   ```

2. **Commit and push**:
   ```bash
   git add app/app.js
   git commit -m "Update caption server URL to Render"
   git push
   ```

## Step 4: Test the Integration

1. Go to your Vercel app
2. Try extracting a recipe from a YouTube video
3. Check Render logs if there are issues (in Render dashboard → Logs)

## Important Notes About Render Free Tier

### ⚠️ Free Tier Limitations

- **Spin Down**: Free services spin down after 15 minutes of inactivity
- **Cold Start**: First request after spin-down takes ~30-60 seconds to wake up
- **Workaround**: The app will handle this gracefully with a timeout/retry

### How to Handle Cold Starts

The cold start is normal for the free tier. Your app should:
- Show a loading message
- Have a reasonable timeout (60 seconds recommended)
- Fall back gracefully if caption server is waking up

### Upgrading (Optional)

If cold starts become an issue:
- Upgrade to Render's paid tier ($7/month)
- Always-on instances with no spin-down
- Faster response times

## Monitoring & Logs

### View Logs
1. Go to your Render dashboard
2. Click on your `baratie-caption-server` service
3. Click "Logs" tab
4. See real-time logs of caption requests

### Manual Restart
- Click "Manual Deploy" → "Deploy latest commit"

### View Metrics
- Dashboard shows CPU, memory, and bandwidth usage

## Troubleshooting

### Service won't start
- Check the "Logs" tab for errors
- Verify `requirements.txt` is correct
- Ensure `caption-server.py` uses PORT environment variable

### CORS errors
- The caption server already has CORS enabled
- If issues persist, check Render logs for actual errors

### Slow first request
- This is normal for free tier (cold start)
- Service spins down after 15 minutes of inactivity
- First request wakes it up (~30-60 seconds)

### 404 errors
- Make sure you're calling `/api/youtube-captions` (not just `/`)
- Verify the URL includes `https://`

## Environment Variables

Render automatically provides:
- `PORT` - The port your server should listen on (already configured)

No additional environment variables needed!

## Testing the Server Directly

You can test the server directly:

```bash
curl -X POST https://baratie-caption-server.onrender.com/api/youtube-captions \
  -H "Content-Type: application/json" \
  -d '{"videoId":"dQw4w9WgXcQ"}'
```

Should return JSON with captions if successful.

## Cost

✅ **Completely Free** with Render's free tier:
- 750 hours/month of runtime (enough for continuous operation)
- Automatic HTTPS
- No credit card required
- Perfect for personal projects

## Alternative: Keep Both Options

You can:
1. Use Render for production (free)
2. Keep the local Python server for development
3. Switch between them easily by changing one line in `app.js`

Local dev:
```javascript
const response = await fetch('http://localhost:8000/api/youtube-captions', {
```

Production (Render):
```javascript
const response = await fetch('https://baratie-caption-server.onrender.com/api/youtube-captions', {
```
