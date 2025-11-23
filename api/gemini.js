// Vercel Serverless Function - Gemini API Proxy
// This function securely proxies requests to Google's Gemini API
// API keys are stored as Vercel environment variables and never exposed to client

// Import agent modules
// Import agent modules
import { detectRecipeSections } from './agents/sectionDetection.js';
import { calculateNutrition } from './agents/nutritionCalculation.js';
import { extractPinnedComment, commentContainsRecipe } from './agents/youtubeComments.js';
import { extractAndValidateImage, extractRecipeFromImage, identifyIngredient } from './agents/imageOCR.js';

// Helper function to extract page title from HTML
function extractPageTitle(html) {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    // Decode HTML entities
    return titleMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  return '';
}

// Helper function to extract main headings from HTML
function extractMainHeadings(html) {
  const headings = [];

  // Extract h1 headings
  const h1Matches = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi);
  for (const match of h1Matches) {
    if (match[1]) {
      const text = match[1]
        .replace(/<[^>]*>/g, '') // Remove nested tags
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      if (text) headings.push(text);
    }
  }

  // Extract h2 headings (limit to first 5)
  const h2Matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
  let h2Count = 0;
  for (const match of h2Matches) {
    if (h2Count >= 5) break;
    if (match[1]) {
      const text = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      if (text) {
        headings.push(text);
        h2Count++;
      }
    }
  }

  return headings;
}

// Helper function to validate if content is cooking-related using Gemini
async function validateCookingContent(title, headings, geminiApiKey) {
  try {
    const contentSummary = `Title: ${title}\nHeadings: ${headings.join(', ')}`;

    const validationPrompt = `Analyze the following webpage title and headings. Determine if this page is about cooking, recipes, food preparation, or culinary topics.

${contentSummary}

Respond with ONLY one word: "VALID" if this is cooking/recipe related, or "INVALID" if it is not.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: validationPrompt }]
        }]
      })
    });

    if (!response.ok) {
      console.error('Validation API call failed:', response.status);
      return true; // Allow through on API failure
    }

    const data = await response.json();
    const validationResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';

    console.log('Content validation response:', validationResponse);
    return validationResponse.includes('VALID');
  } catch (error) {
    console.error('Error validating content:', error);
    return true; // Allow through on error
  }
}

// Helper function to validate if a message is cooking-related using Gemini
async function validateCookingMessage(message, geminiApiKey) {
  try {
    const validationPrompt = `Determine if the following message is related to cooking, recipes, food preparation, culinary questions, or kitchen topics.

Message: "${message}"

Respond with ONLY one word: "VALID" if this is cooking/recipe related, or "INVALID" if it is not.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: validationPrompt }]
        }]
      })
    });

    if (!response.ok) {
      console.error('Message validation API call failed:', response.status);
      return true; // Allow through on API failure
    }

    const data = await response.json();
    const validationResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';

    console.log('Message validation response:', validationResponse);
    return validationResponse.includes('VALID');
  } catch (error) {
    console.error('Error validating message:', error);
    return true; // Allow through on error
  }
}

