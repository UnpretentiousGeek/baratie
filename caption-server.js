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

        console.log(`Fetching captions for video: ${videoId}, language: ${lang || 'default'}`);

        // Fetch transcript with optional language
        const options = {};
        if (lang) {
            options.lang = lang;
        }

        const transcript = await fetchTranscript(videoId, options);

        res.json({
            success: true,
            videoId,
            language: lang || 'en',
            totalEntries: transcript.length,
            transcript
        });

    } catch (error) {
        console.error('Error fetching captions:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch captions'
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
