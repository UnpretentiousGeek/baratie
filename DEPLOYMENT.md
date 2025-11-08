# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you don't have one
2. **Vercel CLI**: Install globally (optional, but recommended)
   ```bash
   yarn global add vercel
   # or
   npm install -g vercel
   ```

## Deployment Methods

### Method 1: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

   Or for a preview deployment:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Confirm build settings (should auto-detect)
   - Confirm environment variables

### Method 2: Deploy via GitHub Integration

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Convert to React/TypeScript"
   git push origin main
   ```

2. **Import Project in Vercel Dashboard**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the settings

3. **Configure Build Settings** (should auto-detect):
   - Framework Preset: Vite
   - Build Command: `yarn build`
   - Output Directory: `dist`
   - Install Command: `yarn install`

## Environment Variables

**CRITICAL**: Set these environment variables in Vercel dashboard:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```

4. **Apply to all environments** (Production, Preview, Development)

### Getting API Keys

- **Gemini API Key**: https://makersuite.google.com/app/apikey
- **YouTube API Key**: https://console.cloud.google.com/apis/credentials

## Updating an Existing Deployment

### Option 1: Automatic (GitHub Integration)
- Just push to your main branch:
  ```bash
  git add .
  git commit -m "Update app"
  git push origin main
  ```
- Vercel will automatically deploy

### Option 2: Manual CLI Update
```bash
vercel --prod
```

### Option 3: Redeploy from Dashboard
- Go to Vercel Dashboard → Your Project → Deployments
- Click "Redeploy" on the latest deployment

## Verifying Deployment

1. **Check Build Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on a deployment to see build logs

2. **Test the API**:
   - Visit: `https://your-project.vercel.app/api/gemini`
   - Should return an error (expected without POST data)
   - If you get 500 error about API key, check environment variables

3. **Test the App**:
   - Visit: `https://your-project.vercel.app`
   - Should load the React app

## Troubleshooting

### Build Fails
- Check Node.js version (should be >= 18.x)
- Verify `package.json` has correct build script
- Check build logs in Vercel dashboard

### API Functions Not Working
- Verify environment variables are set correctly
- Check function logs in Vercel dashboard
- Ensure API keys are valid

### 404 Errors on Routes
- Verify `vercel.json` rewrites are correct
- Check that `dist/index.html` exists after build

## Project Configuration

Your `vercel.json` is already configured with:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ API routes: `/api/*` → `/api/*`
- ✅ SPA routing: All routes → `/index.html`
- ✅ CORS headers for API
- ✅ Security headers

## Next Steps After Deployment

1. **Set Custom Domain** (optional):
   - Settings → Domains → Add your domain

2. **Enable Analytics** (optional):
   - Settings → Analytics → Enable

3. **Set up Preview Deployments**:
   - Automatically creates preview URLs for pull requests

