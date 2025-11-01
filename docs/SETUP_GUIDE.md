# Baratie Setup Guide

Complete setup instructions for getting Baratie up and running with Gemini AI.

## Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Google account (for Gemini API access)
- Text editor (VS Code, Notepad++, or any code editor)

## Step-by-Step Setup

### Step 1: Get Your Gemini API Key

1. **Visit Google AI Studio**
   - Go to: https://makersuite.google.com/app/apikey
   - Or search "Google AI Studio API Key"

2. **Sign In**
   - Use your Google account to sign in
   - Accept any terms of service if prompted

3. **Create API Key**
   - Click the "Create API Key" button
   - Choose "Create API key in new project" (recommended for first-time users)
   - Or select an existing Google Cloud project

4. **Copy Your Key**
   - Your API key will be displayed (looks like: `AIzaSyC...`)
   - Click the copy button or select and copy the entire key
   - **Important**: Keep this key secure and never share it publicly

### Step 2: Configure Baratie

1. **Open the config.js file**
   - Navigate to your Baratie project folder
   - Open `config.js` in your text editor

2. **Replace the placeholder**

   Change this line:
   ```javascript
   GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
   ```

   To this (with your actual key):
   ```javascript
   GEMINI_API_KEY: 'AIzaSyC...',  // Your actual API key
   ```

3. **Choose your model** (optional)

   You can select between two models:

   - **gemini-1.5-flash** (default) - Faster, cheaper, good quality
   - **gemini-1.5-pro** - Slower, more expensive, better quality

   To change the model:
   ```javascript
   GEMINI_MODEL: 'gemini-1.5-pro',
   ```

4. **Save the file**

### Step 3: Test the Application

1. **Open index.html**
   - Double-click `index.html` in your file explorer
   - Or right-click → Open With → Your browser

2. **Test Recipe Extraction**
   - Try these test URLs:
     - https://www.allrecipes.com/recipe/12998/spaghetti-carbonara-ii/
     - https://www.seriouseats.com/italian-carbonara-recipe
     - Any recipe blog post URL

3. **Paste URL and Process**
   - Paste a recipe URL into the input field
   - Click "Process Recipe"
   - Wait 5-10 seconds for AI extraction

4. **If successful, you should see:**
   - "Recipe extracted successfully!" message
   - Preview of the recipe with ingredients
   - "Start Cooking" button

5. **Test Chat Assistant**
   - Click "Start Cooking"
   - Scroll to the chat at the bottom
   - Ask a question like "What can I substitute for eggs?"
   - You should get a helpful AI response

## Troubleshooting

### "Please set your Gemini API key" Error

**Problem**: You see an error about the API key

**Solutions**:
- Make sure you saved `config.js` after editing
- Check that you removed the quotes around the key
- Verify the key starts with `AIza` and has no spaces
- Refresh the browser page (Ctrl+F5 or Cmd+Shift+R)

### "Failed to fetch URL content" Error

**Problem**: The CORS proxy can't access the URL

**Solutions**:
- Try a different recipe URL
- Some websites block scraping (try popular recipe sites)
- Check your internet connection
- The CORS proxy might be temporarily down

### "Gemini API error: 400" or Rate Limit Error

**Problem**: API request failed

**Solutions**:
- **Rate Limit**: You're making too many requests. Wait a minute.
- **Invalid Key**: Double-check your API key in `config.js`
- **Quota Exceeded**: You may have hit your free tier limit

### Recipe Extraction Returns Invalid Result

**Problem**: The AI says there's no recipe on a valid recipe URL

**Solutions**:
- The website structure might be complex
- Try a different recipe source
- Some video-only recipes (YouTube) won't work without transcripts
- Use recipe blog posts with written instructions

### Chat Assistant Not Responding

**Problem**: Chat shows error or no response

**Solutions**:
- Make sure you've loaded a recipe first
- Check browser console (F12) for error messages
- Verify your API key is working (try recipe extraction first)
- Check your internet connection

## API Usage and Costs

### Free Tier Limits (as of 2024)

- **Gemini 1.5 Flash**: 15 requests per minute, 1500 per day
- **Gemini 1.5 Pro**: 2 requests per minute, 50 per day

### Estimated Usage per Session

- Recipe extraction: 1 request (~5-10 seconds)
- Chat messages: 1 request per message (~1-2 seconds)
- Typical cooking session: 5-10 requests total

**The free tier is more than enough for personal use!**

## Security Best Practices

### Protecting Your API Key

1. **Never commit to Git**
   - Add `config.js` to `.gitignore`
   - Use environment variables for deployment

2. **Don't share screenshots** containing your key

3. **Regenerate if exposed**
   - Go to Google AI Studio
   - Delete compromised key
   - Create a new one

4. **Set up billing alerts** (if using paid tier)
   - Go to Google Cloud Console
   - Set budget alerts

## Next Steps

### Optional Enhancements

1. **Create a .gitignore file**
   ```
   config.js
   .env
   ```

2. **Use environment variables** (for deployment)
   ```javascript
   GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'YOUR_KEY_HERE'
   ```

3. **Set up a backend server** (advanced)
   - Better security (hide API key)
   - Better CORS handling
   - Add caching to reduce API calls

### Alternative CORS Proxy

If AllOrigins is slow or down, you can use alternatives:

In `app.js`, change line ~195:
```javascript
// Option 1: CORS Anywhere (requires setup)
const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;

// Option 2: ThingProxy
const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;

// Option 3: Your own proxy server (recommended for production)
const proxyUrl = `https://your-server.com/proxy?url=${encodeURIComponent(url)}`;
```

## Support

If you encounter issues not covered here:

1. Check the browser console (F12 → Console tab)
2. Look for error messages
3. Review the [README.md](README.md) for more details
4. Check [Google AI Studio documentation](https://ai.google.dev/docs)

## Success Checklist

- [ ] Obtained Gemini API key
- [ ] Configured `config.js` with API key
- [ ] Opened `index.html` in browser
- [ ] Successfully extracted a recipe
- [ ] Tested the chat assistant
- [ ] Application running smoothly

**Congratulations! You're ready to cook with AI assistance!** 🍳
