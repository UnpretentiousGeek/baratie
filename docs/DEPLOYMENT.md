# 🚀 Deployment Guide

Complete guide for deploying Baratie to Vercel and configuring the extension.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- API keys (Gemini and optionally YouTube)

## Step 1: Prepare Repository

1. **Ensure files are organized correctly**:
   ```
   baratie/
   ├── app/           # Web app files
   ├── extension/     # Chrome extension
   └── vercel.json    # Deployment config
   ```

2. **Verify `.gitignore` excludes `app/config.js`**

3. **Create `app/config.js.template`** (already done)

## Step 2: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files (config.js will be ignored)
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/baratie.git

# Push
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `baratie` repository
5. **Important**: Set **Root Directory** to `app`
   - Click "Edit" next to Root Directory
   - Enter: `app`
   - Click "Continue"
6. Configure:
   - Framework Preset: "Other"
   - Build Command: Leave empty (or use: `echo 'No build needed'`)
   - Output Directory: Leave empty (or use: `.`)
7. Click "Deploy"
8. Wait for deployment (usually < 1 minute)
9. Note your deployment URL: `https://baratie.vercel.app` (or custom domain)

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd app
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (choose your account)
# - Link to existing project? N
# - Project name? baratie
# - Directory? . (current directory)
# - Override settings? N
```

## Step 4: Configure Extension for Vercel

After deployment, update the extension to point to your Vercel URL:

1. **Edit `extension/popup.js`**:
   ```javascript
   const DEFAULT_VERCEL_PATH = 'https://your-app-name.vercel.app';
   ```

2. **Edit `extension/background.js`**:
   ```javascript
   const DEFAULT_VERCEL = 'https://your-app-name.vercel.app';
   ```

3. **Rebuild extension**:
   - Users can also configure it via extension settings

## Step 5: Configure API Keys

### For Local Development

1. Copy `app/config.js.template` to `app/config.js`
2. Add your API keys to `config.js`
3. **Never commit this file!**

### For Vercel (Optional)

Since this is a client-side app, environment variables are limited. Options:

**Option 1: Use config.js in production**
- Users will see API keys in browser (not ideal)
- Quickest to set up

**Option 2: Serverless Function Proxy**
- Create `api/proxy.js` that uses environment variables
- Proxy requests through your serverless function
- More secure but requires backend code

**Option 3: Embed in HTML**
- Use Vercel's environment variables in a build step
- Inject keys into HTML during build
- Requires build script

## Step 6: Test Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test recipe extraction:
   - Paste a recipe URL
   - Verify it works
3. Test extension:
   - Load extension
   - Configure path to Vercel URL
   - Test capture functionality

## Troubleshooting

### "Could not find valid recipe"
- Check API keys are set correctly
- Verify Gemini API has quota remaining
- Try a different recipe URL

### Extension not connecting
- Verify Vercel URL is correct
- Check browser console for errors
- Ensure CORS is configured (should work with Vercel)

### Vercel deployment fails
- Check Root Directory is set to `app`
- Verify `vercel.json` is in root
- Check build logs for errors

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Settings → Domains
3. Add your domain
4. Follow DNS configuration instructions
5. Update extension paths if needed

## Updating Deployment

Simply push to GitHub:

```bash
git add .
git commit -m "Update features"
git push origin main
```

Vercel will automatically redeploy!

## Environment Variables

To use environment variables in Vercel:

1. Go to Project Settings → Environment Variables
2. Add:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `YOUTUBE_API_KEY`: Your YouTube API key
3. Update code to read from `process.env` (requires build step)

Note: For client-side apps, env vars are injected at build time, not runtime.

## Monitoring

- Vercel dashboard shows deployment history
- Check "Analytics" for usage stats
- Monitor API usage in Google Cloud Console

## Cost Estimation

- **Vercel**: Free tier (100 GB bandwidth/month)
- **Gemini API**: Free tier (15 req/min Flash, 2 req/min Pro)
- **YouTube API**: Free tier (10,000 units/day)

For most personal use, everything stays within free tiers!

---

Need help? Open an issue on GitHub!

