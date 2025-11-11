import { RecipeSection } from '../types';

/**
 * Normalizes recipe ingredients to always return a flat array
 */
export function normalizeIngredients(ingredients: string[] | RecipeSection[]): string[] {
  if (!ingredients || ingredients.length === 0) {
    return [];
  }
  
  // Check if it's already a flat array of strings
  if (typeof ingredients[0] === 'string') {
    return ingredients as string[];
  }
  
  // It's an array of sections, flatten it
  const sections = ingredients as RecipeSection[];
  return sections.flatMap(section => section.items || []);
}

/**
 * Normalizes recipe instructions to always return a flat array
 */
export function normalizeInstructions(instructions: string[] | RecipeSection[]): string[] {
  if (!instructions || instructions.length === 0) {
    return [];
  }
  
  // Check if it's already a flat array of strings
  if (typeof instructions[0] === 'string') {
    return instructions as string[];
  }
  
  // It's an array of sections, flatten it
  const sections = instructions as RecipeSection[];
  return sections.flatMap(section => section.items || []);
}

/**
 * Gets ingredient sections if they exist, otherwise returns null
 */
export function getIngredientSections(ingredients: string[] | RecipeSection[]): RecipeSection[] | null {
  if (!ingredients || ingredients.length === 0) {
    return null;
  }
  
  // Check if it's already a flat array of strings
  if (typeof ingredients[0] === 'string') {
    return null;
  }
  
  // It's an array of sections
  return ingredients as RecipeSection[];
}

/**
 * Gets instruction sections if they exist, otherwise returns null
 */
export function getInstructionSections(instructions: string[] | RecipeSection[]): RecipeSection[] | null {
  if (!instructions || instructions.length === 0) {
    return null;
  }
  
  // Check if it's already a flat array of strings
  if (typeof instructions[0] === 'string') {
    return null;
  }
  
  // It's an array of sections
  return instructions as RecipeSection[];
}

