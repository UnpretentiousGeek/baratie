import React from 'react';
import './About.css';

const About: React.FC = () => {
    return (
        <div className="about-container">
            <div className="about-content">
                <div className="about-text">
                    <h1 className="about-title">About Baratie</h1>
                    <div className="about-description">
                        <p>Baratie is an open source recipe manager built with the help of Cursor and Claude Code.</p>
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
