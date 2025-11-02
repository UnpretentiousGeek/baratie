// ==========================================
// Baratie Recipe Capture Extension
// Popup Script (Cross-browser compatible)
// ==========================================

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Configuration - Default paths (user can customize in settings)
// For local development: file:///D:/Vibe%20Coding%20Projects/Baratie/app/index.html
// For Vercel deployment: https://baratie-piece.vercel.app
const DEFAULT_LOCAL_PATH = 'file:///D:/Vibe%20Coding%20Projects/Baratie/app/index.html';
const DEFAULT_VERCEL_PATH = 'https://baratie-piece.vercel.app';

// DOM Elements
let captureBtn;
let statusMessage;
let previewSection;
let previewText;
let charCount;
let settingsLink;
let resetLink;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  captureBtn = document.getElementById('capture-btn');
  statusMessage = document.getElementById('status-message');
  previewSection = document.getElementById('preview-section');
  previewText = document.getElementById('preview-text');
  charCount = document.getElementById('char-count');
  settingsLink = document.getElementById('settings-link');
  resetLink = document.getElementById('reset-link');

  // Event listeners
  captureBtn.addEventListener('click', handleCapture);
  settingsLink.addEventListener('click', handleSettings);
  if (resetLink) {
    resetLink.addEventListener('click', handleReset);
  }

  // Load saved settings
  loadSettings();

  // Auto-detect selection on popup open
  detectSelection();
});

// Detect if user has text selected
async function detectSelection() {
  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // Check if we can access this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
      showStatus('Cannot capture from browser internal pages', 'error');
      captureBtn.disabled = true;
      return;
    }

    // Request selection from content script
    const sendMessage = browserAPI.tabs.sendMessage(tab.id, { action: 'getSelection' });

    // Handle both Promise-based (Firefox) and callback-based (Chrome) APIs
    if (sendMessage && typeof sendMessage.then === 'function') {
      // Firefox Promise-based API
      sendMessage.then((response) => {
        if (response && response.selection && response.selection.length > 50) {
          showPreview(response.selection);
          showStatus('Text detected! Click capture to send to Baratie.', 'success');
        }
      }).catch((error) => {
        console.log('Content script not ready:', error);
      });
    } else {
      // Chrome callback-based API
      browserAPI.tabs.sendMessage(tab.id, { action: 'getSelection' }, (response) => {
        if (browserAPI.runtime.lastError) {
          // Content script might not be injected yet, ignore error
          console.log('Content script not ready:', browserAPI.runtime.lastError);
          return;
        }

        if (response && response.selection && response.selection.length > 50) {
          showPreview(response.selection);
          showStatus('Text detected! Click capture to send to Baratie.', 'success');
        }
      });
    }
  } catch (error) {
    console.error('Error detecting selection:', error);
  }
}

