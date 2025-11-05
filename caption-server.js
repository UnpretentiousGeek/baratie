// Simple Express server to fetch YouTube captions
// Uses youtube-transcript-plus library

import express from 'express';
import cors from 'cors';
import { fetchTranscript } from 'youtube-transcript-plus';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Serve static files (the HTML page)
app.use(express.static(__dirname));

// API endpoint to fetch captions
app.get('/api/captions', async (req, res) => {
    try {
        const { videoId, lang } = req.query;

        if (!videoId) {
            return res.status(400).json({
                error: 'Missing videoId parameter'
            });
        }

        const requestedLang = lang || 'en';
        console.log(`Fetching captions for video: ${videoId}, language: ${requestedLang}`);

        // Try requested language first
        let transcript = null;
        let usedLang = requestedLang;

        try {
            transcript = await fetchTranscript(videoId, { lang: requestedLang });
        } catch (firstError) {
            console.log(`Language '${requestedLang}' not available, trying fallback languages...`);

            // Fallback language order
            const fallbackLangs = ['en', 'en-US', 'en-GB'];

            // Remove requested language from fallbacks to avoid duplicate attempts
            const langsToTry = fallbackLangs.filter(l => l !== requestedLang);

            for (const fallbackLang of langsToTry) {
                try {
                    console.log(`Trying fallback language: ${fallbackLang}`);
                    transcript = await fetchTranscript(videoId, { lang: fallbackLang });
                    usedLang = fallbackLang;
                    console.log(`Successfully fetched captions in ${fallbackLang}`);
                    break;
                } catch (fallbackError) {
                    // Continue to next fallback
                    continue;
                }
            }

            // If all fallbacks failed, try without language specification (gets default)
            if (!transcript) {
                console.log('Trying to fetch default language captions...');
                try {
                    transcript = await fetchTranscript(videoId);
                    usedLang = 'auto-detected';
                    console.log('Successfully fetched default language captions');
                } catch (finalError) {
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

        res.json({
            success: true,
            videoId,
            language: usedLang,
            requestedLanguage: requestedLang,
            totalEntries: transcript.length,
            transcript
        });

    } catch (error) {
        console.error('Error fetching captions:', error);

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
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Caption server running on http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/captions?videoId=VIDEO_ID&lang=en`);
});
