# YouTube API Setup Guide

Complete instructions for enabling YouTube recipe extraction in Baratie.

## Why YouTube API?

YouTube recipe videos often have detailed recipes in:
- **Video Description** - Full ingredient lists and instructions
- **Pinned Comments** - Updated recipes or corrections from the creator

This feature automatically extracts recipes from both sources!

---

## Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" dropdown at the top
   - Click "New Project"
   - Project name: `Baratie-Recipe-App` (or any name)
   - Click "Create"

3. **Wait for project creation** (takes ~10 seconds)

### Step 2: Enable YouTube Data API v3

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" → "Library"
   - Or go to: https://console.cloud.google.com/apis/library

2. **Search for YouTube API**
   - In the search bar, type "YouTube Data API v3"
   - Click on "YouTube Data API v3" from results

3. **Enable the API**
   - Click the blue "Enable" button
   - Wait for activation (~5 seconds)

### Step 3: Create API Credentials

1. **Go to Credentials Page**
   - Click "APIs & Services" → "Credentials"
   - Or go to: https://console.cloud.google.com/apis/credentials

2. **Create API Key**
   - Click "+ CREATE CREDENTIALS" at the top
   - Select "API key"
   - Your API key will be generated immediately

3. **Copy Your API Key**
   - A popup shows your key (looks like: `AIzaSyB...`)
   - Click the copy button
   - **Important**: Save this somewhere safe!

### Step 4: (Optional but Recommended) Restrict Your API Key

1. **Click "Edit API key"** in the popup
   - Or find your key in the credentials list and click the pencil icon

2. **API Restrictions**
   - Under "API restrictions", select "Restrict key"
   - Check only: **YouTube Data API v3**
   - This prevents misuse of your key

3. **Application Restrictions** (Optional)
   - For better security, you can restrict by:
     - HTTP referrers (if hosting online)
     - IP addresses (if using from specific location)
   - For local development, you can leave this as "None"

4. **Save** your changes

### Step 5: Configure Baratie

1. **Open config.js**
   - Navigate to your Baratie project folder
   - Open `config.js` in a text editor

2. **Add Your YouTube API Key**

   Find this line:
   ```javascript
   YOUTUBE_API_KEY: 'YOUR_YOUTUBE_API_KEY_HERE',
   ```

   Replace with your actual key:
   ```javascript
   YOUTUBE_API_KEY: 'AIzaSyB...',  // Your actual YouTube API key
   ```

3. **Save the file**

### Step 6: Test It Out!

1. **Open index.html** in your browser

2. **Try these YouTube recipe URLs:**
   - https://www.youtube.com/watch?v=VIDEO_ID
   - https://youtu.be/VIDEO_ID
   - Any YouTube Shorts recipe URL

3. **Paste URL and click "Process Recipe"**

4. **If successful, you'll see:**
   - Recipe extracted from video description/comments
   - Title from video
   - All ingredients and instructions parsed

---

## API Usage & Quotas

### Free Tier Limits

YouTube Data API v3 has generous free quotas:
- **10,000 units per day** (free forever)
- Each request costs:
  - Video details: 1 unit
  - Comments: 1 unit
  - **Total per recipe extraction: 2 units**

### What This Means

- You can process **5,000 YouTube recipes per day** for free!
- That's approximately **150,000 recipes per month**
- More than enough for personal use

### Quota Monitoring

Check your usage:
1. Go to: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
2. View daily usage graph
3. Set up alerts if needed

---

## Supported YouTube URL Formats

The app automatically detects and handles:

✅ **Standard URLs**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

✅ **Short URLs**
```
https://youtu.be/dQw4w9WgXcQ
```

✅ **YouTube Shorts**
```
https://www.youtube.com/shorts/ABC123xyz
```

✅ **Embed URLs**
```
https://www.youtube.com/embed/dQw4w9WgXcQ
```

---

## How It Works

### Extraction Flow

```
1. User pastes YouTube URL
   ↓
2. App detects it's YouTube
   ↓
3. Extracts video ID from URL
   ↓
4. Parallel API calls:
   - Fetch video details (title, description)
   - Fetch comments (look for pinned/creator comment)
   ↓
5. Combine description + pinned comment
   ↓
6. Send to Gemini AI for recipe extraction
   ↓
7. Display structured recipe
```

