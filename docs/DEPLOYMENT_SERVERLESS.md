# 🚀 Serverless Deployment Guide - Baratie

Complete guide for deploying Baratie with secure serverless architecture to Vercel.

## Quick Start

```bash
# 1. Set environment variables in Vercel Dashboard
# 2. Commit and push
git add .
git commit -m "Deploy with serverless architecture"
git push

# 3. Vercel auto-deploys
# 4. Test at https://baratie-piece.vercel.app
```

---

## Prerequisites

- ✅ GitHub account
- ✅ Vercel account (free tier works)
- ✅ Gemini API key
- ✅ YouTube Data API v3 key
- ✅ Git installed locally

---

## Step 1: Set Vercel Environment Variables

**CRITICAL**: You must set these BEFORE deploying

### 1.1 Go to Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Select your **baratie-piece** project
3. Go to **Settings** → **Environment Variables**

### 1.2 Add Environment Variables

Click "Add New" and add these two variables:

#### Variable 1: GEMINI_API_KEY

```
Name:  GEMINI_API_KEY
Value: AIzaSyAjmU9e_CwJH1mEzK817vC-zPCDi1d73l0

Environments:
☑ Production
☑ Preview
☑ Development
```

Click **Save**

#### Variable 2: YOUTUBE_API_KEY

```
Name:  YOUTUBE_API_KEY
Value: AIzaSyCeP-CsUjZNBghyf2IRe5i3bnivduGNWhs

Environments:
☑ Production
☑ Preview
☑ Development
```

Click **Save**

### 1.3 Verify

You should see:
```
Environment Variables (2)
├── GEMINI_API_KEY  (Production, Preview, Development)
└── YOUTUBE_API_KEY (Production, Preview, Development)
```

---

## Step 2: Commit Serverless Changes

```bash
# Check what's changed
git status

# Should show:
# - api/gemini.js (new file)
# - api/youtube.js (new file)
# - package.json (new file)
# - vercel.json (modified)
# - app/config.prod.js (modified - NO keys now)
# - app/app.js (modified - uses endpoints)
# - app/index.html (modified)
# - docs/ (new documentation)

# Stage all changes
git add .

# Commit
git commit -m "Migrate to serverless architecture - secure API keys"

# Push to GitHub
git push
```

---

## Step 3: Vercel Auto-Deploys

Vercel automatically detects the push and deploys:

1. **Build starts**: Vercel detects changes
2. **Serverless functions compiled**: `api/*.js` → Vercel Functions
3. **Static files deployed**: `app/` → CDN
4. **Environment variables injected**: From Step 1
5. **Deployment complete**: ~30-60 seconds

### Monitor Deployment

1. Go to Vercel Dashboard → your project
2. Click **Deployments** tab
3. Watch real-time logs

---

## Step 4: Verify Deployment

### 4.1 Visit Site

Open https://baratie-piece.vercel.app

### 4.2 Test Recipe Extraction

1. Enter a recipe URL (e.g., from AllRecipes)
2. Click "Process Recipe"
3. Should extract recipe successfully

### 4.3 Verify Security

Open browser DevTools (F12) → Network tab:

**✅ Good** (What you should see):
```
POST /api/gemini
POST /api/youtube
```

**❌ Bad** (What you should NOT see):
```
POST https://generativelanguage.googleapis.com/...?key=AIzaSy...
GET https://www.googleapis.com/youtube/v3/...?key=AIzaSy...
```

If you see direct API calls with keys, clear cache and hard refresh (Ctrl+Shift+R).

### 4.4 View Source

Right-click page → **View Page Source**

Search for `AIzaSy`:
- **✅ Should find**: 0 results
- **❌ If found**: API keys are exposed (wrong config loaded)

---

## Step 5: Update Extension

Update extension to point to new serverless deployment:

### 5.1 Extension Already Updated

If you followed earlier steps, extension files already have:
- `popup.js`: `DEFAULT_VERCEL_PATH = 'https://baratie-piece.vercel.app'`
- `background.js`: Same
- `manifest.json`: Includes Vercel domain in permissions

### 5.2 Reload Extension

1. Go to `chrome://extensions/`
2. Find "Baratie Recipe Capture"
3. Click 🔄 **Reload**

### 5.3 Test Extension

1. Visit a recipe website
2. Click extension icon
3. Capture a recipe
4. Should open Vercel site and process

---

## Troubleshooting

### Error: "API key not set"

**Problem**: Serverless function can't find environment variables

**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify both keys are set
3. Click **Redeploy** (Deployments → ⋯ → Redeploy)

---

### Error: "CONFIG is not defined"

**Problem**: Client can't load config file

**Solution**:
1. Check `app/config.prod.js` is deployed
2. Hard refresh browser (Ctrl+Shift+R)
3. Check Vercel deployment logs for errors

