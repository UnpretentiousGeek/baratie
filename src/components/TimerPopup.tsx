import React, { useState, useEffect, useRef } from 'react';
import './TimerPopup.css';

interface TimerPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const TimerPopup: React.FC<TimerPopupProps> = ({ isOpen, onClose }) => {
    const [minutes, setMinutes] = useState(5);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [note, setNote] = useState('');
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive) {
            interval = setInterval(() => {
                if (seconds === 0) {
                    if (minutes === 0) {
                        setIsActive(false);
                        if (interval) clearInterval(interval);
                        // Optional: Play sound or notification
                    } else {
                        setMinutes(minutes - 1);
                        setSeconds(59);
                    }
                } else {
                    setSeconds(seconds - 1);
                }
            }, 1000);
        } else if (!isActive && seconds !== 0) {
            if (interval) clearInterval(interval);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, seconds, minutes]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setMinutes(5);
        setSeconds(0);
    };

    const adjustMinutes = (amount: number) => {
        const newMinutes = minutes + amount;
        if (newMinutes >= 0 && newMinutes <= 99) {
            setMinutes(newMinutes);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="timer-overlay">
            <div className="timer-popup" ref={popupRef}>
                <div className="timer-header">
                    <h3>Timer</h3>
                </div>

                <div className="timer-display-container">
                    <button
                        className="timer-adjust-btn"
                        onClick={() => adjustMinutes(-1)}
                        disabled={isActive}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <div className="timer-display">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>

                    <button
                        className="timer-adjust-btn"
                        onClick={() => adjustMinutes(1)}
                        disabled={isActive}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="timer-note-container">
                    <label>Note</label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note..."
                        className="timer-note-input"
                    />
                </div>

                <div className="timer-actions">
                    <button className="timer-btn secondary" onClick={resetTimer}>
                        Reset
                    </button>
                    <button className="timer-btn primary" onClick={toggleTimer}>
                        {isActive ? 'Pause' : 'Start'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimerPopup;
