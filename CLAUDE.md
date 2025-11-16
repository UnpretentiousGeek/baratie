# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baratie is a React/TypeScript web application that transforms recipe URLs, images, PDFs, and text into interactive cooking guides using Google's Gemini API. The app features a chat-based interface with multi-stage workflow and intelligent recipe extraction from various sources including YouTube videos with linked recipes.

**Key capabilities:**
- Extract recipes from URLs (including YouTube videos)
- Extract recipes from images (JPEG, PNG, GIF, WebP) and PDFs
- Extract recipes from selected text via browser extensions
- Interactive chat interface for recipe modifications and cooking questions
- Step-by-step cooking guide with timer support
- Cross-browser extensions for Chrome/Edge and Firefox

## Running the Application

### Development

```bash
yarn install          # Install dependencies
yarn dev             # Run Vite dev server only (frontend at http://localhost:5173)
yarn dev:api         # Run Vercel dev server only (API at http://localhost:3000)
yarn dev:all         # Run both frontend and API concurrently (recommended)
```

**Important:** When developing with file uploads or API features, use `yarn dev:all` to run both the frontend and the Vercel serverless functions locally.

### Build and Deploy

```bash
yarn build           # TypeScript compilation + Vite build
yarn preview         # Preview production build locally
yarn lint            # Run ESLint
```

### First-time Setup

1. Get a Gemini API key from https://makersuite.google.com/app/apikey
2. Get a YouTube Data API v3 key from Google Cloud Console
3. Create `.env` file with:
   ```
   VITE_GEMINI_API_ENDPOINT=/api/gemini
   VITE_YOUTUBE_API_ENDPOINT=/api/youtube
   ```
4. For local development with Vercel functions, create `.env.local` or use `vercel env pull`
5. Set these environment variables in Vercel dashboard for production:
   - `GEMINI_API_KEY`
   - `YOUTUBE_API_KEY`

## Architecture

### Application Flow & Stage Management

The app uses a state machine with four stages managed by `RecipeContext`:

1. **capture** - Initial landing page where users input URLs, attach files, or paste links
2. **preview** - Chat-based interface showing extracted recipe with ability to ask questions or modify
3. **cooking** - Step-by-step interactive cooking guide
4. **complete** - Completion screen after cooking is done

The `Hero.tsx` component conditionally renders different UIs based on `currentStage`:
- `capture`: Shows hero section with `ChatInput`
- `preview`: Shows chat messages with `Message` components and chat-mode `ChatInput`
- `cooking`: Shows `CookingGuide` component
- `complete`: Shows completion screen with options to view recipe or start new one

### State Management (RecipeContext)

**Critical Context State:**
- `attachedFiles`: Array of files to be processed (cleared after extraction)
- `recipe`: The extracted recipe object (ingredients, instructions, metadata)
- `currentStage`: Current app stage
- `messages`: Chat message history (user messages, system responses, recipe previews)

**Key Methods:**
- `extractRecipe(prompt)`: Main orchestration method that:
  - Detects if input is a URL, question, or modification request
  - Routes to appropriate API call (`extractRecipeFromURL`, `modifyRecipe`, `answerQuestion`)
  - Manages message history and stage transitions
  - Clears attached files after successful extraction
- `addFiles(files)`: Processes and adds files to attachedFiles array
- `clearFiles()`: Removes files and revokes preview URLs
- `addMessage(message)`: Adds message to chat history
- `setCurrentStage(stage)`: Transitions between app stages

**Question vs Modification Detection (RecipeContext.tsx:87-98):**
- **Questions**: Start with question words (how, what, when, etc.) or end with `?` → calls `answerQuestion()`
- **Modifications**: Contains action keywords (make, change, adjust, etc.) → calls `modifyRecipe()`
- **New recipes**: Contains URL or has attached files → calls `extractRecipeFromURL()` or `extractRecipeFromFiles()`

### Recipe Extraction Pipeline

**1. Client-Side (`src/utils/api.ts`):**
- `extractRecipeFromURL()`: Sends URL to Gemini API endpoint
- `extractRecipeFromFiles()`: Converts files to base64, sends to Gemini API endpoint
- `modifyRecipe()`: Sends current recipe + modification request to Gemini
- `answerQuestion()`: Asks questions about cooking/recipes
- `fetchYouTubeMetadata()`: Fetches video details and comments from YouTube API

**2. Server-Side (`api/gemini.js`):**

The Gemini serverless function handles multiple input types and processing modes:

**URL Processing:**
- Detects YouTube URLs using regex and extracts video ID
- For YouTube:
  - Fetches video metadata via YouTube API proxy (`api/youtube.js`)
  - Scans video description for recipe links
  - Attempts to fetch and extract from linked recipe sites
  - Falls back to description text if no links found
