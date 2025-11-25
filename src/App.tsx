import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { RecipeProvider, useRecipe } from './context/RecipeContext';
import BackgroundBlobs from './components/BackgroundBlobs';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import './App.css';

const AppContent: React.FC = () => {
  const { currentStage, extractRecipe } = useRecipe();
  const location = useLocation();
  const navigate = useNavigate();
  const isCookingMode = currentStage === 'cooking';
  const isAboutPage = location.pathname === '/about';
  const processedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recipeText = params.get('recipe_text');
    const recipeUrl = params.get('recipe_url');
    const sourceUrl = params.get('source_url');

    // Create a unique key for this request to prevent duplicate processing
    const requestKey = recipeText || recipeUrl;

    if (requestKey && processedRef.current !== requestKey) {
      processedRef.current = requestKey;

      if (recipeText) {
        // Append source URL if available for context
        const prompt = sourceUrl
          ? `${recipeText}\n\nSource: ${sourceUrl}`
          : recipeText;

        extractRecipe(prompt);
      } else if (recipeUrl) {
        extractRecipe(recipeUrl);
      }

      // Clear URL params using navigate to update React Router state
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, extractRecipe, navigate]);

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
