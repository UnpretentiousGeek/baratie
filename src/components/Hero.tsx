import React from 'react';
import { useRecipe } from '../context/RecipeContext';
import ChatInput from './ChatInput';
import './Hero.css';

const Hero: React.FC = () => {
  const { currentStage, recipe } = useRecipe();

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
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>

            <div className="recipe-section">
              <h3>Instructions</h3>
              <ol>
                {recipe.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
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

