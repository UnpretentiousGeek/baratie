// ==========================================
// Baratie - AI Recipe Manager
// ==========================================

// ==========================================
// Multi-Model Routing System
// ==========================================

/**
 * ResponseCache - Caches API responses to reduce quota usage
 * Stores in sessionStorage (short-term) and localStorage (24hr expiry)
 */
class ResponseCache {
    constructor() {
        this.sessionCache = new Map();
        this.localStoragePrefix = 'baratie_cache_';
        this.expiryHours = 24;
        this.stats = {
            hits: 0,
            misses: 0
        };
    }

    // Generate hash for cache key
    generateHash(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Get cache key for recipe extraction
    getRecipeKey(url) {
        return `recipe_${this.generateHash(url)}`;
    }

    // Get cache key for nutrition calculation
    getNutritionKey(ingredients, servings) {
        const ingredientsStr = JSON.stringify(ingredients);
        return `nutrition_${this.generateHash(ingredientsStr + servings)}`;
    }

    // Get cache key for YouTube extraction
    getYouTubeKey(videoId) {
        return `youtube_${videoId}`;
    }

    // Get cache key for chat (based on context + question)
    getChatKey(recipeContext, question) {
        const contextStr = recipeContext.substring(0, 500); // First 500 chars
        return `chat_${this.generateHash(contextStr + question)}`;
    }

    // Store in cache
    set(key, value, type = 'recipe') {
        const cacheEntry = {
            value: value,
            timestamp: Date.now(),
            type: type
        };

        // Store in session cache (immediate access)
        this.sessionCache.set(key, cacheEntry);

        // Store in localStorage (persistent)
        try {
            localStorage.setItem(
                this.localStoragePrefix + key,
                JSON.stringify(cacheEntry)
            );
        } catch (e) {
            console.warn('localStorage full, cache not persisted:', e);
        }
    }

    // Get from cache
    get(key) {
        // Try session cache first (fastest)
        if (this.sessionCache.has(key)) {
            const entry = this.sessionCache.get(key);
            if (this.isValid(entry)) {
                this.stats.hits++;
                console.log(`Cache HIT (session): ${key}`);
                return entry.value;
            } else {
                this.sessionCache.delete(key);
            }
        }

        // Try localStorage
        try {
            const stored = localStorage.getItem(this.localStoragePrefix + key);
            if (stored) {
                const entry = JSON.parse(stored);
                if (this.isValid(entry)) {
                    // Restore to session cache
                    this.sessionCache.set(key, entry);
                    this.stats.hits++;
                    console.log(`Cache HIT (localStorage): ${key}`);
                    return entry.value;
                } else {
                    localStorage.removeItem(this.localStoragePrefix + key);
                }
            }
        } catch (e) {
            console.warn('Error reading from localStorage:', e);
        }

        this.stats.misses++;
        console.log(`Cache MISS: ${key}`);
        return null;
    }

    // Check if cache entry is still valid
    isValid(entry) {
        if (!entry || !entry.timestamp) return false;
        const age = Date.now() - entry.timestamp;
        const maxAge = this.expiryHours * 60 * 60 * 1000;
        return age < maxAge;
    }

    // Clear expired entries
    clearExpired() {
        const now = Date.now();
        const maxAge = this.expiryHours * 60 * 60 * 1000;

        // Clear session cache
        for (const [key, entry] of this.sessionCache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.sessionCache.delete(key);
            }
        }

        // Clear localStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.localStoragePrefix)) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const entry = JSON.parse(stored);
                        if (now - entry.timestamp > maxAge) {
                            keysToRemove.push(key);
                        }
                    }
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Error clearing expired cache:', e);
        }
    }

    // Get cache statistics
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) : 0;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: hitRate + '%'
        };
    }

    // Clear all cache
    clear() {
        this.sessionCache.clear();
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.localStoragePrefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Error clearing cache:', e);
        }
    }
}

/**
 * QuotaTracker - Tracks API usage per model (RPM and RPD limits)
 * Uses rolling 60-second windows for RPM
 * Persists daily counts to localStorage
 */
class QuotaTracker {
    constructor(modelLimits) {
        this.modelLimits = modelLimits; // { modelName: { rpm, rpd } }
        this.requestTimestamps = {}; // { modelName: [timestamps] }
        this.dailyCounts = {}; // { modelName: count }
        this.lastResetDate = null;
        this.localStorageKey = 'baratie_quota_tracker';

        this.loadFromStorage();
        this.checkDailyReset();
    }

    // Load quota data from localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.dailyCounts = data.dailyCounts || {};
                this.lastResetDate = data.lastResetDate || this.getTodayDate();
            } else {
                this.resetDailyCounts();
            }
        } catch (e) {
            console.warn('Error loading quota data:', e);
            this.resetDailyCounts();
        }
    }

    // Save quota data to localStorage
    saveToStorage() {
        try {
            const data = {
                dailyCounts: this.dailyCounts,
                lastResetDate: this.lastResetDate
            };
            localStorage.setItem(this.localStorageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Error saving quota data:', e);
        }
    }

    // Get today's date as string (YYYY-MM-DD)
    getTodayDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    // Check if we need to reset daily counts
    checkDailyReset() {
        const today = this.getTodayDate();
        if (this.lastResetDate !== today) {
            this.resetDailyCounts();
        }
    }

    // Reset daily counts
    resetDailyCounts() {
        this.dailyCounts = {};
        this.lastResetDate = this.getTodayDate();
        Object.keys(this.modelLimits).forEach(model => {
            this.dailyCounts[model] = 0;
        });
        this.saveToStorage();
    }

    // Clean old timestamps (older than 60 seconds)
    cleanOldTimestamps(modelName) {
        const now = Date.now();
        const sixtySecondsAgo = now - 60000;

        if (!this.requestTimestamps[modelName]) {
            this.requestTimestamps[modelName] = [];
        }

        this.requestTimestamps[modelName] = this.requestTimestamps[modelName]
            .filter(ts => ts > sixtySecondsAgo);
    }

    // Check if model can accept new request
    canUseModel(modelName) {
        this.checkDailyReset();
        this.cleanOldTimestamps(modelName);

        const limits = this.modelLimits[modelName];
        if (!limits) return false;

        // Check RPM (requests per minute)
        const recentRequests = (this.requestTimestamps[modelName] || []).length;
        if (recentRequests >= limits.rpm) {
            return false;
        }

        // Check RPD (requests per day)
        const dailyCount = this.dailyCounts[modelName] || 0;
        if (dailyCount >= limits.rpd) {
            return false;
        }

        return true;
    }

    // Record a successful request
    recordRequest(modelName) {
        const now = Date.now();

        // Add to RPM tracking
        if (!this.requestTimestamps[modelName]) {
            this.requestTimestamps[modelName] = [];
        }
        this.requestTimestamps[modelName].push(now);

        // Increment daily count
        if (!this.dailyCounts[modelName]) {
            this.dailyCounts[modelName] = 0;
        }
        this.dailyCounts[modelName]++;

        this.saveToStorage();
    }

    // Get available models (not rate-limited)
    getAvailableModels() {
        return Object.keys(this.modelLimits).filter(model => this.canUseModel(model));
    }

    // Get quota status for a model
    getModelStatus(modelName) {
        this.checkDailyReset();
        this.cleanOldTimestamps(modelName);

        const limits = this.modelLimits[modelName];
        if (!limits) return null;

        const recentRequests = (this.requestTimestamps[modelName] || []).length;
        const dailyCount = this.dailyCounts[modelName] || 0;

        return {
            model: modelName,
            rpm: {
                used: recentRequests,
                limit: limits.rpm,
                available: limits.rpm - recentRequests,
                percentage: Math.round((recentRequests / limits.rpm) * 100)
            },
            rpd: {
                used: dailyCount,
                limit: limits.rpd,
                available: limits.rpd - dailyCount,
                percentage: Math.round((dailyCount / limits.rpd) * 100)
            },
            canUse: this.canUseModel(modelName)
        };
    }

    // Get status for all models
    getAllStatus() {
        return Object.keys(this.modelLimits).map(model => this.getModelStatus(model));
    }

    // Get wait time estimate (seconds until a slot is available)
    getWaitTime(modelName) {
        this.cleanOldTimestamps(modelName);

        const timestamps = this.requestTimestamps[modelName] || [];
        if (timestamps.length === 0) return 0;

        // Find oldest timestamp
        const oldestTimestamp = Math.min(...timestamps);
        const now = Date.now();
        const age = now - oldestTimestamp;
        const waitTime = Math.max(0, 60000 - age); // Time until oldest request expires

        return Math.ceil(waitTime / 1000); // Convert to seconds
    }
}

/**
 * RequestQueue - Queues requests when all models are rate-limited
 * Processes queue when quota becomes available
 */
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    // Add request to queue
    enqueue(request) {
        this.queue.push({
            ...request,
            timestamp: Date.now(),
            id: this.generateId()
        });
        console.log(`Request queued. Queue size: ${this.queue.length}`);
    }

    // Remove and return next request
    dequeue() {
        return this.queue.shift();
    }

    // Get queue size
    size() {
        return this.queue.length;
    }

    // Check if queue is empty
    isEmpty() {
        return this.queue.length === 0;
    }

    // Generate unique ID for request
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Get queue position for a request ID
    getPosition(id) {
        const index = this.queue.findIndex(req => req.id === id);
        return index >= 0 ? index + 1 : -1;
    }

    // Clear queue
    clear() {
        this.queue = [];
    }
}

/**
 * ModelRouter - Routes requests to optimal models with load balancing
 * Implements fallback chains and automatic retry logic
 */
class ModelRouter {
    constructor(quotaTracker) {
        this.quotaTracker = quotaTracker;

        // Define fallback chains for different task types
        this.fallbackChains = {
            extraction: ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'],
            chat: ['gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'],
            nutrition: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
            youtube: ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash']
        };
    }

    // Get optimal model for task type
    selectModel(taskType = 'extraction') {
        const chain = this.fallbackChains[taskType] || this.fallbackChains.extraction;

        // Try to find an available model from the chain
        for (const model of chain) {
            if (this.quotaTracker.canUseModel(model)) {
                console.log(`Selected model: ${model} for task: ${taskType}`);
                return model;
            }
        }

        // No models available
        console.warn(`No models available for task: ${taskType}`);
        return null;
    }

    // Get fallback chain for a task type
    getFallbackChain(taskType = 'extraction') {
        return this.fallbackChains[taskType] || this.fallbackChains.extraction;
    }

    // Get next fallback model
    getNextFallback(currentModel, taskType = 'extraction') {
        const chain = this.getFallbackChain(taskType);
        const currentIndex = chain.indexOf(currentModel);

        if (currentIndex === -1 || currentIndex === chain.length - 1) {
            return null; // No more fallbacks
        }

        // Find next available model in chain
        for (let i = currentIndex + 1; i < chain.length; i++) {
            const model = chain[i];
            if (this.quotaTracker.canUseModel(model)) {
                console.log(`Falling back to: ${model}`);
                return model;
            }
        }

        return null; // No available fallbacks
    }

    // Check if any models are available
    hasAvailableModels() {
        return this.quotaTracker.getAvailableModels().length > 0;
    }

    // Get load-balanced model (distributes load across available models)
    selectBalancedModel(taskType = 'extraction') {
        const chain = this.getFallbackChain(taskType);
        const availableModels = chain.filter(model => this.quotaTracker.canUseModel(model));

        if (availableModels.length === 0) return null;

        // Select model with most available quota (simple load balancing)
        let bestModel = availableModels[0];
        let bestScore = 0;

        for (const model of availableModels) {
            const status = this.quotaTracker.getModelStatus(model);
            const score = status.rpm.available + (status.rpd.available / 10); // Prioritize RPM availability

            if (score > bestScore) {
                bestScore = score;
                bestModel = model;
            }
        }

        console.log(`Load-balanced selection: ${bestModel} (score: ${bestScore.toFixed(1)})`);
        return bestModel;
    }
}

/**
 * CookingTimer - Manages countdown timer with pause/resume/reset functionality
 * Displays in top-right corner during cooking stage
 * Shows modal popup when timer completes
 */
class CookingTimer {
    constructor(recipeManager) {
        this.recipeManager = recipeManager;
        this.timeRemaining = 0; // in seconds
        this.isRunning = false;
        this.isPaused = false;
        this.intervalId = null;
        this.note = '';
        this.audioContext = null;
        this.hasShownNotificationPermission = false;

        this.bindEventListeners();
        this.restoreFromSession();
    }

    bindEventListeners() {
        // Minimize/Maximize
        document.getElementById('timer-minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize();
        });

        document.querySelector('.timer-header').addEventListener('click', () => {
            this.toggleMinimize();
        });

        // Time adjustment
        document.getElementById('timer-add-5').addEventListener('click', () => this.addTime(5));
        document.getElementById('timer-subtract-5').addEventListener('click', () => this.subtractTime(5));

        // Controls
        document.getElementById('timer-toggle').addEventListener('click', () => this.toggleTimer());
        document.getElementById('timer-reset').addEventListener('click', () => this.reset());

        // Note input
        document.getElementById('timer-note').addEventListener('input', (e) => {
            this.note = e.target.value;
            this.saveToSession();
        });

        // Modal dismiss
        document.getElementById('timer-modal-dismiss').addEventListener('click', () => this.dismissModal());

        // Modal overlay click
        document.querySelector('.timer-modal-overlay')?.addEventListener('click', () => this.dismissModal());

