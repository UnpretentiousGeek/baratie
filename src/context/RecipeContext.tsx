import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AttachedFile, Recipe, Stage, RecipeContextType, ChatMessage } from '../types';
import { processFiles } from '../utils/recipeManager';
import { extractRecipeFromFiles } from '../utils/api';
import { validateCookingMessage } from '../utils/validation';

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const useRecipe = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipe must be used within RecipeProvider');
  }
  return context;
};

interface RecipeProviderProps {
  children: ReactNode;
}

export const RecipeProvider: React.FC<RecipeProviderProps> = ({ children }) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStage, setCurrentStage] = useState<Stage>('capture');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Build conversation context from recent messages
  const buildConversationContext = useCallback(() => {
    // Get last 5 messages for context (excluding recipe-preview messages)
    const contextMessages = messages
      .filter(msg => msg.type !== 'recipe-preview')
      .slice(-5)
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.text || ''}`)
      .join('\n');

    return contextMessages;
  }, [messages]);

  const addFiles = useCallback(async (files: File[]) => {
    try {
      const processed = await processFiles(files);
      setAttachedFiles(prev => [...prev, ...processed]);
    } catch (error) {
      console.error('Error adding files:', error);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => {
      const file = prev[index];
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    attachedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setAttachedFiles([]);
  }, [attachedFiles]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const extractRecipe = useCallback(async (prompt: string) => {
    try {
      // Check if this input contains a URL or has files attached
      const hasUrl = /(https?:\/\/[^\s]+)/.test(prompt);
      const hasFiles = attachedFiles.length > 0;

      // Validate cooking relevance for messages without URL/files and no existing recipe
      // Skip validation if:
      // - URL is provided (validated server-side)
      // - Files are attached (assumed to be recipe-related)
      // - Recipe already exists (context is already cooking-related)
      if (!hasUrl && !hasFiles && !recipe) {
        const isValid = await validateCookingMessage(prompt);

        if (!isValid) {
          // Switch to chat mode to show the error message
          if (currentStage === 'capture') {
            setCurrentStage('preview');
          }

          // Add user message first
          addMessage({
            type: 'user',
            text: prompt,
          });

          // Add validation error message
          addMessage({
            type: 'system',
            text: 'Please ask a cooking or recipe-related question. Baratie specializes in helping you cook!',
          });

          return; // Don't proceed with API call
        }
      }

      // Switch to chat mode immediately when user sends first message
      if (currentStage === 'capture') {
        setCurrentStage('preview');
      }

      // Store attached files before clearing
      const filesToSend = attachedFiles.length > 0 ? [...attachedFiles] : undefined;

      // Clear attached files immediately after sending
      clearFiles();

      // Add user message
      addMessage({
        type: 'user',
        text: prompt || 'Extract this recipe',
        attachedFiles: filesToSend,
      });

      // Check if this is a question (ends with ? or starts with question words)
      const isQuestion = /^(\?|how|what|when|where|why|who|which|is|are|can|could|would|should|do|does|did|will|may|might)\s/i.test(prompt.trim()) ||
        prompt.trim().endsWith('?');

      // Check if user is asking about alternatives/substitutions (should suggest, not auto-update)
      const isAlternativeRequest = /\b(don't have|do not have|missing|alternative|substitute|instead of|can i use|what can i use|what to use|replace with|suggest|recommend|options?)\b/i.test(prompt);

      // Check if it's a modification request (contains modification keywords, but not alternative requests)
      const isModification = !isAlternativeRequest && /\b(make|adjust|change|modify|convert|update|replace|remove|add|increase|decrease|scale|double|halve|reduce|swap|use|try)\b/i.test(prompt);

      // Check if we have an existing recipe and this is a question or modification request
      // Question/modification: has recipe, no URL in prompt, no new files attached
      const urlMatches = prompt.match(/(https?:\/\/[^\s]+)/gi);
      if (recipe && !urlMatches && (!filesToSend || filesToSend.length === 0)) {
        if ((isQuestion || isAlternativeRequest) && !isModification) {
          // This is a question or alternative request - answer it without modifying the recipe
          const { answerQuestion } = await import('../utils/api');
          const conversationContext = buildConversationContext();
          const answer = await answerQuestion(prompt, recipe, conversationContext);

          addMessage({
            type: 'system',
            text: answer,
          });
          return;
        } else if (isModification || (!isQuestion && !isAlternativeRequest && !isModification)) {
          // This is a modification request (or ambiguous - treat as modification)

          // Add loading message
          addMessage({
            type: 'loading',
            text: 'Updating recipe...',
          });

          try {
            const { modifyRecipe } = await import('../utils/api');
            const conversationContext = buildConversationContext();
            const modifiedRecipe = await modifyRecipe(recipe, prompt, conversationContext);

            // Update recipe in place
            setRecipe(modifiedRecipe);

            // Only switch to preview if we're in capture mode
            if (currentStage === 'capture') {
              setCurrentStage('preview');
            }

            // Remove loading message and update existing recipe card
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.type !== 'loading');

              // Find the last recipe-preview message and update it
              let lastRecipeIndex = -1;
              for (let i = filtered.length - 1; i >= 0; i--) {
                if (filtered[i].type === 'recipe-preview') {
                  lastRecipeIndex = i;
                  break;
                }
              }

              if (lastRecipeIndex !== -1) {
                const newMessages = [...filtered];
                newMessages[lastRecipeIndex] = {
                  ...newMessages[lastRecipeIndex],
                  recipe: modifiedRecipe
                };
                return newMessages;
              }

              return [...filtered, {
                id: Date.now().toString(),
                type: 'recipe-preview',
                recipe: modifiedRecipe,
                timestamp: new Date()
              } as ChatMessage];
            });

            // Add system message with description of changes
            const changesText = modifiedRecipe.changesDescription
              ? modifiedRecipe.changesDescription
              : 'Recipe updated successfully!';
            addMessage({
              type: 'system',
              text: changesText,
            });
          } catch (error) {
            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
            addMessage({
              type: 'system',
              text: 'Failed to update recipe. Please try again.',
            });
          }
          return;
        }
      }

      // If it's a question but no recipe, still answer it
      if (isQuestion && !urlMatches && (!filesToSend || filesToSend.length === 0) && !recipe) {
        const { answerQuestion } = await import('../utils/api');
        const conversationContext = buildConversationContext();
        const answer = await answerQuestion(prompt, null, conversationContext);

        addMessage({
          type: 'system',
          text: answer,
        });
        return;
      }

      // Check if prompt contains a URL
      const urlPattern = /(https?:\/\/[^\s]+)/gi;
      const urls = prompt.match(urlPattern) || [];
      const url = urls[0] || null;

      let extractedResult;
      if (url && (!filesToSend || filesToSend.length === 0)) {
        // Extract from URL
        const { extractRecipeFromURL } = await import('../utils/api');
        extractedResult = await extractRecipeFromURL(url, prompt);
      } else if (filesToSend && filesToSend.length > 0) {
        // Extract from files
        extractedResult = await extractRecipeFromFiles(filesToSend, prompt);
      } else {
        throw new Error('Please provide a URL or attach files');
      }

      // Check if result is a recipe or an answer
      if ('answer' in extractedResult) {
        // It's an answer/description (e.g. "This is a Mojito")
        addMessage({
          type: 'system',
          text: extractedResult.answer,
        });
        return;
      }

      // It's a recipe
      const extractedRecipe = extractedResult as Recipe;

      // Only switch context if we don't have an active recipe
      if (!recipe) {
        setRecipe(extractedRecipe);
        setCurrentStage('preview');
      }

      // Add system message with recipe title
      addMessage({
        type: 'system',
        text: extractedRecipe.title || 'Here is the Extracted Recipe',
      });

      // Add recipe preview message
      addMessage({
        type: 'recipe-preview',
        recipe: extractedRecipe,
      });
    } catch (error) {
      console.error('Error extracting recipe:', error);

      // Get a more helpful error message
      let errorMessage = 'Failed to extract recipe. Please check the console for details or ensure the API endpoints are configured.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }

      // Add error message
      addMessage({
        type: 'system',
        text: errorMessage,
      });
      throw error;
    }
  }, [attachedFiles, addMessage, recipe, clearFiles, currentStage, setCurrentStage]);

  const value: RecipeContextType = {
    attachedFiles,
    recipe,
    currentStage,
    messages,
    addFiles,
    removeFile,
    clearFiles,
    extractRecipe,
    setStage: setCurrentStage,
    setRecipe,
    addMessage,
    clearMessages,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};

