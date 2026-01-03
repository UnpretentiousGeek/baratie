import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import { ChatMessage } from '../types';
import ChatInput from './ChatInput';
import CookingGuide from './CookingGuide';
import Message from './Message';
import './Hero.css';

const Hero: React.FC = () => {
  const { currentStage, recipe, setStage, messages } = useRecipe();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive or stage changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, currentStage]);

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

  // Show cooking guide when stage is 'cooking' - split layout with chat on left, recipe on right
  if (currentStage === 'cooking' && recipe) {
    // Group consecutive recipe and system messages together
    const groupedMessages: (ChatMessage | ChatMessage[])[] = [];
    let currentGroup: ChatMessage[] | null = null;

    messages.forEach((message) => {
      if (message.type === 'recipe-preview' || message.type === 'system') {
        if (!currentGroup) {
          currentGroup = [message];
        } else {
          currentGroup.push(message);
        }
      } else {
        if (currentGroup) {
          groupedMessages.push(currentGroup);
          currentGroup = null;
        }
        groupedMessages.push(message);
      }
    });

    if (currentGroup) {
      groupedMessages.push(currentGroup);
    }

    return (
      <div className="hero-section cooking-mode">
        <div className="cooking-split-container">
          {/* Left side: Chat interface */}
          <div className="cooking-chat-panel">
            <div className="chat-container">
              <div className="chat-messages">
                {groupedMessages.map((item, index) => {
                  if (Array.isArray(item)) {
                    // Group of recipe/system messages with 8px gap
                    return (
                      <div key={`group-${index}`} className="message-group-recipe-system">
                        {item.map((message) => (
                          <Message key={message.id} message={message} />
                        ))}
                      </div>
                    );
                  } else {
                    // Single message (user or other)
                    return <Message key={item.id} message={item} />;
                  }
                })}
                <div ref={messagesEndRef} />
              </div>
              <ChatInput isChatMode={true} />
            </div>
          </div>
          {/* Right side: Cooking guide */}
          <div className="cooking-recipe-panel">
            <CookingGuide />
          </div>
        </div>
      </div>
    );
  }

  // Show recipe preview when stage is 'preview' - now with chat messages
  if (currentStage === 'preview') {
    // Group consecutive recipe and system messages together
    const groupedMessages: (ChatMessage | ChatMessage[])[] = [];
    let currentGroup: ChatMessage[] | null = null;

    messages.forEach((message) => {
      if (message.type === 'recipe-preview' || message.type === 'system') {
        if (!currentGroup) {
          currentGroup = [message];
        } else {
          currentGroup.push(message);
        }
      } else {
        if (currentGroup) {
          groupedMessages.push(currentGroup);
          currentGroup = null;
        }
        groupedMessages.push(message);
      }
    });

    if (currentGroup) {
      groupedMessages.push(currentGroup);
    }

    return (
      <div className="hero-section chat-mode">
        <div className="hero-content chat-container">
          <div className="chat-messages">
            {groupedMessages.map((item, index) => {
              if (Array.isArray(item)) {
                // Group of recipe/system messages with 8px gap
                return (
                  <div key={`group-${index}`} className="message-group-recipe-system">
                    {item.map((message) => (
                      <Message key={message.id} message={message} />
                    ))}
                  </div>
                );
              } else {
                // Single message (user or other)
                return <Message key={item.id} message={item} />;
              }
            })}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput isChatMode={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="hero-section">
      {/* Mobile/Tablet Unsupported View */}
      <div className="mobile-unsupported-view">
        <p className="mobile-unsupported-text">
          I'm sorry I have not optimized it for smaller devices. For now, you can only try it on Desktop
        </p>
        <img
          src="/assets/sadhamstergirl.gif"
          alt="Sad Hamster"
          className="mobile-unsupported-image"
        />
      </div>

      {/* Desktop View */}
      <div className="hero-content desktop-only">
        <h2 className="hero-title">What you wanna cook?</h2>
        <p className="hero-subtitle">Turn any recipe into an interactive cooking guide</p>
      </div>
      <div className="desktop-only w-full">
        <ChatInput />
      </div>
    </div>
  );
};

export default Hero;

