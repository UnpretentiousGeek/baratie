# Extension Icons

This folder is for extension icons. **The extension works without icons** (using browser defaults).

## Current Status

Icons are **optional** and not required for the extension to function. The extension will use browser default icons (puzzle piece icon).

## Adding Custom Icons (Optional)

If you want custom icons for your extension:

### Required Sizes

Create PNG files with these exact names:
- `icon16.png` - 16x16 pixels (toolbar)
- `icon32.png` - 32x32 pixels (Windows)
- `icon48.png` - 48x48 pixels (extension management)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

### After Adding Icons

1. Place the PNG files in this `icons/` folder
2. Update `manifest.json` to reference them:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_title": "Capture Recipe with Baratie",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

3. Reload the extension in `chrome://extensions`

### Creating Icons

**Online Tools:**
- [Favicon Generator](https://favicon.io/) - Convert images to icons
- [Canva](https://www.canva.com/) - Design custom icons
- [GIMP](https://www.gimp.org/) - Free image editor

**AI Generators:**
- Use tools like DALL-E, Midjourney, or Stable Diffusion
- Prompt: "Simple icon for a recipe manager app, flat design, 128x128"

**Icon Ideas:**
- Chef hat 👨‍🍳
- Fork and knife crossed
- Recipe book
- Cooking pot
- Kitchen utensils
- Food/ingredient themed

### Icon Design Tips

✅ **Do:**
- Use simple, recognizable designs
- Ensure visibility on light AND dark backgrounds
- Keep consistent style across all sizes
- Use the cooking/recipe theme
- Test icons in both Chrome and Firefox

❌ **Don't:**
- Use too many details (won't show at 16x16)
- Use text (unreadable at small sizes)
- Use very light or very dark colors only

## Without Icons

**The extension works perfectly without custom icons!** Browser default icons are functional and recognizable.
