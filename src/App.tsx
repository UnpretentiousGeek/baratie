import React from 'react';
import { RecipeProvider, useRecipe } from './context/RecipeContext';
import BackgroundBlobs from './components/BackgroundBlobs';
import Header from './components/Header';
import Hero from './components/Hero';
import './App.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import About from './components/About';

const AppContent: React.FC = () => {
  const { currentStage } = useRecipe();
  const isCookingMode = currentStage === 'cooking';

  return (
    <Router>
      {!isCookingMode && <BackgroundBlobs />}
      <div className="app-container">
        <Header />
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
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

