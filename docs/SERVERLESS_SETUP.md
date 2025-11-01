# Serverless Setup Guide - Baratie

## Overview

Baratie now uses **Vercel Serverless Functions** to securely proxy API requests to Gemini AI and YouTube Data API. This keeps API keys completely hidden from client-side code.

## Architecture

```
Client (Browser)
    ↓ POST /api/gemini
Vercel Serverless Function (api/gemini.js)
    ↓ Uses process.env.GEMINI_API_KEY
Gemini AI API
    ↓ Response
Back to Client
```

### Benefits
- ✅ API keys never exposed in client code
- ✅ Keys never committed to git
- ✅ Secure environment variable storage
- ✅ Can add rate limiting, caching, analytics
- ✅ Free tier: 100,000 invocations/month

---

## Local Development Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Project (if not already linked)

```bash
vercel link
```

### 4. Set Environment Variables Locally

The `.env.local` file already contains your API keys for local testing:

```bash
# .env.local (already created)
GEMINI_API_KEY=your_gemini_key_here
YOUTUBE_API_KEY=your_youtube_key_here
```

### 5. Run Development Server

```bash
vercel dev
```

This starts a local server that emulates Vercel's production environment:
- Serves app from `app/` directory
- Runs serverless functions from `api/` directory
- Uses environment variables from `.env.local`

### 6. Test Locally

Open http://localhost:3000 and test:
- Recipe extraction from URL
- YouTube video extraction
- Chat assistant
- Macros calculation

---

## Production Deployment

### 1. Set Environment Variables in Vercel Dashboard

**IMPORTANT**: You must set these in Vercel Dashboard for production:

1. Go to https://vercel.com/dashboard
2. Select your **baratie-piece** project
3. Go to **Settings** → **Environment Variables**
4. Add the following:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `GEMINI_API_KEY` | `AIzaSyAjmU9e_CwJH1mEzK817vC-zPCDi1d73l0` | Production, Preview, Development |
| `YOUTUBE_API_KEY` | `AIzaSyCeP-CsUjZNBghyf2IRe5i3bnivduGNWhs` | Production, Preview, Development |

**Screenshot Guide:**
```
Settings → Environment Variables → Add New

Name:  GEMINI_API_KEY
Value: AIzaSyAjmU9e_CwJH1mEzK817vC-zPCDi1d73l0
[✓] Production
[✓] Preview
[✓] Development

[Save]
```

### 2. Deploy to Vercel

```bash
git add .
git commit -m "Migrate to serverless architecture"
git push
```

Vercel auto-deploys on push to main branch.

### 3. Verify Deployment

1. Visit https://baratie-piece.vercel.app
2. Open browser DevTools → Console
3. Try processing a recipe URL
4. Check that NO API keys appear in network requests
5. Verify `/api/gemini` and `/api/youtube` endpoints are called

---

## Testing Serverless Functions

### Test Gemini Endpoint

```bash
curl -X POST http://localhost:3000/api/gemini \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Extract recipe from: Ingredients: flour, eggs. Instructions: Mix and bake.",
    "model": "gemini-2.0-flash"
  }'
```

### Test YouTube Endpoint

```bash
curl -X POST http://localhost:3000/api/youtube \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "videos",
    "params": {
      "part": "snippet",
      "id": "dQw4w9WgXcQ"
    }
  }'
```

---

## API Endpoint Reference

### `/api/gemini`

**Method**: POST

**Request Body**:
```json
{
  "prompt": "Your prompt text here",
  "method": "generateContent",  // optional, default: generateContent
  "model": "gemini-2.0-flash"   // optional, default: from CONFIG
}
```

**Response**: Gemini AI JSON response

**Errors**:
- 400: Missing prompt
- 500: Server configuration error (API key not set)
- 500: Gemini API error

---

### `/api/youtube`

**Method**: POST

**Request Body**:
```json
{
  "endpoint": "videos",  // or "commentThreads"
  "params": {
    "part": "snippet",
    "id": "VIDEO_ID"
  }
}
```

**Allowed Endpoints**:
- `videos` - Get video details
- `commentThreads` - Get video comments

**Response**: YouTube API JSON response

**Errors**:
- 400: Missing endpoint or invalid endpoint
- 500: Server configuration error (API key not set)
- 500: YouTube API error

---

## Troubleshooting

### "API key not set" Error

**Problem**: Serverless function can't find environment variables

