# How the Baratie Recipe Capture Extension Works

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER BROWSING RECIPE PAGE                      │
│  (AllRecipes, Food Network, YouTube comments, any website)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │ User highlights text  │
             │  (ingredients +       │
             │   instructions)       │
             └───────────┬───────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ CONTENT SCRIPT (always active)│
         │ - Tracks text selection       │
         │ - Listens for mouseup/keyup   │
         │ - Stores last selection       │
         └───────────┬───────────────────┘
                     │
                     ▼
     ┌───────────────────────────────────────┐
     │ USER CLICKS EXTENSION ICON            │
     └───────────┬───────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ POPUP OPENS (popup.html)        │
   │ - Shows capture button          │
   │ - Displays help text            │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ USER CLICKS "CAPTURE RECIPE"    │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ POPUP.JS sends message          │
   │ to content script:              │
   │ "getPageContent"                │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ CONTENT SCRIPT responds:        │
   │ {                               │
   │   selection: "highlighted text",│
   │   fullText: "full page",        │
   │   url: "current URL"            │
   │ }                               │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ POPUP.JS determines size:       │
   │ Is text < 1500 characters?      │
   └─────────┬───────────┬───────────┘
             │           │
       YES ◄─┘           └─► NO
        │                   │
        ▼                   ▼
┌─────────────┐    ┌─────────────────┐
│ URL METHOD  │    │ STORAGE METHOD  │
├─────────────┤    ├─────────────────┤
│ 1. Encode   │    │ 1. Generate ID  │
│    text as  │    │    (recipe_123) │
│    URL param│    │ 2. Store in     │
│             │    │    chrome       │
│ 2. Create   │    │    .storage     │
│    Baratie  │    │    .local       │
│    URL with │    │ 3. Create URL   │
│    ?recipe_ │    │    with storage │
│    text=... │    │    ID           │
└──────┬──────┘    └────────┬────────┘
       │                    │
       └─────────┬──────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ OPEN BARATIE IN NEW TAB         │
   │ URL: file:///path/to/index.html │
   │   ?recipe_text=...              │
   │   &source_url=...               │
   │ OR                              │
   │   ?recipe_storage_id=...        │
   │   &source_url=...               │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ BARATIE LOADS (index.html)      │
   │ Extension detection script runs │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ Check URL query parameters:     │
   │ URLSearchParams.has()?          │
   └─────────┬───────────┬───────────┘
             │           │
       NO ◄──┘           └──► YES
        │                    │
        │                    ▼
        │      ┌──────────────────────┐
        │      │ Parse parameters:    │
        │      │ - recipe_text or     │
        │      │ - recipe_storage_id  │
        │      │ - source_url         │
        │      └──────────┬───────────┘
        │                 │
        │                 ▼
        │      ┌──────────────────────┐
        │      │ Store in:            │
        │      │ window.extensionData │
        │      │ {                    │
        │      │   text: "...",       │
        │      │   storageId: "...",  │
        │      │   sourceUrl: "..."   │
        │      │ }                    │
        │      └──────────┬───────────┘
        │                 │
        ▼                 ▼
   ┌─────────────────────────────────┐
   │ APP.JS INITIALIZES              │
   │ RecipeManager constructor:      │
   │ - init()                        │
   │ - checkExtensionData()          │
   └─────────────┬───────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
   NO ◄┤ extensionData?    ├──► YES
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
       ┌─────────────────┐
       │ Normal flow:    │
       │ Wait for user   │
       │ to paste URL    │
       └─────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ checkExtensionData() executes:  │
   │ 1. Get text from URL or storage │
   │ 2. Call extractRecipeFromText() │
   │ 3. Send to Gemini API           │
   │ 4. Parse JSON response          │
   │ 5. Store in currentRecipe       │
   │ 6. Navigate to preview stage    │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ GEMINI API EXTRACTION           │
   │ Prompt: "Extract recipe from    │
   │         the following text..."  │
   │                                 │
   │ Response: {                     │
   │   isValid: true,                │
   │   title: "Recipe Name",         │
   │   servings: 4,                  │
   │   ingredients: [...],           │
   │   instructions: [...]           │
   │ }                               │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ RECIPE PREVIEW STAGE            │
   │ User sees:                      │
   │ - Recipe title                  │
   │ - Source URL                    │
   │ - Ingredient count              │
   │ - Preview of ingredients        │
   │                                 │
   │ Buttons:                        │
   │ [Back]  [Start Cooking]         │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ USER CLICKS "START COOKING"     │
   └─────────────┬───────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────┐
   │ COOKING INTERFACE               │
   │ - Ingredients (scaled)          │
   │ - Instructions (checkboxes)     │
   │ - Progress bar                  │
   │ - Chat assistant                │
   │ - Nutrition tab                 │
   │ - PDF download                  │
   └─────────────────────────────────┘
