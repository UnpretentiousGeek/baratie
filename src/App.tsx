import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { RecipeProvider, useRecipe } from './context/RecipeContext';
import BackgroundBlobs from './components/BackgroundBlobs';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import './App.css';

const AppContent: React.FC = () => {
  const { currentStage, extractRecipe } = useRecipe();
  const location = useLocation();
  const isCookingMode = currentStage === 'cooking';
  const isAboutPage = location.pathname === '/about';

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recipeText = params.get('recipe_text');
    const recipeUrl = params.get('recipe_url');
    const sourceUrl = params.get('source_url');

    if (recipeText) {
      // Append source URL if available for context
      const prompt = sourceUrl
        ? `${recipeText}\n\nSource: ${sourceUrl}`
        : recipeText;

      extractRecipe(prompt);

      // Clear URL params to prevent re-processing
      window.history.replaceState({}, '', window.location.pathname);
    } else if (recipeUrl) {
      extractRecipe(recipeUrl);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search, extractRecipe]);

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
