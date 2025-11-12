import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import AttachedFiles from './AttachedFiles';
import { PlusIcon, ArrowUpIcon } from './icons';
import './ChatInput.css';

interface ChatInputProps {
  isSidebar?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ isSidebar = false }) => {
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

    const currentInput = inputValue;
    // Clear input immediately after sending
    setInputValue('');
    setIsLoading(true);
    
    try {
      await extractRecipe(currentInput);
    } catch (error) {
      console.error('Error extracting recipe:', error);
      alert('Failed to extract recipe. Please check the console for details or ensure the API endpoints are configured.');
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
    <div className={`chat-input-wrapper ${isSidebar ? 'chat-input-sidebar' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Attach files"
      />

      <div className="chat-input-container-inner">
        <AttachedFiles />
        <motion.div
          className={`chat-input-box ${isSidebar ? 'chat-input-box-sidebar' : ''}`}
          whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
        >
          <textarea
            ref={textareaRef}
            className="hero-chat-input"
            placeholder={isSidebar ? "+ Ask Anything" : "Ask Baratie to extract or make changes to a recipe..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            rows={1}
            aria-label="Recipe chat input"
          />
          <div className="chat-input-actions">
            {!isSidebar && (
              <motion.button
                className="btn-add-media"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ backgroundColor: '#faf9f8', scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Add media"
                type="button"
              >
                <PlusIcon size={20} />
              </motion.button>
            )}
            <motion.button
              className="btn-send-arrow"
              onClick={handleSend}
              disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}
              whileHover={{ backgroundColor: '#E6725F', scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              <ArrowUpIcon size={20} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatInput;

