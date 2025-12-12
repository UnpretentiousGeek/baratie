import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AttachedFile, Recipe, Stage, RecipeContextType, ChatMessage } from '../types';
import { processFiles } from '../utils/recipeManager';
import { generateRecipe } from '../utils/api';
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
  // Helper to restore file previews from base64 data
  const restoreFilePreviews = (files: AttachedFile[]): AttachedFile[] => {
    return files.map(file => {
      // If it's an image and has data but no preview (or we want to ensure it works),
      // create a data URI from the base64 data
      if (file.type.startsWith('image/') && file.data) {
        return {
          ...file,
          preview: `data:${file.type};base64,${file.data}`
        };
      }
      return file;
    });
  };

  // Load initial state from sessionStorage
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(() => {
    try {
      const saved = sessionStorage.getItem('baratie_files');
      if (saved) {
        const parsed = JSON.parse(saved);
        return restoreFilePreviews(parsed);
      }
      return [];
    } catch (e) {
      console.error('Failed to load files from storage', e);
      return [];
    }
  });

  const [recipe, setRecipe] = useState<Recipe | null>(() => {
    try {
      const saved = sessionStorage.getItem('baratie_recipe');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load recipe from storage', e);
      return null;
    }
  });

  const [currentStage, setCurrentStage] = useState<Stage>(() => {
    try {
      const saved = sessionStorage.getItem('baratie_stage');
      return (saved as Stage) || 'capture';
    } catch (e) {
      console.error('Failed to load stage from storage', e);
      return 'capture';
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('baratie_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore Date objects and file previews
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          attachedFiles: msg.attachedFiles ? restoreFilePreviews(msg.attachedFiles) : undefined
        }));
      }
      return [];
    } catch (e) {
      console.error('Failed to load messages from storage', e);
      return [];
    }
  });

  // Calculate nutrition logic state
  const [isCalculatingNutrition, setIsCalculatingNutrition] = useState(false);

  // Persist state changes
  React.useEffect(() => {
    try {
      sessionStorage.setItem('baratie_files', JSON.stringify(attachedFiles));
    } catch (e) {
      console.error('Failed to save files to storage', e);
    }
  }, [attachedFiles]);

  React.useEffect(() => {
    try {
      if (recipe) {
        sessionStorage.setItem('baratie_recipe', JSON.stringify(recipe));
      } else {
        sessionStorage.removeItem('baratie_recipe');
      }
    } catch (e) {
      console.error('Failed to save recipe to storage', e);
    }
  }, [recipe]);

  // Calculate nutrition when recipe changes
  React.useEffect(() => {
    let active = true;

    const fetchNutrition = async () => {
      if (recipe && !recipe.nutrition) {
        setIsCalculatingNutrition(true);
        try {
          // Import explicitly to assume it's there now
          const { calculateNutrition } = await import('../utils/api');
          const nutrition = await calculateNutrition(recipe);

          if (active && nutrition && recipe) {
            // Only update if we're still on the same recipe
            setRecipe(prev => {
              // Double check preventing race condition where recipe changed
              if (prev && prev.title === recipe.title) {
                return { ...prev, nutrition };
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('Failed to calculate macros', e);
        } finally {
          if (active) setIsCalculatingNutrition(false);
        }
      } else if (recipe?.nutrition) {
        // If nutrition exists, we are not calculating
        if (active) setIsCalculatingNutrition(false);
      }
    };

    // Debounce slightly to prevent thrashing
    const timer = setTimeout(() => {
      fetchNutrition();
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [recipe]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem('baratie_stage', currentStage);
    } catch (e) {
      console.error('Failed to save stage to storage', e);
    }
  }, [currentStage]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem('baratie_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages to storage', e);
    }
  }, [messages]);

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
      if (!hasUrl && !hasFiles && !recipe) {
        const isValid = await validateCookingMessage(prompt);

        if (!isValid) {
          if (currentStage === 'capture') setCurrentStage('preview');
          addMessage({ type: 'user', text: prompt });
          addMessage({ type: 'system', text: 'Please ask a cooking or recipe-related question. Baratie specializes in helping you cook!' });
          return;
        }
      }

      if (currentStage === 'capture') setCurrentStage('preview');

      const filesToSend = attachedFiles.length > 0 ? [...attachedFiles] : undefined;
      clearFiles();

      addMessage({
        type: 'user',
        text: prompt || 'Extract this recipe',
        attachedFiles: filesToSend,
      });

      // --- Hard Constraint: URLs always trigger extraction ---
      const urlPattern = /(https?:\/\/[^\s]+)/gi;
      const urlInPrompt = prompt.match(urlPattern)?.[0];

      if (urlInPrompt) {
        addMessage({ type: 'loading', text: 'Extracting recipe from URL...' });
        try {
          const { extractRecipeFromURL } = await import('../utils/api');
          const extractedResult = await extractRecipeFromURL(urlInPrompt, prompt);

          setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

          if (extractedResult && 'answer' in extractedResult) {
            addMessage({ type: 'system', text: (extractedResult as any).answer });
            return;
          }

          const extractedRecipe = extractedResult as Recipe;
          if (extractedRecipe.title) {
            extractedRecipe.title = extractedRecipe.title.replace(/[*#_`~]/g, '').trim();
          }

          if (!recipe) {
            setRecipe(extractedRecipe);
            setCurrentStage('preview');
          }

          addMessage({ type: 'system', text: 'Here is the extracted recipe' });
          addMessage({ type: 'recipe-preview', recipe: extractedRecipe });
          return;
        } catch (error) {
          setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
          let errorMessage = 'Failed to extract recipe from URL.';
          if (error instanceof Error) errorMessage = error.message;
          addMessage({ type: 'system', text: errorMessage });
          return;
        }
      }

      // --- Smart Intent Routing (For non-URL prompts) ---
      addMessage({ type: 'loading', text: 'Thinking...' });

      try {
        const { determineIntent } = await import('../utils/api');
        // Hint the intent determiner about presence of files/url context
        const contextPrompt = (filesToSend && filesToSend.length > 0) ? `[User attached ${filesToSend.length} images] ${prompt}` : prompt;
        const intent = await determineIntent(contextPrompt, recipe);
        console.log('Detected Intent:', intent);

        switch (intent) {
          case 'suggest_recipes':
            setMessages(prev => prev.map(msg => msg.type === 'loading' ? { ...msg, text: 'Generating suggestions...' } : msg));
            const { suggestRecipes } = await import('../utils/api');
            const suggestions = await suggestRecipes(prompt, buildConversationContext());
            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

            if (suggestions.length > 0) {
              addMessage({ type: 'recipe-suggestion', text: 'Here are some recommendations:', suggestions });
            } else {
              addMessage({ type: 'system', text: "I couldn't find specific recipes. Could you be more specific?" });
            }
            break;

          case 'answer_question':
            const { answerQuestion } = await import('../utils/api');
            const answer = await answerQuestion(prompt, recipe, buildConversationContext(), filesToSend || []);
            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
            addMessage({ type: 'system', text: answer });
            break;

          case 'modify_recipe':
            if (!recipe) {
              const { answerQuestion: answerQ } = await import('../utils/api');
              const ans = await answerQ(prompt, null, buildConversationContext(), filesToSend || []);
              setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
              addMessage({ type: 'system', text: ans });
            } else {
              setMessages(prev => prev.map(msg => msg.type === 'loading' ? { ...msg, text: 'Updating recipe...' } : msg));
              const { modifyRecipe } = await import('../utils/api');
              const modified = await modifyRecipe(recipe, prompt, buildConversationContext());
              setRecipe(modified);
              setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
              addMessage({ type: 'system', text: 'Recipe updated!' });
            }
            break;

          case 'extract_recipe':
            setMessages(prev => prev.map(msg => msg.type === 'loading' ? { ...msg, text: 'Extracting...' } : msg));

            // Extraction Logic (moved from hard constraint)
            try {
              let extractedResult;
              // Check for URL again here as it might be needed for specific extraction
              const urlPattern = /(https?:\/\/[^\s]+)/gi;
              const urlFound = prompt.match(urlPattern)?.[0];

              if (urlFound) {
                const { extractRecipeFromURL } = await import('../utils/api');
                extractedResult = await extractRecipeFromURL(urlFound, prompt);
              } else if (filesToSend && filesToSend.length > 0) {
                const { extractRecipeFromFiles } = await import('../utils/api');
                extractedResult = await extractRecipeFromFiles(filesToSend, prompt);
              } else {
                const { extractRecipeFromText } = await import('../utils/api');
                extractedResult = await extractRecipeFromText(prompt);
              }

              setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

              if (extractedResult && 'answer' in extractedResult) {
                addMessage({ type: 'system', text: (extractedResult as any).answer });
              } else {
                const extractedRecipe = extractedResult as Recipe;
                if (extractedRecipe.title) {
                  extractedRecipe.title = extractedRecipe.title.replace(/[*#_`~]/g, '').trim();
                }

                // Check for error titles
                const isErrorTitle = /^(I'm sorry|I apologize|I cannot|I could not|Error|No recipe|Unable to)/i.test(extractedRecipe.title || '');
                // Check for empty ingredients
                const hasNoIngredients = !extractedRecipe.ingredients || extractedRecipe.ingredients.length === 0;

                if (isErrorTitle || hasNoIngredients) {
                  addMessage({ type: 'system', text: extractedRecipe.title || 'Could not extract a valid recipe.' });
                } else {
                  if (!recipe) {
                    setRecipe(extractedRecipe);
                    setCurrentStage('preview');
                  }
                  addMessage({ type: 'system', text: 'Here is the extracted recipe' });
                  addMessage({ type: 'recipe-preview', recipe: extractedRecipe });
                }
              }
            } catch (err) {
              setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
              addMessage({ type: 'system', text: 'Failed to extract recipe.' });
            }
            break;
        }

      } catch (err) {
        setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
        addMessage({ type: 'system', text: 'Sorry, I encountered an error.' });
      }

    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
      console.error('Outer error:', error);
      addMessage({ type: 'system', text: 'An unexpected error occurred.' });
    }
  }, [attachedFiles, addMessage, recipe, clearFiles, currentStage, setCurrentStage, buildConversationContext, validateCookingMessage]);

  const selectSuggestion = useCallback(async (selectedRecipe: Recipe) => {
    try {
      // Check if recipe is "lite" (missing details)
      const isLite = !selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0;

      if (isLite) {
        addMessage({
          type: 'loading',
          text: `Creating full recipe for ${selectedRecipe.title}...`
        });

        // Generate full details
        const conversationContext = buildConversationContext();
        const fullRecipe = await generateRecipe(selectedRecipe.title, conversationContext);

        // Remove loading
        setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

        // Only change recipe/stage if NOT in cooking mode
        // If in cooking mode, just show the preview in chat
        if (currentStage !== 'cooking') {
          setRecipe(fullRecipe);
          setCurrentStage('preview');
        }

        addMessage({
          type: 'system',
          text: currentStage === 'cooking'
            ? `Here's another recipe for ${selectedRecipe.title}. Click "Start Cooking" to switch to it:`
            : `Here is the detailed recipe for ${selectedRecipe.title}:`
        });

        addMessage({
          type: 'recipe-preview',
          recipe: fullRecipe,
        });

      } else {
        // Already full recipe
        if (currentStage !== 'cooking') {
          setRecipe(selectedRecipe);
          setCurrentStage('preview');
        }

        addMessage({
          type: 'system',
          text: currentStage === 'cooking'
            ? `Here's another recipe for ${selectedRecipe.title}. Click "Start Cooking" to switch to it:`
            : `Here is the recipe for ${selectedRecipe.title}:`
        });

        addMessage({
          type: 'recipe-preview',
          recipe: selectedRecipe,
        });
      }
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
      addMessage({
        type: 'system',
        text: 'Failed to load recipe details. Please try again.',
      });
    }
  }, [addMessage, buildConversationContext]);


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
    selectSuggestion,
    isCalculatingNutrition,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};
