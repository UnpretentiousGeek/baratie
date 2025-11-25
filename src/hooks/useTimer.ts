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
    // Initialize state from sessionStorage
    const [minutes, setMinutes] = useState<number>(() => {
        try {
            const saved = sessionStorage.getItem('baratie_timer_state');
            return saved ? JSON.parse(saved).minutes : initialMinutes;
        } catch (e) {
            return initialMinutes;
        }
    });
    const [seconds, setSeconds] = useState<number>(() => {
        try {
            const saved = sessionStorage.getItem('baratie_timer_state');
            return saved ? JSON.parse(saved).seconds : 0;
        } catch (e) {
            return 0;
        }
    });
    const [isActive, setIsActive] = useState<boolean>(() => {
        try {
            const saved = sessionStorage.getItem('baratie_timer_state');
            return saved ? JSON.parse(saved).isActive : false;
        } catch (e) {
            return false;
        }
    });
    const [isComplete, setIsComplete] = useState<boolean>(() => {
        try {
            const saved = sessionStorage.getItem('baratie_timer_state');
            return saved ? JSON.parse(saved).isComplete : false;
        } catch (e) {
            return false;
        }
    });
    const [note, setNote] = useState<string>(() => {
        try {
            const saved = sessionStorage.getItem('baratie_timer_state');
            return saved ? JSON.parse(saved).note : '';
        } catch (e) {
            return '';
        }
    });
    const [originalMinutes, setOriginalMinutes] = useState<number>(() => {
        try {
            const saved = sessionStorage.getItem('baratie_timer_state');
            return saved ? JSON.parse(saved).originalMinutes : initialMinutes;
        } catch (e) {
            return initialMinutes;
        }
    });

    // Keep track of the target end time to handle background throttling and persistence
    const endTimeRef = useRef<number | null>(null);

    // Initialize ref from storage
    const savedState = sessionStorage.getItem('baratie_timer_state');
    if (savedState && !endTimeRef.current) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed.endTime) {
                endTimeRef.current = parsed.endTime;
            }
        } catch (e) {
            // Ignore error
        }
    }
    const rafRef = useRef<number | null>(null);

    // Persist state whenever it changes
    useEffect(() => {
        const state = {
            minutes,
            seconds,
            isActive,
            isComplete,
            note,
            originalMinutes,
            endTime: endTimeRef.current
        };
        sessionStorage.setItem('baratie_timer_state', JSON.stringify(state));
    }, [minutes, seconds, isActive, isComplete, note, originalMinutes]);

    // Resume timer on mount if it was active
    useEffect(() => {
        const saved = sessionStorage.getItem('baratie_timer_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.isActive && parsed.endTime) {
                    const now = Date.now();
                    const diff = parsed.endTime - now;

                    if (diff > 0) {
                        // Timer is still running
                        endTimeRef.current = parsed.endTime;
                        setIsActive(true);
                    } else {
                        // Timer finished while away
                        setMinutes(0);
                        setSeconds(0);
                        setIsActive(false);
                        setIsComplete(true);
                        endTimeRef.current = null;
                    }
                }
            } catch (e) {
                console.error('Failed to parse timer state', e);
            }
        }
    }, []);

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
        setMinutes(5);
        setSeconds(0);
        setOriginalMinutes(5);
        endTimeRef.current = null;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        // Clear storage for clean state
        sessionStorage.removeItem('baratie_timer_state');
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

    const playTimerSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // Play 3 beeps
            const now = ctx.currentTime;
            [0, 0.8, 1.6].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now + offset); // A5
                osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.5); // Drop to A4

                gain.gain.setValueAtTime(0.3, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.5);

                osc.start(now + offset);
                osc.stop(now + offset + 0.5);
            });
        } catch (e) {
            console.error('Error playing timer sound:', e);
        }
    };

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
                    playTimerSound();
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