### What Gets Extracted

**From Video Description:**
- Full ingredient list
- Step-by-step instructions
- Serving size
- Cooking notes

**From Pinned Comment:**
- Recipe updates or corrections
- Alternative measurements
- Additional tips
- Ingredient substitutions

**Priority:** If both description and pinned comment have recipes, both are sent to Gemini which intelligently combines them.

---

## Troubleshooting

### "Please set your YouTube API key"

**Problem:** API key not configured

**Solution:**
- Make sure you saved `config.js` after editing
- Check that key doesn't have quotes around it
- Verify key starts with `AIza`
- Refresh browser (Ctrl+F5 or Cmd+Shift+R)

### "YouTube API error: 403"

**Problem:** API key not authorized or quota exceeded

**Solutions:**
1. **Check if YouTube Data API v3 is enabled:**
   - Go to: https://console.cloud.google.com/apis/library
   - Search "YouTube Data API v3"
   - Make sure it says "Manage" (not "Enable")

2. **Check API key restrictions:**
   - Go to credentials page
   - Make sure "YouTube Data API v3" is in allowed APIs

3. **Check quota:**
   - Go to quotas page
   - See if you've hit daily limit (10,000 units)

### "Video not found or is private/unavailable"

**Problem:** Video is private, unlisted, or deleted

**Solution:**
- Try a different public video
- Make sure video URL is correct
- Some videos restrict API access

### "No recipe content found in video description or pinned comment"

**Problem:** Video doesn't have recipe in description/comments

**Solution:**
- Check if recipe is actually in description
- Look for recipes in video timestamps (not yet supported)
- Try a different video with clear recipe text

### Comments Extraction Failed

**Problem:** Comments might be disabled on video

**Solution:**
- App will still extract from description only
- This is normal - many videos disable comments
- Recipe can still be found from description

---

## Security Best Practices

### Protecting Your YouTube API Key

1. **Never commit to Git**
   ```gitignore
   config.js
   .env
   ```

2. **Don't share screenshots** with API key visible

3. **Regenerate if exposed**
   - Go to Google Cloud Console
   - Delete compromised key
   - Create a new one

4. **Use API restrictions**
   - Restrict to YouTube Data API v3 only
   - Add HTTP referrer restrictions if hosting online

### Rate Limiting

The app doesn't currently implement rate limiting, but you can:
- Track your own usage
- Add delays between requests
- Cache processed recipes locally

---

## Advanced Configuration

### Change Comment Search Behavior

In `app.js`, modify `fetchYouTubePinnedComment()`:

```javascript
// Get more comments (default is 10)
const endpoint = `${this.youtubeApiUrl}/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&...`;

// Change comment ordering
// Options: time, relevance
&order=time  // Most recent first
&order=relevance  // Most relevant (default)
```

### Extract Video Transcript (Future Feature)

Currently not implemented, but you could add:
- Captions/subtitles extraction
- Timestamp-based recipe extraction
- Auto-generated transcript parsing

---

## Cost Considerations

### Will This Cost Me Money?

**No!** The free tier is very generous:
- 10,000 units/day = ~5,000 recipes/day
- Reset every 24 hours
- No credit card required
- Free forever

### When Would I Need to Pay?

Only if you:
- Process more than 5,000 YouTube recipes per day
- Build a public service with thousands of users
- Need higher quotas for commercial use

**For personal recipe management:** You'll never hit the limit.

---

## Testing Checklist

- [ ] Created Google Cloud project
- [ ] Enabled YouTube Data API v3
- [ ] Created and copied API key
- [ ] Configured `config.js` with API key
- [ ] Tested with a YouTube recipe video
- [ ] Recipe extracted successfully
- [ ] Verified description content appears
- [ ] Checked if pinned comment was included

---

## Example YouTube Recipe Channels

Try these popular channels (they usually have recipes in descriptions):

- **Binging with Babish** - Detailed recipes in descriptions
- **Joshua Weissman** - Recipes in pinned comments
- **Tasty** - Short-form recipes in descriptions
- **Chef John (Food Wishes)** - Full recipes in descriptions

---

**Last Updated:** 2025-10-30
**API Version:** YouTube Data API v3
