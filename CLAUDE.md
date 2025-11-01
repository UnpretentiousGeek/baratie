# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baratie is a pure client-side web application (no build process, no frameworks) that transforms online recipe URLs into interactive cooking guides using Google's Gemini API. The app has three distinct stages: URL capture, recipe preview, and guided cooking interface.

## Running the Application

**No build process required.** Simply open `index.html` in a web browser.

**First-time setup:**
1. Get a Gemini API key from https://makersuite.google.com/app/apikey
2. Edit `config.js` and replace `YOUR_GEMINI_API_KEY_HERE` with your actual key
3. Open `index.html` in Chrome/Firefox/Safari/Edge

**Testing recipe extraction:**
- Use recipe blog URLs (e.g., AllRecipes, Serious Eats, NYT Cooking)
- Wait 5-10 seconds for AI extraction
- Some sites may block scraping via the CORS proxy

## Architecture

### Single-Class Design
The entire application is managed by one `RecipeManager` class in `app.js`. This class handles:
- Stage navigation (capture → preview → cooking)
- Gemini API calls for extraction and chat
- Session persistence via `sessionStorage`
- Dynamic ingredient scaling
- Progress tracking

### Three-Stage Flow
1. **Stage 1 (Capture)**: User enters URL → app fetches content via CORS proxy → Gemini extracts recipe
2. **Stage 2 (Preview)**: User reviews extracted recipe data before committing
3. **Stage 3 (Cooking)**: Interactive interface with checkboxes, progress bar, serving adjuster, and chat assistant

### State Management
All state lives in the `RecipeManager` instance:
- `currentRecipe`: Full recipe object with ingredients array and instructions array
- `currentServings` vs `originalServings`: Used for scaling calculations
- `completedSteps`: Set of instruction indices that user has checked off
- `chatHistory`: Array of {role, content} messages for Gemini context
- `currentMacros`: Cached nutrition data (calories, protein, carbs, fats, fiber, etc.)

Session state persists to `sessionStorage` automatically and restores on page load (24hr expiry).

### Recipe Data Structure
```javascript
{
    isValid: boolean,
    title: string,
    source: string,
    servings: number,
    ingredients: [
        {
            text: "full text",
            amount: number | null,
            unit: string,
            name: string
        }
    ],
    instructions: ["step 1", "step 2", ...]
}
```

## API Integrations

### Recipe Extraction (`extractRecipeFromURL()`)

**For regular websites:**
1. Fetches URL content via AllOrigins CORS proxy (`https://api.allorigins.win`)
2. Strips HTML, extracts text content (limited to 15k chars)
3. Sends to Gemini with structured JSON prompt
4. Parses response and validates recipe structure
5. Handles errors by returning `{isValid: false}`

**For YouTube videos:**
1. Detects YouTube URL via `isYouTubeURL()`
2. Extracts video ID via `extractYouTubeVideoId()` (handles youtube.com, youtu.be, shorts, embeds)
3. Checks if Short with sparse description (remix detection):
   - `isDescriptionSparse()` - Checks length and recipe keywords
   - `extractSourceVideoId()` - Finds source video link in description
   - If found, fetches source video instead (cascading fallback)
4. Parallel API calls:
   - `fetchYouTubeVideoDetails()` - Gets title, description, channel
   - `fetchYouTubePinnedComment()` - Gets pinned/top comment
5. Uses `extractRecipeFromYouTubeData()` - Reusable extraction logic
6. Combines description + pinned comment text
7. Sends combined content to Gemini for recipe extraction
8. Returns structured recipe with video title

**YouTube Shorts Remix Fallback:**
- Automatically detects remix Shorts with sparse descriptions
- Falls back to source video if link found in description
- Uses 4 quota units (Short + source video)
- Marks recipe title as "(from full video)"
- Gracefully degrades if source not found or extraction fails

**YouTube API Configuration:**
- Requires YouTube Data API v3 key in `config.js`
- Standard videos: 2 quota units (1 for video, 1 for comments)
- Remix Shorts: 4 quota units (Short + source, both with comments)
- Free tier: 10,000 units/day = ~5,000 standard or ~2,500 remix recipes/day
- Setup guide: See [docs/YOUTUBE_SETUP.md](docs/YOUTUBE_SETUP.md)

**Key prompt requirement**: Must request JSON response without markdown code blocks.

### Chat Assistant (`getChatResponse()`)
1. Builds context string with indexed ingredients [0], [1], etc.
2. Includes last 6 messages from `chatHistory`
3. Sends to Gemini with interactive cooking assistant prompt
4. Parses ACTION commands from AI response
5. Executes recipe modifications (servings, substitutions)
6. Returns conversational text response (ACTION lines removed)

**Interactive Action System:**
The chat can modify recipes in real-time using special commands:
- `ACTION:SET_SERVINGS:X` - Changes recipe to X servings
- `ACTION:SUBSTITUTE_INGREDIENT:INDEX:NEW_TEXT` - Replaces ingredient at INDEX

Example: User says "make it for 6 people" → Gemini responds with `ACTION:SET_SERVINGS:6` + explanation → `processRecipeActions()` executes change → Green confirmation message appears.

**Two separate Gemini methods:**
- `callGeminiAPI()`: For structured extraction (expects JSON)
- `callGeminiAPIForChat()`: For conversational responses (expects text with optional ACTIONs)

### API Configuration

