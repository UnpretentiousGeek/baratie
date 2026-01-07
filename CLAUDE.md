# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baratie is a React/TypeScript web application that transforms recipe URLs, images, and PDFs into interactive cooking guides using Google's Gemini API (via OpenAI-compatible endpoint). The app features a chat-based interface with multi-stage workflow, intelligent recipe extraction from various sources including YouTube videos, recipe suggestions by ingredients, and nutrition calculation.

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
3. **cooking** - Split-screen layout with chat interface on left and step-by-step cooking guide on right
4. **complete** - Completion screen after cooking is done

The `Hero.tsx` component conditionally renders different UIs based on `currentStage`:
- `capture`: Shows hero section with `ChatInput` (mobile shows unsupported message)
- `preview`: Shows chat messages with `Message` components and chat-mode `ChatInput`
- `cooking`: Shows split layout - `ChatInput` + messages on left, `CookingGuide` on right
- `complete`: Shows completion screen with options to view recipe or start new one

### State Management (RecipeContext)

**Critical Context State:**
- `attachedFiles`: Array of files to be processed (cleared after extraction)
- `recipe`: The extracted recipe object (ingredients, instructions, metadata)
- `currentStage`: Current app stage
- `messages`: Chat message history (user messages, system responses, recipe previews, suggestions)
- `isCalculatingNutrition`: Boolean flag for nutrition loading state

**Key Methods:**
- `extractRecipe(prompt)`: Main orchestration method that:
  - Uses `determineIntent()` to classify input (extract, suggest, question, modify)
  - Routes to appropriate API call
  - Manages message history and stage transitions
  - Clears attached files after successful extraction
- `selectSuggestion(recipe)`: Generates full recipe from a suggestion
- `addFiles(files)` / `removeFile(index)` / `clearFiles()`: File management
- `setStage(stage)` / `setRecipe(recipe)`: State setters
- `addMessage(message)` / `clearMessages()`: Message management

### Recipe Extraction Pipeline

**1. Client-Side (`src/utils/api.ts`):**
- `determineIntent()`: Classifies user input as extract_recipe, suggest_recipes, answer_question, or modify_recipe
- `extractRecipeFromURL()`: Sends URL to API for processing
- `extractRecipeFromFiles()`: Converts files to base64, sends to API
- `extractRecipeFromText()`: Extracts recipe from pasted text
- `modifyRecipe()`: Sends current recipe + modification request
- `answerQuestion()`: Asks questions about cooking/recipes
- `suggestRecipes()`: Gets recipe suggestions based on ingredients/preferences
- `calculateNutrition()`: Calculates nutritional info for a recipe
- `generateRecipe()`: Generates full recipe from a title/context

**2. Server-Side API Endpoints:**

**`api/openai.js`** - Main API (OpenAI-compatible interface to Gemini):
- Handles all recipe extraction, modification, suggestions, and Q&A
- Uses modular agent system for specialized tasks

**`api/gemini.js`** - Direct Gemini API handler:
- URL Processing: Detects YouTube URLs, fetches video metadata, scans for recipe links
- Recipe Parsing: Returns JSON with `{ title, ingredients[], instructions[] }`
- Filters section headings and instruction-like content from ingredients

**`api/youtube.js`** - YouTube Data API proxy:
- Fetches video metadata for recipe extraction

**3. Agent Modules (`api/agents/`):**
- `imageOCR.js`: Extracts and validates images, identifies ingredients
- `nutritionCalculation.js`: Calculates nutritional information
- `sectionDetection.js`: Detects recipe sections from text
- `youtubeComments.js`: Extracts pinned comments that may contain recipes

### Recipe Data Structure

```typescript
interface Recipe {
  title: string;
  description?: string;     // Short description for suggestions
  ingredients: string[] | RecipeSection[];
  instructions: string[] | RecipeSection[];
  prepTime?: string;
  cookTime?: string;
  nutrition?: NutritionInfo;
  changesDescription?: string;  // Added during modifications
}

interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}
```

### File Processing

**Supported formats:**
- Images: JPEG, JPG, PNG, GIF, WebP (max 10MB each)
- Documents: PDF (max 10MB)

