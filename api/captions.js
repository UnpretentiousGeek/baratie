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
};