- For regular URLs:
  - Fetches HTML content
  - Runs `extractRecipeContent()` to scrape recipe data
  - Extracts JSON-LD structured data (Schema.org Recipe) when available
  - Falls back to HTML scraping with intelligent selectors

**Recipe Parsing:**
- Gemini returns JSON with `{ title, ingredients[], instructions[], servings?, prepTime?, cookTime?, nutrition? }`
- **Critical filtering:** Instructions are filtered to remove section headings (e.g., "To Make the Chicken Rice", "Process")
- Ingredients are aggressively filtered to remove instruction-like content using regex patterns
- Supports both numbered instructions and bullet points
- Combines content from multiple recipe sections

**Important Filters (api/gemini.js:358-409, 636-687):**
- Removes lines starting with cooking verbs (add, mix, heat, cook, etc.)
- Removes lines with multiple action verbs (indicates instruction, not ingredient)
- Removes very long lines (>120 chars for ingredients)
- Removes lines with instruction patterns ("till", "until", "mix well", "turn brown", etc.)
- Filters out section headers ("For Marination:", "Process:", etc.)
- Normalizes numbering and bullet points

**3. YouTube API Proxy (`api/youtube.js`):**

Serverless function that securely proxies requests to YouTube Data API v3:
- Accepts POST requests with `{ endpoint, params }`
- Whitelisted endpoints: `videos`, `commentThreads`
- Adds API key from environment variables
- Returns video metadata, descriptions, and comments
- Used for extracting recipe links from YouTube video descriptions

### Recipe Data Structure

```typescript
interface Recipe {
  title: string;
  ingredients: string[] | RecipeSection[];  // Flat array or sections with titles
  instructions: string[] | RecipeSection[]; // Flat array or sections with titles
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  nutrition?: NutritionInfo;
  changesDescription?: string;  // Added during modifications
}

interface RecipeSection {
  title: string;
  items: string[];
}

interface NutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}
```

The app supports both flat arrays and sectioned recipes. Serverless functions normalize to flat arrays, while the frontend can display both formats.

**Recipe Utility Functions (`src/utils/recipeUtils.ts`):**
- `normalizeIngredients()`: Flattens sectioned ingredients to string array
- `normalizeInstructions()`: Flattens sectioned instructions to string array
- `getIngredientSections()`: Returns sections if present, null otherwise
- `getInstructionSections()`: Returns sections if present, null otherwise

### File Processing

**Supported formats:**
- Images: JPEG, JPG, PNG, GIF, WebP (max 10MB each)
- Documents: PDF (max 10MB)

**Processing flow (`src/utils/recipeManager.ts`):**
1. Validates file type and size
2. Converts to base64 using FileReader
3. Creates preview URLs for images using `URL.createObjectURL()`
4. Cleanup: Preview URLs are revoked when files are removed or recipe is extracted

### Chat System

**Message Types:**
- `user`: User input with optional attached files
- `system`: System responses (errors, confirmations, answers)
- `recipe-preview`: Special message type that renders recipe card with "Start Cooking" button

The chat system intelligently detects:
- **Questions** (starts with question words or ends with ?) → calls `answerQuestion()`
- **Modifications** (contains keywords like "make", "change", "adjust") → calls `modifyRecipe()`
- **New recipes** (contains URL or has attached files) → calls `extractRecipeFromURL()` or `extractRecipeFromFiles()`

### Browser Extensions

Baratie includes cross-browser compatible extensions for Chrome/Edge (Manifest V3) and Firefox (Manifest V2).

**Extension Features:**
- Capture selected recipe text from any webpage
- Send recipe URLs directly to Baratie
- Right-click context menu integration
- Extension popup for manual capture
- Smart storage handling for large recipes (>8KB)
- Configurable Baratie URL (local or deployed)

**Extension Architecture:**

1. **Content Script** (`content-script.js`):
   - Runs on all webpages
   - Tracks text selection (mouse and keyboard)
   - Extracts main content from page (filters nav, footer, ads)
   - Attempts to extract JSON-LD structured recipe data
   - Responds to messages from popup

2. **Background Script** (`background.js`):
   - Handles context menu creation and clicks
   - Manages storage for large recipe text
   - Communicates with Baratie web app
   - Shows notifications
   - Cleans up old storage entries
   - Cross-browser compatibility layer (Chrome vs Firefox APIs)

3. **Popup** (`popup.js`, `popup.html`):
   - Manual capture interface
   - Auto-detects text selection
   - Shows preview of captured text
   - Settings for Baratie URL configuration
   - Handles two transfer methods:
     - URL parameters for small content (<1500 chars)
     - Storage API for large content (>1500 chars)

