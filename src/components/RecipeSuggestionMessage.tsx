import React, { useState } from 'react';
import { Recipe } from '../types';
import { useRecipe } from '../context/RecipeContext';
import './RecipeSuggestionMessage.css';

interface RecipeSuggestionMessageProps {
    suggestions: Recipe[];
    text?: string;
}

const RecipeSuggestionMessage: React.FC<RecipeSuggestionMessageProps> = ({ suggestions, text }) => {
    const { setRecipe, setStage, addMessage } = useRecipe();
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        setSelectedIndex(index);
    };

    const handleConfirm = () => {
        if (selectedIndex !== null && suggestions[selectedIndex]) {
            const selectedRecipe = suggestions[selectedIndex];
            setRecipe(selectedRecipe);
            setStage('preview');

            // Add a preview message to show the selected recipe details
            addMessage({
                type: 'recipe-preview',
                recipe: selectedRecipe,
                text: 'Here is the recipe you selected:'
            });
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
