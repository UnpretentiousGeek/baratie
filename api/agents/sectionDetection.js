/**
 * Section Detection Agent
 * Analyzes extracted recipe content to identify natural sections
 * (e.g., "For Marination", "For Curry", "For Garnish")
 */

/**
 * Detects if a recipe has distinct sections and organizes them
 * @param {Array<string>} ingredients - Flat array of ingredients
 * @param {Array<string>} instructions - Flat array of instructions
 * @param {string} geminiApiKey - Gemini API key
 * @returns {Promise<Object>} - { ingredients: RecipeSection[] | string[], instructions: RecipeSection[] | string[] }
 */
async function detectRecipeSections(ingredients, instructions, geminiApiKey) {
  try {
    // If very few ingredients/instructions, likely no sections
    if (ingredients.length < 5 && instructions.length < 5) {
      return {
        ingredients,
        instructions,
        hasSections: false
      };
    }

    const prompt = `Analyze this recipe and determine if it has distinct preparation sections.

INGREDIENTS:
${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

INSTRUCTIONS:
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

Common recipe sections include:
- Marination / Marinade
- Base / Gravy / Sauce
- Main dish / Curry
- Garnish / Topping
- Dough / Batter
- Filling / Stuffing
- Dressing / Glaze

Analyze the ingredients and instructions to identify if there are natural groupings or sections.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "hasSections": true/false,
  "ingredientSections": [
    { "title": "Marination", "items": ["ingredient1", "ingredient2"] },
    { "title": "Curry", "items": ["ingredient3", "ingredient4"] }
  ],
  "instructionSections": [
    { "title": "Marination", "items": ["step1", "step2"] },
    { "title": "Cooking", "items": ["step3", "step4"] }
  ]
}

If no clear sections exist, set hasSections to false and return empty arrays for sections.
Make sure all original ingredients and instructions are included in the sections.
CRITICAL: Do NOT create artificial sections like "Preparation" and "Cooking" for a simple, single-part recipe. Only create sections if there are distinct components (e.g., "Marinade", "Sauce", "Dough", "Filling"). If the recipe is a standard flat list, return hasSections: false.
CRITICAL: Format section titles cleanly. Remove "For", "The" from the start and ":" from the end. Example: "For Marination:" -> "Marination", "The Sauce:" -> "Sauce".`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      console.error('Section detection API call failed:', response.status);
      // Return flat arrays on failure
      return {
        ingredients,
        instructions,
        hasSections: false
      };
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Section detection response:', responseText.substring(0, 500));

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in section detection response');
      return {
        ingredients,
        instructions,
        hasSections: false
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate the response structure
    if (!result.hasSections || !result.ingredientSections || !result.instructionSections) {
      return {
        ingredients,
        instructions,
        hasSections: false
      };
    }

    // Clean up titles programmatically to be safe
    if (result.hasSections) {
      const cleanTitle = (title) => {
        if (!title) return '';
        return title
          .replace(/^(for\s+|the\s+|to\s+make\s+)/i, '') // Remove "For", "The", "To make"
          .replace(/[:\-]+$/, '') // Remove trailing colon or dash
          .trim();
      };

      if (result.ingredientSections) {
        result.ingredientSections.forEach(section => {
          section.title = cleanTitle(section.title);
        });
      }
      if (result.instructionSections) {
        result.instructionSections.forEach(section => {
          section.title = cleanTitle(section.title);
        });
      }
    }

    // If sections detected, return them
    if (result.hasSections &&
      result.ingredientSections.length > 0 &&
      result.instructionSections.length > 0) {

      console.log(`Detected ${result.ingredientSections.length} ingredient sections and ${result.instructionSections.length} instruction sections`);

      return {
        ingredients: result.ingredientSections,
        instructions: result.instructionSections,
        hasSections: true
      };
    }

    // No sections detected, return flat arrays
    return {
      ingredients,
      instructions,
      hasSections: false
    };

  } catch (error) {
    console.error('Error in section detection:', error);
    // Return original flat arrays on error
    return {
      ingredients,
      instructions,
      hasSections: false
    };
  }
}

export { detectRecipeSections };
