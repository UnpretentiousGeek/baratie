import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="app-header-new">
      <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>Baratie</Link>
      <nav className="nav-links">
        <a href="https://github.com/UnpretentiousGeek/baratie/tree/master/extensions" target="_blank" rel="noopener noreferrer" className="nav-link">Get Extension</a>
        <Link to="/about" className="nav-link">About</Link>
        <a href="mailto:tomar.sanchit15@gmail.com" className="nav-link">Contact</a>
      </nav>
    </header>
  );
};

export default Header;

