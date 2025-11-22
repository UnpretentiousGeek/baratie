/**
 * Nutrition Calculation Agent
 * Calculates macros and calories for a recipe based on ingredients
 */

/**
 * Calculates nutrition information for a recipe
 * @param {Array<string> | Array<Object>} ingredients - Ingredients (flat array or sections)
 * @param {string} title - Recipe title
 * @param {string} geminiApiKey - Gemini API key
 * @returns {Promise<Object>} - { calories, protein, carbs, fat, fiber } or null
 */
async function calculateNutrition(ingredients, title, geminiApiKey) {
  try {
    // Flatten ingredients if they're in sections
    let ingredientsList = [];
    if (Array.isArray(ingredients)) {
      if (ingredients.length > 0 && typeof ingredients[0] === 'object' && ingredients[0].items) {
        // It's sections, flatten them
        ingredients.forEach(section => {
          if (section.items && Array.isArray(section.items)) {
            ingredientsList.push(...section.items);
          }
        });
      } else {
        // It's already a flat array
        ingredientsList = ingredients;
      }
    }

    if (ingredientsList.length === 0) {
      console.warn('No ingredients provided for nutrition calculation');
      return null;
    }

    const prompt = `Calculate the nutritional information for this recipe. Estimate the total macros and calories for the ENTIRE recipe (not per serving).

RECIPE: ${title}

INGREDIENTS:
${ingredientsList.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

Provide realistic estimates based on standard USDA nutritional values. Consider the quantities specified in the ingredients.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "calories": 450,
  "protein": 35,
  "carbs": 25,
  "fat": 20,
  "fiber": 5
}

All values should be numbers (no units).
- Calories: total kcal for entire recipe
- Protein: grams for entire recipe
- Carbs: grams for entire recipe
- Fat: grams for entire recipe
- Fiber: grams for entire recipe`;

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
      console.error('Nutrition calculation API call failed:', response.status);
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Nutrition calculation response:', responseText.substring(0, 300));

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in nutrition response');
      return null;
    }

    const nutrition = JSON.parse(jsonMatch[0]);

    // Validate the response has required fields
    if (typeof nutrition.calories !== 'number' ||
        typeof nutrition.protein !== 'number' ||
        typeof nutrition.carbs !== 'number' ||
        typeof nutrition.fat !== 'number') {
      console.warn('Invalid nutrition response format');
      return null;
    }

    // Ensure all values are numbers and reasonable
    const result = {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein),
      carbs: Math.round(nutrition.carbs),
      fat: Math.round(nutrition.fat),
      fiber: nutrition.fiber ? Math.round(nutrition.fiber) : 0
    };

    console.log('Calculated nutrition:', result);
    return result;

  } catch (error) {
    console.error('Error calculating nutrition:', error);
    return null;
  }
}

module.exports = { calculateNutrition };
