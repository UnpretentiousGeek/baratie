import React, { useState, useMemo } from 'react';
import { useRecipe } from '../context/RecipeContext';
import { normalizeInstructions, normalizeIngredients, getIngredientSections } from '../utils/recipeUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { XIcon, DownloadIcon, CheckIcon, PortionMinusIcon, PortionPlusIcon } from './icons';
import './CookingGuide.css';

const CookingGuide: React.FC = () => {
  const { recipe, setStage } = useRecipe();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [portions, setPortions] = useState(1);

  if (!recipe) {
    return null;
  }

  const instructions = normalizeInstructions(recipe.instructions);
  const ingredients = normalizeIngredients(recipe.ingredients);
  const totalSteps = instructions.length;

  // Ensure currentStep is valid when instructions change
  React.useEffect(() => {
    if (currentStep >= totalSteps && totalSteps > 0) {
      setCurrentStep(totalSteps - 1);
    }
  }, [totalSteps, currentStep]);

  // Reset state when recipe changes
  React.useEffect(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setCheckedIngredients(new Set());
    setSelectedFilter('All');
    setPortions(1);
  }, [recipe?.title]);

  // Get ingredient sections for dynamic filters
  const ingredientSections = useMemo(() => {
    return getIngredientSections(recipe.ingredients);
  }, [recipe.ingredients]);

  // Generate filter options dynamically
  const filterOptions = useMemo(() => {
    const options = ['All'];
    if (ingredientSections && ingredientSections.length > 0) {
      ingredientSections.forEach(section => {
        if (section.title) {
          // Extract clean title (remove "For" prefix if present)
          const cleanTitle = section.title.replace(/^(For|for)\s+/i, '');
          options.push(cleanTitle);
        }
      });
    }
    return options;
  }, [ingredientSections]);

  // Filter ingredients based on selected filter
  const filteredIngredients = useMemo(() => {
    if (selectedFilter === 'All' || !ingredientSections) {
      return ingredients.map((ingredient, index) => ({ ingredient, originalIndex: index }));
    }

    // Find the matching section
    const matchingSection = ingredientSections.find(section => {
      if (!section.title) return false;
      const cleanTitle = section.title.replace(/^(For|for)\s+/i, '');
      return cleanTitle === selectedFilter;
    });

    if (!matchingSection || !matchingSection.items) {
      return ingredients.map((ingredient, index) => ({ ingredient, originalIndex: index }));
    }

    // Map section items to their original indices in the full ingredients array
    const filtered: Array<{ ingredient: string; originalIndex: number }> = [];
    let currentIndex = 0;

    ingredientSections.forEach(section => {
      if (section === matchingSection) {
        // Add items from the matching section with their original indices
        section.items.forEach(item => {
          filtered.push({ ingredient: item, originalIndex: currentIndex });
          currentIndex++;
        });
      } else {
        // Skip items from other sections, but advance the index
        currentIndex += section.items ? section.items.length : 0;
      }
    });

    return filtered;
  }, [ingredients, ingredientSections, selectedFilter]);

  // Calculate macros per portion
  // Note: recipe.nutrition contains values for the ENTIRE recipe
  // When portions > 1, we divide to show nutrition per portion
  const macrosPerPortion = useMemo(() => {
    if (!recipe.nutrition || !recipe.nutrition.calories) {
      return null;
    }

    return {
      calories: Math.round(recipe.nutrition.calories / portions),
      protein: Math.round((recipe.nutrition.protein || 0) / portions),
      carbs: Math.round((recipe.nutrition.carbs || 0) / portions),
      fat: Math.round((recipe.nutrition.fat || 0) / portions),
    };
  }, [recipe.nutrition, portions]);

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
            <DownloadIcon size={24} />
          </button>
          <button type="button" className="recipe-action-btn" onClick={() => setStage('preview')} aria-label="Close">
            <XIcon size={24} />
          </button>
        </div>
      </div>

      {/* Main Content: Two Column Layout */}
      <div className="recipe-main-content">
        {/* Left Column: Ingredient List */}
        <div className="ingredient-list-panel">
          <h3 className="ingredient-list-title">Ingredient list</h3>

          {/* Filter Buttons - Dynamic based on recipe sections */}
          {filterOptions.length > 1 && (
            <div className="ingredient-filters">
              {filterOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  className={`ingredient-filter-btn ${selectedFilter === option ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Ingredients List */}
          <div className="ingredients-list-container">
            {filteredIngredients.map(({ ingredient, originalIndex }) => {
              const isChecked = checkedIngredients.has(originalIndex);
              return (
                <div
                  key={originalIndex}
                  className={`ingredient-item ${isChecked ? 'checked' : ''}`}
                >
                  <div
                    className="ingredient-checkbox-wrapper"
                    onClick={() => toggleIngredient(originalIndex)}
                  >
                    <div className={`ingredient-checkbox ${isChecked ? 'checked' : ''}`}>
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.875 6.75L4.5 9.375L10.5 3.375" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                className={`mark-complete-btn ${completedSteps.has(currentStep) ? 'completed' : ''}`}
                onClick={() => toggleStepComplete(currentStep)}
              >
                {completedSteps.has(currentStep) && <CheckIcon size={20} />}
                <span>{completedSteps.has(currentStep) ? 'Completed' : 'Mark as Completed'}</span>
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
              {macrosPerPortion ? (
                <>
                  <div className="calories-display">
                    <p className="calories-amount">{macrosPerPortion.calories} Calories</p>
                    <p className="calories-label">{portions === 1 ? 'Total' : `For ${portions} Portions`}</p>
                  </div>
                  <div className="macros-info">
                    <div className="macro-item">
                      <div className="macro-icon">
                        <img src="/assets/macros/protein.png" alt="Protein" />
                      </div>
                      <p className="macro-label">{macrosPerPortion.protein}g Protein</p>
                    </div>
                    <div className="macro-item">
                      <div className="macro-icon">
                        <img src="/assets/macros/carbs.png" alt="Carbohydrates" />
                      </div>
                      <p className="macro-label">{macrosPerPortion.carbs}g Carbs</p>
                    </div>
                    <div className="macro-item">
                      <div className="macro-icon">
                        <img src="/assets/macros/fat.png" alt="Fat" />
                      </div>
                      <p className="macro-label">{macrosPerPortion.fat}g Fat</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="calories-display">
                    <p className="calories-amount">Calculating...</p>
                    <p className="calories-label">Nutrition Info</p>
                  </div>
                  <div className="macros-info">
                    <div className="macro-item">
                      <div className="macro-icon">
                        <img src="/assets/macros/protein.png" alt="Protein" />
                      </div>
                      <p className="macro-label">-- Protein</p>
                    </div>
                    <div className="macro-item">
                      <div className="macro-icon">
                        <img src="/assets/macros/carbs.png" alt="Carbohydrates" />
                      </div>
                      <p className="macro-label">-- Carbs</p>
                    </div>
                    <div className="macro-item">
                      <div className="macro-icon">
                        <img src="/assets/macros/fat.png" alt="Fat" />
                      </div>
                      <p className="macro-label">-- Fat</p>
                    </div>
                  </div>
                </>
              )}
              <div className="portions-selector">
                <div className="portions-control">
                  <button
                    type="button"
                    className="portion-btn"
                    onClick={() => setPortions(Math.max(1, portions - 1))}
                    disabled={portions <= 1}
                  >
                    <PortionMinusIcon size={25} disabled={portions <= 1} />
                  </button>
                  <p className="portion-count">{portions}</p>
                  <button
                    type="button"
                    className="portion-btn"
                    onClick={() => setPortions(portions + 1)}
                  >
                    <PortionPlusIcon size={25} />
                  </button>
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
