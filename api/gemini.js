// Vercel Serverless Function - Gemini API Proxy
// This function securely proxies requests to Google's Gemini API
// API keys are stored as Vercel environment variables and never exposed to client

// Helper function to extract recipe content from HTML
function extractRecipeContent(html) {
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Try to find recipe-specific content areas
  const recipeSelectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*recipe[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  
  let extractedContent = '';
  for (const selector of recipeSelectors) {
    const match = html.match(selector);
    if (match && match[1]) {
      extractedContent = match[1];
      break;
    }
  }
  
  // If no specific recipe area found, use body content
  if (!extractedContent) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      extractedContent = bodyMatch[1];
    } else {
      extractedContent = html;
    }
  }
  
  // Remove HTML tags but preserve structure
  let text = extractedContent
    .replace(/<h[1-6][^>]*>/gi, '\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();
  
  // Try to extract JSON-LD structured data if available
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const items = Array.isArray(jsonLd) ? jsonLd : (jsonLd['@graph'] || [jsonLd]);
      
      for (const item of items) {
        if (item['@type'] === 'Recipe' || item['@type'] === 'https://schema.org/Recipe') {
          let recipeText = `RECIPE: ${item.name || ''}\n\n`;
          
          if (item.recipeIngredient) {
            recipeText += 'INGREDIENTS:\n';
            recipeText += item.recipeIngredient.join('\n') + '\n\n';
          }
          
          if (item.recipeInstructions) {
            recipeText += 'INSTRUCTIONS:\n';
            if (Array.isArray(item.recipeInstructions)) {
              item.recipeInstructions.forEach((step, i) => {
                const stepText = typeof step === 'string' ? step : (step.text || step.name || '');
                recipeText += `${i + 1}. ${stepText}\n`;
              });
            }
          }
          
          // Prefer structured data over scraped text
          if (recipeText.length > 50) {
            return recipeText;
          }
        }
      }
    } catch (e) {
      // If JSON-LD parsing fails, continue with scraped text
    }
  }
  
  // Limit content length (Gemini has token limits)
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '...';
  }
  
  return text;
}

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
    const { prompt, method = 'generateContent', model = 'gemini-2.0-flash', fileData, filesData, url } = req.body;

    // If URL is provided, fetch and extract content from it
    let finalPrompt = prompt || '';
    if (url) {
      try {
        // Check if it's a YouTube URL
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const youtubeMatch = url.match(youtubeRegex);
        
        if (youtubeMatch) {
          // It's a YouTube URL - use YouTube API instead
          const videoId = youtubeMatch[1];
          console.log('Detected YouTube video ID:', videoId);
          
          const youtubeApiKey = process.env.YOUTUBE_API_KEY;
          if (!youtubeApiKey) {
            return res.status(400).json({ 
              error: 'YouTube API key not configured. Cannot extract recipe from YouTube videos.' 
            });
          }
          
          // Fetch video metadata from YouTube API
          const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=snippet,contentDetails`;
          const youtubeResponse = await fetch(youtubeApiUrl);
          
          if (!youtubeResponse.ok) {
            throw new Error(`YouTube API error: ${youtubeResponse.status}`);
          }
          
          const youtubeData = await youtubeResponse.json();
          
          if (!youtubeData.items || youtubeData.items.length === 0) {
            throw new Error('Video not found');
          }
          
          const video = youtubeData.items[0];
          const videoTitle = video.snippet.title;
          const videoDescription = video.snippet.description;
          
          // Check if description contains recipe links
          const urlPattern = /(https?:\/\/[^\s\)]+)/g;
          const urls = videoDescription.match(urlPattern) || [];
          
          let recipeContent = '';
          let recipeLinks = [];
          
          // Filter for recipe-related URLs (common recipe site patterns)
          const recipeSitePatterns = [
            /justonecookbook|allrecipes|foodnetwork|tasty|seriouseats|bonappetit|epicurious|delish|thekitchn|food52|minimalistbaker|cookieandkate|smittenkitchen|pinchofyum|halfbakedharvest|damndelicious|gimmesomeoven|recipegirl|twopeasandtheirpod|reciperunner|chefsteps|serious|recipe|food|kitchen|cookbook|cuisine|dish|meal/i
          ];
          
          for (const url of urls) {
            const cleanUrl = url.replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
            if (recipeSitePatterns.some(pattern => pattern.test(cleanUrl))) {
              recipeLinks.push(cleanUrl);
            }
          }
          
          // Fetch recipe content from linked websites
          if (recipeLinks.length > 0) {
            console.log('Found recipe links in description:', recipeLinks);
            
            for (const recipeUrl of recipeLinks.slice(0, 3)) { // Limit to first 3 links
              try {
                console.log('Fetching recipe from link:', recipeUrl);
                const linkResponse = await fetch(recipeUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                  }
                });
                
                if (linkResponse.ok) {
                  const html = await linkResponse.text();
                  const content = extractRecipeContent(html);
                  
                  if (content && content.length > 100) {
                    recipeContent += `\n\n--- Recipe from ${recipeUrl} ---\n${content}`;
                    console.log('Successfully extracted recipe content from link');
                    break; // Use first successful extraction
                  }
                }
              } catch (linkError) {
                console.error('Error fetching recipe link:', linkError);
                // Continue to next link or description
              }
            }
          }
          
          // Combine video info with recipe content and prompt
          let combinedContent = `YouTube Video:\nTitle: ${videoTitle}\n\nDescription:\n${videoDescription}`;
          
          if (recipeContent) {
            combinedContent += `\n\n${recipeContent}`;
            finalPrompt = `Extract the recipe from the following content. The YouTube video description may contain a link to the full recipe, and I've included the recipe content from that link below:\n\n${combinedContent}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }. CRITICAL INSTRUCTIONS: For the instructions array, extract ONLY the numbered step-by-step instructions (e.g., "1. Lay ¼ onion flat side down...", "2. Mince finely into 1/8-inch pieces..."). DO NOT include section headings like "To Make the Chicken Rice", "To Make the Omelettes", "To Serve", "To Store" - these are NOT instructions. Each instruction must be a complete, detailed sentence describing what to do. Combine all numbered steps from all sections into a single sequential array. For ingredients, combine all ingredients from all sections into a single array.'}`;
          } else {
            finalPrompt = `Extract the recipe from this YouTube video:\n\n${combinedContent}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }. CRITICAL INSTRUCTIONS: For the instructions array, extract ONLY the numbered step-by-step instructions (e.g., "1. Lay ¼ onion flat side down...", "2. Mince finely into 1/8-inch pieces..."). DO NOT include section headings like "To Make the Chicken Rice", "To Make the Omelettes", "To Serve", "To Store" - these are NOT instructions. Each instruction must be a complete, detailed sentence describing what to do. Combine all numbered steps from all sections into a single sequential array. If the recipe is not in the description, please note that the recipe is in the video and provide any available information.'}`;
          }
          
          console.log('Extracted YouTube video info - Title:', videoTitle, 'Recipe links found:', recipeLinks.length);
        } else {
          // Regular URL - fetch and scrape HTML
          console.log('Fetching content from URL:', url);
          const urlResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (!urlResponse.ok) {
            throw new Error(`Failed to fetch URL: ${urlResponse.status}`);
          }
          
          const html = await urlResponse.text();
          
          // Extract main content from HTML
          const content = extractRecipeContent(html);
          
          // Combine URL content with prompt
          finalPrompt = `Extract the recipe from this webpage content:\n\n${content}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }. CRITICAL INSTRUCTIONS: For the instructions array, extract ONLY the numbered step-by-step instructions (e.g., "1. Lay ¼ onion flat side down...", "2. Mince finely into 1/8-inch pieces..."). DO NOT include section headings like "To Make the Chicken Rice", "To Make the Omelettes", "To Serve", "To Store" - these are NOT instructions. Each instruction must be a complete, detailed sentence describing what to do. Combine all numbered steps from all sections into a single sequential array. For ingredients, combine all ingredients from all sections into a single array.'}`;
          
          console.log('Extracted content length:', content.length);
        }
      } catch (urlError) {
        console.error('Error fetching URL:', urlError);
        return res.status(400).json({ 
          error: 'Failed to fetch URL content',
          details: urlError.message 
        });
      }
    }

    // Validate request
    if (!finalPrompt) {
      return res.status(400).json({ error: 'Missing required field: prompt or url' });
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
    const parts = [{ text: finalPrompt }];

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
    const recipe = {
      title: 'Extracted Recipe',
      ingredients: [],
      instructions: [],
      ...(recipeText ? { rawText: recipeText } : {})
    };
    
    if (recipeText) {
      // First, try to parse as JSON (Gemini might return JSON)
      try {
        // Try to extract JSON from the response (might be wrapped in markdown code blocks)
        const jsonMatch = recipeText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                         recipeText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.title) recipe.title = parsed.title;
          if (parsed.ingredients && Array.isArray(parsed.ingredients)) {
            recipe.ingredients = parsed.ingredients;
          }
          if (parsed.instructions && Array.isArray(parsed.instructions)) {
            // Filter out section headings from JSON response
            recipe.instructions = parsed.instructions.filter(instruction => {
              if (typeof instruction !== 'string') return false;
              const lower = instruction.toLowerCase().trim();
              // Filter out section headings
              if (/^to\s+(make|serve|store|prepare|assemble|finish|garnish|plate)/i.test(lower) && instruction.length < 50) {
                return false; // Likely a section heading
              }
              // Filter out very short lines that look like headings
              if (instruction.length < 20 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(instruction)) {
                return false; // Looks like a title/heading
              }
              return true;
            });
          }
          // If we successfully parsed JSON, return early
          if (recipe.instructions.length > 0 || recipe.ingredients.length > 0) {
            return res.status(200).json({ recipe });
          }
        }
      } catch (jsonError) {
        // JSON parsing failed, continue with text parsing
        console.log('JSON parsing failed, falling back to text parsing');
      }
      
      // Fallback to text parsing with improved logic
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
      
      // Improved instructions parsing - extract all numbered steps
      // Look for instructions section
      const instructionsStart = lines.findIndex(line => 
        /instructions?|directions?|steps?/i.test(line)
      );
      
      if (instructionsStart !== -1) {
        const instructionLines = lines.slice(instructionsStart + 1);
        const instructions = [];
        let currentStep = '';
        
        for (let i = 0; i < instructionLines.length; i++) {
          const line = instructionLines[i];
          
          // Check if this line starts a new numbered step
          const stepMatch = line.match(/^(\d+)[.)]\s*(.+)/);
          if (stepMatch) {
            // Save previous step if exists
            if (currentStep.trim()) {
              instructions.push(currentStep.trim());
            }
            // Start new step
            currentStep = stepMatch[2];
          } else {
            // Continue current step (might be multi-line)
            if (currentStep) {
              currentStep += ' ' + line;
            } else if (line.trim() && !/^(ingredients?|instructions?|directions?|steps?|title|recipe):/i.test(line)) {
              // If no current step but line looks like content, start one
              currentStep = line;
            }
          }
        }
        
        // Add last step
        if (currentStep.trim()) {
          instructions.push(currentStep.trim());
        }
        
        // Filter out section headings (common patterns like "To Make...", "To Serve", "To Store")
        const filteredInstructions = instructions.filter(instruction => {
          const lower = instruction.toLowerCase().trim();
          // Filter out section headings
          if (/^to\s+(make|serve|store|prepare|assemble|finish|garnish|plate)/i.test(lower) && instruction.length < 50) {
            return false; // Likely a section heading, not an instruction
          }
          // Filter out very short lines that look like headings
          if (instruction.length < 20 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(instruction)) {
            return false; // Looks like a title/heading
          }
          return true;
        });
        
        // If we found numbered steps, use them; otherwise fall back to simple parsing
        if (filteredInstructions.length > 0) {
          recipe.instructions = filteredInstructions;
        } else if (instructions.length > 0) {
          // Use original if filtering removed everything (shouldn't happen, but safety check)
          recipe.instructions = instructions;
        } else {
          // Fallback: simple line-by-line parsing with filtering
          recipe.instructions = instructionLines
            .filter(line => {
              const trimmed = line.trim();
              if (!trimmed) return false;
              // Filter out section headings
              const lower = trimmed.toLowerCase();
              if (/^to\s+(make|serve|store|prepare|assemble|finish|garnish|plate)/i.test(lower) && trimmed.length < 50) {
                return false;
              }
              // Filter out metadata lines
              if (/^(ingredients?|instructions?|directions?|steps?|title|recipe):/i.test(trimmed)) {
                return false;
              }
              return true;
            })
            .map(line => line.replace(/^\d+[.)]\s*/, '').trim())
            .filter(line => line.length > 0);
        }
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

