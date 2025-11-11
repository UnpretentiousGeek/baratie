import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import './CookingGuide.css';

const CookingGuide: React.FC = () => {
  const { recipe, setStage } = useRecipe();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  if (!recipe) {
    return null;
  }

  const instructions = recipe.instructions;
  const totalSteps = instructions.length;

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

  const handleComplete = () => {
    setStage('complete');
  };

  const allStepsCompleted = completedSteps.size === totalSteps;

  return (
    <div className="cooking-guide">
      <div className="cooking-header">
        <button
          className="back-button"
          onClick={() => setStage('preview')}
        >
          <ChevronLeft size={20} />
          Back to Recipe
        </button>
        <h2 className="cooking-title">{recipe.title}</h2>
        <div className="step-indicator">
          Step {currentStep + 1} of {totalSteps}
        </div>
      </div>

      <div className="cooking-content">
        <div className="step-navigation">
          <button
            className="nav-button"
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={24} />
            Previous
          </button>

          <div className="step-content">
            <div className="step-number">Step {currentStep + 1}</div>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-instruction"
            >
              <p>{instructions[currentStep]}</p>
            </motion.div>

            <button
              className={`step-complete-btn ${completedSteps.has(currentStep) ? 'completed' : ''}`}
              onClick={() => toggleStepComplete(currentStep)}
            >
              <Check size={20} />
              {completedSteps.has(currentStep) ? 'Completed' : 'Mark as Complete'}
            </button>
          </div>

          <button
            className="nav-button"
            onClick={goToNextStep}
            disabled={currentStep === totalSteps - 1}
          >
            Next
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="cooking-sidebar">
          <div className="ingredients-panel">
            <h3>Ingredients</h3>
            <ul>
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>
          </div>

          <div className="steps-overview">
            <h3>Steps</h3>
            <div className="steps-list">
              {instructions.map((instruction, index) => (
                <button
                  key={index}
                  className={`step-item ${index === currentStep ? 'active' : ''} ${completedSteps.has(index) ? 'completed' : ''}`}
                  onClick={() => setCurrentStep(index)}
                >
                  <span className="step-item-number">{index + 1}</span>
                  <span className="step-item-text">{instruction.substring(0, 50)}...</span>
                  {completedSteps.has(index) && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {allStepsCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="completion-banner"
        >
          <h3>🎉 All Steps Completed!</h3>
          <p>Great job! Your {recipe.title} is ready.</p>
          <button
            className="finish-button"
            onClick={handleComplete}
          >
            Finish Cooking
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default CookingGuide;

