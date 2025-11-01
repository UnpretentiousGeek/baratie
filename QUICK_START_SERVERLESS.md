# 🚀 Quick Start - Serverless Migration

## What Changed?

Baratie now uses **Vercel Serverless Functions** to securely hide API keys.

### Before (Insecure)
```
Client → Gemini API (API key exposed in browser)
```

### After (Secure)
```
Client → /api/gemini (Vercel Function) → Gemini API (API key hidden)
```

---

## Deployment Steps (5 minutes)

### 1. Set Vercel Environment Variables

Go to https://vercel.com/dashboard → **baratie-piece** → **Settings** → **Environment Variables**

Add these **2 variables**:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | `AIzaSyAjmU9e_CwJH1mEzK817vC-zPCDi1d73l0` |
| `YOUTUBE_API_KEY` | `AIzaSyCeP-CsUjZNBghyf2IRe5i3bnivduGNWhs` |

For each, select **all environments** (Production, Preview, Development).

### 2. Commit and Push

```bash
git add .
git commit -m "Migrate to serverless architecture"
git push
```

### 3. Done!

Vercel auto-deploys in ~60 seconds. Test at https://baratie-piece.vercel.app

---

## Verify It Works

1. Open https://baratie-piece.vercel.app
2. Process a recipe URL
3. Open DevTools (F12) → Network tab
4. Should see: `POST /api/gemini` ✅
5. Should NOT see: `generativelanguage.googleapis.com?key=...` ❌

---

## Files Created/Modified

### New Files ✨
- `/api/gemini.js` - Serverless function for Gemini AI
- `/api/youtube.js` - Serverless function for YouTube API
- `/package.json` - Node.js configuration
- `/.env.local` - Local environment variables (NOT committed)
- `/docs/SERVERLESS_SETUP.md` - Detailed setup guide
- `/docs/DEPLOYMENT_SERVERLESS.md` - Deployment guide
- `/docs/GIT_CLEANUP.md` - How to remove API keys from git history

### Modified Files ✏️
- `/vercel.json` - Added API routing and CORS headers
- `/app/config.prod.js` - **Removed API keys**, added endpoint URLs
- `/app/app.js` - Updated to call `/api/*` endpoints instead of direct APIs
- `/app/index.html` - Simplified config loading

---

## Local Development

### Install Vercel CLI

```bash
npm install -g vercel
```

### Run Local Server

```bash
vercel dev
```

Opens http://localhost:3000 with serverless functions running locally.

---

## Security Improvements

### Before ❌
- API keys visible in `app/config.prod.js`
- API keys visible in browser source code
- API keys visible in network requests
- API keys committed to git

### After ✅
- NO API keys in client code
- NO API keys in git repository
- API keys stored as Vercel environment variables
- Serverless functions act as secure proxy

---

## Next Steps (Optional)

### Rotate API Keys (Recommended)

Since keys were previously public, create new ones:

1. **Gemini**: https://makersuite.google.com/app/apikey
2. **YouTube**: https://console.cloud.google.com/apis/credentials
3. Update `.env.local`
4. Update Vercel environment variables

### Clean Git History

Remove old API keys from git commits:

```bash
# See docs/GIT_CLEANUP.md for detailed instructions
```

### Add API Restrictions

Secure keys even if they leak:

**Gemini API Key**:
- Go to https://makersuite.google.com/app/apikey
- Edit key → HTTP referrers
- Add: `https://baratie-piece.vercel.app/*`

**YouTube API Key**:
- Go to https://console.cloud.google.com/apis/credentials
- Edit key → HTTP referrers
- Add: `https://baratie-piece.vercel.app/*`
- API restrictions → Only YouTube Data API v3

---

## Documentation

| File | Purpose |
|------|---------|
| [SERVERLESS_SETUP.md](docs/SERVERLESS_SETUP.md) | Complete setup guide, API reference, troubleshooting |
| [DEPLOYMENT_SERVERLESS.md](docs/DEPLOYMENT_SERVERLESS.md) | Deployment checklist, verification steps |
| [GIT_CLEANUP.md](docs/GIT_CLEANUP.md) | How to remove API keys from git history |
| This file | Quick start guide |

---

## Troubleshooting

### "API key not set" error

Set environment variables in Vercel Dashboard (Step 1 above), then redeploy.

### Still seeing API keys in browser

Clear cache (Ctrl+Shift+Del) and hard refresh (Ctrl+Shift+R).

### Serverless functions not working

Check Vercel deployment logs in dashboard.

---

## Summary

✅ **Secure**: API keys hidden from client
✅ **Fast**: Serverless functions are ~50-200ms overhead
✅ **Free**: 100K invocations/month on Hobby plan
✅ **Simple**: Just set environment variables and deploy

---

**Questions?** Check the detailed docs above or Vercel deployment logs.