**URL Parameters for Extension Integration:**

The web app accepts these URL parameters:
- `recipe_text`: URL-encoded recipe text (for small recipes)
- `recipe_storage_id`: Storage ID for retrieving large recipes
- `recipe_url`: URL to extract recipe from
- `source_url`: Original page URL (for reference)

**Extension Installation:**

Chrome/Edge:
```
1. Open chrome://extensions or edge://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select chrome-extension folder
5. Enable "Allow access to file URLs"
```

Firefox:
```
1. Open about:debugging
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select firefox-extension/manifest.json
```

### Vercel Deployment

**Serverless Functions (max 30s execution):**
- `api/gemini.js`: Handles all recipe extraction, modification, and Q&A
- `api/youtube.js`: Proxies requests to YouTube Data API v3
- Configured in `vercel.json` with CORS headers and rewrites

**Security Headers (`vercel.json`):**
- CORS enabled for API endpoints (Access-Control-Allow-Origin: *)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

**Environment:**
- API keys stored as Vercel environment variables (`GEMINI_API_KEY`, `YOUTUBE_API_KEY`)
- Never exposed to client
- Functions proxy requests to external APIs

**Deployment Process:**
```bash
vercel                # Deploy to preview
vercel --prod        # Deploy to production
vercel env pull      # Pull environment variables
```

## Project Structure

