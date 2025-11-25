import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './About.css';

const About: React.FC = () => {
    return (
        <div className="about-container">
            <div className="about-content">
                <Link to="/" className="back-button">
                    <ArrowLeft size={24} />
                </Link>
                <div className="about-text">
                    <h1 className="about-title">About Baratie</h1>
                    <div className="about-description">
                        <p>Hey,</p>
                        <p className="spacer">&nbsp;</p>
                        <p>Thank you for checking out Baratie. I built this project as a way to gain some experience building Products and also to add it to my portfolio. I want to get into Product Design but have no experience in it. It was a great experience designing it and developing it. I mostly used Figma for design and then vibe coded this. For vibe coding I used Cursor and Claude Code.</p>
                        <p className="spacer">&nbsp;</p>
                        <p>Thanks</p>
                    </div>
                </div>
                <div className="about-image">
                    <img src="/assets/Icon.png" alt="Baratie Icon" />
                </div>
            </div>
        </div>
    );
};

export default About;