        // Keyboard shortcuts (only when timer is visible)
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible()) return;

            // Space: Start/Pause
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.toggleTimer();
            }

            // R: Reset
            if (e.code === 'KeyR' && e.target.tagName !== 'INPUT' && !e.ctrlKey) {
                e.preventDefault();
                this.reset();
            }

            // Plus/Equals: Add 5 minutes
            if ((e.code === 'Equal' || e.code === 'NumpadAdd') && !e.shiftKey) {
                e.preventDefault();
                this.addTime(5);
            }

            // Minus: Subtract 5 minutes
            if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
                e.preventDefault();
                this.subtractTime(5);
            }
        });
    }

    addTime(minutes) {
        this.timeRemaining += minutes * 60;
        if (this.timeRemaining < 0) this.timeRemaining = 0;
        this.updateDisplay();
        this.saveToSession();
        this.showStatus(`+${minutes} minutes`);
    }

    subtractTime(minutes) {
        this.timeRemaining -= minutes * 60;
        if (this.timeRemaining < 0) this.timeRemaining = 0;
        this.updateDisplay();
        this.saveToSession();
        this.showStatus(`-${minutes} minutes`);
    }

    toggleTimer() {
        if (this.isRunning && !this.isPaused) {
            this.pause();
        } else if (this.isPaused) {
            this.resume();
        } else {
            this.start();
        }
    }

    start() {
        if (this.timeRemaining === 0) {
            this.showStatus('Set a time first!');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.updateControlsState();
        this.showStatus('Timer started');

        // Request notification permission on first start
        this.requestNotificationPermission();

        this.intervalId = setInterval(() => this.tick(), 1000);
        this.saveToSession();
    }

    pause() {
        this.isPaused = true;
        this.updateControlsState();
        this.showStatus('Timer paused');

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.saveToSession();
    }

    resume() {
        this.isPaused = false;
        this.updateControlsState();
        this.showStatus('Timer resumed');

        this.intervalId = setInterval(() => this.tick(), 1000);
        this.saveToSession();
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeRemaining = 0;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.updateDisplay();
        this.updateControlsState();
        this.showStatus('Timer reset');
        this.saveToSession();
    }

    tick() {
        this.timeRemaining--;

        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.complete();
        }

        this.updateDisplay();
        this.saveToSession();
    }

    complete() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.updateControlsState();
        this.showModal();
        this.playNotificationSound();
        this.showBrowserNotification();
        this.flashTabTitle();
        this.saveToSession();
    }

    updateDisplay() {
        const hours = Math.floor(this.timeRemaining / 3600);
        const minutes = Math.floor((this.timeRemaining % 3600) / 60);
        const seconds = this.timeRemaining % 60;

        document.getElementById('timer-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');
    }

    updateControlsState() {
        const widget = document.getElementById('timer-widget');
        const toggleBtn = document.getElementById('timer-toggle');
        const addBtn = document.getElementById('timer-add-5');
        const subtractBtn = document.getElementById('timer-subtract-5');
        const resetBtn = document.getElementById('timer-reset');

        // Update widget state classes
        widget.classList.remove('timer-running', 'timer-paused');

        if (this.isRunning && !this.isPaused) {
            widget.classList.add('timer-running');
            toggleBtn.textContent = 'Pause';
            addBtn.disabled = true;
            subtractBtn.disabled = true;
        } else if (this.isPaused) {
            widget.classList.add('timer-paused');
            toggleBtn.textContent = 'Resume';
            addBtn.disabled = true;
            subtractBtn.disabled = true;
        } else {
            toggleBtn.textContent = 'Start';
            addBtn.disabled = false;
            subtractBtn.disabled = false;
        }
    }

    showStatus(message) {
        const statusEl = document.getElementById('timer-status');
        statusEl.textContent = message;
        statusEl.style.opacity = '1';

        setTimeout(() => {
            statusEl.style.opacity = '0';
        }, 2000);
    }

    showModal() {
        const modal = document.getElementById('timer-modal');
        const noteEl = document.getElementById('timer-modal-note');

        if (this.note) {
            noteEl.textContent = this.note;
        } else {
            noteEl.textContent = '';
        }

        modal.classList.remove('hidden');
    }

    dismissModal() {
        const modal = document.getElementById('timer-modal');
        modal.classList.add('hidden');
    }

    toggleMinimize() {
        const widget = document.getElementById('timer-widget');
        const btn = document.getElementById('timer-minimize-btn');

        if (widget.classList.contains('minimized')) {
            widget.classList.remove('minimized');
            btn.textContent = '−';
        } else {
            widget.classList.add('minimized');
            btn.textContent = '+';
        }
    }

    show() {
        document.getElementById('timer-widget').classList.add('visible');
    }

    hide() {
        document.getElementById('timer-widget').classList.remove('visible');
    }

    isVisible() {
        return document.getElementById('timer-widget').classList.contains('visible');
    }

    // Audio notification
    playNotificationSound() {
        try {
            // Create a simple beep using Web Audio API
            this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800; // 800 Hz beep
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);

            // Play 3 beeps
            setTimeout(() => {
                const osc2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(this.audioContext.destination);
                osc2.frequency.value = 800;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                osc2.start(this.audioContext.currentTime);
                osc2.stop(this.audioContext.currentTime + 0.5);
            }, 600);

            setTimeout(() => {
                const osc3 = this.audioContext.createOscillator();
                const gain3 = this.audioContext.createGain();
                osc3.connect(gain3);
                gain3.connect(this.audioContext.destination);
                osc3.frequency.value = 800;
                osc3.type = 'sine';
                gain3.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain3.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                osc3.start(this.audioContext.currentTime);
                osc3.stop(this.audioContext.currentTime + 0.5);
            }, 1200);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }

    // Browser notification
    requestNotificationPermission() {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'default' && !this.hasShownNotificationPermission) {
            this.hasShownNotificationPermission = true;
            Notification.requestPermission();
        }
    }

    showBrowserNotification() {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            const notification = new Notification('⏰ Timer Complete!', {
                body: this.note || 'Your cooking timer has finished.',
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    // Tab title flash
    flashTabTitle() {
        const originalTitle = document.title;
        let flashCount = 0;
        const maxFlashes = 10;

        const flashInterval = setInterval(() => {
            document.title = flashCount % 2 === 0 ? '⏰ TIMER COMPLETE!' : originalTitle;
            flashCount++;

            if (flashCount >= maxFlashes) {
                clearInterval(flashInterval);
                document.title = originalTitle;
            }
        }, 1000);
    }

    // Session persistence
    saveToSession() {
        const timerData = {
            timeRemaining: this.timeRemaining,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            note: this.note,
            timestamp: Date.now()
        };

        try {
            sessionStorage.setItem('baratie_timer', JSON.stringify(timerData));
        } catch (e) {
            console.warn('Failed to save timer state:', e);
        }
    }

    restoreFromSession() {
        try {
            const timerData = sessionStorage.getItem('baratie_timer');
            if (!timerData) return;

            const data = JSON.parse(timerData);

            // Don't restore if data is old (> 24 hours)
            const age = Date.now() - data.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                sessionStorage.removeItem('baratie_timer');
                return;
            }

            this.timeRemaining = data.timeRemaining || 0;
            this.note = data.note || '';

            // Restore note field
            document.getElementById('timer-note').value = this.note;

            // Don't automatically restart timer, but preserve time
            this.isRunning = false;
            this.isPaused = false;

            this.updateDisplay();
            this.updateControlsState();
        } catch (e) {
            console.warn('Failed to restore timer state:', e);
        }
    }

    clearSession() {
        sessionStorage.removeItem('baratie_timer');
    }
}

class RecipeManager {
    constructor() {
        this.currentRecipe = null;
        this.originalServings = 4; // Original servings from recipe extraction
        this.currentServings = 4; // Current servings (can be adjusted via chat)
        this.completedSteps = new Set();
        this.chatHistory = [];
        this.currentMacros = null; // Store calculated total recipe macros
        this.macrosServingSize = 1; // Number of portions to divide recipe into for nutrition display
        this.cookingTimer = null; // Cooking timer instance

        // Gemini API configuration (Serverless)
        this.geminiApiEndpoint = CONFIG.GEMINI_API_ENDPOINT || '/api/gemini';
        this.geminiModel = CONFIG.GEMINI_MODEL;

        // YouTube API configuration (Serverless)
        this.youtubeApiEndpoint = CONFIG.YOUTUBE_API_ENDPOINT || '/api/youtube';

        // Initialize multi-model routing system
        this.cache = new ResponseCache();
        this.quotaTracker = new QuotaTracker(CONFIG.GEMINI_MODELS || {});
        this.requestQueue = new RequestQueue();
        this.modelRouter = new ModelRouter(this.quotaTracker);

        // Clear expired cache on init
        this.cache.clearExpired();

        // Update quota UI periodically (every 5 seconds)
        setInterval(() => this.updateQuotaUI(), 5000);

        this.init();
    }

    init() {
        // Try to restore session
        this.restoreSession();

        // Bind event listeners
        this.bindEventListeners();

        // Initialize chat
        this.initializeChat();

        // Check for browser extension data
        this.checkExtensionData();

        // Initialize cooking timer
        this.cookingTimer = new CookingTimer(this);
    }

    bindEventListeners() {
        // Stage 1: URL Processing
        document.getElementById('process-btn').addEventListener('click', () => this.processRecipeURL());
        document.getElementById('recipe-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processRecipeURL();
        });

        // Stage 2: Preview Navigation
        document.getElementById('back-to-capture').addEventListener('click', () => this.goToStage('capture'));
        document.getElementById('start-cooking-btn').addEventListener('click', () => this.startCooking());

        // Stage 3: Cooking Interface
        document.getElementById('back-to-start').addEventListener('click', () => this.resetAndGoToStart());
        document.getElementById('download-pdf').addEventListener('click', () => this.downloadPDF());

        // Chat
        document.getElementById('toggle-chat').addEventListener('click', () => this.toggleChat());
        document.getElementById('send-chat').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Macros serving selector
        document.getElementById('macros-decrease-servings').addEventListener('click', () => this.adjustMacrosServings(-1));
        document.getElementById('macros-increase-servings').addEventListener('click', () => this.adjustMacrosServings(1));
        document.getElementById('macros-servings-input').addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value > 0) this.setMacrosServings(value);
        });

        // Macros recalculation
        document.getElementById('recalculate-macros')?.addEventListener('click', () => this.calculateMacros());

        // Timestamp toggle for YouTube videos
        document.getElementById('timestamp-toggle')?.addEventListener('change', (e) => this.toggleTimestamps(e.target.checked));
    }

    // ==========================================
    // Stage Management
    // ==========================================

    goToStage(stageName) {
        document.querySelectorAll('.stage').forEach(stage => {
            stage.classList.remove('active');
        });
        document.getElementById(`stage-${stageName}`).classList.add('active');

        // Show/hide timer based on stage
        if (this.cookingTimer) {
            if (stageName === 'cooking') {
                this.cookingTimer.show();
            } else {
                this.cookingTimer.hide();
            }
        }
    }

    // ==========================================
    // Stage 1: URL Processing & AI Extraction
    // ==========================================

    async processRecipeURL() {
        const urlInput = document.getElementById('recipe-url');
        const url = urlInput.value.trim();

        if (!url) {
            this.showStatus('Please enter a valid URL', 'error');
            return;
        }

        if (!this.isValidURL(url)) {
            this.showStatus('Please enter a valid URL format', 'error');
            return;
        }

        try {
            this.showStatus('Processing recipe... This may take a moment.', 'loading');
            document.getElementById('process-btn').disabled = true;

            // Simulate AI extraction (in production, this would call your AI API)
            const recipe = await this.extractRecipeFromURL(url);

            if (!recipe.isValid) {
                // Show sarcastic error message for non-recipe content
                const sarcasticMessage = this.getSarcasticErrorMessage(url);
                this.showStatus(sarcasticMessage, 'error');
                document.getElementById('process-btn').disabled = false;
                return;
            }

            this.currentRecipe = recipe;
            this.originalServings = recipe.servings;
            this.currentServings = recipe.servings;

            this.showStatus('Recipe extracted successfully!', 'success');

            setTimeout(() => {
                this.displayRecipePreview();
                this.goToStage('preview');
                document.getElementById('process-btn').disabled = false;
            }, 1000);

        } catch (error) {
            console.error('Error processing recipe:', error);
            this.showStatus('An error occurred while processing the recipe. Please try again.', 'error');
            document.getElementById('process-btn').disabled = false;
        }
    }

    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // AI Recipe Extraction using Gemini API (with caching)
    async extractRecipeFromURL(url) {
        try {
            // Check cache first
            const cacheKey = this.cache.getRecipeKey(url);

            // Check if this is a YouTube URL
            if (this.isYouTubeURL(url)) {
                return await this.extractRecipeFromYouTube(url);
            }

            // Step 1: Fetch the content from the URL (html + text)
            const { html, text } = await this.fetchURLContent(url);

            // Step 1a: Try structured extraction from JSON-LD if present
            const structured = this.extractStructuredRecipeFromHtml(html, url);
            if (structured) {
                return this.normalizeExtractedRecipe(structured);
            }

            // Step 2: Build focused content (prioritize likely recipe sections)
            const focused = this.extractLikelyRecipeSections(html, text);

            // Step 3: Send to Gemini API for extraction with an enhanced, strict JSON-only prompt
            const prompt = `You are a recipe extraction expert. Given HTML-derived text below, extract a recipe as strictly-typed JSON.

Rules:
- Respond with ONLY JSON (no markdown, no comments, no code fences).
- If ingredients (≥ 3 items) AND instructions (≥ 2 steps) are clearly present, set "isValid": true.
- If servings are missing, infer a reasonable integer from context (2–8 typical). Never return null; use an integer.
- For each ingredient, provide EXACTLY these fields:
  - text: clean base ingredient text (e.g., "2 cups all-purpose flour" or "Salt to taste")
  - amount: numeric value if present, else null and format it properly
  - unit: unit string (e.g., g, kg, ml, tbsp, tsp, cup, to taste), else ""
  - name: ingredient name only (e.g., "all-purpose flour", "salt")
  - notes (optional): usage instructions like "divided", "optional", "chopped", "room temperature" - NO parentheses
  - conversion (optional): metric/imperial conversion like "about 250 g", "4 oz", "113 g" - NO parentheses
- IMPORTANT: Keep text, notes, and conversion fields SEPARATE. Do NOT put notes or conversions in the text field.
- IMPORTANT: Do NOT add parentheses to any field. The display will add them automatically.

Response shape (exact keys):
{
  "isValid": true,
  "title": "",
  "servings": 4,
  "ingredients": [
    { "text": "2 cups all-purpose flour", "amount": 2, "unit": "cups", "name": "all-purpose flour", "notes": "divided" },
    { "text": "4 oz beef broth", "amount": 4, "unit": "oz", "name": "beef broth", "conversion": "about 113 g" },
    { "text": "Salt to taste", "amount": null, "unit": "", "name": "salt", "notes": "optional" }
  ],
  "instructions": ["..."]
}

If this is NOT a recipe, return {"isValid": false}.

URL: ${url}

CONTENT:
${focused}`;

            const recipe = await this.callGeminiWithFallback(prompt, 'extraction', cacheKey);
            recipe.source = url;
            return this.normalizeExtractedRecipe(recipe);

        } catch (error) {
            console.error('Error extracting recipe:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // Browser Extension Integration
    // ==========================================

    // Check for extension-passed data and auto-process
    async checkExtensionData() {
        if (!window.extensionData) return;

        const { text, storageId, url, sourceUrl } = window.extensionData;

        // MODE 1: URL-only capture (no text selection)
        if (url && !text && !storageId) {
            // Auto-fill the URL input and trigger normal extraction
            document.getElementById('recipe-url').value = url;
            this.showStatus('Extension captured URL. Processing...', 'loading');

            // Trigger normal URL processing after a short delay
            setTimeout(() => {
                this.processRecipeURL();
                // Clear URL params after processing
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 500);
            return;
        }

        // MODE 2: Text capture (with selection or storage)
        let recipeText = text;

        // If storage ID provided, fetch from extension storage
        if (storageId && !text) {
            this.showStatus('Retrieving recipe from extension...', 'loading');
            recipeText = await this.fetchFromExtension(storageId);
        }

        if (!recipeText) {
            this.showStatus('No recipe data received from extension.', 'error');
            return;
        }

        try {
            // Show loading status
            this.showStatus('Processing captured recipe text...', 'loading');
            document.getElementById('process-btn').disabled = true;

            // Extract recipe from captured text
            const recipe = await this.extractRecipeFromText(recipeText, sourceUrl);

            if (!recipe.isValid) {
                this.showStatus('Could not extract a valid recipe from captured text.', 'error');
                document.getElementById('process-btn').disabled = false;
                return;
            }

            // Store recipe and navigate to preview
            this.currentRecipe = recipe;
            this.originalServings = recipe.servings;
            this.currentServings = recipe.servings;

            this.showStatus('Recipe extracted successfully!', 'success');

            setTimeout(() => {
                this.displayRecipePreview();
                this.goToStage('preview');
                document.getElementById('process-btn').disabled = false;

                // Clear URL params after processing (clean up browser history)
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 1000);

        } catch (error) {
            console.error('Error processing extension data:', error);
            this.showStatus('An error occurred while processing the captured recipe.', 'error');
            document.getElementById('process-btn').disabled = false;
        }
    }

    // Extract recipe from plain text (not URL)
    async extractRecipeFromText(text, sourceUrl = 'User Selection') {
        try {
            // Generate cache key from text
            const cacheKey = this.cache.getRecipeKey(sourceUrl + text.substring(0, 500));

            const prompt = `You are a recipe extraction expert. Extract the recipe from the following text content.

Rules:
- Respond with ONLY JSON (no markdown, no comments, no code fences).
- If ingredients (≥ 3 items) AND instructions (≥ 2 steps) are clearly present, set "isValid": true.
- If servings are missing, infer a reasonable integer from context (2–8 typical). Never return null; use an integer.
- For each ingredient, provide EXACTLY these fields:
  - text: clean base ingredient text (e.g., "2 cups all-purpose flour" or "Salt to taste")
  - amount: numeric value if present, else null
  - unit: unit string (e.g., g, kg, ml, tbsp, tsp, cup, to taste), else ""
  - name: ingredient name only (e.g., "all-purpose flour", "salt")
  - notes (optional): usage instructions like "divided", "optional", "chopped", "room temperature" - NO parentheses
  - conversion (optional): metric/imperial conversion like "about 250 g", "4 oz", "113 g" - NO parentheses
- IMPORTANT: Keep text, notes, and conversion fields SEPARATE. Do NOT put notes or conversions in the text field.
- IMPORTANT: Do NOT add parentheses to any field. The display will add them automatically.

Response shape (exact keys):
{
  "isValid": true,
  "title": "",
  "servings": 4,
  "ingredients": [
    { "text": "2 cups all-purpose flour", "amount": 2, "unit": "cups", "name": "all-purpose flour", "notes": "divided" },
    { "text": "4 oz beef broth", "amount": 4, "unit": "oz", "name": "beef broth", "conversion": "about 113 g" },
    { "text": "Salt to taste", "amount": null, "unit": "", "name": "salt", "notes": "optional" }
  ],
  "instructions": ["..."]
}

If this is NOT a recipe, return {"isValid": false}.

SOURCE: ${sourceUrl}

CONTENT:
${text.substring(0, 15000)}`;

            const recipe = await this.callGeminiWithFallback(prompt, 'extraction', cacheKey);
            recipe.source = sourceUrl;
            return this.normalizeExtractedRecipe(recipe);

        } catch (error) {
            console.error('Error extracting recipe from text:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    // Fetch recipe text from extension storage (for large content)
    async fetchFromExtension(storageId) {
        return new Promise((resolve) => {
            try {
                // Try to get extension ID from storage or use wildcard
                chrome.runtime.sendMessage(
                    { action: 'getRecipeText', storageId: storageId },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn('Could not fetch from extension:', chrome.runtime.lastError);
                            resolve(null);
                        } else {
                            resolve(response?.text || null);
                        }
                    }
                );
            } catch (error) {
                console.error('Error fetching from extension:', error);
                resolve(null);
            }
        });
    }

    // ==========================================
    // URL Content Fetching
    // ==========================================

    // Fetch URL content (using a CORS proxy for browser-based fetching)
    async fetchURLContent(url) {
        const proxies = [
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
            (u) => `https://r.jina.ai/http://$${'{'}}HOSTPLACEHOLDER${'}'}` // placeholder to keep array shape; replaced below
        ];

        // Build clean variants for proxies (including jina.ai universal fetcher)
        const jinaVariant = (u) => {
            try {
                const parsed = new URL(u);
                return `https://r.jina.ai/http://${parsed.host}${parsed.pathname}${parsed.search}`;
            } catch {
                return null;
            }
        };

        const proxyUrls = [
            proxies[0](url),
            proxies[1](url),
            jinaVariant(url)
        ].filter(Boolean);

        let lastError = null;
        for (const proxyUrl of proxyUrls) {
            try {
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
                const html = await response.text();

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Remove noisy elements
                const noisy = doc.querySelectorAll('script, style, nav, footer, header');
                noisy.forEach(el => el.remove());

                let textContent = doc.body ? (doc.body.textContent || '') : '';
                textContent = textContent.replace(/\s+/g, ' ').trim();

                return {
                    html,
                    text: textContent.substring(0, 20000)
                };
            } catch (e) {
                lastError = e;
                continue;
            }
        }

        console.error('All proxy fetch attempts failed:', lastError);
        throw new Error('Could not fetch recipe content from URL');
    }

    // ==========================================
    // YouTube Recipe Extraction
    // ==========================================

    // Check if URL is a YouTube video
    isYouTubeURL(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            return hostname.includes('youtube.com') || hostname.includes('youtu.be');
        } catch {
            return false;
        }
    }

    // Extract video ID from YouTube URL
    extractYouTubeVideoId(url) {
        try {
            const urlObj = new URL(url);

            // Handle youtu.be short links
            if (urlObj.hostname.includes('youtu.be')) {
                return urlObj.pathname.slice(1).split('?')[0];
            }

            // Handle youtube.com links
            if (urlObj.hostname.includes('youtube.com')) {
                // Standard watch URL
                const vParam = urlObj.searchParams.get('v');
                if (vParam) return vParam;

                // Shorts URL
                if (urlObj.pathname.includes('/shorts/')) {
                    return urlObj.pathname.split('/shorts/')[1].split('?')[0];
                }

                // Embed URL
                if (urlObj.pathname.includes('/embed/')) {
                    return urlObj.pathname.split('/embed/')[1].split('?')[0];
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting YouTube video ID:', error);
            return null;
        }
    }

    // Extract recipe from YouTube video (description + pinned comment)
    async extractRecipeFromYouTube(url) {
        try {
            const videoId = this.extractYouTubeVideoId(url);
            if (!videoId) {
                throw new Error('Could not extract video ID from YouTube URL');
            }

            // Detect if this is a Short
            const isShort = url.includes('/shorts/');

            // Fetch video details and comments in parallel
            const [videoData, commentsData] = await Promise.all([
                this.fetchYouTubeVideoDetails(videoId),
                this.fetchYouTubePinnedComment(videoId)
            ]);

            // Check if Short has sparse description (likely a remix)
            if (isShort && this.isDescriptionSparse(videoData.description)) {
                // Try to find source video link in description
                const sourceVideoId = this.extractSourceVideoId(videoData.description);

                if (sourceVideoId && sourceVideoId !== videoId) {
                    console.log(`Short has sparse content, attempting fallback to source video: ${sourceVideoId}`);

                    // Show status to user
                    this.showStatus('Short has limited recipe content. Fetching from original video...', 'loading');

                    try {
                        // Fetch source video details and comments
                        const [sourceVideoData, sourceCommentsData] = await Promise.all([
                            this.fetchYouTubeVideoDetails(sourceVideoId),
                            this.fetchYouTubePinnedComment(sourceVideoId)
                        ]);

                        // Extract recipe from source video
                        const sourceRecipe = await this.extractRecipeFromYouTubeData(
                            sourceVideoData,
                            sourceCommentsData,
                            sourceVideoId
                        );

                        // Keep original Short URL as source, but note it's from the full video
                        sourceRecipe.source = url;
                        sourceRecipe.title = `${sourceRecipe.title} (from full video)`;

                        console.log('Successfully extracted recipe from source video');
                        return sourceRecipe;

                    } catch (sourceError) {
                        console.warn('Failed to extract from source video, falling back to Short content:', sourceError);
                        // Fall through to try Short content anyway
                    }
                }
            }

            // Extract recipe from current video (Short or regular video)
            const recipe = await this.extractRecipeFromYouTubeData(videoData, commentsData, videoId);
            recipe.source = url;

            return recipe;

        } catch (error) {
            console.error('Error extracting recipe from YouTube:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    // Fetch YouTube video details using YouTube Data API
    async fetchYouTubeVideoDetails(videoId) {
        // Call serverless proxy endpoint
        const requestBody = {
            endpoint: 'videos',
            params: {
                part: 'snippet',
                id: videoId
            }
        };

        try {
            const response = await fetch(this.youtubeApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                throw new Error('Video not found or is private/unavailable');
            }

            const video = data.items[0];
            return {
                title: video.snippet.title,
                description: video.snippet.description,
                channelTitle: video.snippet.channelTitle
            };

        } catch (error) {
            console.error('YouTube API call failed:', error);
            throw error;
        }
    }

    // Fetch YouTube pinned comment using YouTube Data API
    async fetchYouTubePinnedComment(videoId) {
        // Call serverless proxy endpoint
        const requestBody = {
            endpoint: 'commentThreads',
            params: {
                part: 'snippet',
                videoId: videoId,
                maxResults: '10',
                order: 'relevance'
            }
        };

        try {
            const response = await fetch(this.youtubeApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                // Comments might be disabled
                console.warn('Could not fetch comments (may be disabled)');
                return { pinnedComment: null };
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                return { pinnedComment: null };
            }

            // Look for pinned comment (first comment by channel owner or with most likes)
            let pinnedComment = null;

            // First, try to find a comment that's explicitly from the channel
            const channelComment = data.items.find(item =>
                item.snippet.topLevelComment.snippet.authorChannelId?.value ===
                item.snippet.channelId
            );

            if (channelComment) {
                pinnedComment = channelComment.snippet.topLevelComment.snippet.textDisplay;
            } else {
                // Fallback: Use the most liked comment
                const mostLiked = data.items.reduce((prev, current) => {
                    const prevLikes = prev.snippet.topLevelComment.snippet.likeCount || 0;
                    const currentLikes = current.snippet.topLevelComment.snippet.likeCount || 0;
                    return currentLikes > prevLikes ? current : prev;
                });

                pinnedComment = mostLiked.snippet.topLevelComment.snippet.textDisplay;
            }

            // Clean HTML entities from comment
            if (pinnedComment) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(pinnedComment, 'text/html');
                pinnedComment = doc.body.textContent || pinnedComment;
            }

            return { pinnedComment };

        } catch (error) {
            console.warn('Error fetching YouTube comments:', error);
            return { pinnedComment: null };
        }
    }

    // Fetch YouTube video captions/transcript with timestamps
    async fetchYouTubeCaptions(videoId, withTimestamps = false) {
        try {
            // Call serverless function to fetch captions (using Innertube API - reliable as of 2025)
            const response = await fetch('/api/youtube-captions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId })
            });

            if (!response.ok) {
                console.warn('Captions not available for this video');
                return withTimestamps ? null : null;
            }

            const data = await response.json();

            if (!data.success || !data.captions || data.captions.length === 0) {
                console.warn('No captions found for this video');
                return withTimestamps ? null : null;
            }

            if (withTimestamps) {
                // Return array of {text, start, duration, end} objects
                return data.captions.map(cap => ({
                    text: cap.text,
                    start: cap.start,
                    duration: cap.duration,
                    end: cap.start + cap.duration
                }));
            } else {
                // Return plain text (backward compatibility)
                return data.captions.map(cap => cap.text).join(' ');
            }

        } catch (error) {
            console.warn('Error fetching YouTube captions:', error);
            return withTimestamps ? null : null;
        }
    }

    // Match recipe instructions to video timestamps using captions
    async matchInstructionsToTimestamps(instructions, videoId) {
        try {
            // Fetch captions with timestamps
            const captions = await this.fetchYouTubeCaptions(videoId, true);

            if (!captions || captions.length === 0) {
                console.warn('No captions available for timestamp matching');
                return instructions.map(inst => ({ text: inst, timestamp: null }));
            }

            // Build caption text with markers for Gemini
            const captionText = captions.map(cap =>
                `[${this.formatTimestamp(cap.start)}] ${cap.text}`
            ).join('\n');

            // Use Gemini AI to match instructions to captions
            const prompt = `You are a video timestamp expert. Match each recipe instruction to the most relevant timestamp from the video captions.

INSTRUCTIONS (to match):
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

VIDEO CAPTIONS (with timestamps):
${captionText.substring(0, 8000)}

For each instruction, find the timestamp where that step is demonstrated or explained in the video.
If no good match exists, return null for that instruction.

Response format (JSON only, no markdown):
{
  "matches": [
    { "instruction_index": 0, "timestamp_seconds": 45.5, "confidence": "high" },
    { "instruction_index": 1, "timestamp_seconds": null, "confidence": "none" }
  ]
}`;

            const response = await this.callGeminiAPIForChat(prompt);

            // Parse Gemini response
            let matches;
            try {
                // Remove markdown code fences if present
                const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                matches = JSON.parse(cleanResponse);
            } catch (parseError) {
                console.warn('Failed to parse Gemini timestamp response:', parseError);
                return instructions.map(inst => ({ text: inst, timestamp: null }));
            }

            // Build result array
            return instructions.map((inst, idx) => {
                const match = matches.matches?.find(m => m.instruction_index === idx);
                return {
                    text: inst,
                    timestamp: match?.timestamp_seconds || null,
                    confidence: match?.confidence || 'none'
                };
            });

        } catch (error) {
            console.error('Error matching timestamps:', error);
            return instructions.map(inst => ({ text: inst, timestamp: null }));
        }
    }

    // Format seconds to MM:SS or HH:MM:SS
    formatTimestamp(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Extract source video ID from YouTube Short description
    extractSourceVideoId(description) {
        if (!description) return null;

        // Pattern to match YouTube video URLs in description
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/g,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/g
        ];

        for (const pattern of patterns) {
            const matches = [...description.matchAll(pattern)];
            if (matches.length > 0) {
                // Return first video ID found (likely the source)
                return matches[0][1];
            }
        }

        return null;
    }

    // Extract all URLs from text (for finding recipe links in descriptions)
    extractLinksFromText(text) {
        if (!text) return [];

        // Comprehensive URL regex
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
        const urls = text.match(urlRegex) || [];

        return urls.map(url => ({
            url: url.trim(),
            type: this.classifyURL(url)
        }));
    }

    // Classify URL to determine if it's likely a recipe link
    classifyURL(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            const path = urlObj.pathname.toLowerCase();

            // Recipe domains
            const recipeSites = [
                'allrecipes.com', 'foodnetwork.com', 'bonappetit.com',
                'seriouseats.com', 'epicurious.com', 'cooking.nytimes.com',
                'kingarthurbaking.com', 'delish.com', 'food52.com',
                'thekitchn.com', 'simplyrecipes.com', 'budgetbytes.com',
                'recipetineats.com', 'skinnytaste.com', 'minimalistbaker.com',
                'tasty.co', 'foodandwine.com', 'marthastewart.com',
                'cookieandkate.com', 'pinchofyum.com', 'sallysbakingaddiction.com'
            ];

            if (recipeSites.some(site => hostname.includes(site))) {
                return 'recipe';
            }

            // Recipe-like indicators in path
            if (path.includes('/recipe') || path.includes('/recipes')) {
                return 'recipe';
            }

            // Google Docs/Sheets (often used for recipes)
            if (hostname.includes('docs.google.com') || hostname.includes('drive.google.com')) {
                return 'recipe';
            }

            // Pastebin-like services
            if (hostname.includes('pastebin.com') || hostname.includes('gist.github.com')) {
                return 'recipe';
            }

            // Social media (skip these)
            if (hostname.includes('instagram.com') || hostname.includes('facebook.com') ||
                hostname.includes('twitter.com') || hostname.includes('x.com') ||
                hostname.includes('tiktok.com')) {
                return 'social';
            }

            // Merch/shop (skip these)
            if (hostname.includes('shop') || hostname.includes('store') ||
                path.includes('/shop') || path.includes('/merch')) {
                return 'merch';
            }

            // Video platforms (skip to avoid recursion)
            if (hostname.includes('youtube.com') || hostname.includes('youtu.be') ||
                hostname.includes('vimeo.com')) {
                return 'video';
            }

            return 'unknown';
        } catch {
            return 'unknown';
        }
    }

    // Try to extract recipe from links found in description
    async tryRecipeLinksFromDescription(description) {
        console.log('Attempting to extract recipe from links in description...');

        const links = this.extractLinksFromText(description);

        // Filter and prioritize recipe links
        const recipeLinks = links
            .filter(link => link.type === 'recipe' || link.type === 'unknown')
            .filter(link => link.type !== 'video') // Skip video links to prevent recursion
            .slice(0, 3); // Try up to 3 links

        if (recipeLinks.length === 0) {
            console.log('No recipe links found in description');
            return null;
        }

        console.log(`Found ${recipeLinks.length} potential recipe link(s)`);

        // Try each link in sequence
        for (let i = 0; i < recipeLinks.length; i++) {
            const {url} = recipeLinks[i];

            try {
                console.log(`Trying recipe link ${i + 1}/${recipeLinks.length}: ${url}`);
                this.showStatus(`Fetching recipe from linked page (${i + 1}/${recipeLinks.length})...`, 'loading');

                const recipe = await this.extractRecipeFromURL(url);

                if (recipe && recipe.isValid &&
                    recipe.ingredients && recipe.ingredients.length >= 3) {
                    console.log('Successfully extracted recipe from linked page!');
                    return recipe;
                }
            } catch (error) {
                console.warn(`Failed to extract from ${url}:`, error.message);
                // Continue to next link
            }

            // Small delay to avoid hammering servers
            if (i < recipeLinks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('No valid recipes found in description links');
        return null;
    }

    // Check if description appears sparse/incomplete (likely a remix)
    isDescriptionSparse(description) {
        if (!description) return true;

        const cleanDesc = description.trim();

        // Very short descriptions are likely sparse
        if (cleanDesc.length < 100) return true;

        // Check for recipe-related keywords
        const recipeKeywords = [
            'ingredient', 'recipe', 'cup', 'tablespoon', 'teaspoon',
            'tbsp', 'tsp', 'oz', 'grams', 'ml', 'instructions',
            'step', 'cook', 'bake', 'mix', 'add', 'servings'
        ];

        const lowerDesc = cleanDesc.toLowerCase();
        const keywordCount = recipeKeywords.filter(keyword =>
            lowerDesc.includes(keyword)
        ).length;

        // If less than 3 recipe keywords, probably sparse
        return keywordCount < 3;
    }

    // Extract recipe from YouTube video data (reusable for Shorts and source videos)
    async extractRecipeFromYouTubeData(videoData, commentsData, videoId) {
        // Check cache first
        const cacheKey = this.cache.getYouTubeKey(videoId);

        // Combine description and pinned comment
        let content = '';

        if (videoData.description) {
            content += `VIDEO DESCRIPTION:\n${videoData.description}\n\n`;
        }

        if (commentsData.pinnedComment) {
            content += `PINNED COMMENT:\n${commentsData.pinnedComment}\n\n`;
        }

        if (!content.trim()) {
            throw new Error('No recipe content found in video description or pinned comment');
        }

        // Use Gemini to extract recipe from the combined content
        const prompt = `You are a recipe extraction expert. Extract the recipe from the following YouTube video content.

Rules:
- Respond with ONLY JSON (no markdown, no comments, no code fences).
- If ingredients (≥ 3 items) AND instructions (≥ 2 steps) are clearly present, set "isValid": true.
- If servings are missing, infer a reasonable integer from context (2–8 typical). Never return null; use an integer.
- For each ingredient, provide EXACTLY these fields:
  - text: clean base ingredient text (e.g., "2 cups all-purpose flour" or "Salt to taste")
  - amount: numeric value if present, else null
  - unit: unit string (e.g., g, kg, ml, tbsp, tsp, cup, to taste), else ""
  - name: ingredient name only (e.g., "all-purpose flour", "salt")
  - notes (optional): usage instructions like "divided", "optional", "chopped", "room temperature" - NO parentheses
  - conversion (optional): metric/imperial conversion like "about 250 g", "4 oz", "113 g" - NO parentheses
- IMPORTANT: Keep text, notes, and conversion fields SEPARATE. Do NOT put notes or conversions in the text field.
- IMPORTANT: Do NOT add parentheses to any field. The display will add them automatically.

Response examples:
{ "text": "2 cups all-purpose flour", "amount": 2, "unit": "cups", "name": "all-purpose flour", "notes": "divided" },
{ "text": "4 oz beef broth", "amount": 4, "unit": "oz", "name": "beef broth", "conversion": "about 113 g" },
{ "text": "Salt to taste", "amount": null, "unit": "", "name": "salt", "notes": "optional" }

Response shape (exact keys):
{
  "isValid": true,
  "title": "${videoData.title}",
  "servings": 4,
  "ingredients": [
    { "text": "", "amount": 0, "unit": "", "name": "", "notes": "", "conversion": "" }
  ],
  "instructions": ["..."]
}

If this is NOT a recipe, return {"isValid": false}.

YouTube Video ID: ${videoId}
Video Title: ${videoData.title}

CONTENT:
${content}`;

        const recipe = await this.callGeminiWithFallback(prompt, 'youtube', cacheKey);
        recipe.title = recipe.title || videoData.title;

        // TIER 2: Try description links if primary extraction failed
        if (!recipe.isValid || !recipe.ingredients || recipe.ingredients.length < 3) {
            console.warn('Primary extraction incomplete. Trying description links...');

            if (videoData.description) {
                const linkedRecipe = await this.tryRecipeLinksFromDescription(videoData.description);

                if (linkedRecipe && linkedRecipe.isValid &&
                    linkedRecipe.ingredients && linkedRecipe.ingredients.length >= 3) {
                    // Success! Use linked recipe but keep video metadata
                    linkedRecipe.title = `${videoData.title} (from linked recipe)`;
                    console.log('Successfully extracted recipe from description link!');
                    return this.normalizeExtractedRecipe(linkedRecipe);
                } else {
                    console.warn('Description links did not yield valid recipe. Will try captions next.');
                }
            }
        }

        // TIER 3: If still no valid recipe OR missing instructions, try captions
        const hasIngredients = recipe.ingredients && recipe.ingredients.length >= 3;
        const hasInstructions = recipe.instructions && recipe.instructions.length >= 2;
        const needsCaptionFallback = !recipe.isValid || !hasIngredients || !hasInstructions;

        if (needsCaptionFallback) {
            console.warn('Recipe incomplete or invalid. Trying to extract from video captions...');

            // Try to fetch video captions/transcript
            const captions = await this.fetchYouTubeCaptions(videoId);

            if (captions && captions.length > 200) {
                console.log('Captions found! Attempting to extract recipe from captions.');

                // Determine what to extract based on what's missing
                let captionPrompt;
                if (!hasIngredients) {
                    // Need full recipe from captions
                    captionPrompt = `You are a recipe extraction expert. Extract the complete recipe from the following video transcript/captions.

Rules:
- Respond with ONLY JSON (no markdown, no comments, no code fences).
- If ingredients (≥ 3 items) AND instructions (≥ 2 steps) are clearly present, set "isValid": true.
- Extract ALL ingredients with amounts and ALL cooking instructions
- Ignore non-cooking dialogue, introductions, outros, product promotions
- If servings are missing, infer a reasonable integer from context (2–8 typical)
- For each ingredient, provide the text field with the full ingredient text

Response shape (exact keys):
{
  "isValid": true,
  "title": "${videoData.title}",
  "servings": 4,
  "ingredients": [
    { "text": "2 cups flour", "amount": 2, "unit": "cups", "name": "flour" }
  ],
  "instructions": ["Step 1...", "Step 2..."]
}

If this is NOT a recipe or insufficient information, return {"isValid": false}.

Video Title: ${videoData.title}

CAPTIONS/TRANSCRIPT:
${captions.substring(0, 10000)}`;
                } else {
                    // Only need instructions (already have ingredients)
                    captionPrompt = `You are a recipe instruction expert. Extract ONLY the cooking instructions from the following video transcript/captions.

Rules:
- Extract step-by-step cooking instructions ONLY
- Ignore non-cooking dialogue, introductions, outros, product promotions
- Format as clear, actionable steps
- Return as JSON array of instruction strings
- Minimum 2 instructions required

Response format:
{
  "instructions": ["Step 1 text", "Step 2 text", ...]
}

Video Title: ${videoData.title}

CAPTIONS/TRANSCRIPT:
${captions.substring(0, 10000)}`;
                }

                try {
                    const captionResult = await this.callGeminiAPI(captionPrompt);

                    if (!hasIngredients && captionResult.isValid &&
                        captionResult.ingredients && captionResult.ingredients.length >= 3 &&
                        captionResult.instructions && captionResult.instructions.length >= 2) {
                        // Successfully extracted full recipe from captions!
                        captionResult.title = videoData.title;
                        console.log('Successfully extracted full recipe from video captions.');
                        return this.normalizeExtractedRecipe(captionResult);
                    } else if (hasIngredients && captionResult.instructions && captionResult.instructions.length >= 2) {
                        // Successfully extracted instructions from captions!
                        recipe.instructions = captionResult.instructions;
                        recipe.isValid = true;
                        console.log('Successfully extracted instructions from video captions.');
                        return this.normalizeExtractedRecipe(recipe);
                    } else {
                        console.warn('Caption extraction did not yield sufficient recipe data.');
                    }
                } catch (error) {
                    console.warn('Failed to extract from captions:', error);
                }
            }

            // Last resort - embed video
            // Only do this if we have some ingredients (partial recipe)
            if (hasIngredients) {
                console.warn('Could not extract instructions from captions. Embedding video as last resort.');
                recipe.embedVideoId = videoId;
                recipe.embedVideoTitle = videoData.title;
                recipe.embedInInstructions = true;
                recipe.instructions = [];
                recipe.isValid = true; // Valid because we have ingredients
            } else {
                console.error('Could not extract recipe from any source.');
                recipe.isValid = false;
            }
        }

        // FINAL STEP: Check if captions are available for optional timestamp feature
        // Don't automatically add timestamps - let user toggle them on via UI
        if (recipe.instructions && recipe.instructions.length > 0) {
            console.log('Checking caption availability for optional timestamp feature...');
            try {
                const captionCheck = await this.fetchYouTubeCaptions(videoId, true);

                if (captionCheck && captionCheck.length > 0) {
                    // Store video ID and caption availability flag
                    recipe.youtubeVideoId = videoId;
                    recipe.hasCaptions = true;
                    console.log('Captions available - user can toggle timestamps on if desired');
                } else {
                    recipe.hasCaptions = false;
                    console.log('No captions available for this video');
                }
            } catch (error) {
                console.warn('Failed to check caption availability:', error);
                recipe.hasCaptions = false;
            }
        }

        return this.normalizeExtractedRecipe(recipe);
    }

    // Attempt to extract Recipe via JSON-LD (@type: Recipe)
    extractStructuredRecipeFromHtml(html, url) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
            for (const script of scripts) {
                let json;
                try {
                    json = JSON.parse(script.textContent || '{}');
                } catch {
                    continue;
                }

                const nodes = Array.isArray(json) ? json : (json['@graph'] || [json]);
                for (const node of nodes) {
                    if (!node) continue;
                    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
                    if (types && types.includes('Recipe')) {
                        const title = node.name || node.headline || doc.querySelector('title')?.textContent || 'Recipe';
                        const servings = parseInt(
                            (node.recipeYield && (Array.isArray(node.recipeYield) ? node.recipeYield[0] : node.recipeYield))
                                ?.toString()
                                .match(/\d+/)?.[0] || '4',
                            10
                        );
                        const ingredients = (node.recipeIngredient || []).map(line => {
                            const parsed = this.parseIngredientLine(line);
                            return {
                                text: line,
                                amount: parsed.amount,
                                unit: parsed.unit,
                                name: parsed.name || line
                            };
                        });
                        const instructions = [];
                        if (Array.isArray(node.recipeInstructions)) {
                            for (const inst of node.recipeInstructions) {
                                if (typeof inst === 'string') instructions.push(inst);
                                else if (inst && typeof inst.text === 'string') instructions.push(inst.text);
                                else if (inst && Array.isArray(inst.itemListElement)) {
                                    inst.itemListElement.forEach(it => {
                                        if (typeof it === 'string') instructions.push(it);
                                        else if (it && typeof it.text === 'string') instructions.push(it.text);
                                    });
                                }
                            }
                        }

                        if (ingredients.length >= 3 && instructions.length >= 2) {
                            return {
                                isValid: true,
                                title,
                                servings: Number.isFinite(servings) ? servings : 4,
                                ingredients,
                                instructions,
                                source: url
                            };
                        }
                    }
                }
            }
            return null;
        } catch (e) {
            console.warn('JSON-LD extraction failed:', e);
            return null;
        }
    }

    // Extract likely recipe sections to improve LLM reliability
    extractLikelyRecipeSections(html, text) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const title = doc.querySelector('h1, title')?.textContent?.trim() || '';

            // Collect text from elements that likely contain ingredients/instructions
            const selectors = [
                'h1, h2, h3',
                'ul, ol',
                '[class*="ingredient" i]',
                '[class*="instruction" i], [class*="direction" i]',
                'article',
            ].join(',');
            const nodes = Array.from(doc.querySelectorAll(selectors));

            const sections = [];
            nodes.forEach(n => {
                const t = n.textContent ? n.textContent.replace(/\s+/g, ' ').trim() : '';
                if (!t) return;
                const lower = t.toLowerCase();
                const score = (
                    (lower.includes('ingredient') ? 2 : 0) +
                    (lower.includes('instruction') || lower.includes('direction') || lower.includes('method') ? 2 : 0) +
                    (n.tagName === 'UL' || n.tagName === 'OL' ? 1 : 0)
                );
                if (score > 0) sections.push({ score, text: t.substring(0, 1000) });
            });

            sections.sort((a, b) => b.score - a.score);
            const top = sections.slice(0, 12).map(s => s.text).join('\n');

            const focused = [
                title ? `TITLE: ${title}` : '',
                top || text.substring(0, 4000)
            ].filter(Boolean).join('\n\n');

            return focused;
        } catch {
            // Fallback to raw text if parsing fails
            return text.substring(0, 6000);
        }
    }

    // Heuristic extraction from free-form text (YouTube descriptions/comments)
    extractRecipeHeuristicallyFromText(text, title, url) {
        const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return { isValid: false };

        const ingredients = [];
        const instructions = [];

        // Simple state machine for sections
        let inIngredients = false;
        let inInstructions = false;

        const looksLikeIngredient = (l) => {
            const lower = l.toLowerCase();
            const unitPattern = /(cup|cups|tbsp|tablespoon|tsp|teaspoon|g|kg|ml|l|pound|lb|oz|grams|liters|slice|clove|can|package|stick|pieces?)\b/;
            const qtyPattern = /(^|\s)(\d+[\d\/\s\.]*)(?=\s|\b)/; // numbers or fractions
            return unitPattern.test(lower) || qtyPattern.test(lower);
        };

        const looksLikeInstruction = (l) => {
            if (/^\d+[:\.-]/.test(l)) return true; // numbered or timestamped
            if (/^(step\s*\d+)/i.test(l)) return true;
            if (/^(mix|stir|cook|bake|heat|combine|add|whisk|saute|sauté|boil|simmer|preheat|fold|season)\b/i.test(l)) return true;
            return false;
        };

        for (const l of lines) {
            const lower = l.toLowerCase();
            if (/^ingredients?/i.test(l) || lower.includes('ingredients:')) {
                inIngredients = true; inInstructions = false; continue;
            }
            if (/^(instructions|method|directions)/i.test(l) || lower.includes('instructions:')) {
                inIngredients = false; inInstructions = true; continue;
            }

            if (inIngredients) {
                if (looksLikeIngredient(l)) ingredients.push(l);
                continue;
            }
            if (inInstructions) {
                if (looksLikeInstruction(l)) instructions.push(l.replace(/^\d+[\.)-]\s*/, ''));
                continue;
            }

            // Outside explicit sections: collect probable lines
            if (looksLikeIngredient(l)) ingredients.push(l);
            else if (looksLikeInstruction(l)) instructions.push(l);
        }

        const parsedIngredients = ingredients.map(line => {
            const parsed = this.parseIngredientLine(line);
            return { text: line, amount: parsed.amount, unit: parsed.unit, name: parsed.name };
        });

        const cleanInstructions = instructions
            .map(s => s.replace(/^(\d+[:\.-]\s*)/, '').replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        const valid = (parsedIngredients.length >= 2 || cleanInstructions.length >= 2);
        if (!valid) return { isValid: false };

        return {
            isValid: true,
            title: title || 'YouTube Recipe',
            servings: 4,
            ingredients: parsedIngredients,
            instructions: cleanInstructions,
            source: url
        };
    }

    // ==========================================
    // Multi-Model API Calls with Fallback & Caching
    // ==========================================

    /**
     * Main method for calling Gemini API with multi-model support
     * Includes caching, quota tracking, automatic fallback, and retry logic
     */
    async callGeminiWithFallback(prompt, taskType = 'extraction', cacheKey = null) {
        // Check cache first (if cacheKey provided)
        if (cacheKey) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log('Returning cached response');
                return cached;
            }
        }

        // Check if any models are available
        if (!this.modelRouter.hasAvailableModels()) {
            // All models rate-limited
            const waitTimes = Object.keys(CONFIG.GEMINI_MODELS || {}).map(model =>
                this.quotaTracker.getWaitTime(model)
            );
            const minWait = Math.min(...waitTimes);

            throw new Error(
                `All models are currently rate-limited. Please wait approximately ${minWait} seconds and try again. ` +
                `Consider using the app less frequently to stay within quota limits.`
            );
        }

        // Select optimal model with load balancing
        let selectedModel = this.modelRouter.selectBalancedModel(taskType);

        if (!selectedModel) {
            throw new Error('No available models for this request. Please try again later.');
        }

        // Try primary model with retries
        let lastError = null;
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt + 1}/${maxRetries} with model: ${selectedModel}`);

                const result = await this.callGeminiAPIRaw(prompt, selectedModel);

                // Success - record request and cache result
                this.quotaTracker.recordRequest(selectedModel);

                if (cacheKey) {
                    this.cache.set(cacheKey, result, taskType);
                }

                // Update quota UI
                this.updateQuotaUI();

                return result;

            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt + 1} failed:`, error.message);

                // Check if it's a 429 (rate limit) error
                const is429 = error.message.includes('429') || error.message.includes('rate limit');

                if (is429) {
                    console.log('Rate limit detected, trying fallback model');

                    // Try fallback model
                    const fallbackModel = this.modelRouter.getNextFallback(selectedModel, taskType);

                    if (fallbackModel) {
                        selectedModel = fallbackModel;
                        continue; // Try fallback immediately
                    } else {
                        // No more fallbacks available
                        throw new Error(
                            'All available models are rate-limited. Please wait a moment and try again.'
                        );
                    }
                }

                // For non-429 errors, use exponential backoff before retry
                if (attempt < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.log(`Waiting ${delay}ms before retry...`);
                    await this.delay(delay);
                }
            }
        }

        // All retries exhausted
        throw new Error(`Request failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Raw Gemini API call (used by callGeminiWithFallback)
     */
    async callGeminiAPIRaw(prompt, model) {
        const requestBody = {
            prompt: prompt,
            method: 'generateContent',
            model: model
        };

        const response = await fetch(this.geminiApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error || response.statusText;
            throw new Error(`API error (${response.status}): ${errorMsg}`);
        }

        const data = await response.json();

        // Extract the text from Gemini's response
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No response from Gemini API');
        }

        // Clean up the response and robustly parse JSON
        let cleanedText = generatedText.trim();
        cleanedText = cleanedText
            .replace(/^```\s*json\s*/i, '')
            .replace(/^```/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        // Try direct parse; if it fails, try to extract the first top-level JSON object
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanedText);
        } catch (e) {
            const match = cleanedText.match(/\{[\s\S]*\}/);
            if (match) {
                parsedResponse = JSON.parse(match[0]);
            } else {
                throw e;
            }
        }
        return parsedResponse;
    }

    // Legacy method - now uses multi-model system
    async callGeminiAPI(prompt) {
        return await this.callGeminiWithFallback(prompt, 'extraction');
    }

    // ==========================================
    // Stage 2: Recipe Preview
    // ==========================================

    displayRecipePreview() {
        const recipe = this.currentRecipe;

        document.getElementById('preview-title').textContent = recipe.title;
        document.getElementById('preview-source').textContent = recipe.source;
        document.getElementById('preview-servings').textContent = `Servings: ${recipe.servings}`;
        document.getElementById('preview-ingredient-count').textContent =
            `${recipe.ingredients.length} ingredient${recipe.ingredients.length !== 1 ? 's' : ''}`;

        const ingredientList = document.getElementById('preview-ingredient-list');
        ingredientList.innerHTML = '';
        recipe.ingredients.forEach(ing => {
            const li = document.createElement('li');
            li.textContent = ing.text;
            ingredientList.appendChild(li);
        });
    }

    // ==========================================
    // Stage 3: Cooking Interface
    // ==========================================

    startCooking() {
        this.displayCookingInterface();
        this.goToStage('cooking');

        // Show cooking timer
        if (this.cookingTimer) {
            this.cookingTimer.show();
        }

        this.saveSession();
    }

    displayCookingInterface() {
        const recipe = this.currentRecipe;

        // Recipe Header
        document.getElementById('cooking-title').textContent = recipe.title;
        document.getElementById('cooking-source').textContent = recipe.source;

        // Set servings (from recipe or current state)
        this.originalServings = recipe.servings || 4;
        if (!this.currentServings || this.currentServings === 4) {
            this.currentServings = this.originalServings;
        }

        // Update servings display (read-only)
        document.getElementById('recipe-servings-count').textContent = this.currentServings;

        // Set macros serving size from current servings
        this.macrosServingSize = this.currentServings;
        document.getElementById('macros-servings-input').value = this.macrosServingSize;
        document.getElementById('recipe-total-servings').textContent = this.currentServings;

        // Show/hide timestamp toggle based on caption availability
        const toggleContainer = document.getElementById('timestamp-toggle-container');
        const timestampToggle = document.getElementById('timestamp-toggle');

        if (recipe.youtubeVideoId && recipe.hasCaptions) {
            toggleContainer.style.display = 'flex';
            // Reset toggle state (timestamps off by default)
            timestampToggle.checked = false;
            this.timestampsEnabled = false;
        } else {
            toggleContainer.style.display = 'none';
            this.timestampsEnabled = false;
        }

        // Ingredients
        this.updateIngredientsList();

        // Instructions
        this.displayInstructions();

        // Progress
        this.updateProgress();
    }

    updateIngredientsList() {
        const recipe = this.currentRecipe;
        const ingredientList = document.getElementById('cooking-ingredient-list');
        ingredientList.innerHTML = '';

        // Show ingredients as-is from extraction (matching preview display)
        recipe.ingredients.forEach(ing => {
            const li = document.createElement('li');
            li.textContent = ing.text;  // Use text field directly like preview
            ingredientList.appendChild(li);
        });
    }

    displayInstructions() {
        const recipe = this.currentRecipe;
        const instructionsList = document.getElementById('cooking-instructions-list');
        instructionsList.innerHTML = '';

        // Check if video should be embedded in instructions (edge case #2 - last resort)
        if (recipe.embedVideoId && recipe.embedInInstructions) {
            // Embed video WITHOUT checkboxes or other instructions
            const videoContainer = document.createElement('div');
            videoContainer.className = 'embedded-video-instructions';
            
            // Build YouTube embed URL with proper parameters to avoid Error 153
            const videoId = recipe.embedVideoId;
            const isFileProtocol = window.location.protocol === 'file:';
            const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            
            // For file:// protocol, YouTube blocks embeds with Error 153, so use clickable thumbnail instead
            if (isFileProtocol) {
                videoContainer.innerHTML = `
                    <div class="video-instructions-warning">
                        <p><strong>⚠️ Video Instructions Only</strong></p>
                        <p>This recipe provided ingredients but no written instructions. Click the video thumbnail below to watch on YouTube:</p>
                    </div>
                    <div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px; cursor: pointer;">
                        <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" style="display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; text-decoration: none;">
                            <img 
                                src="${thumbnailUrl}" 
                                alt="${recipe.embedVideoTitle || 'Recipe Video'}"
                                style="width: 100%; height: 100%; object-fit: cover;"
                                onerror="this.src='https://img.youtube.com/vi/${videoId}/hqdefault.jpg'"
                            />
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 0, 0, 0.9); border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                                <svg style="width: 40px; height: 40px; fill: white; margin-left: 4px;" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </div>
                            <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0, 0, 0, 0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                Click to watch on YouTube
                            </div>
                        </a>
                    </div>
                `;
            } else {
                // For http/https, try iframe embed with proper parameters
                const embedParams = new URLSearchParams({
                    'enablejsapi': '1',
                    'origin': window.location.origin,
                    'rel': '0',
                    'modestbranding': '1',
                    'autoplay': '0'
                });
                const embedUrl = `https://www.youtube.com/embed/${videoId}?${embedParams.toString()}`;
                
                videoContainer.innerHTML = `
                    <div class="video-instructions-warning">
                        <p><strong>⚠️ Video Instructions Only</strong></p>
                        <p>This recipe provided ingredients but no written instructions. Follow the video below:</p>
                    </div>
                    <div class="video-wrapper">
                        <iframe
                            src="${embedUrl}"
                            title="${recipe.embedVideoTitle || 'Recipe Video'}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            loading="lazy"
                        ></iframe>
                        <div class="video-fallback" style="display: none; margin-top: 10px; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                            <p style="margin: 0 0 8px 0; color: #856404; font-weight: 500;">Video embedding failed. Click below to watch on YouTube:</p>
                            <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 16px; background: #ff0000; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">
                                ▶ Watch on YouTube
                            </a>
                        </div>
                    </div>
                `;
                
                // Detect embed failure after load
                setTimeout(() => {
                    const iframe = videoContainer.querySelector('iframe');
                    const fallback = videoContainer.querySelector('.video-fallback');
                    if (iframe && fallback) {
                        // Check for error message in iframe (limited by CORS, but we can try)
                        const checkError = () => {
                            try {
                                // If iframe content is accessible and contains error, show fallback
                                // Note: This won't work due to CORS, but we set a timeout as backup
                                setTimeout(() => {
                                    // If we reach here and no error was caught, assume it's working
                                    // Otherwise, error detection will happen via message events
                                }, 2000);
                            } catch (e) {
                                // Cross-origin error is expected and means iframe is loading
                            }
                        };
                        iframe.onerror = () => {
                            fallback.style.display = 'block';
                        };
                        // Alternative: Listen for postMessage from YouTube iframe
                        window.addEventListener('message', (e) => {
                            if (e.data && typeof e.data === 'string' && e.data.includes('error')) {
                                fallback.style.display = 'block';
                            }
                        });
                        checkError();
                    }
                }, 3000);
            }
            instructionsList.appendChild(videoContainer);
            return; // Don't show any other instructions
        }

        // Normal instructions with checkboxes and optional timestamps
        // Only show timestamps if toggle is enabled AND timestamps are available
        const showTimestamps = this.timestampsEnabled && recipe.instructionsWithTimestamps;
        const instructionsData = showTimestamps
            ? recipe.instructionsWithTimestamps
            : recipe.instructions.map(text => ({ text, timestamp: null }));
        const videoId = recipe.youtubeVideoId;

        instructionsData.forEach((instruction, index) => {
            const div = document.createElement('div');
            div.className = 'instruction-item';
            if (this.completedSteps.has(index)) {
                div.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'instruction-checkbox';
            checkbox.checked = this.completedSteps.has(index);
            checkbox.addEventListener('change', () => this.toggleStep(index));

            const content = document.createElement('div');
            content.className = 'instruction-content';

            const number = document.createElement('div');
            number.className = 'instruction-number';
            number.textContent = `Step ${index + 1}`;

            const text = document.createElement('div');
            text.className = 'instruction-text';
            text.textContent = instruction.text || instruction;

            // Add timestamp badge ONLY if timestamps are enabled via toggle
            if (showTimestamps && instruction.timestamp && videoId) {
                const timestampBadge = document.createElement('a');
                timestampBadge.className = 'timestamp-badge';
                timestampBadge.href = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(instruction.timestamp)}s`;
                timestampBadge.target = '_blank';
                timestampBadge.rel = 'noopener noreferrer';
                timestampBadge.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    ${this.formatTimestamp(instruction.timestamp)}
                `;
                timestampBadge.title = 'Watch this step in the video';
                number.appendChild(timestampBadge);
            }

            content.appendChild(number);
            content.appendChild(text);
            div.appendChild(checkbox);
            div.appendChild(content);
            instructionsList.appendChild(div);
        });
    }

    toggleStep(stepIndex) {
        if (this.completedSteps.has(stepIndex)) {
            this.completedSteps.delete(stepIndex);
        } else {
            this.completedSteps.add(stepIndex);
        }

        this.displayInstructions();
        this.updateProgress();
        this.saveSession();
    }

    updateProgress() {
        const totalSteps = this.currentRecipe.instructions.length;
        const completedSteps = this.completedSteps.size;
        const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        document.getElementById('progress-text').textContent = `${completedSteps}/${totalSteps}`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
    }

    // Toggle timestamps on/off for YouTube videos
    async toggleTimestamps(enabled) {
        const recipe = this.currentRecipe;

        if (!recipe.youtubeVideoId || !recipe.hasCaptions) {
            console.warn('Cannot toggle timestamps: no video ID or captions unavailable');
            return;
        }

        this.timestampsEnabled = enabled;

        if (enabled) {
            // Check if we already have timestamps
            if (recipe.instructionsWithTimestamps) {
                console.log('Using cached timestamps');
                this.displayInstructions();
                return;
            }

            // Show loading state
            this.showStatus('Loading video timestamps...', 'loading');

            try {
                // Fetch and match timestamps
                const instructionsWithTimestamps = await this.matchInstructionsToTimestamps(
                    recipe.instructions,
                    recipe.youtubeVideoId
                );

                // Cache the results
                recipe.instructionsWithTimestamps = instructionsWithTimestamps;

                // Refresh display
                this.displayInstructions();

                const matchedCount = instructionsWithTimestamps.filter(i => i.timestamp).length;
                this.showStatus(`Matched ${matchedCount}/${recipe.instructions.length} instructions to video timestamps`, 'success');
                setTimeout(() => this.hideStatus(), 3000);

            } catch (error) {
                console.error('Failed to match timestamps:', error);
                this.showStatus('Failed to load timestamps. Please try again.', 'error');
                setTimeout(() => this.hideStatus(), 3000);

                // Reset toggle on error
                document.getElementById('timestamp-toggle').checked = false;
                this.timestampsEnabled = false;
            }
        } else {
            // Timestamps disabled - just refresh display without timestamps
            this.displayInstructions();
        }
    }

    // ==========================================
    // Tab Management
    // ==========================================

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // If switching to macros tab and macros not calculated, calculate them
        if (tabName === 'macros' && !this.currentMacros) {
            this.calculateMacros();
        }
    }

    // ==========================================
    // Nutrition & Macros Calculation
    // ==========================================

    async calculateMacros() {
        if (!this.currentRecipe) return;

        // Show loading state
        document.getElementById('macros-loading').style.display = 'flex';
        document.getElementById('macros-content').style.display = 'none';
        document.getElementById('macros-error').style.display = 'none';

        try {
            const recipeServings = this.currentRecipe.servings || 1;

            // Check cache first
            const cacheKey = this.cache.getNutritionKey(
                this.currentRecipe.ingredients,
                recipeServings
            );

            // Build recipe context for Gemini
            const ingredientsList = this.currentRecipe.ingredients
                .map(ing => ing.text)
                .join('\n');

            const prompt = `You are a nutrition expert. Calculate the approximate nutritional information for the ENTIRE recipe (all ingredients combined).

Recipe: ${this.currentRecipe.title}
Servings in recipe: ${recipeServings}

Ingredients:
${ingredientsList}

Instructions:
${this.currentRecipe.instructions.join('\n')}

Please provide nutritional information for the TOTAL/ENTIRE RECIPE as JSON (no markdown, no code fences).

Response format (exact keys):
{
  "calories": 0,
  "protein_grams": 0,
  "carbs_grams": 0,
  "fats_grams": 0,
  "fiber_grams": 0,
  "sodium_mg": 0,
  "sugar_grams": 0,
  "cholesterol_mg": 0
}

Base your estimates on standard nutritional databases. Be realistic and conservative.`;

            const macrosData = await this.callGeminiWithFallback(prompt, 'nutrition', cacheKey);

            // Calculate percentages for macronutrients
            const totalMacroCalories =
                (macrosData.protein_grams * 4) +
                (macrosData.carbs_grams * 4) +
                (macrosData.fats_grams * 9);

            const macros = {
                calories: Math.round(macrosData.calories),
                protein: {
                    grams: Math.round(macrosData.protein_grams),
                    percentage: totalMacroCalories > 0
                        ? Math.round((macrosData.protein_grams * 4 / totalMacroCalories) * 100)
                        : 0
                },
                carbs: {
                    grams: Math.round(macrosData.carbs_grams),
                    percentage: totalMacroCalories > 0
                        ? Math.round((macrosData.carbs_grams * 4 / totalMacroCalories) * 100)
                        : 0
                },
                fats: {
                    grams: Math.round(macrosData.fats_grams),
                    percentage: totalMacroCalories > 0
                        ? Math.round((macrosData.fats_grams * 9 / totalMacroCalories) * 100)
                        : 0
                },
                fiber: Math.round(macrosData.fiber_grams),
                sodium: Math.round(macrosData.sodium_mg),
                sugar: Math.round(macrosData.sugar_grams),
                cholesterol: Math.round(macrosData.cholesterol_mg)
            };

            this.currentMacros = macros;
            this.displayMacros(macros);
            this.saveSession();

        } catch (error) {
            console.error('Macros calculation error:', error);
            document.getElementById('macros-loading').style.display = 'none';
            document.getElementById('macros-error').style.display = 'block';
        }
    }

    displayMacros(macros) {
        // Store the total recipe macros (will be divided by user's selected serving count)
        this.currentMacros = macros;

        // Hide loading, show content
        document.getElementById('macros-loading').style.display = 'none';
        document.getElementById('macros-content').style.display = 'block';
        document.getElementById('macros-error').style.display = 'none';

        // Update recipe total servings label (use recipe servings or 1)
        const recipeServings = this.currentRecipe?.servings || 1;
        document.getElementById('recipe-total-servings').textContent = recipeServings;

        // Display macros based on selected serving size
        this.updateMacrosDisplay();
    }

    updateMacrosDisplay() {
        if (!this.currentMacros) return;

        const macros = this.currentMacros; // Total recipe macros
        const userServings = this.macrosServingSize; // User's selected serving count
        const perServingDivider = userServings; // Divide total by user's serving count

        // Calculate per-serving values based on user's selected serving count
        const perServingCalories = Math.round(macros.calories / perServingDivider);
        const perServingProtein = Math.round(macros.protein.grams / perServingDivider);
        const perServingCarbs = Math.round(macros.carbs.grams / perServingDivider);
        const perServingFats = Math.round(macros.fats.grams / perServingDivider);

        // Update calories
        document.getElementById('total-calories').textContent = perServingCalories;

        // Update macronutrients (per serving)
        document.getElementById('protein-grams').textContent = perServingProtein;
        document.getElementById('protein-percentage').textContent = macros.protein.percentage; // Percentage stays same

        document.getElementById('carbs-grams').textContent = perServingCarbs;
        document.getElementById('carbs-percentage').textContent = macros.carbs.percentage;

        document.getElementById('fats-grams').textContent = perServingFats;
        document.getElementById('fats-percentage').textContent = macros.fats.percentage;

        document.getElementById('fiber-grams').textContent = Math.round(macros.fiber / perServingDivider);

        // Update additional nutrients (per serving)
        document.getElementById('sodium-mg').textContent = `${Math.round(macros.sodium / perServingDivider)}mg`;
        document.getElementById('sugar-grams').textContent = `${Math.round(macros.sugar / perServingDivider)}g`;
        document.getElementById('cholesterol-mg').textContent = `${Math.round(macros.cholesterol / perServingDivider)}mg`;
    }

    // ==========================================
    // Dynamic Scaling
    // ==========================================

    // Recipe serving adjustment (via chat assistant only)
    setServings(servings) {
        this.currentServings = servings;
        document.getElementById('recipe-servings-count').textContent = servings;
        this.updateIngredientsList();

        // Also update macros serving size to match
        this.macrosServingSize = servings;
        document.getElementById('macros-servings-input').value = servings;
        document.getElementById('recipe-total-servings').textContent = servings;

        // Recalculate macros if they were already calculated
        if (this.currentMacros) {
            this.calculateMacros();
        }

        this.saveSession();
    }

    // Macros serving size adjustment (for nutrition calculation only)
    adjustMacrosServings(delta) {
        const newServings = this.macrosServingSize + delta;
        if (newServings > 0 && newServings <= 50) {
            this.setMacrosServings(newServings);
        }
    }

    setMacrosServings(servings) {
        this.macrosServingSize = servings;
        document.getElementById('macros-servings-input').value = servings;

        // Update the displayed macros based on new serving size
        if (this.currentMacros) {
            this.updateMacrosDisplay();
        }
    }

    // Removed: Recipe no longer supports scaling
    // Ingredients are shown as-is from the extracted recipe

    scaleIngredient(ingredient) {
        // If no amount, return text as-is (handles "to taste", "pinch of", etc.)
        if (ingredient.amount == null || ingredient.amount === undefined) {
            // If new fields exist, format them; otherwise use text
            if (ingredient.notes || ingredient.conversion) {
                return this.formatIngredientWithFields(ingredient);
            }
            return ingredient.text || '';
        }

        const scaleFactor = this.currentServings / this.originalServings;
        const scaledAmount = ingredient.amount * scaleFactor;
        const formattedAmount = this.formatAmount(scaledAmount);

        // Build scaled ingredient using new structured fields if available
        if (ingredient.notes !== undefined || ingredient.conversion !== undefined) {
            // New format: use structured fields
            // Use structured amount/unit/name instead of text field to avoid duplicates
            const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
            const name = ingredient.name ? ` ${ingredient.name}` : '';
            let result = `${formattedAmount}${unit}${name}`.trim();

            // Add conversion if present (in parentheses)
            if (ingredient.conversion && ingredient.conversion.trim()) {
                result += ` (${ingredient.conversion.trim()})`;
            }

            // Add notes if present (comma-separated or in parentheses based on content)
            if (ingredient.notes && ingredient.notes.trim()) {
                const notes = ingredient.notes.trim();
                // Short notes like "divided", "optional" go after comma
                if (notes.length < 15 && !notes.includes(' ')) {
                    result += `, ${notes}`;
                } else {
                    // Longer notes go in parentheses
                    result += ` (${notes})`;
                }
            }

            return result;
        }

        // Fallback: old format (backward compatibility for cached recipes)
        // Extract parenthetical notes from original text field
        const originalText = ingredient.text || '';
        const parentheticalMatches = originalText.match(/\([^)]+\)/g) || [];
        const commaNotesMatch = originalText.match(/,\s*[^,()]+$/);
        const commaNotes = commaNotesMatch ? commaNotesMatch[0] : '';

        const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
        const name = ingredient.name ? ` ${ingredient.name}` : '';
        let scaledText = `${formattedAmount}${unit}${name}`.trim();

        // Re-append non-conversion parenthetical notes
        if (parentheticalMatches.length > 0) {
            parentheticalMatches.forEach(note => {
                if (!this.isMetricConversion(note)) {
                    scaledText += ` ${note}`;
                }
            });
        }

        // Re-append comma notes
        if (commaNotes && !parentheticalMatches.some(note => note.toLowerCase().includes(commaNotes.toLowerCase().trim().replace(',', '')))) {
            scaledText += commaNotes;
        }

        return scaledText.trim();
    }

    // Format ingredient using structured fields (for non-scaled ingredients)
    formatIngredientWithFields(ingredient) {
        // Clean the text field by removing any parenthetical content and trailing commas
        // This prevents duplication when conversion/notes are in separate fields
        let baseText = (ingredient.text || '')
            .replace(/\s*\([^)]*\)\s*/g, ' ')  // Remove all parenthetical content
            .replace(/\s*,\s*[^,]*$/, '')       // Remove trailing comma notes
            .trim();

        let result = baseText;

        if (ingredient.conversion && ingredient.conversion.trim()) {
            result += ` (${ingredient.conversion.trim()})`;
        }

        if (ingredient.notes && ingredient.notes.trim()) {
            const notes = ingredient.notes.trim();
            if (notes.length < 15 && !notes.includes(' ')) {
                result += `, ${notes}`;
            } else {
                result += ` (${notes})`;
            }
        }

        return result.trim();
    }

    // Helper to detect metric conversion notes (used for backward compatibility)
    isMetricConversion(note) {
        const lowerNote = note.toLowerCase();
        return /\d+\s*(g|kg|mg|ml|l|oz|lb|cup|tbsp|tsp)/.test(lowerNote) &&
               (lowerNote.includes('about') || lowerNote.includes('approx'));
    }

    formatAmount(amount) {
        // Handle fractions nicely
        if (amount % 1 === 0) return amount;

        const fractions = {
            0.25: '¼',
            0.33: '⅓',
            0.5: '½',
            0.66: '⅔',
            0.75: '¾'
        };

        const whole = Math.floor(amount);
        const decimal = amount - whole;

        for (const [dec, frac] of Object.entries(fractions)) {
            if (Math.abs(decimal - parseFloat(dec)) < 0.05) {
                return whole > 0 ? `${whole}${frac}` : frac;
            }
        }

        return amount.toFixed(1);
    }

    // ==========================================
    // Ingredient Parsing & Normalization
    // ==========================================

    parseIngredientLine(line) {
        const cleaned = (line || '').trim();
        // Basic patterns: "1 1/2 cups flour", "400 g spaghetti", "2 tbsp olive oil"
        // Capture amount (supports mixed numbers and fractions), unit, and the rest as name
        const fractionMap = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3' };
        let normalized = cleaned.replace(/[½¼¾⅓⅔]/g, m => fractionMap[m] || m);

        // Convert unicode fractions in mixed numbers like "1½" => "1 1/2"
        normalized = normalized.replace(/(\d)(?=\s*[1/][23463])/g, '$1 ');

        // Match amount (e.g., 1, 1 1/2, 0.5), optional unit, and name
        const amountUnitRegex = /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?)\s*([a-zA-Zµ]+)?\b\s*(.*)$/;
        const match = normalized.match(amountUnitRegex);

        if (!match) {
            return { amount: null, unit: '', name: cleaned };
        }

        const rawAmount = match[1];
        const unit = (match[2] || '').toLowerCase();
        const name = (match[3] || '').trim();

        // Convert mixed number like "1 1/2" to decimal
        let amount = 0;
        const parts = rawAmount.split(' ');
        for (const p of parts) {
            if (/^\d+\/\d+$/.test(p)) {
                const [a, b] = p.split('/').map(Number);
                if (b) amount += a / b;
            } else {
                amount += parseFloat(p);
            }
        }

        if (!isFinite(amount)) amount = null;
        return { amount, unit, name };
    }

    // Clean up ingredient text formatting issues
    cleanIngredientText(text) {
        if (!text) return '';

        // Remove duplicate parenthetical notes: (divided) (divided) → (divided)
        text = text.replace(/\(\s*([^)]+)\)\s*\(\s*\1\s*\)/gi, '($1)');

        // Remove double parentheses: ((text)) → (text)
        text = text.replace(/\(\(([^)]+)\)\)/g, '($1)');

        // Remove triple+ parentheses: (((text))) → (text)
        while (text.includes('(((') || text.includes(')))')) {
            text = text.replace(/\({3,}/g, '(').replace(/\){3,}/g, ')');
        }

        // Normalize whitespace around parentheses
        text = text.replace(/\s+\(/g, ' (').replace(/\)\s+/g, ') ');

        // Remove whitespace inside parentheses
        text = text.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

        // Remove multiple consecutive spaces
        text = text.replace(/\s{2,}/g, ' ');

        // Clean up common formatting issues
        text = text
            .replace(/\s+,/g, ',')          // Remove space before comma
            .replace(/,\s+/g, ', ')         // Normalize space after comma
            .replace(/\s+\./g, '.')         // Remove space before period
            .trim();

        return text;
    }

    normalizeExtractedRecipe(recipe) {
        const safe = { ...recipe };
        // Default/clean servings
        if (!Number.isFinite(safe.servings) || safe.servings <= 0) {
            safe.servings = 4;
        } else {
            safe.servings = Math.max(1, Math.round(safe.servings));
        }

        // Normalize ingredients
        if (Array.isArray(safe.ingredients)) {
            safe.ingredients = safe.ingredients.map(ing => {
                if (ing && typeof ing === 'object') {
                    const text = ing.text || [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ').trim();
                    const cleanedText = this.cleanIngredientText(text);

                    if (ing.amount == null || ing.name == null) {
                        const parsed = this.parseIngredientLine(cleanedText);
                        return {
                            text: cleanedText || '',
                            amount: parsed.amount,
                            unit: parsed.unit,
                            name: parsed.name
                        };
                    }
                    return {
                        text: cleanedText || '',
                        amount: ing.amount,
                        unit: ing.unit || '',
                        name: ing.name || ''
                    };
                } else if (typeof ing === 'string') {
                    const cleanedText = this.cleanIngredientText(ing);
                    const parsed = this.parseIngredientLine(cleanedText);
                    return {
                        text: cleanedText,
                        amount: parsed.amount,
                        unit: parsed.unit,
                        name: parsed.name
                    };
                }
                return { text: '', amount: null, unit: '', name: '' };
            });
        } else {
            safe.ingredients = [];
        }

        // Ensure instructions is an array of strings
        if (!Array.isArray(safe.instructions)) {
            safe.instructions = [];
        } else {
            safe.instructions = safe.instructions.map(x =>
                typeof x === 'string' ? x : (x && x.text) ? x.text : String(x)
            );
        }

        return safe;
    }

    // ==========================================
    // Chat Assistant
    // ==========================================

    initializeChat() {
        this.addChatMessage('assistant',
            "Hi! I'm your cooking assistant. Ask me anything about the recipe - substitutions, techniques, timing, or any other cooking questions!");
    }

    toggleChat() {
        const chat = document.querySelector('.chat-assistant');
        const button = document.getElementById('toggle-chat');

        if (chat.classList.contains('minimized')) {
            chat.classList.remove('minimized');
            button.textContent = '−';
        } else {
            chat.classList.add('minimized');
            button.textContent = '+';
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addChatMessage('user', message);
        input.value = '';

        // Get AI response
        const response = await this.getChatResponse(message);
        this.addChatMessage('assistant', response);
    }

    addChatMessage(role, content) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.textContent = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.chatHistory.push({ role, content });
    }

    async getChatResponse(userMessage) {
        // Check if recipe is loaded
        if (!this.currentRecipe) {
            return "Please load a recipe first, and I'll be happy to help you with it!";
        }

        try {
            // Build context-aware prompt for Gemini
            const recipeContext = `
Recipe Title: ${this.currentRecipe.title}
Current Servings: ${this.currentServings}
Original Servings: ${this.originalServings}

Ingredients (scaled for ${this.currentServings} servings):
${this.currentRecipe.ingredients.map((ing, i) => `[${i}] ${this.scaleIngredient(ing)}`).join('\n')}

Instructions:
${this.currentRecipe.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
`;

            const prompt = `You are an interactive cooking assistant with the ability to modify recipes. You can help the user adjust their recipe in real-time.

IMPORTANT CAPABILITIES:
1. You can change the serving size by responding with: ACTION:SET_SERVINGS:X (where X is the new number of servings)
2. You can substitute ingredients by responding with: ACTION:SUBSTITUTE_INGREDIENT:INDEX:NEW_TEXT (where INDEX is the ingredient number in brackets, and NEW_TEXT is the replacement)
3. Only use these actions when the user explicitly requests changes

IMPORTANT:
- Only answer cooking-related questions. If the user asks about non-cooking topics, politely redirect them to cooking questions.

When responding with actions:
- For serving adjustments: If user says "change to 6 servings", "make it for 6", or "update recipe for 6 servings", respond with "ACTION:SET_SERVINGS:6" followed by a friendly message
- For substitutions: If user says "replace the eggs with flax eggs", find the egg ingredient index and respond with "ACTION:SUBSTITUTE_INGREDIENT:2:2 flax eggs" (example) followed by an explanation

You can include MULTIPLE actions in one response by putting them on separate lines.

Current Recipe Context:
${recipeContext}

Conversation History:
${this.chatHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User Question: ${userMessage}

Provide a helpful response. If the user wants to modify the recipe, include the appropriate ACTION commands, then explain what you changed.`;

            const response = await this.callGeminiAPIForChat(prompt);

            // Process any actions in the response
            const processedResponse = await this.processRecipeActions(response);

            return processedResponse;

        } catch (error) {
            console.error('Chat error:', error);
            return `Chat error: ${error.message}`;
        }
    }

    // Process and execute recipe modification actions from chat
    async processRecipeActions(aiResponse) {
        const lines = aiResponse.split('\n');
        const actions = [];
        const messageLines = [];

        for (const line of lines) {
            if (line.startsWith('ACTION:')) {
                actions.push(line);
            } else {
                messageLines.push(line);
            }
        }

        // Execute actions
        for (const action of actions) {
            const parts = action.split(':');
            const actionType = parts[1];

            if (actionType === 'SET_SERVINGS') {
                const newServings = parseInt(parts[2]);
                if (newServings > 0 && newServings <= 50) {
                    this.setServings(newServings);
                    this.addSystemMessage(`✓ Recipe adjusted to ${newServings} servings`);
                }
            } else if (actionType === 'SUBSTITUTE_INGREDIENT') {
                const ingredientIndex = parseInt(parts[2]);
                const newIngredientText = parts.slice(3).join(':');

                if (ingredientIndex >= 0 && ingredientIndex < this.currentRecipe.ingredients.length) {
                    // Parse the new ingredient (basic parsing)
                    const oldIngredient = this.currentRecipe.ingredients[ingredientIndex];
                    const newIngredient = this.parseIngredientText(newIngredientText, oldIngredient);

                    this.currentRecipe.ingredients[ingredientIndex] = newIngredient;
                    this.updateIngredientsList();

                    // Recalculate macros if they were already calculated
                    if (this.currentMacros) {
                        this.calculateMacros();
                    }

                    this.saveSession();
                    this.addSystemMessage(`✓ Substituted: ${newIngredient.text}`);
                }
            }
        }

        // Return the message without action commands
        return messageLines.join('\n').trim();
    }

    // Parse ingredient text into structured format
    parseIngredientText(text, templateIngredient = null) {
        // Try to extract amount and unit
        const amountMatch = text.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*([a-zA-Z]*)\s*(.+)$/);

        if (amountMatch) {
            let amount = amountMatch[1];
            // Handle fractions like 1/2
            if (amount.includes('/')) {
                const [num, den] = amount.split('/').map(Number);
                amount = num / den;
            } else {
                amount = parseFloat(amount);
            }

            return {
                text: text,
                amount: amount,
                unit: amountMatch[2] || (templateIngredient?.unit || ''),
                name: amountMatch[3].trim()
            };
        }

        // If no amount found, treat as "to taste" style
        return {
            text: text,
            amount: templateIngredient?.amount || null,
            unit: templateIngredient?.unit || 'to taste',
            name: text
        };
    }

    // Add a system message to chat (for action confirmations)
    addSystemMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message system';
        messageDiv.textContent = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Call Gemini API for chat (text-only response, with caching)
    async callGeminiAPIForChat(prompt, cacheKey = null) {
        // Check cache first
        if (cacheKey) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log('Returning cached chat response');
                return cached;
            }
        }

        // Select model for chat
        let selectedModel = this.modelRouter.selectBalancedModel('chat');

        if (!selectedModel) {
            throw new Error('No available models for chat. Please try again later.');
        }

        // Try with retries and fallback
        let lastError = null;
        const maxRetries = 2; // Fewer retries for chat

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const requestBody = {
                    prompt: prompt,
                    method: 'generateContent',
                    model: selectedModel
                };

                const response = await fetch(this.geminiApiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMsg = errorData.error || response.statusText;
                    throw new Error(`API error (${response.status}): ${errorMsg}`);
                }

                const data = await response.json();
                const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!generatedText) {
                    throw new Error('No response from Gemini API');
                }

                // Success - record request
                this.quotaTracker.recordRequest(selectedModel);

                // Cache result if cacheKey provided
                if (cacheKey) {
                    this.cache.set(cacheKey, generatedText.trim(), 'chat');
                }

                // Update quota UI
                this.updateQuotaUI();

                return generatedText.trim();

            } catch (error) {
                lastError = error;
                console.error(`Chat attempt ${attempt + 1} failed:`, error.message);

                // Check for rate limit
                const is429 = error.message.includes('429') || error.message.includes('rate limit');

                if (is429) {
                    const fallbackModel = this.modelRouter.getNextFallback(selectedModel, 'chat');
                    if (fallbackModel) {
                        selectedModel = fallbackModel;
                        continue;
                    }
                }

                // For non-429 errors or no fallbacks, retry with backoff
                if (attempt < maxRetries - 1) {
                    await this.delay(1000);
                }
            }
        }

        throw new Error(`Chat request failed: ${lastError.message}`);
    }

    // ==========================================
    // PDF Download
    // ==========================================

    downloadPDF() {
        if (!this.currentRecipe) return;

        try {
            // Access jsPDF from window object
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Set up colors
            const primaryColor = [255, 107, 53]; // #ff6b35
            const darkColor = [44, 62, 80]; // #2c3e50
            const lightColor = [127, 140, 141]; // #7f8c8d

            let yPosition = 20;
            const pageWidth = doc.internal.pageSize.getWidth();
            const marginLeft = 20;
            const marginRight = 20;
            const maxWidth = pageWidth - marginLeft - marginRight;

            // Title
            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont(undefined, 'bold');
            const titleLines = doc.splitTextToSize(this.currentRecipe.title, maxWidth);
            doc.text(titleLines, marginLeft, yPosition);
            yPosition += titleLines.length * 8 + 5;

            // Source and Servings
            doc.setFontSize(10);
            doc.setTextColor(...lightColor);
            doc.setFont(undefined, 'normal');
            doc.text(`Source: ${this.currentRecipe.source}`, marginLeft, yPosition);
            yPosition += 6;
            doc.text(`Servings: ${this.currentServings}`, marginLeft, yPosition);
            yPosition += 10;

            // Ingredients Section
            doc.setFontSize(16);
            doc.setTextColor(...darkColor);
            doc.setFont(undefined, 'bold');
            doc.text('Ingredients', marginLeft, yPosition);
            yPosition += 8;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            this.currentRecipe.ingredients.forEach(ing => {
                const ingredientText = `• ${this.scaleIngredient(ing)}`;
                const lines = doc.splitTextToSize(ingredientText, maxWidth - 5);

                // Check if we need a new page
                if (yPosition + (lines.length * 6) > 280) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.text(lines, marginLeft + 5, yPosition);
                yPosition += lines.length * 6 + 2;
            });

            yPosition += 8;

            // Instructions Section
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(...darkColor);

            // Check if we need a new page for instructions header
            if (yPosition > 260) {
                doc.addPage();
                yPosition = 20;
            }

            doc.text('Instructions', marginLeft, yPosition);
            yPosition += 8;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            this.currentRecipe.instructions.forEach((instruction, i) => {
                const stepNumber = `${i + 1}. `;
                const stepText = doc.splitTextToSize(instruction, maxWidth - 10);

                // Check if we need a new page
                if (yPosition + (stepText.length * 6) + 5 > 280) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Step number in bold
                doc.setFont(undefined, 'bold');
                doc.text(stepNumber, marginLeft, yPosition);

                // Step text
                doc.setFont(undefined, 'normal');
                doc.text(stepText, marginLeft + 10, yPosition);
                yPosition += stepText.length * 6 + 5;
            });

            // Footer
            const totalPages = doc.internal.pages.length - 1;
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(...lightColor);
                doc.text(
                    'Generated by Baratie - Your AI Recipe Assistant',
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // Save the PDF
            const filename = `${this.currentRecipe.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            doc.save(filename);

            // Show confirmation in chat
            this.addSystemMessage('✓ Recipe PDF downloaded successfully!');

        } catch (error) {
            console.error('PDF generation error:', error);
            // Fallback to text file if PDF fails
            this.downloadAsText();
        }
    }

    // Fallback method to download as text file
    downloadAsText() {
        if (!this.currentRecipe) return;

        let content = `${this.currentRecipe.title}\n`;
        content += `${'='.repeat(this.currentRecipe.title.length)}\n\n`;
        content += `Source: ${this.currentRecipe.source}\n`;
        content += `Servings: ${this.currentServings}\n\n`;

        content += `INGREDIENTS:\n`;
        content += `${'-'.repeat(50)}\n`;
        this.currentRecipe.ingredients.forEach(ing => {
            content += `• ${this.scaleIngredient(ing)}\n`;
        });

        content += `\nINSTRUCTIONS:\n`;
        content += `${'-'.repeat(50)}\n`;
        this.currentRecipe.instructions.forEach((instruction, i) => {
            content += `${i + 1}. ${instruction}\n\n`;
        });

        content += `\n${'='.repeat(50)}\n`;
        content += `Generated by Baratie - Your AI Recipe Assistant\n`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentRecipe.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addSystemMessage('✓ Recipe downloaded as text file');
    }

    // ==========================================
    // Session Management
    // ==========================================

    saveSession() {
        if (!this.currentRecipe) return;

        const sessionData = {
            recipe: this.currentRecipe,
            currentServings: this.currentServings,
            originalServings: this.originalServings,
            completedSteps: Array.from(this.completedSteps),
            macros: this.currentMacros,
            macrosServingSize: this.macrosServingSize,
            timestamp: Date.now()
        };

        try {
            sessionStorage.setItem('baratie_session', JSON.stringify(sessionData));
        } catch (e) {
            console.error('Failed to save session:', e);
        }
    }

    restoreSession() {
        try {
            const sessionData = sessionStorage.getItem('baratie_session');
            if (!sessionData) return;

            const data = JSON.parse(sessionData);

            // Check if session is recent (within 24 hours)
            const age = Date.now() - data.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                sessionStorage.removeItem('baratie_session');
                return;
            }

            this.currentRecipe = data.recipe;
            this.currentServings = data.currentServings || data.recipe?.servings || 4;
            this.originalServings = data.originalServings || data.recipe?.servings || 4;
            this.completedSteps = new Set(data.completedSteps);
            this.currentMacros = data.macros || null;
            this.macrosServingSize = data.macrosServingSize || this.currentServings;

            // Restore to cooking stage
            this.displayCookingInterface();
            this.goToStage('cooking');

            // Restore macros if they exist
            if (this.currentMacros) {
                this.displayMacros(this.currentMacros);
            }

        } catch (e) {
            console.error('Failed to restore session:', e);
            sessionStorage.removeItem('baratie_session');
        }
    }

    resetAndGoToStart() {
        this.currentRecipe = null;
        this.completedSteps.clear();
        this.chatHistory = [];
        this.currentMacros = null;
        sessionStorage.removeItem('baratie_session');

        // Hide and reset cooking timer
        if (this.cookingTimer) {
            this.cookingTimer.hide();
            this.cookingTimer.reset();
        }

        document.getElementById('recipe-url').value = '';
        document.getElementById('chat-messages').innerHTML = '';
        this.initializeChat();

        this.goToStage('capture');
    }

    // ==========================================
    // Utility Functions
    // ==========================================

    getSarcasticErrorMessage(url) {
        // Array of sarcastic messages for non-recipe content
        const messages = [
            "🤔 That's not a recipe, that's... actually, I have no idea what that is. But it's definitely not food.",
            "😬 I'm a recipe manager, not a miracle worker. That URL has zero cooking vibes.",
            "🙄 Nice try, but I'm pretty sure that's not a recipe. Unless you're planning to eat your screen?",
            "🤨 I searched that entire page for ingredients and instructions. Found nothing. Are you pranking me?",
            "😅 That's about as much a recipe as I am a Michelin-star chef. (Spoiler: I'm not.)",
            "🍕 I was expecting ingredients like 'flour' and 'eggs', not... whatever this is. Try again with actual food?",
            "👨‍🍳 Chef's note: This is not food content. Please feed me recipes, not random web pages.",
            "🥘 I'm designed to extract recipes, not existential crises. That URL gave me both confusion and hunger for real recipes.",
            "📖 I read that entire page twice. Still no recipe. Maybe try a food blog next time?",
            "🍝 I can extract recipes from the messiest food blogs, but I can't extract food from non-food content. Physics, you know?",
            "🧑‍🍳 Error 404: Recipe Not Found. Did you mean to send me to a cooking website?",
            "🍳 I'm having an identity crisis. That URL told me I'm NOT a recipe manager. Please validate me with actual recipes.",
            "🥗 That's not a recipe. That's not even food-adjacent. I'm starting to question your definition of 'cooking'.",
            "👀 I scanned every pixel of that page. No ingredients, no instructions, no hope. Send help (in the form of recipes).",
            "🤷 I mean, technically you CAN'T cook what you just sent me. Because it's not food. Just saying."
        ];

        // Pick a random sarcastic message
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        // Add a helpful tip
        return `${randomMessage}\n\nTip: Try recipe blogs like AllRecipes, Food Network, or YouTube cooking videos!`;
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type} show`;

        if (type !== 'loading') {
            setTimeout(() => {
                statusDiv.classList.remove('show');
            }, 5000);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // Quota Tracker UI
    // ==========================================

    updateQuotaUI() {
        const quotaContainer = document.getElementById('quota-tracker');
        if (!quotaContainer) return; // UI not loaded yet

        const allStatus = this.quotaTracker.getAllStatus();
        const cacheStats = this.cache.getStats();

        let html = '<div class="quota-header">';
        html += '<h4>API Quota Status</h4>';
        html += `<div class="cache-stats">Cache Hit Rate: ${cacheStats.hitRate}</div>`;
        html += '</div>';

        html += '<div class="quota-models">';

        allStatus.forEach(status => {
            const rpmHealth = status.rpm.percentage < 70 ? 'healthy' :
                            status.rpm.percentage < 90 ? 'warning' : 'critical';
            const rpdHealth = status.rpd.percentage < 70 ? 'healthy' :
                            status.rpd.percentage < 90 ? 'warning' : 'critical';

            // Simplify model name for display
            const displayName = status.model.replace('gemini-', '').replace('-', ' ');

            html += `
                <div class="quota-model ${status.canUse ? '' : 'rate-limited'}">
                    <div class="model-name">${displayName}</div>
                    <div class="model-quota">
                        <div class="quota-bar-container">
                            <div class="quota-label">Minute</div>
                            <div class="quota-bar ${rpmHealth}">
                                <div class="quota-fill" style="width: ${status.rpm.percentage}%"></div>
                            </div>
                            <div class="quota-text">${status.rpm.used}/${status.rpm.limit}</div>
                        </div>
                        <div class="quota-bar-container">
                            <div class="quota-label">Day</div>
                            <div class="quota-bar ${rpdHealth}">
                                <div class="quota-fill" style="width: ${status.rpd.percentage}%"></div>
                            </div>
                            <div class="quota-text">${status.rpd.used}/${status.rpd.limit}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        quotaContainer.innerHTML = html;
    }

    toggleQuotaTracker() {
        const quotaTracker = document.getElementById('quota-tracker');
        if (!quotaTracker) return;

        if (quotaTracker.classList.contains('minimized')) {
            quotaTracker.classList.remove('minimized');
            this.updateQuotaUI();
        } else {
            quotaTracker.classList.add('minimized');
        }
    }
}

// ==========================================
// Initialize Application
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    window.recipeManager = new RecipeManager();
});
