import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="app-header-new">
      <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }} onClick={closeMenu}>Baratie</Link>

      {/* Desktop Navigation */}
      <nav className="nav-links desktop-nav">
        <a href="https://github.com/UnpretentiousGeek/baratie/tree/master/extensions" target="_blank" rel="noopener noreferrer" className="nav-link">Get Extension</a>
        <Link to="/about" className="nav-link">About</Link>
        <a href="https://x.com/hakku015" target="_blank" rel="noopener noreferrer" className="nav-link">Contact</a>
      </nav>

      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
        {isMenuOpen ? (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M31.25 8.75L8.75 31.25" stroke="#2D2925" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M31.25 31.25L8.75 8.75" stroke="#2D2925" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.25 20H33.75" stroke="#2D2925" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.25 10H33.75" stroke="#2D2925" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.25 30H33.75" stroke="#2D2925" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="mobile-menu-overlay">
          <a href="https://github.com/UnpretentiousGeek/baratie/tree/master/extensions" target="_blank" rel="noopener noreferrer" className="mobile-nav-link" onClick={closeMenu}>Get Extension</a>
          <Link to="/about" className="mobile-nav-link" onClick={closeMenu}>About</Link>
          <a href="https://x.com/hakku015" target="_blank" rel="noopener noreferrer" className="mobile-nav-link" onClick={closeMenu}>Contact</a>
        </div>
      )}
    </header>
  );
};

export default Header;