```
baratie/
├── api/                          # Vercel serverless functions
│   ├── gemini.js                # Recipe extraction, Q&A, modifications
│   └── youtube.js               # YouTube API proxy
├── chrome-extension/            # Chrome/Edge Manifest V3 extension
│   ├── background.js            # Service worker
│   ├── content-script.js        # Page content access
│   ├── popup.js                 # Popup interface
│   ├── popup.html               # Popup UI
│   ├── manifest.json            # Manifest V3 config
│   └── styles/                  # Extension styles
├── firefox-extension/           # Firefox Manifest V2 extension
│   ├── background.js            # Background script
│   ├── content-script.js        # Page content access
│   ├── popup.js                 # Popup interface
│   ├── popup.html               # Popup UI
│   ├── manifest.json            # Manifest V2 config
│   └── styles/                  # Extension styles
├── src/
│   ├── components/              # React components
│   │   ├── AttachedFiles.tsx    # File preview carousel
│   │   ├── BackgroundBlobs.tsx  # Animated background
│   │   ├── ChatInput.tsx        # Input field with file upload
│   │   ├── CookingGuide.tsx     # Step-by-step cooking interface
│   │   ├── Header.tsx           # App header
│   │   ├── Hero.tsx             # Main stage controller
│   │   ├── Message.tsx          # Chat message component
│   │   ├── SentAttachedFiles.tsx # Sent files display
│   │   ├── ImageOverlay.tsx     # Image lightbox
│   │   ├── icons/               # Icon components
│   │   └── ui/                  # UI primitives (button, card, carousel)
│   ├── context/
│   │   └── RecipeContext.tsx    # Global state management
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── api.ts               # API client functions
│   │   ├── recipeManager.ts     # File processing utilities
│   │   └── recipeUtils.ts       # Recipe data normalization
│   ├── lib/
│   │   └── utils.ts             # General utilities (cn helper)
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── public/                      # Static assets
├── vercel.json                  # Vercel configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

## Key Technologies

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server (port 5173)
- **Framer Motion**: Animations throughout (hero, chat, cooking guide)
- **Vercel**: Serverless functions for API proxy and deployment
- **Tailwind CSS**: Utility-first styling (v4.1.17)
- **Embla Carousel**: Carousel for image previews
- **Radix UI**: Accessible UI primitives
- **Lucide React**: Icon library
- **Google Gemini API**: AI-powered recipe extraction and Q&A
- **YouTube Data API v3**: Video metadata and description fetching

## Development Patterns

### When modifying recipe extraction:

1. Check both JSON parsing path (lines 350-467) and text fallback path (lines 473-520) in `api/gemini.js`
2. Update ingredient/instruction filters in both locations
3. Test with various recipe sources (YouTube, recipe blogs, images, PDFs)
4. Check server logs for filtering behavior (console.log statements added)
5. Test with extension-captured text (both small and large recipes)

### When adding new features:

- Update `RecipeContext` for new state
- Update `types/index.ts` for TypeScript types
- Consider which stage the feature belongs to
- Add appropriate message handling in `extractRecipe()`
- If adding API functionality, consider if it needs to be in serverless functions
- Update CLAUDE.md with new patterns and conventions

### When working with browser extensions:

- Both Chrome and Firefox extensions share the same JavaScript code
- Use `browserAPI` variable for cross-browser compatibility: `const browserAPI = typeof browser !== 'undefined' ? browser : chrome;`
- Test both Promise-based (Firefox) and callback-based (Chrome) API patterns
- Update both `chrome-extension` and `firefox-extension` folders when making changes
- Test with both small (<1500 chars) and large (>1500 chars) recipe text
- Verify URL parameter parsing in `Hero.tsx` when changing URL format

### When debugging API issues:

- Check Vercel function logs for detailed console output
- Gemini API responses are logged with first 1000 chars
- Ingredient/instruction filtering is logged with before/after counts
- Final recipe structure is logged before returning
- Test YouTube API proxy separately: POST to `/api/youtube` with `{ endpoint: 'videos', params: { id: 'VIDEO_ID', part: 'snippet' } }`

### Code Style Conventions:

- Use functional components with hooks (no class components)
- Use TypeScript for all new code
- Follow existing file naming: PascalCase for components, camelCase for utilities
- Use Tailwind CSS classes for styling (avoid custom CSS when possible)
- Use Framer Motion for animations
- Keep components small and focused (extract sub-components when needed)
- Use `useCallback` for functions passed as props
- Clean up resources (URL.revokeObjectURL, event listeners, etc.)

## Common Issues

### "API endpoint not accessible" error:
- Running `yarn dev` only starts Vite, not the API server
- Solution: Use `yarn dev:all` or run `vercel dev` in separate terminal

### Instructions appearing in ingredients:
- Check the regex filters in `api/gemini.js` (lines 376-406, 636-687)
- Gemini may return malformed JSON - filters catch most cases
- Add new action verbs or patterns to filter lists
- Test with the specific problematic recipe source

### Empty instructions after extraction:
- Check if filters are too aggressive (console logs show what's filtered)
- Section headings may be incorrectly identified as instructions
- Adjust heading detection patterns (lines 431-440)
- Verify Gemini API response format in logs

### Browser extension not working:
- **Chrome/Edge**: Ensure "Developer mode" enabled and "Allow access to file URLs" checked
- **Firefox**: Load as temporary add-on (not persistent across browser restarts)
- Check console logs in extension background page for errors
- Verify Baratie URL in extension settings matches your deployment
- Test content script injection by checking for "Baratie Recipe Capture: Content script loaded" in page console

### YouTube recipe extraction failing:
- Verify `YOUTUBE_API_KEY` is set in Vercel environment variables
- Check YouTube API quota limits (10,000 units/day default)
- Test YouTube API proxy directly: `/api/youtube` endpoint
- Verify video has recipe links in description (check `api/gemini.js` logs)

### Large recipes not transferring from extension:
- Extension uses storage API for recipes >1500 chars
- Verify storage permissions in manifest.json
- Check background script logs for storage operations
- Storage entries expire after 60 seconds

### CORS errors in development:
- Ensure `vercel.json` has correct CORS headers
- Use `yarn dev:all` to run both frontend and API on same origin
- Check browser console for specific CORS policy violations

## Testing Checklist

When making changes, test these scenarios:

**Recipe Extraction:**
- [ ] URL extraction (regular recipe site)
- [ ] YouTube video with recipe link in description
- [ ] Image file upload (JPEG, PNG)
- [ ] PDF file upload
- [ ] Extension text capture (small <1500 chars)
- [ ] Extension text capture (large >1500 chars)
- [ ] Extension URL capture

**Chat Interactions:**
- [ ] Ask question about recipe (should NOT modify recipe)
- [ ] Request modification (should update recipe)
- [ ] Submit new URL/file (should create new recipe)

**Cooking Guide:**
- [ ] Navigate through steps
- [ ] Mark steps as complete
- [ ] Return to recipe preview
- [ ] Complete cooking flow

**Cross-browser:**
- [ ] Chrome extension functionality
- [ ] Firefox extension functionality
- [ ] Mobile responsive design

## Environment Variables Reference

**Frontend (`.env`):**
```
VITE_GEMINI_API_ENDPOINT=/api/gemini
VITE_YOUTUBE_API_ENDPOINT=/api/youtube
```

**Backend (Vercel dashboard or `.env.local`):**
```
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**Note:** Never commit API keys to version control. Use Vercel environment variables for production.

## Additional Resources

- Main README: `README.md`
- Extension guides: `chrome-extension/README.md`, `firefox-extension/README.md`
- Deployment guide: `DEPLOYMENT.md`
- Gemini API: https://ai.google.dev/docs
- YouTube Data API: https://developers.google.com/youtube/v3
- Vercel Functions: https://vercel.com/docs/functions
