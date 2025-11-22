import React from 'react';
import { motion } from 'framer-motion';
import './LoadingMessage.css';

interface LoadingMessageProps {
  text?: string;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ text = 'Updating recipe...' }) => {
  return (
    <div className="message-container message-loading">
      <div className="message-bubble message-bubble-loading">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
          <p className="loading-text">{text}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingMessage;

