# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baratie is a React/TypeScript web application that transforms recipe URLs, images, and PDFs into interactive cooking guides using Google's Gemini API. The app is built with Vite, React, TypeScript, and Framer Motion for animations.

## Running the Application

**Development:**
1. Install dependencies: `yarn install`
2. Run dev server: `yarn dev`
3. Open http://localhost:3000

**First-time setup:**
1. Get a Gemini API key from https://makersuite.google.com/app/apikey
2. Set environment variables in `.env`:
   ```
   VITE_GEMINI_API_ENDPOINT=/api/gemini
   VITE_YOUTUBE_API_ENDPOINT=/api/youtube
   ```
3. Configure API keys in Vercel environment variables (for production)

**Build for production:**
```bash
yarn build
```

## Architecture

### React Component Structure
- **App.tsx**: Main application component with RecipeProvider
- **components/**: Reusable UI components
  - `Header.tsx`: Navigation header
  - `Hero.tsx`: Hero section with chat input
  - `ChatInput.tsx`: Chat interface with file attachment
  - `AttachedFiles.tsx`: File preview with fan/list layouts and Framer Motion animations
  - `BackgroundBlobs.tsx`: Background SVG decoration

### State Management
- **RecipeContext**: React Context API for global state management
  - `attachedFiles`: Array of uploaded files (images/PDFs)
  - `recipe`: Extracted recipe data
  - `currentStage`: Current app stage ('capture' | 'preview' | 'cooking' | 'complete')

### API Integration
- **api/gemini.js**: Vercel serverless function for Gemini API
- **api/youtube.js**: Vercel serverless function for YouTube API
- **src/utils/api.ts**: Client-side API utilities

### File Processing
- **src/utils/recipeManager.ts**: File processing utilities
  - Converts files to base64
  - Creates preview URLs for images
  - Validates file types and sizes

## Technologies

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Framer Motion**: Animation library
- **Vercel**: Serverless functions for API proxy

## Project Structure

```
src/
├── components/          # React components
├── context/            # React Context providers
├── types/              # TypeScript definitions
├── utils/              # Utility functions
├── App.tsx             # Main app component
└── main.tsx            # Entry point

api/                    # Vercel serverless functions
├── gemini.js
└── youtube.js
```

## Environment Variables

Set these in Vercel dashboard or `.env.local`:
- `GEMINI_API_KEY`: Google Gemini API key
- `YOUTUBE_API_KEY`: YouTube Data API v3 key

## Development Notes

- All animations use Framer Motion
- File attachments support images (JPG, PNG, GIF, WebP) and PDFs
- Maximum file size: 10MB per file
- API keys are never exposed to client (serverless functions only)
