# Baratie Recipe Capture Browser Extension

Complete guide for installing, using, and understanding the Baratie Recipe Capture browser extension.

---

## Overview

The **Baratie Recipe Capture Extension** is a companion tool for the Baratie Recipe Manager web application. It allows you to capture recipe text from any webpage with a single click and automatically send it to Baratie for AI-powered extraction and cooking guidance.

## Features

- **One-Click Capture**: Click the extension icon to capture recipe text
- **Smart Selection**: Automatically detects highlighted text
- **Works Everywhere**: Capture from blogs, YouTube comments, Instagram posts, any website
- **Right-Click Menu**: Context menu option for quick text capture
- **Automatic Processing**: Opens Baratie and starts AI extraction immediately
- **Large Content Support**: Handles both small snippets and full recipe pages
- **Clean URLs**: Removes query parameters after processing

---

## Installation

### Step 1: Locate Extension Files

The extension files are located in:
```
d:\Vibe Coding Projects\Baratie\extension\
```

### Step 2: Load Extension in Chrome/Edge

1. Open Chrome or Edge browser
2. Navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `extension` folder: `d:\Vibe Coding Projects\Baratie\extension\`
6. The extension should now appear with a "B" icon (or default puzzle piece)

### Step 3: Enable File Access (Required)

Since Baratie runs as a local file (`file:///`), you must enable file access:

1. In `chrome://extensions/`, find "Baratie Recipe Capture"
2. Click **Details**
3. Scroll down to **Allow access to file URLs**
4. Toggle it **ON**

**Important:** Without this step, the extension cannot open Baratie.

### Step 4: Configure Baratie Path (Optional)

By default, the extension looks for Baratie at:
```
file:///D:/Vibe%20Coding%20Projects/Baratie/index.html
```

If your Baratie is located elsewhere:

1. Click the extension icon
2. Click the **⚙️ Settings** link at the bottom
3. Enter your correct Baratie path
4. Click OK

**Alternative:** Run Baratie on localhost to avoid file:// restrictions:
```bash
cd "d:\Vibe Coding Projects\Baratie"
python -m http.server 8000
```
Then set path to: `http://localhost:8000/index.html`

---

## Usage

### Method 1: Popup Capture (Recommended)

1. **Navigate** to any webpage with a recipe
2. **Highlight** the recipe text (ingredients and instructions)
3. **Click** the Baratie extension icon in your browser toolbar
4. **Click** the "Capture Recipe" button in the popup
5. **Wait** for Baratie to open and process the recipe automatically

### Method 2: Right-Click Context Menu

1. **Navigate** to any webpage with a recipe
2. **Highlight** the recipe text
3. **Right-click** on the selected text
4. **Select** "Capture Recipe with Baratie" from the context menu
5. **Wait** for Baratie to open and process

### Method 3: Auto-Capture Full Page

1. **Navigate** to a recipe webpage
2. **Click** the extension icon (without selecting text)
3. **Click** "Capture Recipe"
4. Extension will capture the entire page content
5. Baratie will attempt to extract the recipe from full page

---

## How It Works

### Architecture

```
User highlights recipe text on webpage
    ↓
Extension captures selection via content script
    ↓
Extension encodes text and creates Baratie URL
    ↓
Small content (<1500 chars) → URL query parameters
Large content (>1500 chars) → chrome.storage.local
    ↓
Extension opens Baratie in new tab with data
    ↓
Baratie detects extension data on page load
    ↓
Auto-triggers AI extraction via Gemini API
    ↓
Recipe preview shown → User confirms → Starts cooking
```

### Data Transfer Methods

**Small Content (< 1500 characters):**
- Passed via URL query parameters
- Format: `?recipe_text=ENCODED_TEXT&source_url=CURRENT_URL`
- Fast and simple
- Visible in browser history

**Large Content (> 1500 characters):**
- Stored in `chrome.storage.local` with unique ID
- Format: `?recipe_storage_id=recipe_123456789&source_url=CURRENT_URL`
- Baratie retrieves from storage via extension messaging
- Automatically cleaned up after 60 seconds
- More secure and reliable

---

## Extension Files

### File Structure

```
extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Extension popup UI
├── popup.js              # Popup interaction logic
├── content-script.js     # Injected into webpages (text selection)
├── background.js         # Service worker (storage, context menu)
├── styles/
│   └── popup.css         # Popup styling
└── icons/
    ├── icon16.png        # Toolbar icon (16x16)
    ├── icon48.png        # Extension page icon (48x48)
    └── icon128.png       # Web store icon (128x128)
```

### Key Components

**manifest.json**:
- Defines extension permissions and capabilities
- Uses Manifest V3 (latest standard)
- Requests: `activeTab`, `storage`, `scripting`, file access

