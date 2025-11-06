// API Configuration - PRODUCTION (Serverless)
// This file is safe to commit - NO API KEYS stored here
// API keys are securely stored as Vercel environment variables
// Accessed via serverless function proxies in /api directory

const CONFIG = {
    // Gemini AI Configuration
    GEMINI_API_ENDPOINT: '/api/gemini', // Serverless proxy endpoint
    GEMINI_MODEL: 'gemini-2.0-flash-lite', // Default model (used as fallback)

    // Multi-Model Configuration
    // Each model has independent rate limits on the same API key
    // All Gemini models are multimodal and support vision per: https://ai.google.dev/gemini-api/docs/image-understanding
    GEMINI_MODELS: {
        'gemini-2.5-flash': {
            rpm: 10,
            rpd: 250,
            priority: 1,  // Highest priority for vision (enhanced segmentation)
            vision: true   // All Gemini models support vision
        },
        'gemini-2.0-flash': {
            rpm: 15,    // Requests per minute
            rpd: 200,   // Requests per day
            priority: 2,
            vision: true   // Enhanced object detection
        },
        'gemini-2.5-flash-lite': {
            rpm: 15,
            rpd: 1000,
            priority: 3,
            vision: true
        },
        'gemini-2.0-flash-lite': {
            rpm: 30,
            rpd: 200,
            priority: 4,
            vision: true
        },
        // Vision-capable models (for image and PDF processing)
        // According to Gemini API docs: https://ai.google.dev/gemini-api/docs/image-understanding
        // These models support vision: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
        'gemini-1.5-pro': {
            rpm: 5,
            rpd: 100,
            priority: 5,
            vision: true
        },
        'gemini-1.5-flash': {
            rpm: 15,
            rpd: 200,
            priority: 6,
            vision: true
        }
    },

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
