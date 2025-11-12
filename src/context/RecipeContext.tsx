import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AttachedFile, Recipe, Stage, RecipeContextType, ChatMessage } from '../types';
import { processFiles } from '../utils/recipeManager';
import { extractRecipeFromFiles } from '../utils/api';

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
      // Add user message
      addMessage({
        type: 'user',
        text: prompt || 'Extract this recipe',
        attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
      });

      // Check if we have an existing recipe and this is a modification request
      // Modification request: has recipe, no URL in prompt, no new files attached
      const hasUrl = prompt.match(/(https?:\/\/[^\s]+)/gi);
      if (recipe && !hasUrl && attachedFiles.length === 0) {
        // This is a modification request
        const { modifyRecipe } = await import('../utils/api');
        const modifiedRecipe = await modifyRecipe(recipe, prompt);
        
        setRecipe(modifiedRecipe);
        setCurrentStage('preview');

        // Add system message
        addMessage({
          type: 'system',
          text: 'Recipe updated successfully!',
        });

        // Add recipe preview message
        addMessage({
          type: 'recipe-preview',
          recipe: modifiedRecipe,
        });
        return;
      }

      // Check if prompt contains a URL
      const urlPattern = /(https?:\/\/[^\s]+)/gi;
      const urls = prompt.match(urlPattern) || [];
      const url = urls[0] || null;
      
      let extractedRecipe;
      if (url && attachedFiles.length === 0) {
        // Extract from URL
        const { extractRecipeFromURL } = await import('../utils/api');
        extractedRecipe = await extractRecipeFromURL(url, prompt);
      } else if (attachedFiles.length > 0) {
        // Extract from files
        extractedRecipe = await extractRecipeFromFiles(attachedFiles, prompt);
      } else {
        throw new Error('Please provide a URL or attach files');
      }
      
      setRecipe(extractedRecipe);
      setCurrentStage('preview');
      
      // Clear attached files after successful extraction
      clearFiles();

      // Add system message
      addMessage({
        type: 'system',
        text: 'Here is the Extracted Recipe',
      });

      // Add recipe preview message
      addMessage({
        type: 'recipe-preview',
        recipe: extractedRecipe,
      });
    } catch (error) {
      console.error('Error extracting recipe:', error);
      // Add error message
      addMessage({
        type: 'system',
        text: 'Failed to extract recipe. Please check the console for details or ensure the API endpoints are configured.',
      });
      throw error;
    }
  }, [attachedFiles, addMessage, recipe, clearFiles]);

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

