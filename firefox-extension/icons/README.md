# Extension Icons

This folder should contain three PNG icon files for the Baratie Recipe Capture extension:

- **icon16.png** (16x16 pixels) - Toolbar icon
- **icon48.png** (48x48 pixels) - Extension management page
- **icon128.png** (128x128 pixels) - Chrome Web Store listing

## Creating Icons

You can create these icons using:

1. **Online Tools:**
   - [Canva](https://www.canva.com) - Free icon maker
   - [Favicon.io](https://favicon.io) - Icon generator
   - [IconScout](https://iconscout.com) - Free icon library

2. **Design Software:**
   - Adobe Illustrator / Photoshop
   - Figma
   - GIMP (free)

3. **Icon Suggestions:**
   - Chef hat icon
   - Fork and knife icon
   - Recipe book icon
   - Orange/red color scheme (matching Baratie brand: #ff6b35)

## Temporary Placeholders

Until proper icons are created, you can use these temporary solutions:

### Option 1: Generate from Text
Use an online tool like [favicon.io/favicon-generator](https://favicon.io/favicon-generator/) to create icons from the letter "B" (for Baratie) with:
- Background: #ff6b35 (orange)
- Text: #ffffff (white)
- Font: Bold

### Option 2: Use Emoji
Convert a chef or food emoji to PNG:
- 👨‍🍳 (Chef emoji)
- 🍽️ (Fork and knife with plate)
- 📖 (Recipe book)

### Option 3: Simple SVG to PNG
Create a simple SVG with the Baratie logo and convert to PNG at required sizes.

## Installing Icons

Once you have the three PNG files:

1. Place them in this `/icons/` directory
2. Ensure they're named exactly:
   - icon16.png
   - icon48.png
   - icon128.png
3. Reload the extension in Chrome

## Quick Command (ImageMagick)

If you have ImageMagick installed, you can resize one icon to all three sizes:

```bash
# Convert large icon to all required sizes
magick base-icon.png -resize 16x16 icon16.png
magick base-icon.png -resize 48x48 icon48.png
magick base-icon.png -resize 128x128 icon128.png
```

---

**Note:** For now, the extension will show a default puzzle piece icon in Chrome until proper icons are added.
