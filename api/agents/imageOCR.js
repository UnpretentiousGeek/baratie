/**
 * Image OCR and Validation Agent
 * Extracts text from images and validates cooking relevance
 */

/**
 * Extracts text from image and determines if it's cooking-related
 * @param {Object} fileData - { data: base64, mimeType: string }
 * @param {string} geminiApiKey - Gemini API key
 * @returns {Promise<Object>} - { isRecipe: boolean, isCooking: boolean, text: string, message: string }
 */
async function extractAndValidateImage(fileData, geminiApiKey) {
  try {
    const prompt = `Analyze this image and determine:
1. Is it related to cooking or food?
2. Does it contain a recipe (with ingredients and instructions)?
3. What text can you extract from it?

RESPOND IN THIS EXACT JSON FORMAT:
{
  "isCooking": true/false,
  "isRecipe": true/false,
  "extractedText": "any text visible in the image",
  "message": "brief description of what you see"
}

Examples:
- Recipe card/book → isCooking: true, isRecipe: true
- Ingredient photo → isCooking: true, isRecipe: false
- Random image → isCooking: false, isRecipe: false`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: fileData.mimeType,
                data: fileData.data
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      console.error('Image OCR API call failed:', response.status);
      return {
        isCooking: false,
        isRecipe: false,
        text: '',
        message: 'Failed to analyze image'
      };
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Image OCR response:', responseText.substring(0, 500));

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in image OCR response');
      return {
        isCooking: false,
        isRecipe: false,
        text: responseText,
        message: 'Could not parse image analysis'
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      isCooking: result.isCooking || false,
      isRecipe: result.isRecipe || false,
      text: result.extractedText || '',
      message: result.message || 'Image analyzed'
    };

  } catch (error) {
    console.error('Error in image OCR:', error);
    return {
      isCooking: false,
      isRecipe: false,
      text: '',
      message: 'Error analyzing image'
    };
  }
}

/**
 * Extracts recipe from image that's confirmed to contain one
 * @param {Object} fileData - { data: base64, mimeType: string }
 * @param {string} geminiApiKey - Gemini API key
 * @returns {Promise<Object>} - { title, ingredients, instructions } or null
 */
async function extractRecipeFromImage(fileData, geminiApiKey) {
  try {
    const prompt = `Extract the complete recipe from this image.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "title": "Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...]
}

Extract ALL ingredients and instructions visible in the image.
Maintain the exact quantities and measurements shown.
DO NOT include section headings in the ingredients or instructions arrays.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: fileData.mimeType,
                data: fileData.data
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      console.error('Recipe extraction from image failed:', response.status);
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Recipe extraction response:', responseText.substring(0, 500));

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in recipe extraction response');
      return null;
    }

    const recipe = JSON.parse(jsonMatch[0]);

    // Validate recipe structure
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      console.warn('Invalid recipe structure from image');
      return null;
    }

    return {
      title: recipe.title,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions
    };

  } catch (error) {
    console.error('Error extracting recipe from image:', error);
    return null;
  }
}

/**
 * Identifies ingredient in image (for non-recipe cooking images)
 * @param {Object} fileData - { data: base64, mimeType: string }
 * @param {string} geminiApiKey - Gemini API key
 * @returns {Promise<string>} - Description of the ingredient/food item
 */
async function identifyIngredient(fileData, geminiApiKey) {
  try {
    const prompt = `What food item or ingredient is shown in this image?
Provide a brief, helpful description including:
- What it is
- Common uses in cooking
- Any visible characteristics

Keep the response concise and friendly (2-3 sentences).`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: fileData.mimeType,
                data: fileData.data
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      return 'Unable to identify the ingredient in this image.';
    }

    const data = await response.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Unable to identify the ingredient.';

    return description;

  } catch (error) {
    console.error('Error identifying ingredient:', error);
    return 'Error analyzing the image.';
  }
}

export {
  extractAndValidateImage,
  extractRecipeFromImage,
  identifyIngredient
};
