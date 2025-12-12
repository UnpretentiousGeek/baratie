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
    // 1. Try to extract JSON-LD first (Gold Standard)
    // We match all scripts and looks for "Recipe" type
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    let bestJsonLd = '';

    for (const match of jsonLdMatches) {
        if (match[1]) {
            const content = match[1];
            // Prioritize block containing "Recipe"
            if (content.includes('"Recipe"') || content.includes("'Recipe'")) {
                bestJsonLd = content;
                break; // Found the recipe block
            }
            // Fallback: keep the longest block if it looks like data
            if (content.length > bestJsonLd.length) {
                bestJsonLd = content;
            }
        }
    }

    if (bestJsonLd) {
        return `Detected JSON-LD Structured Data:\n${bestJsonLd.trim().substring(0, 15000)}`;
    }

    // 2. Clean up HTML (remove scripts/styles that aren't JSON-LD)
    let cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // 3. Try Semantic Selectors
    const recipeSelectors = [
        /<div[^>]*class="[^"]*recipe[^"]*"[^>]*>([\s\S]*?)<\/div>/i, // generic .recipe class
        /<div[^>]*class="[^"]*wprm-recipe-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i, // WP Recipe Maker
        /<div[^>]*class="[^"]*tasty-recipes[^"]*"[^>]*>([\s\S]*?)<\/div>/i, // Tasty Recipes
        /<article[^>]*>([\s\S]*?)<\/article>/i, // Semantic Article
        /<main[^>]*>([\s\S]*?)<\/main>/i, // Semantic Main
        /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    let extractedContent = '';

    // Default to body
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    extractedContent = bodyMatch ? bodyMatch[1] : cleanHtml;

    // Try to find a more specific, cleaner section
    for (const selector of recipeSelectors) {
        const match = cleanHtml.match(selector);
        if (match && match[1]) {
            const candidate = match[1];
            // If the candidate is substantial enough (arbitrary >500 chars), prefer it over the massive body
            if (candidate.length > 500) {
                extractedContent = candidate;
                break; // Stop at the first good match (ordered by specificity)
            }
        }
    }

    // 4. Final Cleanup
    extractedContent = extractedContent
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
        .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
        .replace(/<[^>]+>/g, ' ') // Remove all remaining tags
        .replace(/\s+/g, ' ')     // Collapse whitespace
        .trim();

    return extractedContent.substring(0, 15000); // Truncate to avoid massive tokens
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
        const { prompt, model = 'gpt-5-nano-2025-08-07', fileData, filesData, url, currentRecipe, modify, question, action, content, type, conversationHistory = '' } = req.body;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

        // 1. Validation & Nutrition Logic
        if (action === 'determine_intent') {
            const systemPrompt = "You are the brain of a recipe app. Determine the user's intent based on their message and context. Choose the most appropriate function to call.\nIf the user asks about an image (what is this?, describe this), use 'answer_question'.\nIf the intent is just general chat or ambiguous, use 'answer_question'.";

            const tools = [
                {
                    type: "function",
                    function: {
                        name: "answer_question",
                        description: "Answer general cooking questions, describe attached food images, explain ingredients, or answer questions about the current recipe. Default to this for chat.",
                        parameters: { type: "object", properties: {}, required: [] }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "suggest_recipes",
                        description: "Suggest recipes based on ingredients, leftovers, or specific dish requests (e.g., 'I have chicken', 'Give me a biryani recipe').",
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
                if (youtubeApiKey) {
                    try {
                        const ytResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=snippet`);
                        const ytData = await ytResp.json();
                        if (ytData.items && ytData.items.length > 0) {
                            const snippet = ytData.items[0].snippet;
                            extractedContext = `YouTube Video Title: ${snippet.title}\nDescription: ${snippet.description}`;
                            finalPrompt = `Extract recipe from this YouTube info. ${extractedContext}\n\n${prompt}`;
                        }
                    } catch (e) { console.error('YouTube fetch failed', e); }
                }
            } else {
                // Generic URL Scraping
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for scraping

                    const webResp = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (webResp.ok) {
                        const html = await webResp.text();
                        const pageContent = extractRecipeContent(html);
                        extractedContext = `Webpage Content: ${pageContent}`;
                        finalPrompt = `Extract recipe from this webpage. ${extractedContext}\n\n${prompt}`;
                    }
                } catch (e) {
                    console.error('Web scrape failed', e);
                    // Don't fail the whole request, just proceed without context if scrape fails
                    // But if user specifically asked to extract from URL, maybe we should indicate failure?
                    // For now, let it fall through to the LLM which might hallucinate or say "I can't read it".
                    // Better to explicitly say we couldn't access.
                    if (e.name === 'AbortError') {
                        extractedContext = "Could not access the website (Timeout).";
                    } else {
                        extractedContext = "Could not access the website.";
                    }
                    finalPrompt = `I tried to access the URL but failed. ${prompt}`;
                }
            }
        }

        // 3. Construct System Prompt & User Prompt based on Request Type
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
       Return JSON format: { "suggestions": [{ "title": string, "description": string }] }.
       Do NOT include ingredients or instructions yet. Just the title and a short 1-sentence description.`;

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
