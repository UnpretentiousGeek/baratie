import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import AttachedFiles from './AttachedFiles';
import { PlusIcon, ArrowUpIcon } from './icons';
import './ChatInput.css';

const ChatInput: React.FC = () => {
  const { addFiles, extractRecipe, attachedFiles, messages } = useRecipe();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
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
    setIsLoading(true);
    setLastMessageCount(messages.length);
    
    try {
      await extractRecipe(currentInput);
      // Don't clear input here - wait for response
    } catch (error) {
      console.error('Error extracting recipe:', error);
      // Clear input on error
      setInputValue('');
      alert('Failed to extract recipe. Please check the console for details or ensure the API endpoints are configured.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear input when a new system or recipe-preview message arrives (response received)
  React.useEffect(() => {
    if (lastMessageCount > 0 && messages.length > lastMessageCount) {
      const newMessages = messages.slice(lastMessageCount);
      const hasResponse = newMessages.some(msg => msg.type === 'system' || msg.type === 'recipe-preview');
      if (hasResponse && inputValue) {
        // Only clear if the input matches what we sent
        setInputValue('');
      }
    }
  }, [messages, lastMessageCount, inputValue]);

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

      <div className="chat-input-container-inner">
        <AttachedFiles />
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
              <PlusIcon size={20} />
            </motion.button>
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

