# Baratie - AI Recipe Manager

AI-powered recipe manager with Gemini integration, built with React, TypeScript, and Vite.

## Features

- 🍳 Extract recipes from images, PDFs, and URLs
- 📝 Interactive cooking guide
- 🎨 Beautiful, modern UI with Framer Motion animations
- 📱 Responsive design
- ⚡ Fast development with Vite

## Getting Started

### Prerequisites

- Node.js >= 18.x
- Yarn (install with `npm install -g yarn`)

### Installation

```bash
yarn install
```

### Development

```bash
yarn dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
yarn build
```

### Preview Production Build

```bash
yarn preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── AttachedFiles.tsx
│   ├── BackgroundBlobs.tsx
│   ├── ChatInput.tsx
│   ├── Header.tsx
│   └── Hero.tsx
├── context/            # React Context providers
│   └── RecipeContext.tsx
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   ├── api.ts
│   └── recipeManager.ts
├── App.tsx             # Main App component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_GEMINI_API_ENDPOINT=/api/gemini
VITE_YOUTUBE_API_ENDPOINT=/api/youtube
```

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Framer Motion** - Animation library

## License

MIT
