import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { RecipeProvider, useRecipe } from './context/RecipeContext';
import BackgroundBlobs from './components/BackgroundBlobs';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import './App.css';

const AppContent: React.FC = () => {
  const { currentStage } = useRecipe();
  const location = useLocation();
  const isCookingMode = currentStage === 'cooking';
  const isAboutPage = location.pathname === '/about';

  return (
    <>
      {(!isCookingMode || isAboutPage) && <BackgroundBlobs />}
      <div className="app-container">
        <Header />
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <RecipeProvider>
      <Router>
        <AppContent />
      </Router>
    </RecipeProvider>
  );
};

export default App;