// Handle capture button click
async function handleCapture() {
  try {
    captureBtn.disabled = true;
    captureBtn.classList.add('loading');
    showStatus('Capturing recipe text...', '');

    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // Get selection from content script
    const handleResponse = async (response) => {
      if (!response) {
        console.error('❌ No response from content script');
        showStatus('Error: No response from page. Try refreshing.', 'error');
        captureBtn.disabled = false;
        captureBtn.classList.remove('loading');
        return;
      }

      console.log('📥 Received from content script:', {
        hasSelection: !!response.selection,
        selectionLength: response.selection?.length || 0,
        url: response.url
      });

      const { selection, fullText, url } = response;

      // Check if user has text selected
      const hasSelection = selection && selection.length > 50;

      if (hasSelection) {
        // MODE 1: Text Selection Capture
        // User highlighted text - extract from captured text
        let capturedText = selection;

        // Truncate very long text (Gemini API limit)
        if (capturedText.length > 15000) {
          capturedText = capturedText.substring(0, 15000);
          showStatus('Text truncated to 15,000 characters (API limit)', '');
        }

        // Show preview
        showPreview(capturedText);

        // Decide transfer method based on size
        if (capturedText.length < 1500) {
          // Use URL query parameters for small content
          await sendViaUrlParams(capturedText, url);
        } else {
          // Use storage for large content
          await sendViaStorage(capturedText, url);
        }
      } else {
        // MODE 2: URL Capture
        // No text selected - just send URL for normal extraction
        showStatus('No text selected. Sending URL for extraction...', '');
        await sendUrlOnly(url);
      }
    };

    const sendMessage = browserAPI.tabs.sendMessage(tab.id, { action: 'getPageContent' });

    // Handle both Promise-based (Firefox) and callback-based (Chrome) APIs
    if (sendMessage && typeof sendMessage.then === 'function') {
      // Firefox Promise-based API
      sendMessage.then(handleResponse).catch((error) => {
        console.error('❌ Content script error:', error);
        showStatus('Error: Could not access page content. Try refreshing the page.', 'error');
        captureBtn.disabled = false;
        captureBtn.classList.remove('loading');
      });
    } else {
      // Chrome callback-based API
      browserAPI.tabs.sendMessage(tab.id, { action: 'getPageContent' }, async (response) => {
        if (browserAPI.runtime.lastError) {
          console.error('❌ Content script error:', browserAPI.runtime.lastError);
          showStatus('Error: Could not access page content. Try refreshing the page.', 'error');
          captureBtn.disabled = false;
          captureBtn.classList.remove('loading');
          return;
        }
        await handleResponse(response);
      });
    }
  } catch (error) {
    console.error('Capture error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

// Send data via URL query parameters (for small content)
async function sendViaUrlParams(text, sourceUrl) {
  try {
    const baratiePath = await getBaratiePath();
    const encoded = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(sourceUrl);
    const baratieUrl = `${baratiePath}?recipe_text=${encoded}&source_url=${encodedUrl}`;

    console.log('📤 Sending via URL params:', {
      baratiePath,
      textLength: text.length,
      sourceUrl,
      finalUrl: baratieUrl.substring(0, 100) + '...'
    });

    showStatus('Opening Baratie...', 'success');

    // Open Baratie in new tab
    await browserAPI.tabs.create({ url: baratieUrl });

    // Close popup after short delay
    setTimeout(() => {
      window.close();
    }, 500);
  } catch (error) {
    console.error('Error opening Baratie:', error);
    showStatus(`Error: ${error.message}`, 'error');
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

// Send data via storage (for large content)
async function sendViaStorage(text, sourceUrl) {
  try {
    const baratiePath = await getBaratiePath();
    const storageId = `recipe_${Date.now()}`;

    // Store text with unique ID
    await browserAPI.storage.local.set({ [storageId]: text });

    const encodedUrl = encodeURIComponent(sourceUrl);
    const baratieUrl = `${baratiePath}?recipe_storage_id=${storageId}&source_url=${encodedUrl}`;

    console.log('📤 Sending via storage:', {
      baratiePath,
      storageId,
      textLength: text.length,
      sourceUrl,
      finalUrl: baratieUrl
    });

    showStatus('Opening Baratie...', 'success');

    // Open Baratie in new tab
    await browserAPI.tabs.create({ url: baratieUrl });

    // Clean up storage after 60 seconds
    setTimeout(() => {
      browserAPI.storage.local.remove(storageId);
    }, 60000);

    // Close popup after short delay
    setTimeout(() => {
      window.close();
    }, 500);
  } catch (error) {
    console.error('Error using storage:', error);
    showStatus(`Error: ${error.message}`, 'error');
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

// Send URL only (for normal URL-based extraction)
async function sendUrlOnly(url) {
  try {
    const baratiePath = await getBaratiePath();
    const encodedUrl = encodeURIComponent(url);
    const baratieUrl = `${baratiePath}?recipe_url=${encodedUrl}`;

    console.log('📤 Sending URL only:', {
      baratiePath,
      sourceUrl: url,
      finalUrl: baratieUrl
    });

    showStatus('Opening Baratie...', 'success');

    // Open Baratie in new tab
    await browserAPI.tabs.create({ url: baratieUrl });

    // Close popup after short delay
    setTimeout(() => {
      window.close();
    }, 500);
  } catch (error) {
    console.error('Error opening Baratie:', error);
    showStatus(`Error: ${error.message}`, 'error');
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

// Show status message
function showStatus(message, type = '') {
  statusMessage.className = `status-message ${type}`;
  statusMessage.innerHTML = `<p>${message}</p>`;
}

// Show preview of captured text
function showPreview(text) {
  const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
  previewText.textContent = preview;
  charCount.textContent = text.length.toLocaleString();
  previewSection.style.display = 'block';
}

// Get Baratie URL (from settings or default)
async function getBaratiePath() {
  try {
    const result = await browserAPI.storage.sync.get(['baratiePath']);
    if (result.baratiePath) {
      return result.baratiePath;
    }
    // Default to Vercel if available, otherwise local
    return DEFAULT_VERCEL_PATH || DEFAULT_LOCAL_PATH;
  } catch (error) {
    console.error('Error loading Baratie path:', error);
    return DEFAULT_LOCAL_PATH;
  }
}

// Load saved settings
async function loadSettings() {
  try {
    const result = await browserAPI.storage.sync.get(['baratiePath']);
    if (result.baratiePath) {
      // User has customized path
      console.log('Using custom Baratie path:', result.baratiePath);
    } else {
      console.log('Using default Baratie path');
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Handle settings link click
async function handleSettings(e) {
  e.preventDefault();
  const currentPath = await getBaratiePath();
  const newPath = prompt(
    'Enter the full path to your Baratie app:\n\n' +
    'Local file: file:///D:/Vibe%20Coding%20Projects/Baratie/app/index.html\n' +
    'Localhost: http://localhost:8000\n' +
    'Vercel: https://baratie-piece.vercel.app',
    currentPath
  );

  if (newPath && newPath.trim()) {
    await browserAPI.storage.sync.set({ baratiePath: newPath.trim() });
    showStatus('Settings saved!', 'success');
    loadSettings(); // Refresh display
  }
}

// Handle reset link click - Reset to default Vercel URL
async function handleReset(e) {
  e.preventDefault();
  if (confirm('Reset to default Vercel URL?\n\nhttps://baratie-piece.vercel.app')) {
    await browserAPI.storage.sync.remove('baratiePath');
    showStatus('Reset to Vercel URL!', 'success');
    loadSettings(); // Refresh display
    console.log('Path reset to default Vercel:', DEFAULT_VERCEL_PATH);
  }
}
