import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import AttachedFiles from './AttachedFiles';
import './ChatInput.css';

const ChatInput: React.FC = () => {
  const { addFiles, extractRecipe, attachedFiles } = useRecipe();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await addFiles(files);
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      await extractRecipe(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error extracting recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length > 0) {
      e.preventDefault();
      await addFiles(files);
    }
  };

  return (
    <div className="chat-input-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Attach files"
      />
      
      <AttachedFiles />

      <div className="chat-input-container-inner">
        <motion.div
          className="chat-input-box"
          whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
        >
          <textarea
            ref={textareaRef}
            className="hero-chat-input"
            placeholder="Ask Baratie to extract or make changes to a recipe..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            rows={1}
            aria-label="Recipe chat input"
          />
          <div className="chat-input-actions">
            <motion.button
              className="btn-add-media"
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ backgroundColor: '#faf9f8', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Add media"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" rx="10" fill="none"/>
                <path d="M10 5V15M5 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </motion.button>
            <motion.button
              className="btn-send-arrow"
              onClick={handleSend}
              disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}
              whileHover={{ backgroundColor: '#E6725F', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 16.875V3.125" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.375 8.75L10 3.125L15.625 8.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatInput;

