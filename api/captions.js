// Vercel serverless function to fetch YouTube captions
// Uses youtube-transcript-plus library
// Reference: https://github.com/ericmmartin/youtube-transcript-plus

import { fetchTranscript } from 'youtube-transcript-plus';

// Realistic browser user agent to avoid detection
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Custom fetch configuration to make requests look more like browser requests
// Simplified headers to avoid triggering YouTube's bot detection in serverless environments
const createFetchConfig = (lang) => ({
    userAgent: USER_AGENT,
    lang: lang,
    // Custom fetch functions with minimal but effective headers
    // Note: Some headers like 'Connection' are not supported in Node.js fetch
    videoFetch: async ({ url, lang, userAgent }) => {
        console.log('[videoFetch] Fetching:', url);
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': userAgent || USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': lang ? `${lang},en-US,en;q=0.9` : 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/',
                    'Origin': 'https://www.youtube.com'
                }
            });
            console.log('[videoFetch] Response status:', response.status);
            
            // Check if response contains ytInitialPlayerResponse (YouTube's embedded data)
            const clonedResponse = response.clone();
            try {
                const html = await clonedResponse.text();
                if (html.includes('ytInitialPlayerResponse')) {
                    console.log('[videoFetch] Found ytInitialPlayerResponse in HTML');
                } else {
                    console.log('[videoFetch] WARNING: ytInitialPlayerResponse not found in HTML');
                }
            } catch (inspectError) {
                console.log('[videoFetch] Could not inspect HTML:', inspectError.message);
            }
            
            return response;
        } catch (error) {
            console.error('[videoFetch] Error:', error.message);
            throw error;
        }
    },
    playerFetch: async ({ url, method, body, headers, lang, userAgent }) => {
        console.log('[playerFetch] Fetching:', url, 'Method:', method);
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'User-Agent': userAgent || USER_AGENT,
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Accept-Language': lang ? `${lang},en-US,en;q=0.9` : 'en-US,en;q=0.9',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/',
                    ...headers
                },
                body
            });
            console.log('[playerFetch] Response status:', response.status);
            
            // Clone response to inspect body without consuming it
            const clonedResponse = response.clone();
            try {
                const responseText = await clonedResponse.text();
                const responseData = JSON.parse(responseText);
                
                // Log caption tracks info if available
                if (responseData?.captions?.playerCaptionsTracklistRenderer) {
                    const tracks = responseData.captions.playerCaptionsTracklistRenderer.captionTracks || [];
                    console.log('[playerFetch] Found caption tracks:', tracks.length);
                    if (tracks.length > 0) {
                        console.log('[playerFetch] Track languages:', tracks.map(t => t.languageCode).join(', '));
                    }
                } else if (responseData?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
                    const tracks = responseData.captions.playerCaptionsTracklistRenderer.captionTracks;
                    console.log('[playerFetch] Found caption tracks (alt path):', tracks.length);
                } else {
                    console.log('[playerFetch] No caption tracks found in response structure');
                    console.log('[playerFetch] Response keys:', Object.keys(responseData || {}).slice(0, 10));
                }
            } catch (parseError) {
                console.log('[playerFetch] Could not parse response for inspection:', parseError.message);
            }
            
            return response;
        } catch (error) {
            console.error('[playerFetch] Error:', error.message);
            throw error;
        }
    },
    transcriptFetch: async ({ url, lang, userAgent }) => {
        console.log('[transcriptFetch] Fetching:', url);
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': userAgent || USER_AGENT,
                    'Accept': '*/*',
                    'Accept-Language': lang ? `${lang},en-US,en;q=0.9` : 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/',
                    'Origin': 'https://www.youtube.com'
                }
            });
            console.log('[transcriptFetch] Response status:', response.status);
            return response;
        } catch (error) {
            console.error('[transcriptFetch] Error:', error.message);
            throw error;
        }
    }
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { videoId, lang } = req.query;

        if (!videoId) {
            return res.status(400).json({
                error: 'Missing videoId parameter'
            });
        }

        const requestedLang = lang || 'en';
        console.log(`[API] Fetching captions for video: ${videoId}, language: ${requestedLang}`);
        console.log(`[API] Environment: ${process.env.VERCEL ? 'Vercel Production' : 'Local/Dev'}`);

        // Try requested language first with enhanced configuration
        let transcript = null;
        let usedLang = requestedLang;

        try {
            // First try with default config (no custom fetch) - simpler and more compatible
            console.log(`[API] Attempting with default config...`);
            transcript = await fetchTranscript(videoId, { 
                lang: requestedLang,
                userAgent: USER_AGENT
            });
            console.log(`[API] Success with default config!`);
        } catch (firstError) {
            console.log(`[API] Default config failed:`, firstError.message);
            console.log(`[API] Trying with custom fetch functions...`);
            
            // If default fails, try with custom fetch functions
            try {
                const config = createFetchConfig(requestedLang);
                transcript = await fetchTranscript(videoId, config);
                console.log(`[API] Success with custom fetch config!`);
            } catch (customError) {
                console.error(`[API] Custom fetch also failed:`, customError.message);
                throw firstError; // Throw original error
            }
        }
        
        // If still no transcript, try fallback languages
        if (!transcript) {
            console.log(`[API] Language '${requestedLang}' not available, trying fallback languages...`);

            // Fallback language order
            const fallbackLangs = ['en', 'en-US', 'en-GB'];

            // Remove requested language from fallbacks to avoid duplicate attempts
            const langsToTry = fallbackLangs.filter(l => l !== requestedLang);

            for (const fallbackLang of langsToTry) {
                try {
                    console.log(`[API] Trying fallback language: ${fallbackLang}`);
                    // Try simple config first
                    transcript = await fetchTranscript(videoId, { 
                        lang: fallbackLang,
                        userAgent: USER_AGENT
                    });
                    usedLang = fallbackLang;
                    console.log(`[API] Successfully fetched captions in ${fallbackLang}`);
                    break;
                } catch (fallbackError) {
                    console.log(`[API] Fallback ${fallbackLang} failed:`, fallbackError.message);
                    // Try with custom fetch as last resort
                    try {
                        const config = createFetchConfig(fallbackLang);
                        transcript = await fetchTranscript(videoId, config);
                        usedLang = fallbackLang;
                        console.log(`[API] Success with custom fetch for ${fallbackLang}`);
                        break;
                    } catch (customFallbackError) {
                        // Continue to next fallback
                        continue;
                    }
                }
            }

            // If all fallbacks failed, try without language specification (gets default)
            if (!transcript) {
                console.log('[API] Trying to fetch default language captions...');
                try {
                    transcript = await fetchTranscript(videoId, { userAgent: USER_AGENT });
                    usedLang = 'auto-detected';
                    console.log('[API] Successfully fetched default language captions');
                } catch (finalError) {
                    console.error('[API] All attempts failed, throwing original error');
                    throw firstError; // Throw original error with better message
                }
            }
        }

        if (!transcript || transcript.length === 0) {
            return res.status(404).json({
                error: 'No captions found for this video',
                videoId
            });
        }

        res.status(200).json({
            success: true,
            videoId,
            language: usedLang,
            requestedLanguage: requestedLang,
            totalEntries: transcript.length,
            transcript
        });

    } catch (error) {
        console.error('Error fetching captions:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);

        // Check for module import errors
        if (error.message && (error.message.includes('Cannot find module') || error.message.includes('Failed to load') || error.message.includes('import'))) {
            return res.status(500).json({
                error: 'Module import error',
                message: error.message,
                details: 'The youtube-transcript-plus package may not be installed correctly in production. Please check Vercel deployment logs.',
                videoId: req.query.videoId
            });
        }

        // Provide more helpful error messages
        const errorMessage = error.message || 'Failed to fetch captions';
        const isUnavailable = errorMessage.includes('not available') || errorMessage.includes('No transcripts');

        res.status(isUnavailable ? 404 : 500).json({
            error: errorMessage,
            videoId: req.query.videoId,
            details: isUnavailable
                ? 'This video does not have captions available, or captions are disabled'
                : 'An error occurred while fetching captions'
        });
    }
}
