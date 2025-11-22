/**
 * Validation utilities for ensuring content is cooking-related
 */

/**
 * Validates if a message is cooking or recipe-related
 * @param text The message text to validate
 * @returns Promise<boolean> - true if cooking-related, false otherwise
 */
export async function validateCookingMessage(text: string): Promise<boolean> {
  try {
    const apiEndpoint = import.meta.env.VITE_GEMINI_API_ENDPOINT || '/api/gemini';

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'validate',
        content: text,
        type: 'message'
      }),
    });

    if (!response.ok) {
      console.error('Validation request failed:', response.status);
      // If validation service fails, allow the message through
      // to avoid blocking legitimate requests due to service issues
      return true;
    }

    const data = await response.json();
    return data.isValid || false;
  } catch (error) {
    console.error('Error validating cooking message:', error);
    // On error, allow through to avoid false negatives
    return true;
  }
}
