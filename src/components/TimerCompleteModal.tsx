import React from 'react';
import './TimerCompleteModal.css';

interface TimerCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalMinutes: number;
    note: string;
}

const TimerCompleteModal: React.FC<TimerCompleteModalProps> = ({ isOpen, onClose, originalMinutes, note }) => {
    if (!isOpen) return null;

    return (
        <div className="timer-complete-overlay">
            <div className="timer-complete-card">
                <p className="timer-complete-title">Timer’s up</p>
                <p className="timer-complete-time">{originalMinutes} mins</p>

                {note && (
                    <div className="timer-complete-note-container">
                        <p className="timer-complete-note">{note}</p>
                    </div>
                )}

                <button className="timer-complete-close-btn" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default TimerCompleteModal;
