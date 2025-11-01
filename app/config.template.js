// API Configuration Template
// Copy this file to config.js and add your API keys
// Gemini API key from: https://makersuite.google.com/app/apikey
// YouTube API key from: https://console.cloud.google.com/apis/credentials

const CONFIG = {
    // Gemini AI Configuration
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE', // Replace with your actual API key
    GEMINI_MODEL: 'gemini-2.0-flash', // or 'gemini-1.5-pro-latest' for higher quality
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1/models/',

    // YouTube Data API Configuration
    YOUTUBE_API_KEY: 'YOUR_YOUTUBE_API_KEY_HERE', // Replace with your YouTube Data API v3 key
    YOUTUBE_API_URL: 'https://www.googleapis.com/youtube/v3'
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
