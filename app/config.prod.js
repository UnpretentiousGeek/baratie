// API Configuration - PRODUCTION (Serverless)
// This file is safe to commit - NO API KEYS stored here
// API keys are securely stored as Vercel environment variables
// Accessed via serverless function proxies in /api directory

const CONFIG = {
    // Gemini AI Configuration
    GEMINI_API_ENDPOINT: '/api/gemini', // Serverless proxy endpoint
    GEMINI_MODEL: 'gemini-2.0-flash',   // Model name (used in requests)

    // YouTube Data API Configuration
    YOUTUBE_API_ENDPOINT: '/api/youtube', // Serverless proxy endpoint

    // Legacy fields (kept for backward compatibility, not used)
    GEMINI_API_URL: null, // Deprecated - using serverless endpoint
    YOUTUBE_API_URL: null // Deprecated - using serverless endpoint
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
