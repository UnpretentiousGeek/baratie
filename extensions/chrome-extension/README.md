# Baratie Recipe Capture - Chrome/Edge Extension

Browser extension for capturing recipes from any webpage and sending them to Baratie Recipe Manager.

## Compatibility

✅ **Chrome** (Manifest V3)
✅ **Edge** (Manifest V3)
✅ **Brave** (Manifest V3)
✅ **Any Chromium-based browser**

## Quick Install

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder (`chrome-extension`)
5. Enable "Allow access to file URLs" in extension details

See **INSTALL.txt** for detailed instructions.

## Features

- 📋 **Text Capture**: Select recipe text, right-click, and capture
- 🔗 **URL Capture**: Send any recipe URL directly to Baratie
- 💾 **Smart Storage**: Automatically handles large recipes
https://github.com/UnpretentiousGeek/baratie/tree/master/extensions- 🔔 **Notifications**: Get feedback on capture actions

## Usage

### Method 1: Right-Click Context Menu
1. Highlight recipe text on any webpage
2. Right-click → "Capture Recipe with Baratie"

### Method 2: Extension Popup
1. Click the extension icon
2. Click "Capture Recipe" button
3. Captures selected text or current URL

## Files

- `manifest.json` - Chrome Manifest V3 configuration
- `background.js` - Background service worker
- `popup.js` - Extension popup interface
- `popup.html` - Popup UI
- `content-script.js` - Page content access
- `styles/` - CSS styling
- `icons/` - Extension icons

## Cross-Browser Support

This is the **Chrome/Edge version**. For Firefox, use the `firefox-extension` folder instead.

Both versions use the same JavaScript code with a cross-browser compatibility layer.

## Troubleshooting

**Extension not loading?**
- Ensure "Developer mode" is enabled
- Check that you selected the correct folder

**Baratie doesn't open?**
- Enable "Allow access to file URLs"

**Context menu missing?**
- Reload extension from chrome://extensions
- Refresh the webpage

## Learn More

- Main project: `../../README.md`
- Complete guide: `../../INSTALL.txt`
- Cross-browser details: `../../docs/CROSS_BROWSER.md`
