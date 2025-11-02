# Baratie Recipe Capture - Firefox Extension

Browser extension for capturing recipes from any webpage and sending them to Baratie Recipe Manager.

## Compatibility

✅ **Firefox** (Manifest V2)
✅ **Firefox Developer Edition**

## Quick Install (Temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `manifest.json` from this folder
4. Extension loads (removed when Firefox closes)

## Permanent Installation

**Option 1: Firefox Developer Edition**
1. Download [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)
2. Set `xpinstall.signatures.required` to `false` in `about:config`
3. Load extension (now persists permanently)

**Option 2: Sign the Extension**
1. Create account at [addons.mozilla.org](https://addons.mozilla.org)
2. Submit extension for signing (free, automatic)
3. Install signed `.xpi` file

See **INSTALL.txt** for detailed instructions.

## Features

- 📋 **Text Capture**: Select recipe text, right-click, and capture
- 🔗 **URL Capture**: Send any recipe URL directly to Baratie
- 💾 **Smart Storage**: Automatically handles large recipes
- ⚙️ **Configurable**: Set your Baratie URL (local or deployed)
- 🔔 **Notifications**: Get feedback on capture actions

## Usage

### Method 1: Right-Click Context Menu
1. Highlight recipe text on any webpage
2. Right-click → "Capture Recipe with Baratie"

### Method 2: Extension Popup
1. Click the extension icon
2. Click "Capture Recipe" button
3. Captures selected text or current URL

## Configuration

Click extension icon → Settings (⚙️) → Enter Baratie URL:
- **Vercel**: `https://baratie-piece.vercel.app` (default)
- **Local**: `file:///path/to/Baratie/app/index.html`

## Files

- `manifest.json` - Firefox Manifest V2 configuration
- `background.js` - Background script
- `popup.js` - Extension popup interface
- `popup.html` - Popup UI
- `content-script.js` - Page content access
- `styles/` - CSS styling
- `icons/` - Extension icons

## Cross-Browser Support

This is the **Firefox version**. For Chrome/Edge, use the `chrome-extension` folder instead.

Both versions use the same JavaScript code with a cross-browser compatibility layer.

## Temporary vs Permanent

**Temporary Add-on:**
- ✅ Quick testing
- ✅ No signing required
- ❌ Removed when Firefox closes
- ❌ Must reload each session

**Permanent Installation:**
- ✅ Persists across restarts
- ✅ Normal extension experience
- ⚠️ Requires Firefox Dev Edition OR signing

## Troubleshooting

**Extension not loading?**
- Select `manifest.json` (not the folder)
- Check browser console for errors

**Extension removed after restart?**
- Normal for temporary add-ons
- Use permanent installation method

**Baratie doesn't open?**
- Verify Baratie URL in settings
- Test URL in a regular Firefox tab

**Context menu missing?**
- Reload extension from about:debugging
- Refresh the webpage

## Learn More

- Main project: `../README.md`
- Complete guide: `INSTALL.txt`
- Cross-browser details: `../docs/CROSS_BROWSER.md`
