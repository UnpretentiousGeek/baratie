export interface AttachedFile {
  name: string;
  type: string;
  data: string;
  originalFile?: File;
  preview?: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  nutrition?: NutritionInfo;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export type Stage = 'capture' | 'preview' | 'cooking' | 'complete';

export interface RecipeContextType {
  attachedFiles: AttachedFile[];
  recipe: Recipe | null;
  currentStage: Stage;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  extractRecipe: (prompt: string) => Promise<void>;
  setStage: (stage: Stage) => void;
  setRecipe: (recipe: Recipe | null) => void;
}