**Gemini AI:**
- Stored in `config.js` (never commit with real API key)
- Default model: `gemini-1.5-flash` (fast, 15 req/min free tier)
- Alternative: `gemini-1.5-pro` (higher quality, 2 req/min)
- Get key: https://makersuite.google.com/app/apikey

**YouTube Data API v3:**
- Also stored in `config.js`
- Free tier: 10,000 units/day (~5,000 recipes/day)
- Setup: See [docs/YOUTUBE_SETUP.md](docs/YOUTUBE_SETUP.md)
- Get key: https://console.cloud.google.com/apis/credentials
- Enable API: https://console.cloud.google.com/apis/library/youtube.googleapis.com

## Dynamic Scaling Algorithm

When user changes servings:
1. Calculate `scaleFactor = currentServings / originalServings`
2. For each ingredient with an `amount`, multiply by scale factor
3. Format numbers nicely with `formatAmount()` (converts decimals to fractions like ½, ¼, ⅓)
4. Ingredients with `amount: null` (like "salt to taste") remain unchanged

**Important**: Original recipe data never changes; scaling is applied during display only.

## CSS Architecture

All colors use CSS custom properties in `:root`. The app uses a gradient background with white card containers for each stage.

**Stage visibility:** Only one `.stage` element has `.active` class at a time. JavaScript toggles this class to switch between stages.

**Responsive breakpoints:**
- `@media (max-width: 768px)`: Tablet adjustments
- `@media (max-width: 480px)`: Mobile adjustments

**Fixed chat assistant:** Positioned `position: fixed` bottom-right with minimize/expand toggle.

## CORS Proxy Consideration

The app uses AllOrigins to bypass browser CORS restrictions. If this proxy is slow/down, alternatives can be swapped in `fetchURLContent()` around line 195:
- CORS Anywhere: `https://cors-anywhere.herokuapp.com/`
- ThingProxy: `https://thingproxy.freeboard.io/fetch/`
- Custom backend proxy (recommended for production)

## PDF Generation

The app uses **jsPDF** library (loaded from CDN) to generate formatted PDF files:
- Color-coded sections (title in orange, headers in dark gray)
- Automatic page breaks for long recipes
- Proper text wrapping for long ingredients/instructions
- Footer on every page
- Falls back to text file if PDF generation fails

**Method**: `downloadPDF()` around line 859
**Fallback**: `downloadAsText()` for backwards compatibility

## Common Modifications

**Change AI model**: Edit `GEMINI_MODEL` in `config.js`

**Adjust ingredient scaling logic**: See `scaleIngredient()` and `formatAmount()` methods

**Modify extraction prompt**: Update the template literal in `extractRecipeFromURL()` around line 140

**Change chat behavior**: Update the system prompt in `getChatResponse()` around line 676 (includes ACTION system instructions)

**Add new ACTION types**: Extend `processRecipeActions()` to handle new commands

**Alternative CORS proxy**: Update `proxyUrl` in `fetchURLContent()` around line 195

## File Dependencies

Load order matters:
1. jsPDF library (from CDN)
2. `config.js` (defines CONFIG global)
3. `app.js` (references CONFIG and jsPDF)

HTML must include all scripts in correct order (see `index.html` lines 148-152).

## Session Persistence

On every state change (step completion, serving adjustment, recipe load), the app calls `saveSession()` which writes to `sessionStorage['baratie_session']`.

On page load, `restoreSession()` checks for valid session data (< 24hrs old) and automatically jumps to cooking stage if found.

**Session includes:**
- Complete recipe object
- Current vs original servings
- Array of completed step indices
- Cached macros data (if calculated)
- Timestamp

## Nutrition & Macros Tab

The app includes a tabbed interface in the cooking stage allowing users to switch between Recipe view and Nutrition view.

### Tab Switching
- **Recipe Tab**: Default view with ingredients and instructions
- **Nutrition Tab**: Shows AI-calculated nutritional information
- Tabs managed via `switchTab(tabName)` method (app.js line 968)

### Macros Calculation
**Method**: `calculateMacros()` (app.js line 991)
- Triggered when user first switches to Nutrition tab
- Also recalculates when:
  - Servings are adjusted
  - Ingredients are substituted via chat assistant
- Uses Gemini API with nutrition expert prompt
- Returns per-serving values: calories, protein, carbs, fats, fiber, sodium, sugar, cholesterol

**Display**: `displayMacros(macros)` (app.js line 1077)
- Calories shown in large gradient circle
- Macronutrients (protein, carbs, fats) with gram amounts and percentages
- Fiber and additional nutrients (sodium, sugar, cholesterol)

### Automatic Recalculation
- `setServings()` checks if macros exist and recalculates (line 1123)
- `processRecipeActions()` recalculates after ingredient substitutions (line 1408)

### UI States
- **Loading**: Spinner shown while Gemini calculates
- **Success**: Full nutrition breakdown displayed
- **Error**: Error message with recalculate button

See [docs/MACROS_FEATURE.md](docs/MACROS_FEATURE.md) for complete documentation.

## Known Limitations

- Video recipes (YouTube/TikTok) require transcript extraction (not implemented)
- Some websites block scraping entirely
- CORS proxy can be slow/unreliable
- API key is visible client-side (not secure for production)
- No backend means no recipe caching or user accounts
- Nutrition values are AI estimates, not lab-tested facts