---

### Error: CORS blocked

**Problem**: Browser blocking API requests

**Solution**: Should be fixed automatically by `vercel.json` headers. If not:
1. Check `vercel.json` has CORS headers for `/api/*`
2. Redeploy project
3. Clear browser cache

---

### Function timeout

**Problem**: Serverless function takes >10 seconds (Hobby plan limit)

**Solution**:
1. Check Gemini/YouTube API status
2. Simplify prompts (reduce token count)
3. Check API quotas aren't exceeded
4. Upgrade to Vercel Pro (60s timeout)

---

### Still seeing API keys in browser

**Problem**: Old cached files

**Solution**:
```bash
# Clear browser cache
Ctrl + Shift + Del → Clear browsing data

# Hard refresh
Ctrl + Shift + R

# Check what's actually deployed
https://baratie-piece.vercel.app/config.prod.js

# Should show NO API keys (endpoints instead)
```

---

## Local Development

For local testing with serverless functions:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Run local dev server
vercel dev

# Open http://localhost:3000
# Serverless functions run locally
# Uses .env.local for environment variables
```

See [SERVERLESS_SETUP.md](SERVERLESS_SETUP.md) for detailed local dev guide.

---

## Security Checklist

- [ ] Environment variables set in Vercel Dashboard
- [ ] NO API keys in `app/config.prod.js`
- [ ] NO API keys in git history (see [GIT_CLEANUP.md](GIT_CLEANUP.md))
- [ ] View source shows NO `AIzaSy` patterns
- [ ] Network tab shows `/api/gemini` and `/api/youtube` calls
- [ ] Gemini API key has HTTP referrer restrictions
- [ ] YouTube API key has HTTP referrer restrictions
- [ ] Repository `.gitignore` excludes `.env.local` and `app/config.js`

---

## Deployment Checklist

### Pre-Deployment
- [ ] Serverless functions created (`api/gemini.js`, `api/youtube.js`)
- [ ] `package.json` exists
- [ ] `vercel.json` configured for API routing
- [ ] `app/config.prod.js` has NO API keys
- [ ] `app/app.js` updated to call `/api/*` endpoints
- [ ] `.env.local` created for local dev
- [ ] `.gitignore` excludes sensitive files

### Vercel Configuration
- [ ] Vercel account created
- [ ] Project connected to GitHub repo
- [ ] `GEMINI_API_KEY` environment variable set
- [ ] `YOUTUBE_API_KEY` environment variable set
- [ ] Environment variables applied to Production, Preview, Development

### Deployment
- [ ] Changes committed to git
- [ ] Changes pushed to GitHub
- [ ] Vercel auto-deployment triggered
- [ ] Deployment succeeded (check dashboard)
- [ ] Site accessible at https://baratie-piece.vercel.app

### Testing
- [ ] Recipe extraction works
- [ ] YouTube video extraction works
- [ ] Chat assistant works
- [ ] Macros calculation works
- [ ] Extension captures recipes correctly
- [ ] NO API keys visible in browser source/network

### Post-Deployment
- [ ] API keys rotated (if they were previously public)
- [ ] Gemini API key restrictions added
- [ ] YouTube API key restrictions added
- [ ] Documentation updated
- [ ] Team notified (if applicable)

---

## Cost Breakdown

### Vercel Hobby Plan (Free)
- ✅ 100GB bandwidth/month
- ✅ 100,000 serverless invocations/month
- ✅ 10 second max function duration
- ✅ Unlimited static requests
- ✅ Automatic HTTPS
- ✅ GitHub integration

### Expected Usage (1000 active users/month)
- Recipe extractions: ~2,000 requests
- YouTube videos: ~1,000 requests
- Chat messages: ~3,000 requests
- Macros calculations: ~1,500 requests
- **Total**: ~7,500 invocations/month

**Result**: Well within free tier limits!

---

## Next Steps

1. ✅ Deploy to Vercel (you're here!)
2. 📝 [Clean git history](GIT_CLEANUP.md) to remove old API keys
3. 🔒 [Add API key restrictions](SERVERLESS_SETUP.md#security-best-practices)
4. 📱 Test extension on multiple browsers
5. 📊 Monitor usage in Vercel Dashboard

---

## Support

- **Deployment Issues**: Check Vercel deployment logs
- **API Errors**: Check browser console (F12)
- **Serverless Functions**: See [SERVERLESS_SETUP.md](SERVERLESS_SETUP.md)
- **Git History Cleanup**: See [GIT_CLEANUP.md](GIT_CLEANUP.md)
- **Extension Issues**: See [extension/README.md](../extension/README.md)

---

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Gemini API Docs](https://ai.google.dev/docs)
- [YouTube Data API Docs](https://developers.google.com/youtube/v3)

