import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AttachedFile, Recipe, Stage, RecipeContextType } from '../types';
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

  const extractRecipe = useCallback(async (prompt: string) => {
    try {
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
    } catch (error) {
      console.error('Error extracting recipe:', error);
      throw error;
    }
  }, [attachedFiles]);

  const value: RecipeContextType = {
    attachedFiles,
    recipe,
    currentStage,
    addFiles,
    removeFile,
    clearFiles,
    extractRecipe,
    setStage: setCurrentStage,
    setRecipe,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};

