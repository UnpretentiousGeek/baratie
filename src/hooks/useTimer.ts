import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerReturn {
    minutes: number;
    seconds: number;
    isActive: boolean;
    isComplete: boolean;
    note: string;
    originalMinutes: number;
    setNote: (note: string) => void;
    start: () => void;
    pause: () => void;
    reset: () => void;
    adjustMinutes: (amount: number) => void;
    closeCompleteModal: () => void;
}

export const useTimer = (initialMinutes: number = 5): UseTimerReturn => {
    const [minutes, setMinutes] = useState(initialMinutes);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [note, setNote] = useState('');
    const [originalMinutes, setOriginalMinutes] = useState(initialMinutes);

    // Keep track of the target end time to handle background throttling
    const endTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    const start = useCallback(() => {
        if (minutes === 0 && seconds === 0) return;

        setIsActive(true);
        setIsComplete(false);

        // Calculate expected end time
        const now = Date.now();
        const totalMs = (minutes * 60 + seconds) * 1000;
        endTimeRef.current = now + totalMs;
    }, [minutes, seconds]);

    const pause = useCallback(() => {
        setIsActive(false);
        endTimeRef.current = null;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        setIsActive(false);
        setIsComplete(false);
        setMinutes(5); // Default reset to 5 or original? User usually expects default.
        setSeconds(0);
        setOriginalMinutes(5);
        endTimeRef.current = null;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const adjustMinutes = useCallback((amount: number) => {
        if (isActive) return;

        setMinutes(prev => {
            const newVal = prev + amount;
            if (newVal < 1) return 1;
            if (newVal > 99) return 99;
            setOriginalMinutes(newVal);
            return newVal;
        });
    }, [isActive]);

    const closeCompleteModal = useCallback(() => {
        setIsComplete(false);
        reset();
    }, [reset]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && endTimeRef.current) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = endTimeRef.current! - now;

                if (diff <= 0) {
                    // Timer complete
                    setMinutes(0);
                    setSeconds(0);
                    setIsActive(false);
                    setIsComplete(true);
                    endTimeRef.current = null;
                    clearInterval(interval);
                } else {
                    // Update display
                    const totalSeconds = Math.ceil(diff / 1000);
                    const mins = Math.floor(totalSeconds / 60);
                    const secs = totalSeconds % 60;

                    setMinutes(mins);
                    setSeconds(secs);
                }
            }, 100); // Check every 100ms for better accuracy than 1s
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive]);

    return {
        minutes,
        seconds,
        isActive,
        isComplete,
        note,
        originalMinutes,
        setNote,
        start,
        pause,
        reset,
        adjustMinutes,
        closeCompleteModal
    };
};