**Processing flow (`src/utils/recipeManager.ts`):**
1. Validates file type and size
2. Converts to base64 using FileReader
3. Creates preview URLs for images using `URL.createObjectURL()`
4. Cleanup: Preview URLs are revoked when files are removed or recipe is extracted

**PDF Export (`src/utils/pdfUtils.ts`):**
- Uses jsPDF and jspdf-autotable for recipe PDF export

### Chat System

**Message Types:**
- `user`: User input with optional attached files
- `system`: System responses (errors, confirmations, answers)
- `recipe-preview`: Special message type that renders recipe card with "Start Cooking" button
- `recipe-suggestion`: Displays multiple recipe suggestions user can choose from
- `loading`: Shows loading state during API calls

The chat system uses `determineIntent()` to intelligently detect:
- **Recipe extraction** (contains URL or has attached files)
- **Recipe suggestions** (asking for ideas, what to cook with ingredients)
- **Questions** (starts with question words or ends with ?)
- **Modifications** (contains keywords like "make", "change", "adjust")

### Components

**Core Components:**
- `Hero.tsx`: Main content area, renders different UI per stage
- `Header.tsx`: Navigation header
- `ChatInput.tsx`: Multi-purpose input with file attachment support
- `CookingGuide.tsx`: Interactive step-by-step cooking interface
- `Message.tsx`: Renders individual chat messages

**Supporting Components:**
- `AttachedFiles.tsx` / `SentAttachedFiles.tsx`: File attachment display
- `RecipeSuggestionMessage.tsx`: Displays recipe suggestion cards
- `LoadingMessage.tsx`: Loading state display
- `ImageOverlay.tsx`: Full-screen image viewer
- `TimerPopup.tsx` / `TimerCompleteModal.tsx`: Cooking timer UI
- `BackgroundBlobs.tsx`: Animated background effects
- `About.tsx`: About page

**Hooks:**
- `useTimer.ts`: Timer functionality for cooking steps

### Vercel Deployment

**Serverless Functions (max 30s execution):**
- `api/openai.js`: Main API endpoint for all operations
- `api/gemini.js`: Direct Gemini API handler
- `api/youtube.js`: YouTube data fetching
- Configured in `vercel.json` with CORS headers and rewrites

**Environment:**
- API keys stored as Vercel environment variables
- Never exposed to client
- Functions proxy requests to Gemini API

## Key Technologies

- **React 18**: UI library with React Router for navigation
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server (port 5173)
- **Framer Motion**: Animations throughout (hero, chat, cooking guide)
- **Vercel**: Serverless functions for API proxy
- **Tailwind CSS**: Utility-first styling
- **Embla Carousel**: Carousel for image previews
- **jsPDF**: PDF generation for recipe export
- **Lucide React**: Icon library
- **Vercel Analytics**: Usage analytics

## Development Patterns

**When modifying recipe extraction:**
1. Check the intent determination in `src/utils/api.ts` `determineIntent()`
2. Update the appropriate API function (`extractRecipeFromURL`, `extractRecipeFromFiles`, etc.)
3. Check corresponding handler in `api/openai.js` or `api/gemini.js`
4. Test with various recipe sources (YouTube, recipe blogs, images, pasted text)

**When adding new features:**
- Update `RecipeContext` for new state
- Update `types/index.ts` for TypeScript types
- Consider which stage the feature belongs to
- Add appropriate message handling in `extractRecipe()`

**When debugging API issues:**
- Check Vercel function logs for detailed console output
- API responses are logged with first 1000 chars
- Filter behavior is logged with before/after counts
- Final recipe structure is logged before returning

## Common Issues

**"API endpoint not accessible" error:**
- Running `yarn dev` only starts Vite, not the API server
- Solution: Use `yarn dev:all` or run `vercel dev` in separate terminal

**Instructions appearing in ingredients:**
- Check the regex filters in `api/gemini.js`
- Gemini may return malformed JSON - filters catch most cases
- Add new action verbs or patterns to filter lists

**Empty instructions after extraction:**
- Check if filters are too aggressive (console logs show what's filtered)
- Section headings may be incorrectly identified as instructions
- Adjust heading detection patterns

**Nutrition not loading:**
- Check `isCalculatingNutrition` state in RecipeContext
- Verify `calculateNutrition()` API call in `api.ts`
- Check `nutritionCalculation.js` agent for errors
