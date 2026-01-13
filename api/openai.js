// Vercel Serverless Function - OpenAI API Proxy
// Proxies requests to OpenAI API using 'gpt-5-nano' as requested
// Replicates all functionality from api/gemini.js

// --- Helper Functions (Ported from gemini.js) ---

function extractPageTitle(html) {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        return titleMatch[1]
            .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    }
    return '';
}

function extractMainHeadings(html) {
    const headings = [];
    const h1Matches = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi);
    for (const match of h1Matches) {
        if (match[1]) headings.push(cleanText(match[1]));
    }
    const h2Matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
    let h2Count = 0;
    for (const match of h2Matches) {
        if (h2Count++ < 5 && match[1]) headings.push(cleanText(match[1]));
    }
    return headings;
}

function cleanText(text) {
    return text.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function extractRecipeContent(html) {
    // Remove script and style tags first (except JSON-LD which we process separately)
    let cleanHtml = html.replace(/<script(?![^>]*type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Try to find recipe-specific content areas
    const recipeSelectors = [
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*class="[^"]*recipe[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*wprm-recipe-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];

    let extractedContent = '';
    let bestMatch = null;
    let bestLength = 0;

    // Try all selectors and pick the one with the most content
    for (const selector of recipeSelectors) {
        const matches = cleanHtml.matchAll(new RegExp(selector.source, 'gi'));
        for (const match of matches) {
            if (match && match[1]) {
                const content = match[1];
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
        const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        extractedContent = bodyMatch ? bodyMatch[1] : cleanHtml;
    }

    // Remove non-recipe elements
    extractedContent = extractedContent.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    extractedContent = extractedContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    extractedContent = extractedContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    extractedContent = extractedContent.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    extractedContent = extractedContent.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');

    // Convert HTML to readable text with structure preserved
    let text = extractedContent
        .replace(/<ol[^>]*>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<h[1-6][^>]*>/gi, '\n### ')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

    // Try to extract JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    let bestRecipeText = '';
    let bestRecipeLength = 0;

    for (const jsonLdMatch of jsonLdMatches) {
        try {
            const jsonLd = JSON.parse(jsonLdMatch[1]);
            const items = Array.isArray(jsonLd) ? jsonLd : (jsonLd['@graph'] || [jsonLd]);

            for (const item of items) {
                if (item['@type'] === 'Recipe' || item['@type'] === 'https://schema.org/Recipe') {
                    let recipeText = `RECIPE: ${item.name || ''}\n\n`;
                    let instructionCount = 0;

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
                                } else if (step['@type'] === 'HowToSection' && step.itemListElement) {
                                    // Handle nested sections (common in detailed recipes)
                                    step.itemListElement.forEach((subStep) => {
                                        const subText = subStep.text || subStep.name || '';
                                        if (subText && subText.length > 10) {
                                            recipeText += `${instructionCount + 1}. ${subText}\n`;
                                            instructionCount++;
                                        }
                                    });
                                    return;
                                } else {
                                    stepText = step.name || '';
                                }
                                if (stepText && stepText.length > 10) {
                                    recipeText += `${instructionCount + 1}. ${stepText}\n`;
                                    instructionCount++;
                                }
                            });
                        }
                    }

                    // Keep the recipe with the MOST content (longest/most detailed)
                    if (instructionCount > 0 && recipeText.length > bestRecipeLength) {
                        bestRecipeText = recipeText;
                        bestRecipeLength = recipeText.length;
                        console.log(`Found recipe "${item.name}" with ${instructionCount} instructions`);
                    }
                }
            }
        } catch (e) {
            console.log('JSON-LD parse error:', e.message);
        }
    }

    let jsonLdRecipeText = bestRecipeText;

    // Combine JSON-LD with scraped text if available
    if (jsonLdRecipeText) {
        return `${jsonLdRecipeText}\n\n--- Additional content ---\n${text.substring(0, 10000)}`;
    }

    // Limit content length
    if (text.length > 20000) {
        text = text.substring(0, 20000) + '...';
    }

    return text;
}

