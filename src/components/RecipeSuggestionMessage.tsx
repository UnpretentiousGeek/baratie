import React, { useState } from 'react';
import { Recipe } from '../types';
import { useRecipe } from '../context/RecipeContext';
import './RecipeSuggestionMessage.css';

interface RecipeSuggestionMessageProps {
    suggestions: Recipe[];
    text?: string;
}

const RecipeSuggestionMessage: React.FC<RecipeSuggestionMessageProps> = ({ suggestions, text }) => {
    const { selectSuggestion } = useRecipe();
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        setSelectedIndex(index);
    };

    const handleConfirm = () => {
        if (selectedIndex !== null && suggestions[selectedIndex]) {
            selectSuggestion(suggestions[selectedIndex]);
        }
    };

    return (
        <div className="recipe-suggestion-container">
            <div className="recipe-suggestion-header">
                <p className="recipe-suggestion-text">
                    {text || 'Here are recommended recipes based on the ingredients'}
                </p>
            </div>
            <div className="recipe-suggestion-list-card">
                <div className="recipe-suggestion-list">
                    {suggestions.map((recipe, index) => (
                        <div
                            key={index}
                            className={`recipe-suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                            onClick={() => handleSelect(index)}
                        >
                            <p className="recipe-suggestion-item-text">{recipe.title}</p>
                            {recipe.description && <p className="recipe-suggestion-item-desc">{recipe.description}</p>}
                        </div>
                    ))}
                </div>
                <button
                    className="recipe-suggestion-confirm-button"
                    onClick={handleConfirm}
                    disabled={selectedIndex === null}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
};

export default RecipeSuggestionMessage;
