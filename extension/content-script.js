// ==========================================
// Baratie Recipe Capture Extension
// Content Script (injected into all pages)
// ==========================================

// Track last text selection
let lastSelection = '';

// Listen for text selection changes
document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString().trim();
  if (selection.length > 50) {
    lastSelection = selection;
  }
});

// Also track keyboard selection (Shift + arrows, Ctrl+A, etc.)
document.addEventListener('keyup', (e) => {
  // Only track if Shift key was involved (selection)
  if (e.shiftKey || e.key === 'a' && (e.ctrlKey || e.metaKey)) {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 50) {
      lastSelection = selection;
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    // Return just the current selection
    const response = {
      selection: window.getSelection().toString().trim() || lastSelection,
      url: window.location.href
    };
    console.log('📨 Content script: getSelection response:', {
      selectionLength: response.selection.length,
      url: response.url
    });
    sendResponse(response);
    return true; // Required for async sendResponse
  } else if (request.action === 'getPageContent') {
    // Return selection + full page content as fallback
    const currentSelection = window.getSelection().toString().trim();
    const selection = currentSelection || lastSelection;

    // Get main content (try to extract meaningful text)
    const fullText = extractMainContent();

    const response = {
      selection: selection,
      fullText: fullText,
      url: window.location.href
    };

    console.log('📨 Content script: getPageContent response:', {
      selectionLength: response.selection.length,
      fullTextLength: response.fullText.length,
      url: response.url
    });

    sendResponse(response);
    return true; // Required for async sendResponse
  }
});

// Extract main content from page (avoid nav, footer, ads)
function extractMainContent() {
  // Try to find main content area
  const mainSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.recipe',
    '.entry-content',
    '.post-content',
    '.article-body',
    '#content',
    '.content'
  ];

  let mainElement = null;
  for (const selector of mainSelectors) {
    mainElement = document.querySelector(selector);
    if (mainElement) break;
  }

  // If no main content found, use body
  if (!mainElement) {
    mainElement = document.body;
  }

  // Clone element to avoid modifying original
  const clone = mainElement.cloneNode(true);

  // Remove noisy elements
  const noisySelectors = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    '.advertisement',
    '.ad',
    '.sidebar',
    '.comments',
    '.social-share',
    'iframe',
    'noscript'
  ];

  noisySelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // Get text content
  let text = clone.textContent || clone.innerText || '';

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Limit length (Gemini API + URL limits)
  if (text.length > 15000) {
    text = text.substring(0, 15000);
  }

  return text;
}

// Extract structured data if available (JSON-LD recipe schema)
function extractStructuredRecipe() {
  try {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : (data['@graph'] || [data]);

        for (const item of items) {
          if (item['@type'] === 'Recipe') {
            // Format recipe as text
            let recipeText = `RECIPE: ${item.name || ''}\n\n`;

            if (item.recipeIngredient) {
              recipeText += 'INGREDIENTS:\n';
              recipeText += item.recipeIngredient.join('\n') + '\n\n';
            }

            if (item.recipeInstructions) {
              recipeText += 'INSTRUCTIONS:\n';
              if (Array.isArray(item.recipeInstructions)) {
                item.recipeInstructions.forEach((step, i) => {
                  const text = typeof step === 'string' ? step : step.text || '';
                  recipeText += `${i + 1}. ${text}\n`;
                });
              }
            }

            return recipeText;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting structured recipe:', error);
    return null;
  }
}

// Console log to confirm content script loaded
console.log('Baratie Recipe Capture: Content script loaded');
