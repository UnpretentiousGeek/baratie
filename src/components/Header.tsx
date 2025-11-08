import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="app-header-new">
      <h1 className="logo">Baratie</h1>
      <nav className="nav-links">
        <a href="#extension" className="nav-link">Get Extension</a>
        <a href="#about" className="nav-link">About</a>
        <a href="#contact" className="nav-link">Contact</a>
      </nav>
    </header>
  );
};

export default Header;