```

## Component Interactions

### 1. Content Script ↔ Webpage

```javascript
// content-script.js injected into webpage
document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString();
  if (selection.length > 50) {
    lastSelection = selection;
  }
});
```

**What it does**: Silently monitors text selection without interfering with page.

---

### 2. Popup ↔ Content Script

```javascript
// popup.js sends message
chrome.tabs.sendMessage(tabId,
  { action: 'getPageContent' },
  (response) => {
    const { selection, fullText, url } = response;
    // Process...
  }
);
```

**What it does**: Popup requests captured data from content script.

---

### 3. Popup → Baratie (via URL)

```javascript
// popup.js opens Baratie
const encoded = encodeURIComponent(text);
const baratieUrl = `file:///path/index.html?recipe_text=${encoded}`;
chrome.tabs.create({ url: baratieUrl });
```

**What it does**: Passes captured text via URL query parameter.

---

### 4. Baratie Detection Script

```javascript
// index.html (before app.js loads)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('recipe_text')) {
  window.extensionData = {
    text: decodeURIComponent(urlParams.get('recipe_text')),
    sourceUrl: decodeURIComponent(urlParams.get('source_url'))
  };
}
```

**What it does**: Detects extension data before app initializes.

---

### 5. App Initialization

```javascript
// app.js constructor
constructor() {
  // ... setup ...
  this.init();
}

init() {
  this.restoreSession();
  this.bindEventListeners();
  this.initializeChat();
  this.checkExtensionData(); // ← NEW
}
```

**What it does**: Checks for extension data immediately after setup.

---

### 6. Extension Data Processing

```javascript
// app.js
async checkExtensionData() {
  if (!window.extensionData) return;

  const { text, storageId, sourceUrl } = window.extensionData;

  // Get text from URL or storage
  let recipeText = text || await this.fetchFromExtension(storageId);

  // Extract recipe
  const recipe = await this.extractRecipeFromText(recipeText, sourceUrl);

  // Store and display
  this.currentRecipe = recipe;
  this.displayRecipePreview();
  this.goToStage('preview');

  // Clean up URL
  window.history.replaceState({}, '', window.location.pathname);
}
```

**What it does**: Processes extension data and auto-extracts recipe.

---

## Data Format Examples

### Small Content (URL Parameters)

```
file:///D:/Baratie/index.html
  ?recipe_text=Chocolate%20Chip%20Cookies%0A%0AIngredients%3A%0A...
  &source_url=https%3A%2F%2Fexample.com%2Frecipe
```

### Large Content (Storage)

```
file:///D:/Baratie/index.html
  ?recipe_storage_id=recipe_1730300123456
  &source_url=https%3A%2F%2Fexample.com%2Frecipe
```

Storage contains:
```javascript
{
  "recipe_1730300123456": "Very long recipe text with 2000+ characters..."
}
```

---

## Timeline (Typical Capture)

```
0ms   - User clicks extension icon
50ms  - Popup opens and renders
100ms - Content script responds with text
150ms - Popup.js encodes data
200ms - New tab created with Baratie URL
250ms - Baratie index.html loads
300ms - Detection script runs
350ms - app.js constructor executes
400ms - checkExtensionData() called
450ms - extractRecipeFromText() sends to Gemini
5000ms - Gemini API responds (3-5 seconds typical)
5100ms - Recipe parsed and normalized
5200ms - Preview stage displayed

Total: ~5.2 seconds from click to preview
```

---

## Error Handling Flow

```
┌─────────────────────────┐
│ Capture fails?          │
│ - No text selected      │
│ - Content script error  │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Show error in popup:    │
│ "Please select text"    │
└─────────────────────────┘

┌─────────────────────────┐
│ Baratie opens but no    │
│ extension data?         │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Normal flow:            │
│ Show Stage 1 (URL input)│
└─────────────────────────┘

┌─────────────────────────┐
│ Gemini API fails?       │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Show error:             │
│ "Could not extract      │
│  valid recipe"          │
└─────────────────────────┘
```

---

## Security & Privacy

### What Gets Transmitted

1. **To Extension Storage**: Captured text only (temporary, 60s max)
2. **To Baratie**: Text + source URL via query params
3. **To Gemini API**: Text content for extraction (Google's servers)
4. **Nowhere Else**: No tracking, no analytics, no third-party services

### What's Stored

- **Temporarily**: chrome.storage.local for large content (auto-deleted)
- **Persistently**: sessionStorage in Baratie (24hr, local only)
- **Never**: User browsing history, personal data, credentials

---

## Browser Compatibility

### Chrome/Edge (✅ Fully Supported)
- Manifest V3: ✅
- chrome.* APIs: ✅
- File URL access: ✅ (with permission)

### Firefox (⚠️ Requires Modification)
- Manifest V3: ✅ (supported since Firefox 109)
- browser.* APIs: Need polyfill
- File URL access: Different permission model

### Safari (❌ Not Compatible)
- Uses different extension format (.appex)
- Requires complete rewrite

---

## Performance Characteristics

### Memory Usage
- Content script: ~1-2 MB per tab
- Popup: ~3-5 MB when open
- Background worker: ~2-3 MB persistent
- Total: <10 MB typical

### CPU Usage
- Content script: Negligible (event listeners only)
- Popup: <1% when capturing
- Background worker: <1% idle, <5% during capture

### Network Usage
- Extension → Baratie: No network (local file)
- Baratie → Gemini: ~5-10 KB per API call
- Total: Depends on Gemini usage

---

**For complete documentation, see [README_EXTENSION.md](../docs/README_EXTENSION.md)**
