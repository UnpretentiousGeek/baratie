import { AttachedFile, Recipe } from '../types';

const GEMINI_API_ENDPOINT = import.meta.env.VITE_GEMINI_API_ENDPOINT || '/api/gemini';
const YOUTUBE_API_ENDPOINT = import.meta.env.VITE_YOUTUBE_API_ENDPOINT || '/api/youtube';

export async function extractRecipeFromFiles(
  files: AttachedFile[],
  prompt: string
): Promise<Recipe> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: files.map(f => ({ name: f.name, type: f.type, data: f.data })),
        prompt,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract recipe');
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error extracting recipe:', error);
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
      throw new Error('Failed to extract recipe from URL');
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

export async function answerQuestion(question: string, currentRecipe?: Recipe | null): Promise<string> {
  try {
    let prompt = question;
    
    // If there's a current recipe, include it for context
    if (currentRecipe) {
      const ingredients = Array.isArray(currentRecipe.ingredients) 
        ? (typeof currentRecipe.ingredients[0] === 'string' 
            ? currentRecipe.ingredients 
            : currentRecipe.ingredients.flatMap((s: any) => s.items || []))
        : [];
      
      prompt = `Current Recipe Context:
Title: ${currentRecipe.title}
Ingredients: ${ingredients.join(', ')}

User Question: ${question}

Please provide a helpful answer to the user's question. If the question relates to the recipe, you can reference it. Otherwise, provide a general answer.`;
    }

    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        question: true,
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
  modificationPrompt: string
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
          servings: currentRecipe.servings,
          prepTime: currentRecipe.prepTime,
          cookTime: currentRecipe.cookTime,
        },
        modify: true,
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

