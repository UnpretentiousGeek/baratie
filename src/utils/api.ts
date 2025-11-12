import { AttachedFile, Recipe } from '../types';

const GEMINI_API_ENDPOINT = import.meta.env.VITE_GEMINI_API_ENDPOINT || '/api/gemini';
const YOUTUBE_API_ENDPOINT = import.meta.env.VITE_YOUTUBE_API_ENDPOINT || '/api/youtube';

export async function extractRecipeFromFiles(
  files: AttachedFile[],
  prompt: string
): Promise<Recipe> {
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

    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filesData,
        prompt: prompt || 'Extract the recipe from the provided images.',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to extract recipe');
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

export async function answerQuestion(question: string): Promise<string> {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: question,
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

