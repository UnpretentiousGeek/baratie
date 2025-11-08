import React from 'react';
import ChatInput from './ChatInput';
import './Hero.css';

const Hero: React.FC = () => {
  return (
    <div className="hero-section">
      <div className="hero-content">
        <h2 className="hero-title">What you wanna cook?</h2>
        <p className="hero-subtitle">Turn any recipe into an interactive cooking guide</p>
      </div>
      <ChatInput />
    </div>
  );
};

export default Hero;