**content-script.js**:
- Runs on all webpages
- Detects text selection (mouseup, keyup events)
- Extracts main content from page
- Responds to extension popup requests

**popup.js**:
- Handles capture button click
- Decides data transfer method (URL vs storage)
- Opens Baratie with captured data
- Configurable Baratie path

**background.js**:
- Service worker for extension lifecycle
- Handles context menu (right-click) option
- Manages chrome.storage cleanup
- Listens for messages from Baratie (optional)

---

## Web App Integration

### Modified Files

**index.html** (lines 249-270):
- Added extension data detection script
- Checks URL query parameters on page load
- Stores data in `window.extensionData` for app.js

**app.js** (3 new methods):

1. **`checkExtensionData()`** (line 217):
   - Called during app initialization
   - Detects extension-passed data
   - Auto-triggers recipe extraction
   - Bypasses manual URL input

2. **`extractRecipeFromText(text, sourceUrl)`** (line 273):
   - Extracts recipe from plain text (not URL)
   - Uses same Gemini API prompt as URL extraction
   - Returns normalized recipe object

3. **`fetchFromExtension(storageId)`** (line 319):
   - Retrieves large content from chrome.storage
   - Uses extension messaging API
   - Falls back gracefully if unavailable

---

## Troubleshooting

### Extension icon doesn't appear
- **Solution**: Reload the extension in `chrome://extensions/`
- Pin the extension to toolbar: Click puzzle icon → Pin "Baratie Recipe Capture"

### "Could not access page content" error
- **Cause**: Content script not injected yet
- **Solution**: Refresh the recipe webpage and try again
- **Alternative**: Select text and use right-click menu

### Baratie doesn't open
- **Cause**: File access not enabled
- **Solution**: Enable "Allow access to file URLs" in extension settings
- **Alternative**: Run Baratie on localhost (see Step 4 above)

### "No recipe data received" error
- **Cause**: Selected text was too short or storage failed
- **Solution**: Select more text (at least 50 characters)
- **Check**: Browser console for error messages

### Recipe extraction fails
- **Cause**: Captured text doesn't contain valid recipe
- **Solution**: Ensure you select ingredients AND instructions
- **Tip**: Look for numbered steps or bulleted ingredient lists

### Extension works once then stops
- **Cause**: Storage not cleaned up
- **Solution**: Extension auto-cleans after 60s, just wait
- **Manual fix**: Clear extension data in `chrome://extensions/`

---

## Testing

### Test Recipe Sites

Try the extension on these recipe websites:

- **AllRecipes**: https://www.allrecipes.com/
- **Food Network**: https://www.foodnetwork.com/
- **Serious Eats**: https://www.seriouseats.com/
- **NYT Cooking**: https://cooking.nytimes.com/
- **YouTube Recipe Comments**: Many cooking videos have recipes in pinned comments

### Test Procedure

1. Navigate to recipe page
2. Highlight ingredients and instructions
3. Click extension icon
4. Verify popup shows character count
5. Click "Capture Recipe"
6. Verify Baratie opens in new tab
7. Verify loading status appears
8. Verify recipe extracted successfully
9. Confirm recipe preview shows correct data

---

## Browser Compatibility

### Fully Supported
- ✅ **Chrome** (version 88+)
- ✅ **Edge** (version 88+)

### Partially Supported
- ⚠️ **Firefox** (requires minor API changes)
  - Change `chrome.*` to `browser.*` in all extension files
  - Use WebExtension Polyfill for cross-browser compatibility

### Not Supported
- ❌ **Safari** (uses different extension format)
- ❌ **Opera** (should work but untested)

---

## Privacy & Security

### Data Handling

- **No data leaves your device** except to Gemini API
- **No tracking or analytics**
- **No external servers** (besides CORS proxies for URL fetching)
- **No user accounts or authentication**
- **All processing is local**

### Permissions Explained

- **`activeTab`**: Access current tab when you click the extension
- **`storage`**: Store captured text temporarily (auto-deleted)
- **`scripting`**: Inject content script to detect selections
- **`file:///*`**: Open local Baratie HTML file

### Security Notes

- Extension can read all webpage content (required for capture)
- Gemini API key is visible in `config.js` (client-side limitation)
- Captured text stored for max 60 seconds
- No persistent data collection

---

## Customization

### Change Extension Icon

Replace files in `extension/icons/`:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Reload extension in `chrome://extensions/`

### Change Baratie Path

**Option 1: Via Settings**
- Click extension icon → ⚙️ Settings → Enter new path

**Option 2: Edit Code**
In `extension/popup.js`, line 7:
```javascript
const BARATIE_PATH = 'file:///YOUR/PATH/HERE/index.html';
```

### Customize Popup UI

