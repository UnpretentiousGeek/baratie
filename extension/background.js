// ==========================================
// Baratie Recipe Capture Extension
// Background Service Worker (Manifest V3)
// ==========================================

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Baratie Recipe Capture Extension installed!');

    // Show welcome notification
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Baratie Recipe Capture',
        message: 'Extension installed! Right-click on any recipe text and select "Capture with Baratie".',
        priority: 1
      });
    } catch (e) {
      console.warn('Notification creation failed (icon likely missing):', e);
    }

    // Open setup instructions (optional)
    // chrome.tabs.create({ url: 'setup.html' });
  } else if (details.reason === 'update') {
    console.log('Baratie Recipe Capture Extension updated!');
  }
});

// Listen for messages from Baratie web app (cross-origin messaging)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRecipeText') {
    // Retrieve text from storage
    chrome.storage.local.get([request.storageId], (result) => {
      const text = result[request.storageId] || null;

      sendResponse({ text: text });

      // Clean up storage after retrieval
      if (text) {
        chrome.storage.local.remove(request.storageId);
        console.log('Recipe text retrieved and cleaned up:', request.storageId);
      }
    });

    // Return true to indicate async response
    return true;
  }
});

// Handle context menu (right-click) option
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.contextMenus && chrome.contextMenus.create) {
    chrome.contextMenus.create({
      id: 'captureRecipe',
      title: 'Capture Recipe with Baratie',
      contexts: ['selection']
    });
  } else {
    console.warn('contextMenus API unavailable. Check permissions in manifest.');
  }
});

// Handle context menu click
try {
  if (chrome.contextMenus && chrome.contextMenus.onClicked && typeof chrome.contextMenus.onClicked.addListener === 'function') {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId !== 'captureRecipe' || !info.selectionText) return;

      const selectedText = (info.selectionText || '').trim();

      if (selectedText.length < 50) {
        // Show error notification
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon48.png'),
            title: 'Selection Too Short',
            message: 'Please select more text (at least 50 characters) for recipe capture.',
            priority: 1
          });
        } catch (e) {
          // ignore
        }
        return;
      }

      // Get Baratie path from storage
      chrome.storage.sync.get(['baratiePath'], (result) => {
        const DEFAULT_LOCAL = 'file:///D:/Vibe%20Coding%20Projects/Baratie/app/index.html';
        const DEFAULT_VERCEL = 'https://baratie-piece.vercel.app';
        const BARATIE_PATH = result.baratiePath || DEFAULT_VERCEL || DEFAULT_LOCAL;

        // Decide transfer method based on size
      if (selectedText.length < 8000) {
          // Use URL parameters
          const encoded = encodeURIComponent(selectedText);
          const encodedUrl = encodeURIComponent(tab.url);
          const baratieUrl = `${BARATIE_PATH}?recipe_text=${encoded}&source_url=${encodedUrl}`;

          chrome.tabs.create({ url: baratieUrl });
        } else {
          // Use storage
        const storageId = `recipe_${Date.now()}`;
          chrome.storage.local.set({ [storageId]: selectedText }, () => {
            const encodedUrl = encodeURIComponent(tab.url);
            const baratieUrl = `${BARATIE_PATH}?recipe_storage_id=${storageId}&source_url=${encodedUrl}`;

            chrome.tabs.create({ url: baratieUrl });

            // Clean up after 60 seconds
            setTimeout(() => {
              chrome.storage.local.remove(storageId);
            }, 60000);
          });
        }
      });
    });
  } else {
    console.warn('contextMenus.onClicked not available. Check permissions and service worker context.');
  }
} catch (e) {
  console.warn('Failed to register contextMenus.onClicked listener:', e);
}

// Clean up old storage entries (run on startup)
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const keysToRemove = [];

    for (const key in items) {
      if (key.startsWith('recipe_')) {
        // Extract timestamp from key (recipe_TIMESTAMP)
        const timestamp = parseInt(key.split('_')[1]);
        // Remove if older than 1 hour
        if (now - timestamp > 3600000) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove);
      console.log('Cleaned up old recipe storage entries:', keysToRemove.length);
    }
  });
});

// Handle extension icon click (alternative to popup)
chrome.action.onClicked.addListener((tab) => {
  // This won't fire if default_popup is set in manifest
  // Included for reference in case popup is disabled
  console.log('Extension icon clicked on tab:', tab.url);
});

console.log('Baratie Recipe Capture: Background service worker loaded');
