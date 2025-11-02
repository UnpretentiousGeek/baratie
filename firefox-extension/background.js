// ==========================================
// Baratie Recipe Capture Extension
// Background Script (Cross-browser compatible)
// ==========================================

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Extension installation handler
browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Baratie Recipe Capture Extension installed!');

    // Show welcome notification
    try {
      browserAPI.notifications.create({
        type: 'basic',
        title: 'Baratie Recipe Capture',
        message: 'Extension installed! Right-click on any recipe text and select "Capture with Baratie".',
        priority: 1
      });
    } catch (e) {
      console.warn('Notification creation failed:', e);
    }

    // Open setup instructions (optional)
    // browserAPI.tabs.create({ url: 'setup.html' });
  } else if (details.reason === 'update') {
    console.log('Baratie Recipe Capture Extension updated!');
  }
});

// Listen for messages from Baratie web app (cross-origin messaging)
// Note: Firefox doesn't support onMessageExternal in Manifest V2, so we use regular onMessage
const messageListener = (request, sender, sendResponse) => {
  if (request.action === 'getRecipeText') {
    // Retrieve text from storage
    const getStorage = browserAPI.storage.local.get([request.storageId]);

    // Handle both Promise-based (Firefox) and callback-based (Chrome) APIs
    if (getStorage && typeof getStorage.then === 'function') {
      // Firefox Promise-based API
      getStorage.then((result) => {
        const text = result[request.storageId] || null;
        sendResponse({ text: text });

        // Clean up storage after retrieval
        if (text) {
          browserAPI.storage.local.remove(request.storageId);
          console.log('Recipe text retrieved and cleaned up:', request.storageId);
        }
      });
      return true;
    } else {
      // Chrome callback-based API
      browserAPI.storage.local.get([request.storageId], (result) => {
        const text = result[request.storageId] || null;
        sendResponse({ text: text });

        // Clean up storage after retrieval
        if (text) {
          browserAPI.storage.local.remove(request.storageId);
          console.log('Recipe text retrieved and cleaned up:', request.storageId);
        }
      });
      return true;
    }
  }
};

// Register the appropriate listener based on browser
if (typeof browser !== 'undefined' && browser.runtime.onMessage) {
  browser.runtime.onMessage.addListener(messageListener);
} else if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(messageListener);
}

// Handle context menu (right-click) option
browserAPI.runtime.onInstalled.addListener(() => {
  if (browserAPI.contextMenus && browserAPI.contextMenus.create) {
    browserAPI.contextMenus.create({
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
  if (browserAPI.contextMenus && browserAPI.contextMenus.onClicked && typeof browserAPI.contextMenus.onClicked.addListener === 'function') {
    browserAPI.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId !== 'captureRecipe' || !info.selectionText) return;

      const selectedText = (info.selectionText || '').trim();

      if (selectedText.length < 50) {
        // Show error notification
        try {
          browserAPI.notifications.create({
            type: 'basic',
            title: 'Selection Too Short',
            message: 'Please select more text (at least 50 characters) for recipe capture.',
            priority: 1
          });
        } catch (e) {
          // ignore
        }
        return;
      }

      // Get Baratie path from storage - handle both Promise and callback APIs
      const handleStorage = (result) => {
        const DEFAULT_LOCAL = 'file:///D:/Vibe%20Coding%20Projects/Baratie/app/index.html';
        const DEFAULT_VERCEL = 'https://baratie-piece.vercel.app';
        const BARATIE_PATH = result.baratiePath || DEFAULT_VERCEL || DEFAULT_LOCAL;

        // Decide transfer method based on size
        if (selectedText.length < 8000) {
          // Use URL parameters
          const encoded = encodeURIComponent(selectedText);
          const encodedUrl = encodeURIComponent(tab.url);
          const baratieUrl = `${BARATIE_PATH}?recipe_text=${encoded}&source_url=${encodedUrl}`;

          browserAPI.tabs.create({ url: baratieUrl });
        } else {
          // Use storage
          const storageId = `recipe_${Date.now()}`;
          const setData = { [storageId]: selectedText };

          const setStorage = browserAPI.storage.local.set(setData);
          const handleSet = () => {
            const encodedUrl = encodeURIComponent(tab.url);
            const baratieUrl = `${BARATIE_PATH}?recipe_storage_id=${storageId}&source_url=${encodedUrl}`;

            browserAPI.tabs.create({ url: baratieUrl });

            // Clean up after 60 seconds
            setTimeout(() => {
              browserAPI.storage.local.remove(storageId);
            }, 60000);
          };

          if (setStorage && typeof setStorage.then === 'function') {
            setStorage.then(handleSet);
          } else {
            handleSet();
          }
        }
      };

      const getStorage = browserAPI.storage.sync.get(['baratiePath']);
      if (getStorage && typeof getStorage.then === 'function') {
        // Firefox Promise-based API
        getStorage.then(handleStorage);
      } else {
        // Chrome callback-based API
        browserAPI.storage.sync.get(['baratiePath'], handleStorage);
      }
    });
  } else {
    console.warn('contextMenus.onClicked not available. Check permissions and service worker context.');
  }
} catch (e) {
  console.warn('Failed to register contextMenus.onClicked listener:', e);
}

// Clean up old storage entries (run on startup)
browserAPI.runtime.onStartup.addListener(() => {
  const handleItems = (items) => {
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
      browserAPI.storage.local.remove(keysToRemove);
      console.log('Cleaned up old recipe storage entries:', keysToRemove.length);
    }
  };

  const getStorage = browserAPI.storage.local.get(null);
  if (getStorage && typeof getStorage.then === 'function') {
    getStorage.then(handleItems);
  } else {
    browserAPI.storage.local.get(null, handleItems);
  }
});

// Handle extension icon click (alternative to popup)
// Use browserAction for Firefox Manifest V2, action for Chrome Manifest V3
const actionAPI = browserAPI.browserAction || browserAPI.action;
if (actionAPI && actionAPI.onClicked) {
  actionAPI.onClicked.addListener((tab) => {
    // This won't fire if default_popup is set in manifest
    // Included for reference in case popup is disabled
    console.log('Extension icon clicked on tab:', tab.url);
  });
}

console.log('Baratie Recipe Capture: Background script loaded (cross-browser compatible)');
