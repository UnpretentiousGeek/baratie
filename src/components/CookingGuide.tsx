import React, { useState } from 'react';
import { useRecipe } from '../context/RecipeContext';
import { normalizeInstructions, normalizeIngredients } from '../utils/recipeUtils';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import './CookingGuide.css';

const CookingGuide: React.FC = () => {
  const { recipe, setStage } = useRecipe();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  if (!recipe) {
    return null;
  }

  const instructions = normalizeInstructions(recipe.instructions);
  const ingredients = normalizeIngredients(recipe.ingredients);
  const totalSteps = instructions.length;

  const toggleIngredient = (index: number) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="cooking-guide">
      {/* Recipe Name Header */}
      <div className="recipe-name-header">
        <h2 className="recipe-name-title">{recipe.title || 'Recipe Name'}</h2>
        <div className="recipe-name-actions">
          <button type="button" className="recipe-action-btn" aria-label="Download">
            <Download size={32} />
          </button>
          <button type="button" className="recipe-action-btn" onClick={() => setStage('preview')} aria-label="Close">
            <X size={32} />
          </button>
        </div>
      </div>

      {/* Main Content: Two Column Layout */}
      <div className="recipe-main-content">
        {/* Left Column: Ingredient List */}
        <div className="ingredient-list-panel">
          <h3 className="ingredient-list-title">Ingredient list</h3>
          
          {/* Filter Buttons */}
          <div className="ingredient-filters">
            <button
              type="button"
              className={`ingredient-filter-btn ${selectedFilter === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('All')}
            >
              All
            </button>
            <button
              type="button"
              className={`ingredient-filter-btn ${selectedFilter === 'Marination' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('Marination')}
            >
              Marination
            </button>
            <button
              type="button"
              className={`ingredient-filter-btn ${selectedFilter === 'Curry' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('Curry')}
            >
              Curry
            </button>
          </div>

          {/* Ingredients List */}
          <div className="ingredients-list-container">
            {ingredients.map((ingredient, index) => {
              const isChecked = checkedIngredients.has(index);
              return (
                <div 
                  key={index} 
                  className={`ingredient-item ${isChecked ? 'checked' : ''}`}
                >
                  <div 
                    className="ingredient-checkbox-wrapper"
                    onClick={() => toggleIngredient(index)}
                  >
                    <div className={`ingredient-checkbox ${isChecked ? 'checked' : ''}`}>
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.875 6.75L4.5 9.375L10.5 3.375" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <p className="ingredient-name">{ingredient}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Instructions and Macros */}
        <div className="instructions-macros-column">
          {/* Instructions Section */}
          <div className="instructions-section">
            <div className="instructions-header">
              <h3 className="instructions-title">Instructions</h3>
              <div className="step-counter">
                {currentStep + 1}/{totalSteps}
              </div>
            </div>

            <div className="instruction-content">
              <p className="instruction-text">{instructions[currentStep] || 'Recipe Instructions'}</p>
            </div>

            <div className="instruction-navigation">
              <button
                type="button"
                className="nav-btn prev-btn"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="mark-complete-btn"
                onClick={() => toggleStepComplete(currentStep)}
              >
                {completedSteps.has(currentStep) ? 'Completed' : 'Mark as Completed'}
              </button>
              <button
                type="button"
                className="nav-btn next-btn"
                onClick={goToNextStep}
                disabled={currentStep === totalSteps - 1}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Macros Section */}
          <div className="macros-section">
            <h3 className="macros-title">Macros</h3>
            <div className="macros-content">
              <div className="calories-display">
                <p className="calories-amount">1000 Calories</p>
                <p className="calories-label">Per Portion</p>
              </div>
              <div className="macros-info">
                <div className="macro-item">
                  <div className="macro-icon">🍳</div>
                  <p className="macro-label">10g Protein</p>
                </div>
                <div className="macro-item">
                  <div className="macro-icon">🍞</div>
                  <p className="macro-label">10g Carbohydrates</p>
                </div>
                <div className="macro-item">
                  <div className="macro-icon">🧀</div>
                  <p className="macro-label">10g Fat</p>
                </div>
              </div>
              <div className="portions-selector">
                <div className="portions-control">
                  <button type="button" className="portion-btn">−</button>
                  <p className="portion-count">1</p>
                  <button type="button" className="portion-btn">+</button>
                </div>
                <p className="portions-label">Portions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookingGuide;
