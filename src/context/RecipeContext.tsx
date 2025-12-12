import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AttachedFile, Recipe, Stage, RecipeContextType, ChatMessage } from '../types';
import { processFiles } from '../utils/recipeManager';
import { extractRecipeFromFiles, suggestRecipes, generateRecipe } from '../utils/api';
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
      const isQuestion =
        /\b(how|what|why|when|where|who|can|could|would|should|do|does|did|will|may|might)\b.*\?/i.test(prompt) ||
        /\b(how (do|to)|substitute|replace|alternatives?)\b/i.test(prompt) ||
        /\b(is|are) (it|there)\b/i.test(prompt) ||
        /\b(tell me (more|about)|describe|explain)\b/i.test(prompt) ||
        prompt.trim().endsWith('?');

      // Check if user is asking about alternatives/substitutions (should suggest, not auto-update)
      const isAlternativeRequest = /\b(don't have|do not have|missing|alternative|substitute|instead of|can i use|what can i use|what to use|replace with|suggest|recommend|options?)\b/i.test(prompt);

      // Check if it's a modification request (contains modification keywords, but not alternative requests)
      const isModification = !isAlternativeRequest && /\b(make|adjust|change|modify|convert|update|replace|remove|add|increase|decrease|scale|double|halve|reduce|swap|use|try)\b/i.test(prompt);

      // Check for suggestion intent
      // Heuristics:
      // 1. Explicit suggestion keywords
      // 2. "What can I cook" patterns
      // 3. "Recipes for" patterns
      // 4. Inventory statements ("I have", "Got")
      // 5. Explicit requests ("Give me", "Show me")
      const isSuggestion =
        ((/\b(suggest|recommend|ideas|options)\b/i.test(prompt)) && !/\b(substitute|replace|instead)\b/i.test(prompt)) ||
        /\bwhat (can|should|to) (i|we) (make|cook|eat|prepare)\b/i.test(prompt) ||
        /\b(recipes? for)\b/i.test(prompt) ||
        /\b(give|show|find|search) (me)?.*\b(recipe|dish)\b/i.test(prompt) ||
        /\b(i (have|got)|leftover)\b/i.test(prompt);

      // Check if we have an existing recipe and this is a question or modification request
      // Question/modification: has recipe, no URL in prompt, no new files attached
      const urlMatches = prompt.match(/(https?:\/\/[^\s]+)/gi);

      // Detect if the prompt looks like a complete recipe (many lines, recipe keywords)
      const looksLikeNewRecipe = (() => {
        // Check if text is long (more than 200 chars) and has recipe-like structure
        if (prompt.length < 200) return false;

        // Count newlines - recipes typically have many lines
        const lineCount = (prompt.match(/\n/g) || []).length;
        if (lineCount < 5) return false;

        // Check for typical recipe section headers or patterns
        const recipePatterns = [
          /ingredients?:/i,
          /instructions?:/i,
          /directions?:/i,
          /steps?:/i,
          /method:/i,
          /preparation:/i,
          /\d+\s*(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|pound|lb|gram|kg|ml|liter)/i, // measurements
          /\d+\.\s+[A-Z]/m, // numbered steps like "1. Cook"
        ];

        const patternMatches = recipePatterns.filter(pattern => pattern.test(prompt)).length;
        return patternMatches >= 2; // At least 2 recipe patterns
      })();

      // HANDLE SUGGESTIONS (Priority over Q&A)
      if (isSuggestion && !urlMatches && (!filesToSend || filesToSend.length === 0) && !looksLikeNewRecipe) {
        addMessage({
          type: 'loading',
          text: 'Generating suggestions...',
        });

        try {
          const conversationContext = buildConversationContext();
          const suggestions = await suggestRecipes(prompt, conversationContext);

          // Remove loading message
          setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

          if (suggestions && suggestions.length > 0) {
            // Add message with suggestions
            addMessage({
              type: 'recipe-suggestion',
              text: 'Here are recommended recipes based on your request:',
              suggestions: suggestions,
            });
            return;
          } else {
            // Fallback if no suggestions returned
            addMessage({
              type: 'system',
              text: 'I couldn\'t find any specific recipes for that. Could you provide more details about what you\'re looking for?',
            });
            return;
          }
        } catch (error) {
          setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
          console.error('Error generating suggestions:', error);

          let errorMessage = 'I had trouble generating recipe suggestions. Please try again.';

          if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Rate limit'))) {
            errorMessage = 'You have hit the rate limit for the free tier of the AI model. Please wait a minute before trying again.';
          }

          addMessage({
            type: 'system',
            text: errorMessage,
          });
          return;
        }
      }

      if (recipe && !urlMatches && (!filesToSend || filesToSend.length === 0) && !looksLikeNewRecipe) {
        if ((isQuestion || isAlternativeRequest) && !isModification) {
          // This is a question or alternative request - answer it without modifying the recipe
          addMessage({
            type: 'loading',
            text: 'Thinking...',
          });

          try {
            const { answerQuestion } = await import('../utils/api');
            const conversationContext = buildConversationContext();
            const answer = await answerQuestion(prompt, recipe, conversationContext);

            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

            addMessage({
              type: 'system',
              text: answer,
            });
          } catch (error) {
            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
            addMessage({
              type: 'system',
              text: 'Sorry, I encountered an error while answering your question.',
            });
          }
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

      // If it's a question (even with files) and no recipe, answer it
      if (isQuestion && !urlMatches && !recipe) {
        addMessage({
          type: 'loading',
          text: 'Thinking...',
        });

        const { answerQuestion } = await import('../utils/api');
        const conversationContext = buildConversationContext();
        const answer = await answerQuestion(prompt, null, conversationContext, filesToSend || []);

        setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

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

      // Add loading message
      addMessage({
        type: 'loading',
        text: 'Extracting recipe...',
      });

      let extractedResult;
      try {
        if (url && (!filesToSend || filesToSend.length === 0)) {
          // Extract from URL
          const { extractRecipeFromURL } = await import('../utils/api');
          extractedResult = await extractRecipeFromURL(url, prompt);
        } else if (filesToSend && filesToSend.length > 0) {
          // Extract from files
          extractedResult = await extractRecipeFromFiles(filesToSend, prompt);
        } else if (looksLikeNewRecipe) {
          // Extract from recipe text in prompt
          const { extractRecipeFromText } = await import('../utils/api');
          extractedResult = await extractRecipeFromText(prompt);
        } else {
          throw new Error('Please provide a URL or attach files');
        }
      } catch (error) {
        // Remove loading message on error
        setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
        throw error;
      }

      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

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

      // Clean title - remove markdown characters (*, #, _, etc.)
      if (extractedRecipe.title) {
        extractedRecipe.title = extractedRecipe.title.replace(/[*#_`~]/g, '').trim();
      }

      // Validate extracted recipe
      const isErrorTitle = /^(I'm sorry|I apologize|I cannot|I could not|Error|No recipe|Unable to)/i.test(extractedRecipe.title || '');
      const hasNoIngredients = !extractedRecipe.ingredients || extractedRecipe.ingredients.length === 0;

      if (isErrorTitle || hasNoIngredients) {
        // Treat as an error/system message
        addMessage({
          type: 'system',
          text: extractedRecipe.title || 'Could not extract a valid recipe from the provided content.',
        });
        return;
      }

      // Only switch context if we don't have an active recipe
      if (!recipe) {
        setRecipe(extractedRecipe);
        setCurrentStage('preview');
      }

      // Add system message
      addMessage({
        type: 'system',
        text: 'Here is the extracted recipe',
      });

      // Add recipe preview message
      addMessage({
        type: 'recipe-preview',
        recipe: extractedRecipe,
      });
    } catch (error) {
      // Ensure loading message is removed in case of error in the outer block
      setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

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

        // Update with full details
        setRecipe(fullRecipe);
        setCurrentStage('preview');

        addMessage({
          type: 'system',
          text: `Here is the detailed recipe for ${selectedRecipe.title}:`
        });

        addMessage({
          type: 'recipe-preview',
          recipe: fullRecipe,
        });

      } else {
        // Already full recipe
        setRecipe(selectedRecipe);
        setCurrentStage('preview');

        addMessage({
          type: 'system',
          text: `Here is the recipe for ${selectedRecipe.title}:`
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
