import React from 'react';
import { motion } from 'framer-motion';
import { ChatMessage } from '../types';
import { normalizeIngredients } from '../utils/recipeUtils';
import { useRecipe } from '../context/RecipeContext';
import './Message.css';

interface MessageProps {
  message: ChatMessage;
}

const UserMessage: React.FC<{ text: string; attachedFiles?: any[] }> = ({ text }) => {
  return (
    <div className="message-container message-user">
      <div className="message-bubble message-bubble-user">
        <p className="message-text">{text}</p>
      </div>
    </div>
  );
};

const SystemMessage: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="message-container message-system">
      <div className="message-bubble message-bubble-system">
        <p className="message-text">{text}</p>
      </div>
    </div>
  );
};

const RecipePreviewMessage: React.FC<{ recipe: any }> = ({ recipe }) => {
  const { setStage } = useRecipe();
  const ingredients = normalizeIngredients(recipe.ingredients);

  const handleStartCooking = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStage('cooking');
  };

  return (
    <div className="message-container message-recipe">
      <div className="recipe-preview-card">
        <h3 className="recipe-preview-title">{recipe.title}</h3>
        <div className="recipe-preview-section">
          <h4 className="recipe-preview-section-title">Ingredients</h4>
          <div className="recipe-preview-ingredients">
            {ingredients.map((ingredient, index) => (
              <p key={index} className="recipe-preview-ingredient">{ingredient}</p>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="recipe-preview-button"
          onClick={handleStartCooking}
        >
          Start Cooking
        </button>
      </div>
    </div>
  );
};

const Message: React.FC<MessageProps> = ({ message }) => {
  if (message.type === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <UserMessage text={message.text || ''} attachedFiles={message.attachedFiles} />
      </motion.div>
    );
  }

  if (message.type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SystemMessage text={message.text || ''} />
      </motion.div>
    );
  }

  if (message.type === 'recipe-preview' && message.recipe) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <RecipePreviewMessage recipe={message.recipe} />
      </motion.div>
    );
  }

  return null;
};

export default Message;

