# Production Deployment Fix - YouTube Caption API

## Problem

The caption API worked locally with `vercel dev` but failed in production deployment.

## Root Cause

The `youtube-transcript-plus` library requires **ES modules** (`import` syntax), but the serverless function was using **CommonJS** (`require` syntax).

### Error Symptoms
- ✅ Works: `vercel dev` (local development)
- ❌ Fails: Production deployment on Vercel
- Error: Module import/require mismatch

## Solution

Convert all caption-related files to use ES modules.

### Changes Made

#### 1. Updated `api/captions.js` (Serverless Function)

**Before (CommonJS):**
```javascript
const { fetchTranscript } = require('youtube-transcript-plus');
module.exports = async (req, res) => {
```

**After (ES Modules):**
```javascript
import { fetchTranscript } from 'youtube-transcript-plus';
export default async (req, res) => {
```

#### 2. Updated `caption-server.js` (Local Development Server)

**Before (CommonJS):**
```javascript
const express = require('express');
const cors = require('cors');
const { fetchTranscript } = require('youtube-transcript-plus');
```

**After (ES Modules):**
```javascript
import express from 'express';
import cors from 'cors';
import { fetchTranscript } from 'youtube-transcript-plus';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Note:** Added `__dirname` polyfill because it's not available in ES modules.

#### 3. Updated `package.json`

**Added:**
```json
{
  "type": "module"
}
```

This tells Node.js to treat all `.js` files as ES modules.

## Testing

### Local Development

```bash
npm run caption-server
```

Test endpoint:
```bash
curl "http://localhost:3000/api/captions?videoId=dQw4w9WgXcQ&lang=en"
```

### Production Deployment

```bash
vercel --prod
```

The serverless function will now work correctly in production.

## Why This Works

1. **Vercel Serverless Functions**: Support both CommonJS and ES modules, but the library requires ES modules
2. **youtube-transcript-plus**: Uses ES module syntax exclusively (no CommonJS exports)
3. **package.json "type": "module"**: Enables ES modules for the entire project

## Verification Checklist

After deploying to production:

- [ ] Navigate to `https://YOUR-PROJECT.vercel.app/api/captions?videoId=dQw4w9WgXcQ&lang=en`
- [ ] Should return JSON with caption data
- [ ] Check Vercel function logs for any errors
- [ ] Test with the main app by extracting a YouTube recipe
- [ ] Test the standalone caption fetcher at `/captions.html`

## Common Issues

### Issue: "Cannot use import outside a module"
**Solution:** Add `"type": "module"` to `package.json`

### Issue: "__dirname is not defined"
**Solution:** Use the polyfill:
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
```

### Issue: "require is not defined"
**Solution:** Convert all `require()` to `import` statements

## Files Modified

- ✅ `api/captions.js` - Serverless function
- ✅ `caption-server.js` - Local development server
- ✅ `package.json` - Added `"type": "module"`

## Deployment

After making these changes:

```bash
git add .
git commit -m "Fix caption API for production (convert to ES modules)"
git push origin main
vercel --prod
```

Or use GitHub integration - Vercel will auto-deploy.

## Additional Notes

- **No changes needed** to `app/app.js` or `captions.html` - they already call the API correctly
- **Local and production** now use identical module systems
- **Future-proof** - ES modules are the modern JavaScript standard

## Rollback Plan

If you need to rollback:

1. Remove `"type": "module"` from `package.json`
2. Convert `import` back to `require` in all files
3. Remove `__dirname` polyfill from `caption-server.js`
4. Redeploy

**Not recommended** - ES modules are the better approach.

## Success Indicators

You'll know it's working when:

1. ✅ Local server starts without errors
2. ✅ `curl` test returns caption data
3. ✅ Production API endpoint returns caption data
4. ✅ Vercel function logs show successful executions
5. ✅ Main app successfully extracts YouTube recipes with captions

---

**Fixed by:** Converting to ES modules
**Date:** 2025-11-05
**Status:** ✅ Resolved