Edit `extension/styles/popup.css`:
- Change colors (search for `#ff6b35` for Baratie orange)
- Adjust sizing (currently 360px width)
- Modify button styles

---

## Advanced Features

### Context Menu Integration

Right-click on selected text → "Capture Recipe with Baratie"

Implemented in `background.js` lines 46-75:
- Only appears when text is selected
- Uses same data transfer as popup
- Shows notification if selection too short

### Automatic Storage Cleanup

Extension cleans up old storage entries:
- On extension startup (line 90 of `background.js`)
- After 60 seconds of data storage (line 70)
- Prevents storage bloat

### Structured Recipe Detection

Content script attempts to extract JSON-LD recipe schema:
- Checks for `<script type="application/ld+json">`
- Looks for `@type: "Recipe"`
- Pre-formats structured data for better extraction

Implemented in `content-script.js` lines 81-117

---

## Development

### Making Changes

1. Edit extension files in `extension/` folder
2. Go to `chrome://extensions/`
3. Click **Reload** button on Baratie Recipe Capture card
4. Test changes on a recipe webpage

### Debugging

**Extension Popup:**
- Right-click on extension icon → Inspect popup
- Console logs appear in popup DevTools

**Content Script:**
- Open webpage → F12 → Console tab
- Look for "Baratie Recipe Capture: Content script loaded"

**Background Worker:**
- Go to `chrome://extensions/`
- Click "service worker" link under Baratie extension
- Console logs appear in worker DevTools

### Publishing to Web Store

1. Create icons (16, 48, 128px PNG files)
2. Zip the `extension` folder
3. Create developer account at [Chrome Web Store](https://chrome.google.com/webstore/developer/dashboard)
4. Upload ZIP and fill in store listing
5. Submit for review

---

## Comparison: Extension vs Manual URL

| Feature | Extension Capture | Manual URL Paste |
|---------|------------------|------------------|
| **Speed** | 1 click | Type/paste URL |
| **Text Selection** | ✅ Supports | ❌ Full page only |
| **Works on YouTube comments** | ✅ Yes | ❌ No |
| **Works on Instagram** | ✅ Yes | ❌ Blocked |
| **Structured data extraction** | ✅ Automatic | ✅ Automatic |
| **Requires installation** | ✅ Yes | ❌ No |

---

## Known Limitations

1. **File Access Required**: Must enable "Allow access to file URLs" manually
2. **Chrome-Only API**: `chrome.*` API not compatible with Firefox without changes
3. **No Icon Provided**: Default puzzle icon shown until PNGs are added
4. **Browser History**: Small captures visible in URL (use storage for privacy)
5. **Extension Updates**: Must reload manually during development

---

## Future Enhancements

### Planned Features

- [ ] Firefox compatibility (WebExtension Polyfill)
- [ ] Custom icon design (chef hat or fork/knife)
- [ ] Options page for settings (instead of prompt dialog)
- [ ] Keyboard shortcut (Ctrl+Shift+R to capture)
- [ ] Badge showing capture count
- [ ] Recent captures history
- [ ] Export captured text before sending
- [ ] OCR for recipe images (capture from photos)

### Community Contributions

Want to improve the extension? Contributions welcome:

1. Add proper PNG icons
2. Implement Firefox support
3. Create options page UI
4. Add keyboard shortcuts
5. Improve text extraction algorithm

---

## Support

### Getting Help

- **Check troubleshooting section** above
- **View browser console** for error messages
- **Check extension console** (right-click icon → Inspect)
- **Verify Gemini API key** is set in `config.js`

### Reporting Issues

When reporting issues, include:

1. Browser and version (e.g., Chrome 120.0.6099.109)
2. Extension error messages (from console)
3. Recipe URL or text you tried to capture
4. Steps to reproduce the issue

---

## Credits

**Extension Author**: Claude Code (AI Assistant)
**Baratie App**: Original web application
**APIs Used**: Google Gemini AI, YouTube Data API v3
**Extension Framework**: Chrome Extension Manifest V3

---

## License

Same license as Baratie main application.

---

## Quick Reference

### Installation Checklist

- [ ] Load unpacked extension from `extension/` folder
- [ ] Enable Developer mode in `chrome://extensions/`
- [ ] Enable "Allow access to file URLs"
- [ ] Configure Baratie path if not default location
- [ ] Test on a sample recipe website

### Usage Checklist

- [ ] Navigate to recipe page
- [ ] Highlight recipe text (ingredients + instructions)
- [ ] Click extension icon in toolbar
- [ ] Click "Capture Recipe" button
- [ ] Wait for Baratie to open and process
- [ ] Confirm recipe extraction in preview stage
- [ ] Start cooking!

---

**Enjoy effortless recipe capture with Baratie!** 👨‍🍳🍽️
