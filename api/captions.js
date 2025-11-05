// Vercel serverless function to fetch YouTube captions
// Uses youtube-transcript-plus library

import { fetchTranscript } from 'youtube-transcript-plus';

export default async (req, res) => {
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

        console.log(`Fetching captions for video: ${videoId}, language: ${lang || 'default'}`);

        // Fetch transcript with optional language
        const options = {};
        if (lang) {
            options.lang = lang;
        }

        const transcript = await fetchTranscript(videoId, options);

        res.status(200).json({
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
};
