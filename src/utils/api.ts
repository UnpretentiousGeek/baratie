import { AttachedFile, Recipe } from '../types';

const GEMINI_API_ENDPOINT = '/api/openai';
const YOUTUBE_API_ENDPOINT = import.meta.env.VITE_YOUTUBE_API_ENDPOINT || '/api/youtube';

export async function extractRecipeFromFiles(
  files: AttachedFile[],
  prompt: string
): Promise<Recipe | { answer: string }> {
  try {
    // Convert files to the format expected by the API
    const filesData = files.map(f => {
      // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
      let base64Data = f.data;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      return {
        mimeType: f.type,
        data: base64Data,
      };
    });

    console.log('Sending request to:', GEMINI_API_ENDPOINT);
    console.log('Files count:', filesData.length);

    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filesData,
        prompt: prompt || 'Extract the recipe from the provided images.',
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to extract recipe';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Check if it's an answer/description instead of a recipe
    if (data.answer || data.text || data.isIngredientIdentification) {
      return { answer: data.answer || data.text };
    }

    return data.recipe;
  } catch (error) {
    console.error('Error extracting recipe:', error);

    // Provide more helpful error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev && GEMINI_API_ENDPOINT.startsWith('/api/')) {
        throw new Error('API endpoint not accessible. Make sure to run "vercel dev" in a separate terminal to start the API server, or use "yarn dev:all" to run both frontend and API together.');
      }
    }

    throw error;
  }
}

export async function extractRecipeFromText(recipeText: string): Promise<Recipe> {
  try {
    // Send the recipe text as the prompt - the backend will extract it
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Extract the recipe from the following text and return it as JSON with this structure: { "title": "...", "ingredients": ["..."], "instructions": ["..."] }\n\n${recipeText}`,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to extract recipe from text';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error extracting recipe from text:', error);
    throw error;
  }
}


export async function extractRecipeFromURL(url: string, prompt: string): Promise<Recipe> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        prompt,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to extract recipe from URL';
      try {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch (e) {
          // If response is not JSON, use the text directly if it's short enough
          if (errorText.length < 200) {
            errorMessage = `Server Error: ${errorText}`;
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error extracting recipe from URL:', error);
    throw error;
  }
}

export async function extractRecipeFromYouTube(videoId: string): Promise<Recipe> {
  try {
    const response = await fetch(`${YOUTUBE_API_ENDPOINT}?videoId=${videoId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to extract recipe from YouTube');
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error extracting recipe from YouTube:', error);
    throw error;
  }
}

export async function answerQuestion(
  question: string,
  currentRecipe: Recipe | null = null,
  conversationHistory: string = ''
): Promise<string> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: question,
        question: true,
        currentRecipe: currentRecipe ? {
          title: currentRecipe.title,
          ingredients: currentRecipe.ingredients,
          instructions: currentRecipe.instructions,
        } : undefined,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get answer');
    }

    const data = await response.json();
    return data.answer || data.text || 'I apologize, but I couldn\'t generate an answer.';
  } catch (error) {
    console.error('Error answering question:', error);
    throw error;
  }
}

export async function modifyRecipe(
  currentRecipe: Recipe,
  modificationPrompt: string,
  conversationHistory: string = ''
): Promise<Recipe> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: modificationPrompt,
        currentRecipe: {
          title: currentRecipe.title,
          ingredients: currentRecipe.ingredients,
          instructions: currentRecipe.instructions,
          prepTime: currentRecipe.prepTime,
          cookTime: currentRecipe.cookTime,
        },
        modify: true,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to modify recipe');
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error modifying recipe:', error);
    throw error;
  }
}

export async function suggestRecipes(
  prompt: string,
  conversationHistory: string = ''
): Promise<Recipe[]> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        suggest: true,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Recipe suggestion API failed:', response.status, errorText);
      throw new Error(`Failed to get recipe suggestions: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error getting specific suggestions:', error);
    throw error;
  }
}


export async function calculateNutrition(
  recipe: Recipe,
  conversationHistory: string = ''
): Promise<any> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculateNutrition',
        title: recipe.title,
        ingredients: recipe.ingredients,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      console.warn('Nutrition calculation failed');
      return null;
    }

    const data = await response.json();
    return data.nutrition;
  } catch (error) {
    console.error('Error calculating nutrition:', error);
    return null;
  }
}

export async function generateRecipe(
  title: string,
  context: string = ''
): Promise<Recipe> {
  const prompt = `Generate a detailed cooking recipe for "${title}". ${context ? `Context: ${context}` : ''}`;
  // Reuse the extraction logic which handles generation from text prompts
  return extractRecipeFromText(prompt);
}