// --- OpenAI Agent Helpers ---

async function callOpenAI(prompt, systemPrompt, apiKey, model, jsonMode = false) {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    const body = {
        model: model,
        messages: messages,
    };

    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// --- Main Handler ---

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { prompt, model = 'gpt-4o-mini', fileData, filesData, url, currentRecipe, modify, question, action, content, type, conversationHistory = '' } = req.body;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

        // 1. Validation & Nutrition Logic
        if (action === 'determine_intent') {
            const systemPrompt = `You are the brain of a recipe app. Determine the user's intent based on their message and context. Choose the most appropriate function to call.

IMPORTANT RULES FOR IMAGES:
- If user has an image AND asks "what can I cook/make with these?", "recipe ideas?", "suggest something", or similar → use 'suggest_recipes'
- If user has an image AND asks "what is this?", "identify this", "describe this" → use 'answer_question'
- If user has an image of ingredients/food AND wants recipe suggestions → use 'suggest_recipes'

For text-only requests:
- Recipe requests like "give me a X recipe", "make me X", "I want to cook X", "recipe for X" → use 'suggest_recipes'  
- Recipe suggestions, dish ideas, "I have X, what can I make?" → use 'suggest_recipes'
- General cooking questions, explanations, "how do I...", "what is..." → use 'answer_question'
- If ambiguous, prefer 'suggest_recipes' for anything that sounds like wanting a recipe`;

            const tools = [
                {
                    type: "function",
                    function: {
                        name: "answer_question",
                        description: "Answer general cooking questions, identify/describe a food item in an image ('what is this?'), explain ingredients, or answer questions about the current recipe. Use this for identification and Q&A, NOT for recipe suggestions.",
                        parameters: { type: "object", properties: {}, required: [] }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "suggest_recipes",
                        description: "Suggest recipes based on ingredients (text OR image), leftovers, specific dish requests, or when user asks for a recipe by name. Use this when user asks 'what can I cook/make with these?', 'recipe ideas', 'suggest something', 'give me a X recipe', 'make me X', 'I want to cook X', or shows ingredient photos wanting recipe suggestions. This is the PRIMARY action for any request that wants recipe suggestions or a recipe for a specific dish.",
                        parameters: { type: "object", properties: {}, required: [] }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "modify_recipe",
                        description: "Modify the CURRENTLY loaded recipe (e.g., 'make it spicy', 'adjust for 2 people'). Only valid if a recipe is currently active.",
                        parameters: { type: "object", properties: {}, required: [] }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "extract_recipe",
                        description: "Extract a recipe from provided text, URL, or finding a recipe in the message. ONLY use this if the user explicitly asks to 'extract', 'save', 'get the recipe', or if the input is a URL/long text that is clearly a recipe.",
                        parameters: { type: "object", properties: {}, required: [] }
                    }
                }
            ];

            try {
                // Check if files are present in the request (we don't send file data to determine_intent to save tokens, just metadata)
                // Actually the frontend sends 'prompt' and 'currentRecipe'. We need to know if files are attached.
                // We'll trust the user prompt context or just add it if possible.
                // For now, let's assume the prompt implies it or we allow Q&A to handle it.
                const hasFile = (fileData || (filesData && filesData.length > 0)) ? 'yes' : 'no';

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: `Context: ${currentRecipe ? 'Recipe Active' : 'No Recipe'}\nHas File: ${hasFile}\nMessage: ${prompt}` }
                        ],
                        tools: tools,
                        tool_choice: "required"
                    })
                });

                const data = await response.json();
                const toolCall = data.choices[0]?.message?.tool_calls?.[0];

                if (toolCall) {
                    return res.status(200).json({ intent: toolCall.function.name });
                } else {
                    return res.status(200).json({ intent: 'answer_question' }); // Default fallback
                }

            } catch (e) {
                console.error('Intent determination error', e);
                return res.status(200).json({ intent: 'answer_question' }); // Fail safe
            }
        }

        if (action === 'validate') {
            const validationSystemPrompt = `You are a content filter. Respond with JSON: { "isValid": boolean }. Valid content is related to cooking, recipes, food, ingredients, or culinary techniques.`;
            let validationPrompt = '';

            if (type === 'message') {
                validationPrompt = `Assess this message: "${content}"`;
            } else if (type === 'content') {
                validationPrompt = `Assess this webpage: Title: "${content.title}", Headings: "${content.headings.join(', ')}"`;
            }

            try {
                const resp = await callOpenAI(validationPrompt, validationSystemPrompt, apiKey, model, true);
                const json = JSON.parse(resp);
                return res.status(200).json({ isValid: json.isValid });
            } catch (e) {
                console.error('Validation error', e);
                return res.status(200).json({ isValid: true }); // Fail open
            }
        }

        if (action === 'calculateNutrition') {
            const ingredients = req.body.ingredients;
            const title = req.body.title || 'Recipe';

            // Check if ingredients are present
            if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
                return res.status(200).json({ nutrition: null });
            }

            const nutritionSystemPrompt = `You are a nutritionist. Calculate estimated macros for the ENTIRE recipe.
             Return JSON: { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }.
             All values should be total for the whole recipe (not per serving). Use standard USDA data.`;

            let ingredientsList = [];
            if (Array.isArray(ingredients)) {
                ingredientsList = ingredients.flatMap(i => (typeof i === 'object' && i.items) ? i.items : i);
            }

            const nutritionPrompt = `Recipe: ${title}\nIngredients:\n${ingredientsList.join('\n')}`;

            try {
                const resp = await callOpenAI(nutritionPrompt, nutritionSystemPrompt, apiKey, model, true);
                const json = JSON.parse(resp);
                return res.status(200).json({ nutrition: json });
            } catch (e) {
                console.error('Nutrition calc error', e);
                return res.status(200).json({ nutrition: null });
            }
        }

        // 2. URL Processing (YouTube & Web Scraping)
        let finalPrompt = prompt || '';
        let extractedContext = '';

        if (url) {
            // YouTube Logic (Simplified: Check for ID, use description)
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const youtubeMatch = url.match(youtubeRegex);

            if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                const youtubeApiKey = process.env.YOUTUBE_API_KEY;

                if (!youtubeApiKey) {
                    return res.status(400).json({
                        error: 'YouTube API key not configured. Cannot extract recipe from YouTube videos.'
                    });
                }

                try {
                    console.log('Detected YouTube video ID:', videoId);

                    // Fetch video metadata
                    const ytResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=snippet`);

                    if (!ytResp.ok) {
                        const errText = await ytResp.text();
                        return res.status(400).json({
                            error: `YouTube API error: ${ytResp.status}`,
                            details: errText.substring(0, 200)
                        });
                    }

                    const ytData = await ytResp.json();

                    if (!ytData.items || ytData.items.length === 0) {
                        return res.status(404).json({
                            error: 'Video not found',
                            details: 'The YouTube video ID could not be found. It may be private, deleted, or invalid.'
                        });
                    }

                    const snippet = ytData.items[0].snippet;
                    const videoTitle = snippet.title || 'Unknown Title';
                    const videoDescription = snippet.description || '';

                    console.log('YouTube video title:', videoTitle);

                    // Step 1: Validate if video is cooking-related
                    try {
                        const validationResp = await callOpenAI(
                            `Is this video title about cooking, recipes, or food? Title: "${videoTitle}"`,
                            'Respond with JSON: { "isCooking": boolean }',
                            apiKey, model, true
                        );
                        const validation = JSON.parse(validationResp);
                        if (!validation.isCooking) {
                            return res.status(400).json({
                                error: 'This YouTube video does not appear to be cooking or recipe-related.',
                                details: 'Please provide a link to a cooking video.'
                            });
                        }
                    } catch (e) {
                        console.warn('Validation failed, allowing through:', e.message);
                    }

                    let recipeFound = false;

                    // Step 2: Check if description contains recipe structure
                    if (videoDescription && videoDescription.length > 50) {
                        const hasIngredients = /ingredients?:|what you need|shopping list/i.test(videoDescription);
                        const hasInstructions = /instructions?:|directions?:|steps?:|process:|how to make|method/i.test(videoDescription);
                        const hasLists = /[•\-\*]/.test(videoDescription);

                        if (hasIngredients || hasInstructions || hasLists) {
                            console.log('Recipe likely in description');
                            extractedContext = `YouTube Video: ${videoTitle}\n\nDescription with recipe:\n${videoDescription}`;
                            finalPrompt = `Extract the recipe from this YouTube video description:\n\n${extractedContext}\n\n${prompt}`;
                            recipeFound = true;
                        }
                    }

                    // Step 3: Check pinned comment if no recipe in description
                    if (!recipeFound || videoDescription.length < 500) {
                        console.log('Checking pinned comment for recipe...');
                        try {
                            const commentsResp = await fetch(
                                `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=5&key=${youtubeApiKey}`
                            );

                            if (commentsResp.ok) {
                                const commentsData = await commentsResp.json();

                                if (commentsData.items && commentsData.items.length > 0) {
                                    // Look for channel owner's comment (likely pinned)
                                    for (const item of commentsData.items) {
                                        const comment = item.snippet?.topLevelComment?.snippet;
                                        if (!comment || !comment.textDisplay) continue;

                                        const isChannelOwner = comment.authorChannelId?.value === item.snippet.channelId;

                                        if (isChannelOwner && comment.textDisplay.length > 50) {
                                            const commentText = comment.textDisplay
                                                .replace(/<[^>]*>/g, '')
                                                .replace(/&quot;/g, '"')
                                                .replace(/&amp;/g, '&')
                                                .replace(/<br\s*\/?>/gi, '\n');

                                            // Check if comment contains recipe
                                            const hasRecipeStructure = /ingredients?|instructions?|steps?|directions?/i.test(commentText);
                                            if (hasRecipeStructure) {
                                                console.log('Found recipe in pinned comment');
                                                extractedContext = `YouTube Video: ${videoTitle}\n\nPinned Comment with recipe:\n${commentText}`;
                                                finalPrompt = `Extract the recipe from this pinned comment:\n\n${extractedContext}\n\n${prompt}`;
                                                recipeFound = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('Could not fetch comments:', e.message);
                        }
                    }

                    // Step 4: Check for recipe links in description (ALWAYS check, even if description has some structure)
                    // Many creators link to their website with the full recipe
                    const urlPattern = /(https?:\/\/[^\s\)\]]+)/g;
                    const allUrls = videoDescription.match(urlPattern) || [];

                    console.log('Found URLs in description:', allUrls.length);

                    // Known recipe sites get priority
                    const knownRecipeSites = /justonecookbook|allrecipes|foodnetwork|tasty|seriouseats|bonappetit|epicurious|delish|thekitchn|food52|minimalistbaker|pinchofyum|halfbakedharvest|bbcgoodfood|jamieoliver|marthastewart|budgetbytes|simplyrecipes|skinnytaste|cookieandkate|loveandlemons|hostthetoast|recipetineats|therecipecritic/i;

                    // Exclude non-recipe URLs
                    const excludePatterns = /youtube\.com|youtu\.be|instagram\.com|twitter\.com|facebook\.com|tiktok\.com|patreon\.com|amazon\.com|amzn\.to|bit\.ly|linktr\.ee|discord\.com|twitch\.tv|spotify\.com|apple\.com|google\.com|goo\.gl/i;

                    // Separate into priority (known recipe sites) and other URLs
                    const priorityUrls = [];
                    const otherUrls = [];

                    for (const rawUrl of allUrls) {
                        const cleanUrl = rawUrl.replace(/[.,;!?\]\)]+$/, '');

                        if (excludePatterns.test(cleanUrl)) {
                            continue; // Skip social media and non-recipe links
                        }

                        if (knownRecipeSites.test(cleanUrl)) {
                            priorityUrls.push(cleanUrl);
                        } else {
                            otherUrls.push(cleanUrl);
                        }
                    }

                    // Try priority URLs first, then other URLs
                    const urlsToTry = [...priorityUrls, ...otherUrls].slice(0, 5);

                    console.log('URLs to try for recipe:', urlsToTry);

                    for (const recipeUrl of urlsToTry) {
                        console.log('Trying to fetch recipe from:', recipeUrl);
                        try {
                            const linkResp = await fetch(recipeUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.5'
                                },
                                redirect: 'follow'
                            });

                            if (linkResp.ok) {
                                const html = await linkResp.text();
                                const content = extractRecipeContent(html);

                                // Check if content looks like a recipe (has ingredients or instructions keywords)
                                const looksLikeRecipe = content && content.length > 200 &&
                                    (/ingredients?/i.test(content) || /instructions?|directions?|steps?/i.test(content));

                                if (looksLikeRecipe) {
                                    console.log('Successfully extracted recipe from:', recipeUrl);
                                    extractedContext = `Recipe from ${recipeUrl}:\n\n${content}`;
                                    finalPrompt = `Extract the recipe from this linked website. Include exact quantities for ingredients:\n\n${extractedContext}\n\n${prompt}`;
                                    recipeFound = true;
                                    break;
                                } else {
                                    console.log('Content from URL does not look like a recipe, trying next...');
                                }
                            } else {
                                console.log('Failed to fetch URL:', recipeUrl, 'Status:', linkResp.status);
                            }
                        } catch (e) {
                            console.warn('Could not fetch recipe link:', recipeUrl, e.message);
                        }
                    }

                    // Step 5: Fallback - use description even if no clear recipe structure
                    if (!recipeFound && videoDescription && videoDescription.length > 100) {
                        console.log('Using description as fallback');
                        extractedContext = `YouTube Video: ${videoTitle}\n\nDescription:\n${videoDescription}`;
                        finalPrompt = `This YouTube video description may contain a recipe. Try to extract it. If no recipe is found, respond with: { "title": "Recipe not found", "ingredients": [], "instructions": [] }\n\n${extractedContext}\n\n${prompt}`;
                        recipeFound = true;
                    }

                    // Step 6: No recipe found anywhere
                    if (!recipeFound) {
                        return res.status(400).json({
                            error: 'Recipe not found in this YouTube video.',
                            details: 'Could not find recipe in video description, pinned comment, or linked websites. The recipe might only be shown in the video itself.'
                        });
                    }

                } catch (e) {
                    console.error('YouTube processing error:', e);
                    return res.status(500).json({
                        error: 'Failed to process YouTube video',
                        details: e.message
                    });
                }
            } else {
                // Generic URL Scraping
                try {
                    console.log('Scraping URL:', url);
                    const webResp = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                        }
                    });

                    if (webResp.ok) {
                        const html = await webResp.text();
                        console.log('Scraped HTML length:', html.length);
                        const pageContent = extractRecipeContent(html);
                        console.log('Extracted content length:', pageContent.length);

                        if (pageContent.length > 100) {
                            extractedContext = `Webpage Content: ${pageContent}`;
                            finalPrompt = `Extract recipe from this webpage. ${extractedContext}\n\n${prompt}`;
                        } else {
                            return res.status(400).json({
                                error: 'Could not extract recipe content from this website. The site may be blocking automated access. Please try copying and pasting the recipe text directly.'
                            });
                        }
                    } else {
                        console.error('Scrape failed with status:', webResp.status);
                        return res.status(400).json({
                            error: `Could not access website (HTTP ${webResp.status}). Please try copying and pasting the recipe text directly.`
                        });
                    }
                } catch (e) {
                    console.error('Web scrape failed:', e.message);
                    return res.status(400).json({
                        error: 'Could not access website. Please try copying and pasting the recipe text directly.'
                    });
                }
            }
        }

        // 3. Image Pre-classification (before constructing prompts)
        // Classify images to determine: isCooking, isRecipe, or ingredient photo
        let imageClassification = null;
        const hasImages = (filesData && filesData.length > 0) || fileData;

        if (hasImages && !url) { // Only classify if we have images and no URL (URL takes priority)
            const firstFile = filesData && filesData.length > 0 ? filesData[0] : fileData;

            if (firstFile && firstFile.data && firstFile.mimeType) {
                console.log('Classifying image before processing...');

                try {
                    // Call OpenAI to classify the image
                    const classificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                {
                                    role: 'system',
                                    content: `Analyze this image and classify it. Return JSON only:
{
  "isCooking": boolean (is this related to cooking, food, or ingredients?),
  "isRecipe": boolean (does this contain a written recipe with ingredients AND instructions?),
  "description": string (brief description of what you see)
}

Examples:
- Recipe card/book with text → isCooking: true, isRecipe: true
- Photo of ingredients/food items → isCooking: true, isRecipe: false
- Random non-food image → isCooking: false, isRecipe: false`
                                },
                                {
                                    role: 'user',
                                    content: [
                                        { type: 'text', text: 'Classify this image:' },
                                        { type: 'image_url', image_url: { url: `data:${firstFile.mimeType};base64,${firstFile.data}` } }
                                    ]
                                }
                            ],
                            response_format: { type: 'json_object' },
                            max_tokens: 200
                        })
                    });

                    if (classificationResponse.ok) {
                        const classData = await classificationResponse.json();
                        const classText = classData.choices[0]?.message?.content;
                        if (classText) {
                            imageClassification = JSON.parse(classText);
                            console.log('Image classification:', imageClassification);
                        }
                    }
                } catch (e) {
                    console.warn('Image classification failed, proceeding anyway:', e.message);
                }

                // Handle classification results
                if (imageClassification) {
                    // Reject non-cooking images
                    if (!imageClassification.isCooking) {
                        return res.status(400).json({
                            error: 'This image does not appear to be related to cooking or food.',
                            details: imageClassification.description || 'Please provide an image of a recipe, food, or ingredients.'
                        });
                    }

                    // If it's an ingredient photo (not a recipe), and user is asking about it
                    // Route to ingredient identification
                    if (imageClassification.isCooking && !imageClassification.isRecipe) {
                        const isAskingAboutImage = /what is this|what are these|identify|describe/i.test(prompt || '');

                        if (isAskingAboutImage && !req.body.suggest) {
                            console.log('Ingredient identification request detected');
                            // Return ingredient description directly
                            return res.status(200).json({
                                answer: imageClassification.description || 'This appears to be a food item or ingredient.',
                                isIngredientIdentification: true
                            });
                        }
                    }
                }
            }
        }

        // 4. Construct System Prompt & User Prompt based on Request Type
        let systemPrompt = "You are Baratie, an AI Recipe Manager. You are helpful, friendly, and expert at parsing and organizing recipes.";
        let userMessageContent = finalPrompt;
        let messages = [];

        // Image Handling (OCR/Vision)
        let imageUrls = [];
        if (filesData && filesData.length > 0) {
            imageUrls = filesData.map(f => {
                return { type: "image_url", image_url: { url: `data:${f.mimeType};base64,${f.data}` } };
            });
        } else if (fileData) {
            imageUrls = [{ type: "image_url", image_url: { url: `data:${fileData.mimeType};base64,${fileData.data}` } }];
        }

        // Define specific task prompts
        if (question) {
            systemPrompt = "You are Baratie, an AI Recipe Manager and cooking expert. Answer the user's question CONCISELY (1-2 paragraphs max). You CAN and SHOULD describe attached food images if asked (e.g. 'What is this?'). If a recipe is provided in context, refer to it. DO NOT output the full recipe unless explicitly asked for ingredients or instructions.\nReturn JSON format: { \"answer\": \"string\" }.";
            // Add context
            if (currentRecipe) userMessageContent += `\nCurrent Recipe: ${JSON.stringify(currentRecipe)}`;
            if (conversationHistory) userMessageContent += `\nHistory: ${conversationHistory}`;

        } else if (modify && currentRecipe) {
            systemPrompt = `You are Baratie, an AI Recipe Manager. Modify the provided recipe based on the user's request.
       Return JSON format: { "title": string, "ingredients": string[], "instructions": string[], "changesDescription": string }.
       Ingredients should be strings with quantity and name. Instructions should be step-by-step strings.
       "changesDescription" should briefly summarize the modifications.`;

            userMessageContent = `Current Recipe: ${JSON.stringify(currentRecipe)}\nUser Request: ${prompt}\nHistory: ${conversationHistory}`;

        } else if (req.body.suggest) {
            systemPrompt = `You are Baratie, an AI Recipe Manager and Chef. Suggest 4 recipes based on the user's request.

If the user attached images of ingredients/food, ANALYZE THE IMAGES to identify what ingredients are shown, then suggest recipes that use those ingredients.

Return JSON format: { "suggestions": [{ "title": string, "description": string }] }.
Do NOT include full ingredients or instructions yet. Just the title and a short 1-sentence description.`;

            userMessageContent = `User Request: ${prompt}\nHistory: ${conversationHistory}`;

        } else {
            // Default: Extraction (from URL, text, or image)
            systemPrompt = `You are Baratie, an AI Recipe Manager. Extract a single recipe from the provided text or image.
       Return JSON format: { "title": string, "ingredients": string[], "instructions": string[] }.
       If the input is just a food image without text, make a best-guess recipe for that dish.
       Do not include markdown formatting like \`\`\`json. Return raw JSON.`;

            // userMessageContent is already set to finalPrompt (which includes scraped content)
        }

        // Construct final message payload
        let finalUserMessage;
        if (imageUrls.length > 0) {
            finalUserMessage = {
                role: "user",
                content: [
                    { type: "text", text: userMessageContent },
                    ...imageUrls
                ]
            };
        } else {
            finalUserMessage = { role: "user", content: userMessageContent };
        }

        messages = [
            { role: "system", content: systemPrompt },
            finalUserMessage
        ];

        // 4. Call OpenAI with Fallback
        let response;
        try {
            console.log(`Calling OpenAI with model: ${model}`);
            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    response_format: { type: "json_object" }
                })
            });

            // If model is invalid (404/400) or fails, try fallback
            if (!response.ok && model !== 'gpt-4o-mini') {
                console.warn(`Primary model ${model} failed (${response.status}). Retrying with gpt-4o-mini...`);
                // Retry with fallback
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: messages,
                        response_format: { type: "json_object" }
                    })
                });
            }

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI Error: ${response.status} ${err}`);
            }

            const data = await response.json();
            const rawContent = data.choices[0].message.content;

            console.log('OpenAI Raw Response:', rawContent.substring(0, 200));

            // 5. Parse and Return
            try {
                const parsed = JSON.parse(rawContent);

                if (req.body.suggest) {
                    return res.status(200).json({ suggestions: parsed.suggestions || parsed.recipes || [] });
                }
                if (question) {
                    return res.status(200).json({ answer: parsed.answer || parsed.text || rawContent });
                }

                // Default extraction/modification return
                return res.status(200).json({ recipe: parsed });

            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                if (question) return res.status(200).json({ answer: rawContent });
                return res.status(500).json({ error: 'Failed to parse OpenAI response', raw: rawContent });
            }

        } catch (error) {
            console.error('API Handler Error:', error);
            return res.status(500).json({ error: error.message });
        }
    } catch (error) {
        console.error('API Handler Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
