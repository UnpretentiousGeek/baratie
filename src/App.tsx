import React from 'react';
import { RecipeProvider } from './context/RecipeContext';
import BackgroundBlobs from './components/BackgroundBlobs';
import Header from './components/Header';
import Hero from './components/Hero';
import './App.css';

const App: React.FC = () => {
  return (
    <RecipeProvider>
      <BackgroundBlobs />
      <div className="app-container">
        <Header />
        <Hero />
      </div>
    </RecipeProvider>
  );
};

export default App;

