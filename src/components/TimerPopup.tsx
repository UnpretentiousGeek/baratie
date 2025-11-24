import React, { useState, useEffect, useRef } from 'react';
import './TimerPopup.css';

interface TimerPopupProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
}

const TimerPopup: React.FC<TimerPopupProps> = ({ isOpen, onClose, anchorRef }) => {
    const [minutes, setMinutes] = useState(5);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [note, setNote] = useState('');
    const popupRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, right: 0 });

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
            if (
                popupRef.current &&
                !popupRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Calculate position
            if (anchorRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                // Position below the button, aligned to the right
                setPosition({
                    top: rect.bottom + 8, // 8px gap
                    right: window.innerWidth - rect.right
                });
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

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
        <div
            className="timer-popup"
            ref={popupRef}
            style={{
                top: `${position.top}px`,
                right: `${position.right}px`
            }}
        >
            <div className="timer-header">
                <h3>Timer</h3>
            </div>

            <div className="timer-display-container">
                <button
                    className="timer-adjust-btn"
                    onClick={() => adjustMinutes(-1)}
                    disabled={isActive}
                >
                    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.90625 12.5H21.0938" stroke="#B8B3AE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.90625 12.5H21.0938" stroke="#2D2925" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12.5 3.90625V21.0938" stroke="#2D2925" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
    );
};

export default TimerPopup;
