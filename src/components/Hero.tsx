import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import { normalizeInstructions, normalizeIngredients } from '../utils/recipeUtils';
import ChatInput from './ChatInput';
import CookingGuide from './CookingGuide';
import './Hero.css';

const Hero: React.FC = () => {
  const { currentStage, recipe, setStage } = useRecipe();

  // Handle case where stage is 'cooking' but recipe is null
  useEffect(() => {
    if (currentStage === 'cooking' && !recipe) {
      console.warn('Stage is cooking but recipe is null, resetting to capture');
      setStage('capture');
    }
  }, [currentStage, recipe, setStage]);

  // Show completion screen when stage is 'complete'
  if (currentStage === 'complete' && recipe) {
    return (
      <div className="hero-section">
        <div className="hero-content">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="completion-icon"
          >
            🎉
          </motion.div>
          <h2 className="hero-title">Recipe Complete!</h2>
          <p className="hero-subtitle">Your {recipe.title} is ready to enjoy!</p>
          <div className="completion-actions">
            <motion.button
              type="button"
              className="start-cooking-btn"
              onClick={() => setStage('preview')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Recipe Again
            </motion.button>
            <motion.button
              type="button"
              className="new-recipe-btn"
              onClick={() => {
                setStage('capture');
                // Optionally clear the recipe here
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start New Recipe
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Show cooking guide when stage is 'cooking'
  if (currentStage === 'cooking' && recipe) {
    return <CookingGuide />;
  }

  // Show recipe preview when stage is 'preview'
  if (currentStage === 'preview' && recipe) {
    return (
      <div className="hero-section">
        <div className="hero-content">
          <h2 className="hero-title">{recipe.title}</h2>
          <div className="recipe-preview">
            {recipe.servings && (
              <p className="recipe-meta">Servings: {recipe.servings}</p>
            )}
            {recipe.prepTime && (
              <p className="recipe-meta">Prep Time: {recipe.prepTime}</p>
            )}
            {recipe.cookTime && (
              <p className="recipe-meta">Cook Time: {recipe.cookTime}</p>
            )}
            
            <div className="recipe-section">
              <h3>Ingredients</h3>
              <ul>
                {normalizeIngredients(recipe.ingredients).map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>

            <div className="recipe-section">
              <h3>Instructions</h3>
              <ol>
                {normalizeInstructions(recipe.instructions).map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>

            <motion.button
              type="button"
              className="start-cooking-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (recipe) {
                  console.log('Setting stage to cooking, recipe exists:', recipe.title);
                  setStage('cooking');
                } else {
                  console.error('Recipe is null when trying to start cooking');
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Start Cooking
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-section">
      <div className="hero-content">
        <h2 className="hero-title">What you wanna cook?</h2>
        <p className="hero-subtitle">Turn any recipe into an interactive cooking guide</p>
      </div>
      <ChatInput />
    </div>
  );
};

export default Hero;