**Local Development**:
1. Check `.env.local` exists in project root
2. Restart `vercel dev`

**Production**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify `GEMINI_API_KEY` and `YOUTUBE_API_KEY` are set
3. Redeploy the project

---

### CORS Errors

**Problem**: Browser blocking cross-origin requests

**Solution**: Already handled! Headers are set in:
- `vercel.json` (for all `/api/*` routes)
- Each serverless function (OPTIONS preflight handling)

---

### Function Timeout

**Problem**: Serverless function times out (>30 seconds)

**Solution**:
- Default timeout is 30s (configured in `vercel.json`)
- For Hobby plan (free): Max 10 seconds
- For Pro plan: Max 60 seconds

If Gemini/YouTube takes too long:
1. Check API quotas
2. Simplify prompts
3. Upgrade Vercel plan

---

### Network Tab Shows Direct API Calls

**Problem**: Still calling Gemini/YouTube directly

**Solution**:
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard refresh (Ctrl+F5)
3. Check `app.js` was updated correctly
4. Verify no old cached service workers

---

## Security Best Practices

### 1. API Key Restrictions

Even though keys are hidden, add domain restrictions:

**Gemini API Key**:
1. Go to https://makersuite.google.com/app/apikey
2. Click your key → Edit
3. Add **HTTP referrers**:
   - `https://baratie-piece.vercel.app/*`
   - `http://localhost:3000/*`

**YouTube API Key**:
1. Go to https://console.cloud.google.com/apis/credentials
2. Click your key → Edit
3. Add **HTTP referrers**:
   - `https://baratie-piece.vercel.app/*`
   - `http://localhost:3000/*`
4. Set **API restrictions** → Only YouTube Data API v3

### 2. Rate Limiting (Future Enhancement)

Add rate limiting to serverless functions:
```javascript
// api/gemini.js
const rateLimit = new Map();

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Allow 10 requests per minute per IP
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000);

  if (recentRequests.length >= 10) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);

  // Continue with normal handler...
}
```

---

## Migration Checklist

- [x] Created `/api/gemini.js` serverless function
- [x] Created `/api/youtube.js` serverless function
- [x] Created `package.json`
- [x] Updated `vercel.json` with API routing
- [x] Updated `app/config.prod.js` to remove API keys
- [x] Updated `app/app.js` to call serverless endpoints
- [x] Updated `app/index.html` to simplify config loading
- [x] Created `.env.local` for local development
- [x] Added `.env.local` to `.gitignore`
- [ ] Set environment variables in Vercel Dashboard
- [ ] Removed API keys from git history
- [ ] Deployed to Vercel
- [ ] Tested production deployment

---

## File Structure

```
baratie/
├── api/                          # Serverless functions
│   ├── gemini.js                # Gemini AI proxy
│   └── youtube.js               # YouTube Data API proxy
├── app/                          # Client-side app (static)
│   ├── index.html               # Main HTML (updated)
│   ├── app.js                   # App logic (updated API calls)
│   ├── config.prod.js           # Config (NO keys, safe to commit)
│   └── ...
├── docs/                         # Documentation
│   ├── SERVERLESS_SETUP.md      # This file
│   └── DEPLOYMENT.md            # Deployment guide
├── .env.local                    # Local env vars (NOT committed)
├── .gitignore                    # Excludes .env.local, config.js
├── package.json                  # Node.js config
├── vercel.json                   # Vercel config (API routing, headers)
└── README.md                     # Project readme
```

---

## Cost Estimation

### Vercel Hobby Plan (Free)
- **Bandwidth**: 100 GB/month
- **Serverless Executions**: 100,000 invocations/month
- **Function Duration**: 10 seconds max per function

### Estimated Usage (1000 users/month)
- Recipe extractions: ~1000 Gemini calls
- YouTube videos: ~500 YouTube calls
- Chat messages: ~2000 Gemini calls
- **Total**: ~3500 invocations/month

**Conclusion**: Free tier is more than enough for personal/hobby use!

---

## Support

If you encounter issues:

1. Check this guide first
2. Review [DEPLOYMENT.md](DEPLOYMENT.md)
3. Check Vercel deployment logs
4. Check browser DevTools console
5. Test serverless functions locally with `vercel dev`

## Further Reading

- [Vercel Serverless Functions Docs](https://vercel.com/docs/functions)
- [Environment Variables on Vercel](https://vercel.com/docs/projects/environment-variables)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
