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
  prepTime?: string;
  cookTime?: string;
  nutrition?: NutritionInfo;
  changesDescription?: string; // Description of changes made during modification
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export type Stage = 'capture' | 'preview' | 'cooking' | 'complete';

export type MessageType = 'user' | 'system' | 'recipe-preview' | 'loading' | 'recipe-suggestion';

export interface ChatMessage {
  id: string;
  type: MessageType;
  text?: string;
  recipe?: Recipe | null;
  attachedFiles?: AttachedFile[];
  suggestions?: Recipe[];
  timestamp: Date;
}

export interface RecipeContextType {
  attachedFiles: AttachedFile[];
  recipe: Recipe | null;
  currentStage: Stage;
  messages: ChatMessage[];
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  extractRecipe: (prompt: string) => Promise<void>;
  setStage: (stage: Stage) => void;
  setRecipe: (recipe: Recipe | null) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
}

