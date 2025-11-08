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

