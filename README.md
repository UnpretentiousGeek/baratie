# 🍳 Baratie - AI-Powered Recipe Manager

An intelligent web application that transforms messy online recipes into structured, interactive cooking guides. Built with vanilla JavaScript, powered by Google's Gemini AI.

## 🌟 Features

- **Smart Recipe Extraction**: Paste any recipe URL (blogs, YouTube, Instagram, TikTok) and let AI extract structured recipe data
- **Interactive Cooking Interface**: Step-by-step guidance with progress tracking and ingredient scaling
- **AI Chat Assistant**: Get cooking tips, substitutions, and technique advice
- **Browser Extension**: Capture recipes directly from any webpage (Chrome, Edge, and Firefox)
- **Session Persistence**: Your cooking progress is automatically saved
- **YouTube Integration**: Extract recipes from video descriptions and captions
- **Nutrition Calculation**: AI-powered macro and nutrition information

## 📁 Project Structure

```
baratie/
├── app/                    # Web application (deployed to Vercel)
│   ├── index.html
│   ├── app.js
│   ├── config.js          # API keys (not committed)
│   ├── config.js.template  # Template for setup
│   └── styles.css
│
├── chrome-extension/       # Chrome/Edge extension (ready to install)
│   ├── manifest.json       # Chrome Manifest V3
│   ├── background.js
│   ├── popup.js
│   ├── popup.html
│   ├── content-script.js
│   ├── INSTALL.txt         # Installation guide
│   ├── README.md
│   ├── styles/
│   └── icons/
│
├── firefox-extension/      # Firefox extension (ready to install)
│   ├── manifest.json       # Firefox Manifest V2
│   ├── background.js
│   ├── popup.js
│   ├── popup.html
│   ├── content-script.js
│   ├── INSTALL.txt         # Installation guide
│   ├── README.md
│   ├── styles/
│   └── icons/
│
├── docs/                   # Documentation
│   ├── CROSS_BROWSER.md    # Extension technical documentation
│   ├── SETUP_GUIDE.md
│   ├── YOUTUBE_SETUP.md
│   └── ...
│
├── .gitignore
├── vercel.json            # Vercel deployment config
└── README.md
```

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/baratie.git
   cd baratie
   ```

2. **Set up API Keys**
   - Copy `app/config.js.template` to `app/config.js`
   - Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Get your YouTube API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add your keys to `app/config.js`

3. **Open the app**
   - Open `app/index.html` in your browser
   - Or use a local server: `python -m http.server 8000` then visit `http://localhost:8000`

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set **Root Directory** to `app`
   - Add environment variables (optional, see below)
   - Deploy!

3. **Update Extension**
   - Edit `extension/popup.js` and `extension/background.js`
   - Update `DEFAULT_VERCEL_PATH` with your Vercel URL
   - Or let users configure it in extension settings

## 🔧 Configuration

### API Keys

The app requires two API keys:

1. **Gemini API Key** (Required)
   - Get from: https://makersuite.google.com/app/apikey
   - Used for: Recipe extraction and chat assistant

2. **YouTube API Key** (Optional but recommended)
   - Get from: https://console.cloud.google.com/apis/credentials
   - Used for: YouTube video recipe extraction

### Environment Variables (Vercel)

If deploying to Vercel, you can use environment variables instead of `config.js`:

- `GEMINI_API_KEY`
- `YOUTUBE_API_KEY`

Note: Since this is a client-side app, environment variables are limited. Consider using `config.js` or a serverless function proxy.

## 📱 Browser Extension

Two separate folders for easy installation - just pick your browser!

### Chrome/Edge Installation

📁 Use the **`chrome-extension/`** folder

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder
5. Enable "Allow access to file URLs" in extension details

**See `chrome-extension/INSTALL.txt` for detailed instructions.**

### Firefox Installation

📁 Use the **`firefox-extension/`** folder

**Temporary (Quick Testing):**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `firefox-extension/manifest.json`

**Permanent:**
- Use Firefox Developer Edition (see `firefox-extension/INSTALL.txt`)
- Or sign the extension at addons.mozilla.org (free)

**See `firefox-extension/INSTALL.txt` for detailed instructions.**

### Why Two Folders?

Chrome uses **Manifest V3**, Firefox uses **Manifest V2**. Separate folders means:
- ✅ No manual switching needed
- ✅ Ready to install out-of-the-box
- ✅ Clear installation per browser
- ✅ Same functionality, different manifests

Both share identical JavaScript code with cross-browser compatibility built-in.

### Configuration

1. Click the extension icon
2. Click "Settings" (⚙️)
3. Enter your Baratie URL:
   - Vercel: `https://baratie-piece.vercel.app` (default)
   - Local: `file:///path/to/Baratie/app/index.html`

### Usage

- **Capture Recipe Text**: Select text on any webpage, right-click, choose "Capture Recipe with Baratie"
- **Capture Recipe URL**: Click extension icon, then "Capture Recipe" button

## 📚 Documentation

- [Setup Guide](docs/SETUP_GUIDE.md) - Detailed setup instructions
- [YouTube Feature](docs/YOUTUBE_FEATURE.md) - YouTube integration details
- [Extension Guide](docs/README_EXTENSION.md) - Browser extension documentation

## 🛠️ Development

### Tech Stack

- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: CSS3 with CSS Grid/Flexbox
- **AI**: Google Gemini API
- **Hosting**: Vercel
- **Extension**: Cross-browser compatible (Chrome Manifest V3, Firefox Manifest V2)

### Key Files

- `app/app.js` - Main application logic (1444 lines)
- `app/config.js` - API configuration (not committed)
- `extension/popup.js` - Extension popup interface (cross-browser)
- `extension/background.js` - Extension background script (cross-browser)
- `extension/manifest.json` - Active manifest (Chrome V3 or Firefox V2)
- `extension/build.js` - Helper script to switch between browsers

## 🚨 Important Notes

### Security

- **Never commit `app/config.js`** - It contains your API keys
- The `.gitignore` file is configured to exclude sensitive files
- Use `config.js.template` as a reference

### API Limits

- Gemini Free Tier: 15 requests/minute (Flash), 2 requests/minute (Pro)
- YouTube API: 10,000 units/day (free tier)

### CORS Proxy

The app uses AllOrigins CORS proxy to fetch recipe content. This is a third-party service and may have rate limits.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Free to use and modify for personal or commercial projects.

## 🙏 Credits

- **Gemini AI** - Recipe extraction and chat assistance
- **YouTube Data API** - Video recipe extraction
- **AllOrigins** - CORS proxy service

---

**Baratie** - Named after the famous floating restaurant from One Piece! 🍳

For questions or issues, please open an issue on GitHub.