// Helper function to extract recipe content from HTML
function extractRecipeContent(html) {
  // Remove script and style tags first
  let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Try to find recipe-specific content areas with more comprehensive selectors
  const recipeSelectors = [
    // Try JSON-LD first (most reliable)
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
    // Common recipe site patterns
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*recipe[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*recipe[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<section[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
  ];

  let extractedContent = '';
  let bestMatch = null;
  let bestLength = 0;

  // Try all selectors and pick the one with the most content (likely the main content area)
  for (const selector of recipeSelectors) {
    const matches = cleanHtml.matchAll(new RegExp(selector.source, 'gi'));
    for (const match of matches) {
      if (match && match[1]) {
        const content = match[1];
        // Prefer longer content (more likely to be the main article)
        if (content.length > bestLength) {
          bestLength = content.length;
          bestMatch = content;
        }
      }
    }
  }

  if (bestMatch) {
    extractedContent = bestMatch;
  } else {
    // If no specific recipe area found, use body content
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      extractedContent = bodyMatch[1];
    } else {
      extractedContent = cleanHtml;
    }
  }

  // Remove common non-recipe elements that might interfere
  extractedContent = extractedContent.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  extractedContent = extractedContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  extractedContent = extractedContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  extractedContent = extractedContent.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  extractedContent = extractedContent.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');

  // Remove HTML tags but preserve structure - be more careful with instruction content
  let text = extractedContent
    // Preserve numbered lists and steps
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // Preserve headings
    .replace(/<h[1-6][^>]*>/gi, '\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    // Preserve paragraphs
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    // Preserve divs and spans (might contain important text)
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<span[^>]*>/gi, ' ')
    .replace(/<\/span>/gi, ' ')
    // Preserve line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove other HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...');

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  // Try to extract JSON-LD structured data if available
  // But don't use it if it doesn't have complete instructions
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  let jsonLdRecipeText = '';

  for (const jsonLdMatch of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const items = Array.isArray(jsonLd) ? jsonLd : (jsonLd['@graph'] || [jsonLd]);

      for (const item of items) {
        if (item['@type'] === 'Recipe' || item['@type'] === 'https://schema.org/Recipe') {
          let recipeText = `RECIPE: ${item.name || ''}\n\n`;
          let hasInstructions = false;

          if (item.recipeIngredient) {
            recipeText += 'INGREDIENTS:\n';
            recipeText += item.recipeIngredient.join('\n') + '\n\n';
          }

          if (item.recipeInstructions) {
            recipeText += 'INSTRUCTIONS:\n';
            if (Array.isArray(item.recipeInstructions)) {
              item.recipeInstructions.forEach((step, i) => {
                let stepText = '';
                if (typeof step === 'string') {
                  stepText = step;
                } else if (step['@type'] === 'HowToStep' || step.text) {
                  stepText = step.text || step.name || '';
                } else {
                  stepText = step.name || '';
                }
                if (stepText && stepText.length > 10) {
                  recipeText += `${i + 1}. ${stepText}\n`;
                  hasInstructions = true;
                }
              });
            }
          }

          // Only use JSON-LD if it has substantial instructions (at least 3 steps or detailed content)
          if (hasInstructions && recipeText.length > 200) {
            jsonLdRecipeText = recipeText;
            break; // Use first good recipe found
          }
        }
      }
    } catch (e) {
      // If JSON-LD parsing fails, continue with scraped text
      console.log('JSON-LD parse error:', e.message);
    }
  }

  // If we have good JSON-LD data, combine it with scraped text for completeness
  if (jsonLdRecipeText) {
    // Combine JSON-LD with scraped text to ensure we have everything
    return `${jsonLdRecipeText}\n\n--- Additional content from page ---\n${text}`;
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
    // Validate request body
    if (!req.body) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    const { prompt, method = 'generateContent', model = 'gemini-2.0-flash', fileData, filesData, url, currentRecipe, modify, question, action, content, type, conversationHistory = '' } = req.body;

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Handle validation requests
    if (action === 'validate') {
      try {
        let isValid = false;

        if (type === 'message') {
          // Validate chat message
          isValid = await validateCookingMessage(content, apiKey);
        } else if (type === 'content') {
          // Validate URL content (title and headings)
          const { title, headings } = content;
          isValid = await validateCookingContent(title, headings, apiKey);
        } else {
          return res.status(400).json({ error: 'Invalid validation type. Use "message" or "content".' });
        }

        return res.status(200).json({ isValid });
      } catch (validationError) {
        console.error('Validation error:', validationError);
        // On validation error, return true to avoid blocking legitimate requests
        return res.status(200).json({ isValid: true });
      }
    }

    // If URL is provided, fetch and extract content from it
    let finalPrompt = prompt || '';
    if (url) {
      try {
        // Check if it's a YouTube URL
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
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
          console.log('Fetching YouTube video metadata for ID:', videoId);

          let youtubeResponse;
          try {
            youtubeResponse = await fetch(youtubeApiUrl);
          } catch (fetchError) {
            console.error('YouTube API fetch failed:', fetchError);
            return res.status(500).json({
              error: 'Failed to connect to YouTube API',
              details: fetchError.message
            });
          }

          if (!youtubeResponse.ok) {
            let errorText = '';
            try {
              errorText = await youtubeResponse.text();
            } catch (e) {
              errorText = 'Could not read error response';
            }
            console.error('YouTube API error response:', youtubeResponse.status, errorText);
            return res.status(400).json({
              error: `YouTube API error: ${youtubeResponse.status}`,
              details: errorText.substring(0, 200)
            });
          }

          const youtubeData = await youtubeResponse.json();
          console.log('YouTube API response received, items count:', youtubeData.items?.length || 0);

          if (!youtubeData.items || youtubeData.items.length === 0) {
            return res.status(404).json({
              error: 'Video not found',
              details: 'The YouTube video ID could not be found. It may be private, deleted, or invalid.'
            });
          }

          const video = youtubeData.items[0];
          if (!video || !video.snippet) {
            console.error('YouTube API returned invalid video data:', video);
            return res.status(500).json({
              error: 'YouTube API returned invalid data',
              details: 'Video snippet is missing'
            });
          }
          const videoTitle = video.snippet.title || 'Unknown Title';
          const videoDescription = video.snippet.description || '';

          // Step 1: Validate YouTube video title is cooking-related
          console.log('Validating YouTube video title:', videoTitle);
          let isCookingVideo = true;
          try {
            isCookingVideo = await validateCookingMessage(videoTitle, apiKey);
          } catch (validationError) {
            console.error('Validation error (allowing through):', validationError);
            // Allow through on validation error to avoid blocking
            isCookingVideo = true;
          }

          if (!isCookingVideo) {
            return res.status(400).json({
              error: 'This YouTube video does not appear to be cooking or recipe-related.',
              details: 'Please provide a link to a cooking video.'
            });
          }

          // Step 2: Check if description contains recipe directly
          let recipeInDescription = false;
          // Relaxed check: Lower length limit and be more lenient with keywords
          if (videoDescription && videoDescription.length > 50) {
            // Check if description has recipe-like structure
            const hasIngredients = /ingredients?:|what you need|shopping list/i.test(videoDescription);
            const hasInstructions = /instructions?:|directions?:|steps?:|process:|how to make|method/i.test(videoDescription);
            const hasLists = /[•\-\*]/.test(videoDescription); // Check for bullet points

            // If it has ingredients OR instructions OR bullet points, it might be a recipe
            recipeInDescription = hasIngredients || hasInstructions || hasLists;

            if (recipeInDescription) {
              console.log('Recipe likely in description (relaxed check)');
              finalPrompt = `Extract the recipe from this YouTube video description:\n\n${videoDescription}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }'}`;
              // We still check for links/pinned comments as they might be better sources, 
              // but we have a fallback now.
            }
          }

          // Step 3: If no recipe in description (or we want to check for better sources), check pinned comment
          let pinnedCommentRecipe = '';
          // Always check pinned comment if description is short or ambiguous
          if (!recipeInDescription || videoDescription.length < 500) {
            console.log('Checking pinned comment for better recipe source...');
            const pinnedComment = await extractPinnedComment(videoId, youtubeApiKey);

            if (pinnedComment) {
              const hasRecipe = await commentContainsRecipe(pinnedComment, apiKey);

              if (hasRecipe) {
                console.log('Recipe found in pinned comment');
                finalPrompt = `Extract the recipe from this pinned comment:\n\n${pinnedComment}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }'}`;
                recipeInDescription = true;
                // Pinned comment is usually the best source if it contains a recipe
              }
            }
          }

          // Step 4: Check description for recipe links (highest priority if found)
          let recipeContent = '';
          let recipeLinks = [];

          // Check if description contains recipe links
          const urlPattern = /(https?:\/\/[^\s\)]+)/g;
          const urls = (videoDescription && videoDescription.match(urlPattern)) || [];

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
                    // If we found a link, use it as the primary source
                    finalPrompt = `Extract the recipe from the following content. The YouTube video description contained a link to the full recipe:\n\n${recipeContent}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }'}`;
                    recipeInDescription = true;
                    break; // Use first successful extraction
                  }
                }
              } catch (linkError) {
                console.error('Error fetching recipe link:', linkError);
                // Continue to next link or description
              }
            }
          }

          // Step 5: Fallback - if no specific recipe found but we have a description, try to use it
          if (!recipeInDescription && !recipeContent && videoDescription) {
            console.log('No specific recipe structure found, but using description as fallback');
            finalPrompt = `Extract the recipe from this YouTube video description. It might be unstructured or brief:\n\n${videoDescription}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }'}`;
            recipeInDescription = true;
          }

          // Step 6: If still no content to process, return error
          if (!finalPrompt) {
            return res.status(400).json({
              error: 'Recipe not found in this YouTube video.',
              details: 'Could not find recipe in description, pinned comment, or linked websites. The recipe might be shown only in the video.'
            });
          }

          // Combine video info with recipe content and prompt (if not already set by link extraction)
          if (!recipeContent) {
            // Logic handled above by setting finalPrompt directly for description/comment
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

          // Validate that the page is cooking-related
          const pageTitle = extractPageTitle(html);
          const pageHeadings = extractMainHeadings(html);

          console.log('Validating page content - Title:', pageTitle, 'Headings count:', pageHeadings.length);

          const isValidCookingContent = await validateCookingContent(pageTitle, pageHeadings, apiKey);

          if (!isValidCookingContent) {
            return res.status(400).json({
              error: 'This link does not appear to contain cooking or recipe content.',
              details: 'Please provide a URL to a recipe or cooking-related page.'
            });
          }

          // Extract main content from HTML
          const content = extractRecipeContent(html);

          // Log content preview for debugging
          const contentPreview = content.substring(0, 500);
          console.log('Extracted content preview:', contentPreview);
          console.log('Extracted content length:', content.length);

          // If content seems too short, warn
          if (content.length < 500) {
            console.warn('Warning: Extracted content seems very short. The page might require JavaScript to load content.');
          }

          // Combine URL content with prompt
          finalPrompt = `Extract the recipe from this webpage content. The content below contains the full recipe text from the webpage:\n\n${content}\n\n${prompt || 'Extract the complete recipe and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }. CRITICAL INSTRUCTIONS: For the instructions array, extract ALL step-by-step instructions from the "Process" or "Instructions" section. Instructions may be numbered (e.g., "1. Add chicken...") OR bullet points (e.g., "• Add chicken..."). Each instruction must be a complete, detailed sentence describing what to do. DO NOT include section headings like "To Make the Chicken Rice", "To Make the Omelettes", "To Serve", "To Store", or "Process" - these are NOT instructions. Combine all steps from the Process/Instructions section into a single sequential array. For ingredients, combine all ingredients from all sections into a single array. CRITICAL SEPARATION: Ingredients should ONLY be ingredient names with quantities and measurements. Examples of CORRECT ingredients: "750 gms chicken on bone, curry cut", "1/2 cup yogurt, beaten", "2-3 green chillies, slit", "1 tbsp ginger, chopped", "Salt to taste". Examples of INCORRECT (these are instructions, NOT ingredients): "Add chicken, yogurt, salt and mix well", "Heat ghee in a pan", "Add onions and sauté till brown", "Mix well and set aside". Ingredients are just the raw materials - they do NOT contain action verbs at the start (like "add", "mix", "heat", "cook", "stir") or describe cooking processes. The content above contains the full recipe - extract all steps with their complete descriptions.'}`;
        }
      } catch (urlError) {
        console.error('Error fetching URL:', urlError);
        return res.status(400).json({
          error: 'Failed to fetch URL content',
          details: urlError.message
        });
      }
    }

    // Handle question requests (not recipe modifications)
    if (question) {
      console.log('Answering question:', prompt);

      // Build context-aware prompt
      let contextPrompt = '';

      if (currentRecipe) {
        // Normalize ingredients and instructions
        let ingredientsList = [];
        if (Array.isArray(currentRecipe.ingredients)) {
          if (currentRecipe.ingredients.length > 0 && typeof currentRecipe.ingredients[0] === 'string') {
            ingredientsList = currentRecipe.ingredients;
          } else {
            ingredientsList = currentRecipe.ingredients.flatMap(section => section.items || []);
          }
        }

        contextPrompt += `\nCURRENT RECIPE CONTEXT:\nTitle: ${currentRecipe.title}\nIngredients: ${ingredientsList.slice(0, 10).join(', ')}${ingredientsList.length > 10 ? '...' : ''}\n\n`;
      }

      if (conversationHistory) {
        contextPrompt += `CONVERSATION HISTORY:\n${conversationHistory}\n\n`;
      }

      finalPrompt = `${contextPrompt}USER QUESTION: ${prompt}

Please provide a clear, concise, and helpful answer to this cooking-related question. If the question references the current recipe or previous conversation, use that context in your answer. Keep the answer friendly and focused.`;
    }
    // Handle recipe modification requests
    else if (modify && currentRecipe) {
      console.log('Modifying recipe:', currentRecipe.title);

      // Normalize ingredients and instructions to arrays
      let ingredientsList = [];
      if (Array.isArray(currentRecipe.ingredients)) {
        if (currentRecipe.ingredients.length > 0 && typeof currentRecipe.ingredients[0] === 'string') {
          ingredientsList = currentRecipe.ingredients;
        } else {
          // It's an array of sections
          ingredientsList = currentRecipe.ingredients.flatMap(section => section.items || []);
        }
      }

      let instructionsList = [];
      if (Array.isArray(currentRecipe.instructions)) {
        if (currentRecipe.instructions.length > 0 && typeof currentRecipe.instructions[0] === 'string') {
          instructionsList = currentRecipe.instructions;
        } else {
          // It's an array of sections
          instructionsList = currentRecipe.instructions.flatMap(section => section.items || []);
        }
      }

      // Format current recipe for the prompt
      const recipeText = `CURRENT RECIPE:
Title: ${currentRecipe.title}
${currentRecipe.prepTime ? `Prep Time: ${currentRecipe.prepTime}` : ''}
${currentRecipe.cookTime ? `Cook Time: ${currentRecipe.cookTime}` : ''}

Ingredients:
${ingredientsList.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

Instructions:
${instructionsList.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`;

      let contextSection = '';
      if (conversationHistory) {
        contextSection = `\nCONVERSATION HISTORY:\n${conversationHistory}\n`;
      }

      finalPrompt = `${recipeText}${contextSection}\n\nUSER REQUEST: ${prompt}\n\nPlease modify the recipe according to the user's request and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."], "changesDescription": "..." }. The "changesDescription" field should be a brief summary of what changes were made (e.g., "Made the recipe vegan by replacing chicken with tofu and eggs with a vegan alternative", or "Adjusted ingredient quantities for 2 pounds of chicken"). CRITICAL INSTRUCTIONS: For the instructions array, extract ONLY the numbered step-by-step instructions. DO NOT include section headings. Each instruction must be a complete, detailed sentence describing what to do. Combine all numbered steps into a single sequential array. For ingredients, combine all ingredients into a single array. CRITICAL SEPARATION: Ingredients should ONLY be ingredient names with quantities and measurements. Examples of CORRECT ingredients: "750 gms chicken on bone, curry cut", "1/2 cup yogurt, beaten", "2-3 green chillies, slit". Examples of INCORRECT (these are instructions, NOT ingredients): "Add chicken, yogurt, salt and mix well", "Heat ghee in a pan", "Add onions and sauté till brown". Ingredients are just the raw materials - they do NOT contain action verbs at the start (like "add", "mix", "heat", "cook", "stir") or describe cooking processes. Make sure to preserve the recipe structure and format while applying the requested modifications.`;
    }

    // Validate request
    if (!finalPrompt && !modify && !question) {
      return res.status(400).json({ error: 'Missing required field: prompt or url' });
    }

    // If modify is true but no currentRecipe, return error
    if (modify && !currentRecipe) {
      return res.status(400).json({ error: 'Cannot modify recipe: no current recipe provided' });
    }

    // API key already retrieved above (line 336)

    // Handle image processing with OCR and validation
    if ((filesData && filesData.length > 0) || fileData) {
      console.log('Processing image files with OCR agent...');

      // Get the first file for validation
      const firstFile = filesData && filesData.length > 0 ? filesData[0] : fileData;

      if (firstFile && firstFile.data && firstFile.mimeType) {
        // Step 1: Validate image and extract text
        const validation = await extractAndValidateImage(firstFile, apiKey);

        console.log('Image validation result:', {
          isCooking: validation.isCooking,
          isRecipe: validation.isRecipe,
          message: validation.message
        });

        // Step 2a: If not cooking-related, reject
        if (!validation.isCooking) {
          return res.status(400).json({
            error: 'This image does not appear to be related to cooking.',
            details: validation.message || 'Please provide an image of a recipe or food item.'
          });
        }

        // Step 2b: If cooking but not a recipe, identify the ingredient
        if (validation.isCooking && !validation.isRecipe) {
          console.log('Image is cooking-related but not a recipe - identifying ingredient');
          const description = await identifyIngredient(firstFile, apiKey);

          return res.status(200).json({
            answer: description,
            text: description,
            isIngredientIdentification: true
          });
        }

        // Step 2c: If it's a recipe, continue with extraction
        // The existing Gemini call will handle the actual recipe extraction
        console.log('Image contains a recipe - proceeding with extraction');
      }
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
      console.log('=== GEMINI RESPONSE ===');
      console.log('Response length:', recipeText.length);
      console.log('First 1000 chars:', recipeText.substring(0, 1000));
    }

    // If this is a question request, return the answer directly
    if (question) {
      return res.status(200).json({
        answer: recipeText || 'I apologize, but I couldn\'t generate an answer.',
        text: recipeText
      });
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
            // Filter out instruction-like content from ingredients
            recipe.ingredients = parsed.ingredients.filter(ingredient => {
              if (typeof ingredient !== 'string') return false;
              const trimmed = ingredient.trim();
              if (!trimmed) return false;

              // Filter out section headers
              if (/^(instructions?|directions?|steps?|process|method|for\s+(marination|curry|sauce|dressing|garnish|topping|filling|base|mixture)):?$/i.test(trimmed)) {
                return false;
              }

              // Filter out numbered steps (e.g., "1. Add chicken...")
              if (/^\d+[.)]\s/.test(trimmed)) {
                return false;
              }

              // Filter out lines that start with action verbs (case-insensitive, handles various forms)
              if (/^(add|mix|heat|cook|stir|sauté|saute|roast|garnish|serve|cover|set|fry|boil|simmer|bake|grill|steam|blend|pour|sprinkle|toss|fold|melt|dissolve|combine|separate|divide|transfer|place|arrange|layer|spread|brush|drizzle|dip|coat|dust|flour|batter|chop|slice|dice|mince|crush|beat|whisk|process|marinate|remove|drain|rinse|wash|peel|cut|trim|prepare|bring|reduce|lower|raise|increase)\s/i.test(trimmed)) {
                return false;
              }

              // Filter out sentences that describe a process (contain multiple action verbs or conjunctions indicating steps)
              const actionVerbMatches = trimmed.match(/\b(add|mix|heat|cook|stir|sauté|saute|roast|garnish|serve|cover|set|fry|boil|simmer|bake|grill|steam|blend|pour|sprinkle|toss|fold|melt|dissolve|combine|separate|divide|transfer|place|arrange|layer|spread|brush|drizzle|dip|coat|dust|flour|batter|then|and\s+then|until|till|when|leave|rest|starts?|floating|turn|becomes?)\b/gi);
              if (actionVerbMatches && actionVerbMatches.length >= 2) {
                return false; // Multiple action verbs/indicators = likely an instruction
              }

              // Filter out very long lines (likely instructions, not ingredients)
              // Ingredients are typically short: "1 cup flour" or "2 tbsp butter, melted"
              if (trimmed.length > 120) {
                return false;
              }

              // Filter out lines that look like complete sentences with periods and multiple clauses
              if ((trimmed.match(/\./g) || []).length > 1) {
                return false; // Multiple sentences = likely instruction
              }

              // Filter out lines that contain instruction patterns
              if (/\b(till|until|when|after|before|while|then|and then|mix well|cover and|set aside|leave|rest|marinate for|starts?\s+(to\s+)?(floating|boiling|bubbling)|turn(s|ed)?\s+(brown|golden|soft|tender)|becomes?\s+)/i.test(trimmed)) {
                return false;
              }

              // Filter out sentence structure patterns
              // Common instruction patterns: "Cook till...", "Add the...", etc.
              if (/^(cook|add|mix|heat|stir|sauté|saute)\s+(the|till|until|for|about|some|all)/i.test(trimmed)) {
                return false;
              }

              // Filter out "Procedure" headers (often bolded in markdown)
              if (/^\*+Procedure:?\*+/i.test(trimmed) || /^Procedure:?/i.test(trimmed)) {
                return false;
              }

              // Filter out "Enjoy!" and similar closing remarks
              if (/^(enjoy|bon appetit|happy cooking)!*$/i.test(trimmed)) {
                return false;
              }

              return true;
            });
          }
          if (parsed.instructions && Array.isArray(parsed.instructions)) {
            console.log('Raw instructions from Gemini:', parsed.instructions.length, 'items');
            console.log('First 5 raw instructions:', parsed.instructions.slice(0, 5));

            // Filter out section headings from JSON response
            recipe.instructions = parsed.instructions.filter(instruction => {
              if (typeof instruction !== 'string') {
                console.log('Filtered out non-string instruction:', typeof instruction);
                return false;
              }

              const trimmed = instruction.trim();
              if (!trimmed) {
                console.log('Filtered out empty instruction');
                return false;
              }

              const lower = trimmed.toLowerCase();

              // Filter out section headings (but be more lenient - only filter if it's clearly a heading)
              if (/^to\s+(make|serve|store|prepare|assemble|finish|garnish|plate)\s*$/i.test(lower)) {
                console.log('Filtered out section heading:', trimmed);
                return false; // Likely a section heading
              }

              // Filter out very short lines that look like headings (but be more lenient)
              if (trimmed.length < 15 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/.test(trimmed)) {
                console.log('Filtered out short heading:', trimmed);
                return false; // Looks like a title/heading
              }

              // Keep all other instructions - don't filter them out
              return true;
            });

            console.log('Filtered instructions count:', recipe.instructions.length);
            if (recipe.instructions.length > 0) {
              console.log('First 5 filtered instructions:', recipe.instructions.slice(0, 5));
            } else {
              console.log('WARNING: All instructions were filtered out!');
              console.log('All raw instructions:', parsed.instructions);
            }
          } else {
            console.log('WARNING: No instructions array found in parsed JSON');
            console.log('Parsed keys:', Object.keys(parsed));
          }
          // Include changesDescription if present (for modifications)
          if (parsed.changesDescription) {
            recipe.changesDescription = parsed.changesDescription;
          }
          // If we successfully parsed JSON, run agents and return
          // Only return if we have at least ingredients (instructions might be empty if they were all filtered)
          if (recipe.ingredients.length > 0) {
            console.log('Returning JSON-parsed recipe. Ingredients:', recipe.ingredients.length, 'Instructions:', recipe.instructions.length);

            // Run section detection agent (if not a modification)
            if (!modify) {
              const sectionResult = await detectRecipeSections(
                recipe.ingredients,
                recipe.instructions,
                apiKey
              );

              if (sectionResult.hasSections) {
                recipe.ingredients = sectionResult.ingredients;
                recipe.instructions = sectionResult.instructions;
              }

              // Run nutrition calculation agent
              const nutrition = await calculateNutrition(
                recipe.ingredients,
                recipe.title,
                apiKey
              );

              if (nutrition) {
                recipe.nutrition = nutrition;
              }
            }

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
      // Improved logic to skip conversational openers
      let titleMatch = recipeText.match(/(?:Recipe|Title):\s*(.+)/i);

      if (!titleMatch) {
        // If no explicit "Recipe:" prefix, look for the first line that looks like a title
        // and isn't a conversational opener
        const potentialTitleMatch = recipeText.match(/^(.+?)(?:\n|Ingredients|Instructions)/i);
        if (potentialTitleMatch) {
          let potentialTitle = potentialTitleMatch[1].trim();

          // Check if it's a conversational opener
          const conversationalPattern = /^(okay|sure|here|certainly|i found|based on|extracted|from the|this is|recipe for|extracted from)/i;

          if (conversationalPattern.test(potentialTitle)) {
            // It's conversational, try to find the real title
            // Look for a line that is short, capitalized, and not conversational
            const titleLine = lines.find(line => {
              const trimmed = line.trim();
              return trimmed.length > 3 &&
                trimmed.length < 60 &&
                !conversationalPattern.test(trimmed) &&
                !/^(ingredients?|instructions?|directions?|steps?)/i.test(trimmed);
            });

            if (titleLine) {
              recipe.title = titleLine.trim();
            } else {
              // Fallback: clean the conversational part if possible
              recipe.title = potentialTitle.replace(/^(okay|sure|here|certainly|i found|based on|extracted|from the|this is|recipe for|extracted from).*?(?:is|:)\s*/i, '');
            }
          } else {
            recipe.title = potentialTitle;
          }
        }
      } else {
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
          .filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return false;

            // Filter out section headers
            if (/^(instructions?|directions?|steps?|process|method|for\s+(marination|curry|sauce|dressing|garnish|topping|filling|base|mixture)):?$/i.test(trimmed)) {
              return false;
            }

            // Filter out numbered steps
            if (/^\d+[.)]\s/.test(trimmed)) {
              return false;
            }

            // Filter out lines that start with action verbs
            if (/^(add|mix|heat|cook|stir|sauté|saute|roast|garnish|serve|cover|set|fry|boil|simmer|bake|grill|steam|blend|pour|sprinkle|toss|fold|melt|dissolve|combine|separate|divide|transfer|place|arrange|layer|spread|brush|drizzle|dip|coat|dust|flour|batter|chop|slice|dice|mince|crush|beat|whisk|process|marinate|remove|drain|rinse|wash|peel|cut|trim|prepare|bring|reduce|lower|raise|increase)\s/i.test(trimmed)) {
              return false;
            }

            // Filter out sentences that describe a process
            const actionVerbMatches = trimmed.match(/\b(add|mix|heat|cook|stir|sauté|saute|roast|garnish|serve|cover|set|fry|boil|simmer|bake|grill|steam|blend|pour|sprinkle|toss|fold|melt|dissolve|combine|then|and\s+then|until|till|when|leave|rest|starts?|floating|turn|becomes?)\b/gi);
            if (actionVerbMatches && actionVerbMatches.length >= 2) {
              return false;
            }

            // Filter out very long lines (likely instructions, not ingredients)
            if (trimmed.length > 120) {
              return false;
            }

            // Filter out lines with multiple sentences
            if ((trimmed.match(/\./g) || []).length > 1) {
              return false;
            }

            // Filter out instruction patterns
            if (/\b(till|until|when|after|before|while|then|and then|mix well|cover and|set aside|leave|rest|marinate for|starts?\s+(to\s+)?(floating|boiling|bubbling)|turn(s|ed)?\s+(brown|golden|soft|tender)|becomes?\s+)/i.test(trimmed)) {
              return false;
            }

            // Filter out sentence structure patterns
            if (/^(cook|add|mix|heat|stir|sauté|saute)\s+(the|till|until|for|about|some|all)/i.test(trimmed)) {
              return false;
            }

            // Filter out "Procedure" headers (often bolded in markdown)
            if (/^\*+Procedure:?\*+/i.test(trimmed) || /^Procedure:?/i.test(trimmed)) {
              return false;
            }

            // Filter out "Enjoy!" and similar closing remarks
            if (/^(enjoy|bon appetit|happy cooking)!*$/i.test(trimmed)) {
              return false;
            }

            return true;
          })
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
      }

      // Improved instructions parsing - extract all numbered steps
      // Look for instructions section (including "Process" which is common in Indian recipes)
      const instructionsStart = lines.findIndex(line =>
        /instructions?|directions?|steps?|process/i.test(line)
      );

      if (instructionsStart !== -1) {
        const instructionLines = lines.slice(instructionsStart + 1);
        const instructions = [];
        let currentStep = '';

        for (let i = 0; i < instructionLines.length; i++) {
          const line = instructionLines[i];
          const trimmed = line.trim();

          // Skip empty lines
          if (!trimmed) continue;

          // Check if this line starts a new numbered step (e.g., "1. Add chicken...")
          const stepMatch = trimmed.match(/^(\d+)[.)]\s*(.+)/);
          if (stepMatch) {
            // Save previous step if exists
            if (currentStep.trim()) {
              instructions.push(currentStep.trim());
            }
            // Start new step
            currentStep = stepMatch[2];
          }
          // Check if this line starts with a bullet point (•, -, *, etc.)
          else if (/^[•\-\*]\s*(.+)/.test(trimmed)) {
            const bulletMatch = trimmed.match(/^[•\-\*]\s*(.+)/);
            if (bulletMatch) {
              // Save previous step if exists
              if (currentStep.trim()) {
                instructions.push(currentStep.trim());
              }
              // Start new step from bullet point
              currentStep = bulletMatch[1];
            }
          }
          else {
            // Continue current step (might be multi-line)
            if (currentStep) {
              currentStep += ' ' + trimmed;
            } else if (trimmed && !/^(ingredients?|instructions?|directions?|steps?|process|title|recipe|for\s+(marination|curry)):?$/i.test(trimmed)) {
              // If no current step but line looks like content, start one
              // But skip section headers
              currentStep = trimmed;
            }
          }
        }

        // Add last step
        if (currentStep.trim()) {
          instructions.push(currentStep.trim());
        }

        // Filter out section headings (common patterns like "To Make...", "To Serve", "To Store")
        const filteredInstructions = instructions.filter(instruction => {
          const trimmed = instruction.trim();
          if (!trimmed) return false;

          const lower = trimmed.toLowerCase();

          // Filter out section headings (but be more lenient - only filter if it's clearly just a heading)
          if (/^to\s+(make|serve|store|prepare|assemble|finish|garnish|plate)\s*$/i.test(lower)) {
            console.log('Text parsing: Filtered out section heading:', trimmed);
            return false; // Likely a section heading, not an instruction
          }

          // Filter out very short lines that look like headings (but be more lenient)
          if (trimmed.length < 15 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/.test(trimmed)) {
            console.log('Text parsing: Filtered out short heading:', trimmed);
            return false; // Looks like a title/heading
          }

          // Keep all other instructions
          return true;
        });

        console.log('Text parsing: Extracted', instructions.length, 'instructions, filtered to', filteredInstructions.length);

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
              if (/^(ingredients?|instructions?|directions?|steps?|title|recipe|changesDescription):/i.test(trimmed)) {
                return false;
              }
              return true;
            })
            .map(line => line.replace(/^\d+[.)]\s*/, '').trim())
            .filter(line => line.length > 0);
        }
      }

      // Try to extract changesDescription from text (fallback if not in JSON)
      if (modify && !recipe.changesDescription) {
        const changesMatch = recipeText.match(/(?:changesDescription|changes?|modifications?):\s*(.+?)(?:\n|$)/i);
        if (changesMatch) {
          recipe.changesDescription = changesMatch[1].trim();
        }
      }
    }

    console.log('=== FINAL RECIPE ===');
    console.log('Title:', recipe.title);
    console.log('Ingredients count:', recipe.ingredients.length);
    console.log('Instructions count:', recipe.instructions.length);
    console.log('First 3 instructions:', recipe.instructions.slice(0, 3));

    // Step 4: Detect recipe sections (only if not a modification request)
    if (!modify && recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
      console.log('Running section detection agent...');
      const sectionResult = await detectRecipeSections(
        recipe.ingredients,
        recipe.instructions,
        apiKey
      );

      if (sectionResult.hasSections) {
        console.log('Sections detected - updating recipe structure');
        recipe.ingredients = sectionResult.ingredients;
        recipe.instructions = sectionResult.instructions;
      } else {
        console.log('No sections detected - keeping flat structure');
      }
    }

    // Step 5: Calculate nutrition information (only for new extractions, not modifications)
    if (!modify && recipe.ingredients.length > 0) {
      console.log('Running nutrition calculation agent...');
      const nutrition = await calculateNutrition(
        recipe.ingredients,
        recipe.title,
        apiKey
      );

      if (nutrition) {
        recipe.nutrition = nutrition;
        console.log('Nutrition calculated:', nutrition);
      } else {
        console.log('Nutrition calculation failed or skipped');
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

