import React from 'react';
import { RecipeProvider, useRecipe } from './context/RecipeContext';
import BackgroundBlobs from './components/BackgroundBlobs';
import Header from './components/Header';
import Hero from './components/Hero';
import './App.css';

const AppContent: React.FC = () => {
  const { currentStage } = useRecipe();
  const isCookingMode = currentStage === 'cooking';
  
  return (
    <>
      {!isCookingMode && <BackgroundBlobs />}
      <div className="app-container">
        <Header />
        <Hero />
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <RecipeProvider>
      <AppContent />
    </RecipeProvider>
  );
};

export default App;

