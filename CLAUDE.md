# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baratie is a React/TypeScript web application that transforms recipe URLs, images, and PDFs into interactive cooking guides using Google's Gemini API. The app features a chat-based interface with multi-stage workflow and intelligent recipe extraction from various sources including YouTube videos with linked recipes.

## Running the Application

**Development:**
```bash
yarn install          # Install dependencies
yarn dev             # Run Vite dev server only (frontend at http://localhost:5173)
yarn dev:api         # Run Vercel dev server only (API at http://localhost:3000)
yarn dev:all         # Run both frontend and API concurrently (recommended)
```

**Important:** When developing with file uploads or API features, use `yarn dev:all` to run both the frontend and the Vercel serverless functions locally.

**Build and Deploy:**
```bash
yarn build           # TypeScript compilation + Vite build
yarn preview         # Preview production build locally
yarn lint            # Run ESLint
```

**First-time setup:**
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

### Recipe Extraction Pipeline

**1. Client-Side (`src/utils/api.ts`):**
- `extractRecipeFromURL()`: Sends URL to Gemini API
- `extractRecipeFromFiles()`: Converts files to base64, sends to Gemini API
- `modifyRecipe()`: Sends current recipe + modification request to Gemini
- `answerQuestion()`: Asks questions about cooking/recipes

**2. Server-Side (`api/gemini.js`):**

The Gemini serverless function handles multiple input types:

**URL Processing:**
- Detects YouTube URLs using regex and extracts video ID
- For YouTube: Fetches video metadata, scans description for recipe links, attempts to fetch linked recipe sites
- For regular URLs: Fetches HTML, runs `extractRecipeContent()` to scrape recipe
- Extracts JSON-LD structured data (Schema.org Recipe) when available
- Falls back to HTML scraping with intelligent selectors

**Recipe Parsing:**
- Gemini returns JSON with `{ title, ingredients[], instructions[] }`
- **Critical filtering:** Instructions are filtered to remove section headings (e.g., "To Make the Chicken Rice", "Process")
- Ingredients are aggressively filtered to remove instruction-like content using regex patterns
- Supports both numbered instructions and bullet points
- Combines content from multiple recipe sections

**Important Filters (lines 358-409, 636-687):**
- Removes lines starting with cooking verbs (add, mix, heat, cook, etc.)
- Removes lines with multiple action verbs (indicates instruction, not ingredient)
- Removes very long lines (>120 chars for ingredients)
- Removes lines with instruction patterns ("till", "until", "mix well", "turn brown", etc.)
- Filters out section headers ("For Marination:", "Process:", etc.)

### Recipe Data Structure

```typescript
interface Recipe {
  title: string;
  ingredients: string[] | RecipeSection[];  // Flat array or sections with titles
  instructions: string[] | RecipeSection[]; // Flat array or sections with titles
  prepTime?: string;
  cookTime?: string;
  nutrition?: NutritionInfo;
  changesDescription?: string;  // Added during modifications
}
```

The app supports both flat arrays and sectioned recipes, but serverless functions normalize to flat arrays.

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

### Vercel Deployment

**Serverless Functions (max 30s execution):**
- `api/gemini.js`: Handles all recipe extraction, modification, and Q&A
- Configured in `vercel.json` with CORS headers and rewrites

**Environment:**
- API keys stored as Vercel environment variables
- Never exposed to client
- Functions proxy requests to Gemini API

## Key Technologies

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server (port 5173)
- **Framer Motion**: Animations throughout (hero, chat, cooking guide)
- **Vercel**: Serverless functions for API proxy
- **Tailwind CSS**: Utility-first styling
- **Embla Carousel**: Carousel for image previews

## Development Patterns

**When modifying recipe extraction:**
1. Check both JSON parsing path (lines 350-467) and text fallback path (lines 473-520) in `api/gemini.js`
2. Update ingredient/instruction filters in both locations
3. Test with various recipe sources (YouTube, recipe blogs, images)
4. Check server logs for filtering behavior (console.log statements added)

**When adding new features:**
- Update `RecipeContext` for new state
- Update `types/index.ts` for TypeScript types
- Consider which stage the feature belongs to
- Add appropriate message handling in `extractRecipe()`

**When debugging API issues:**
- Check Vercel function logs for detailed console output
- Gemini API responses are logged with first 1000 chars
- Ingredient/instruction filtering is logged with before/after counts
- Final recipe structure is logged before returning

## Common Issues

**"API endpoint not accessible" error:**
- Running `yarn dev` only starts Vite, not the API server
- Solution: Use `yarn dev:all` or run `vercel dev` in separate terminal

**Instructions appearing in ingredients:**
- Check the regex filters in `api/gemini.js` (lines 376-406)
- Gemini may return malformed JSON - filters catch most cases
- Add new action verbs or patterns to filter lists

**Empty instructions after extraction:**
- Check if filters are too aggressive (console logs show what's filtered)
- Section headings may be incorrectly identified as instructions
- Adjust heading detection patterns (lines 431-440)
