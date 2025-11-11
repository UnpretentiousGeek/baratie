export interface AttachedFile {
  name: string;
  type: string;
  data: string;
  originalFile?: File;
  preview?: string;
}

export interface RecipeSection {
  title?: string; // e.g., "For the Chicken Rice", "To Make the Omelettes"
  items: string[];
}

export interface Recipe {
  title: string;
  ingredients: string[] | RecipeSection[]; // Support both flat array and sections
  instructions: string[] | RecipeSection[]; // Support both flat array and sections
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

