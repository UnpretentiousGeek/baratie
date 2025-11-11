// Vercel Serverless Function - Gemini API Proxy
// This function securely proxies requests to Google's Gemini API
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
    const { prompt, method = 'generateContent', model = 'gemini-2.0-flash', fileData, filesData } = req.body;

    // Validate request
    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error: API key not set' });
    }

    // Build Gemini API URL
    // According to Gemini API docs: https://ai.google.dev/gemini-api/docs/image-understanding
    // Vision models use v1beta API: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
    let modelName = model;
    let apiVersion = 'v1beta'; // Vision models use v1beta according to documentation

    // Use model name exactly as provided - no modifications needed
    // Valid vision models: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash

    const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:${method}?key=${apiKey}`;
    console.log('Calling Gemini API:', {
      requestedModel: model,
      actualModel: modelName,
      apiVersion: apiVersion,
      hasFile: !!fileData,
      hasMultipleFiles: !!filesData,
      fileCount: filesData ? filesData.length : (fileData ? 1 : 0),
      url: geminiUrl.replace(apiKey, 'HIDDEN')
    });

    // Prepare request body for Gemini
    const parts = [{ text: prompt }];

    // Add multiple files if provided
    if (filesData && Array.isArray(filesData) && filesData.length > 0) {
      console.log(`Adding ${filesData.length} files to request`);
      filesData.forEach((file, index) => {
        if (file.data && file.mimeType) {
          console.log(`  File ${index + 1}: ${file.mimeType}, ${file.data.length} bytes`);
          parts.push({
            inline_data: {
              mime_type: file.mimeType,
              data: file.data
            }
          });
        }
      });
    }
    // Add single file if provided (backwards compatibility)
    else if (fileData && fileData.data && fileData.mimeType) {
      console.log('Adding single file to request:', {
        mimeType: fileData.mimeType,
        dataLength: fileData.data.length,
        model: model
      });

      parts.push({
        inline_data: {
          mime_type: fileData.mimeType,
          data: fileData.data
        }
      });
    }

    const geminiRequestBody = {
      contents: [{
        parts: parts
      }]
    };

    // Call Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    });

    // Check if Gemini API request was successful
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      console.error('Request details:', {
        requestedModel: model,
        actualModel: modelName,
        apiVersion: apiVersion,
        hasFile: !!fileData,
        fileType: fileData?.mimeType,
        url: geminiUrl.replace(apiKey, 'HIDDEN')
      });
      
      // If 404, suggest trying different model or API version
      if (geminiResponse.status === 404) {
        let suggestion = 'Try using a different model like gemini-2.5-flash or gemini-2.0-flash';
        if (model.includes('1.5')) {
          suggestion = 'Gemini 1.5 models may not be available. Try using gemini-2.5-flash or gemini-2.0-flash instead.';
        }
        return res.status(404).json({
          error: 'Model not found',
          details: `The model "${modelName}" was not found in ${apiVersion}. This might be due to an incorrect model name or the model may not be available in your region/API version.`,
          suggestion: suggestion
        });
      }
      
      return res.status(geminiResponse.status).json({
        error: 'Gemini API request failed',
        details: errorText
      });
    }

    // Parse and return Gemini response
    const data = await geminiResponse.json();
    
    // Extract recipe from Gemini response
    // Gemini returns: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    let recipeText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts || [];
      recipeText = parts.map(part => part.text || '').join('\n');
    }
    
    // Parse the recipe text into structured format
    // For now, return a basic structure - this should be enhanced with proper parsing
    const recipe = {
      title: 'Extracted Recipe',
      ingredients: [],
      instructions: [],
      ...(recipeText ? { rawText: recipeText } : {})
    };
    
    // Try to parse the recipe text (basic implementation)
    if (recipeText) {
      const lines = recipeText.split('\n').filter(line => line.trim());
      
      // Look for title (usually first line or after "Recipe:" or "Title:")
      const titleMatch = recipeText.match(/(?:Recipe|Title):\s*(.+)/i) || 
                        recipeText.match(/^(.+?)(?:\n|Ingredients|Instructions)/i);
      if (titleMatch) {
        recipe.title = titleMatch[1].trim();
      }
      
      // Look for ingredients section
      const ingredientsStart = lines.findIndex(line => 
        /ingredients?/i.test(line)
      );
      if (ingredientsStart !== -1) {
        const instructionsStart = lines.findIndex((line, idx) => 
          idx > ingredientsStart && /instructions?|directions?|steps?/i.test(line)
        );
        const ingredientsEnd = instructionsStart !== -1 ? instructionsStart : lines.length;
        recipe.ingredients = lines
          .slice(ingredientsStart + 1, ingredientsEnd)
          .filter(line => line.trim() && !/instructions?|directions?|steps?/i.test(line))
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
      }
      
      // Look for instructions section
      const instructionsStart = lines.findIndex(line => 
        /instructions?|directions?|steps?/i.test(line)
      );
      if (instructionsStart !== -1) {
        recipe.instructions = lines
          .slice(instructionsStart + 1)
          .filter(line => line.trim())
          .map(line => line.replace(/^\d+[.)]\s*/, '').trim())
          .filter(line => line.length > 0);
      }
    }
    
    return res.status(200).json({ recipe });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

