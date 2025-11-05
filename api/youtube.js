// Vercel Serverless Function - YouTube API Proxy
// This function securely proxies requests to YouTube Data API v3
// API keys are stored as Vercel environment variables and never exposed to client

export default async function handler(req, res) {
  // Enable CORS for client-side requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { endpoint, params } = req.body;

    // Validate request
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing required field: endpoint' });
    }

    // Check for API key
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    // Allowed endpoints (security: whitelist only)
    const allowedEndpoints = [
      'videos',
      'commentThreads'
    ];

    if (!allowedEndpoints.includes(endpoint)) {
      return res.status(400).json({
        error: 'Invalid endpoint',
        allowedEndpoints
      });
    }

    // Build YouTube API URL
    const baseUrl = 'https://www.googleapis.com/youtube/v3';
    const queryParams = new URLSearchParams({
      ...params,
      key: apiKey
    });
    const youtubeUrl = `${baseUrl}/${endpoint}?${queryParams.toString()}`;

    // Call YouTube API
    const youtubeResponse = await fetch(youtubeUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Check if YouTube API request was successful
    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      console.error('YouTube API error:', youtubeResponse.status, errorText);
      return res.status(youtubeResponse.status).json({
        error: 'YouTube API request failed',
        details: errorText
      });
    }

    // Parse and return YouTube response
    const data = await youtubeResponse.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

