# Agent-Based Recipe Extraction Architecture

## Overview

Baratie now uses a multi-step agent-based architecture for intelligent recipe extraction, validation, and enhancement. The system follows the specifications in `Instructions.txt` with specialized agents handling different aspects of recipe processing.

## Agent Modules

All agents are located in `api/agents/` directory and are modular, reusable functions.

### 1. Section Detection Agent (`sectionDetection.js`)

**Purpose**: Analyzes extracted recipes to identify natural sections (e.g., "Marination", "Curry", "Garnish").

**When Used**: After initial recipe extraction from any source (URL, YouTube, Image)

**How It Works**:
- Takes flat arrays of ingredients and instructions
- Uses Gemini to detect natural groupings
- Returns RecipeSection[] format if sections found, otherwise flat arrays

**Output Format**:
```javascript
{
  ingredients: [
    { title: "For Marination", items: ["750g chicken", "1/2 cup yogurt"] },
    { title: "For Curry", items: ["2 onions", "3 tomatoes"] }
  ],
  instructions: [...],
  hasSections: true
}
```

### 2. Nutrition Calculation Agent (`nutritionCalculation.js`)

**Purpose**: Calculates macros and calories for entire recipe based on ingredients.

**When Used**: After recipe extraction for new recipes (not modifications)

**How It Works**:
- Takes ingredients list and recipe title
- Uses Gemini with USDA nutritional value estimates
- Calculates total macros for entire recipe

**Output Format**:
```javascript
{
  calories: 450,
  protein: 35,  // grams
  carbs: 25,    // grams
  fat: 20,      // grams
  fiber: 5      // grams
}
```

**UI Integration**: CookingGuide scales these values by portion selector.

### 3. YouTube Comments Agent (`youtubeComments.js`)

**Purpose**: Extracts pinned comments from YouTube videos to find recipes.

**When Used**: During YouTube URL processing, after checking description

**How It Works**:
- Fetches comments using YouTube Data API v3
- Identifies pinned comment (channel owner + first comment)
- Validates if comment contains recipe using Gemini

**Functions**:
- `extractPinnedComment(videoId, apiKey)` → comment text or null
- `commentContainsRecipe(text, apiKey)` → boolean

### 4. Image OCR Agent (`imageOCR.js`)

**Purpose**: Validates images and extracts text/recipes from image files.

**When Used**: Before processing any image uploads

**How It Works**:
- Sends image to Gemini for analysis
- Determines if cooking-related and if it's a recipe
- Handles three scenarios: recipe, ingredient identification, non-cooking

**Functions**:
- `extractAndValidateImage()` → {isCooking, isRecipe, text, message}
- `extractRecipeFromImage()` → {title, ingredients, instructions}
- `identifyIngredient()` → description text

---

## Multi-Step Extraction Flows

### Website Extraction Flow

```
User provides URL
    ↓
1. Fetch HTML
    ↓
2. Extract title & headings
    ↓
3. Validate cooking-related (validateCookingContent)
    ↓ [If invalid] → Return error
    ↓
4. Extract recipe content from HTML
    ↓
5. Send to Gemini for structured extraction
    ↓
6. Run Section Detection Agent
    ↓
7. Run Nutrition Calculation Agent
    ↓
8. Return complete recipe with sections + nutrition
```

**Key Files Modified**:
- `api/gemini.js` lines 458-560, 828-856, 1035-1070

### YouTube Extraction Flow

```
User provides YouTube URL
    ↓
1. Extract video ID
    ↓
2. Fetch video metadata (YouTube Data API)
    ↓
3. Validate title is cooking-related
    ↓ [If invalid] → Return error
    ↓
4. Check description for recipe text
    ↓ [If found] → Extract and return
    ↓
5. Extract pinned comment
    ↓
6. Check if pinned comment has recipe
    ↓ [If found] → Extract and return
    ↓
7. Scan description for recipe links
    ↓
8. For each link: validate & extract
    ↓ [If found] → Extract and return
    ↓
9. If not found anywhere → Return error
    ↓
10. Run Section Detection Agent
    ↓
11. Run Nutrition Calculation Agent
    ↓
12. Return complete recipe
```

**Key Files Modified**:
- `api/gemini.js` lines 363-515

### Image Extraction Flow

```
User uploads image(s)
    ↓
1. Run Image OCR Agent
    ↓
2. Validate: isCooking? isRecipe?
    ↓
    ├─ Not cooking → Return error
    ├─ Cooking but not recipe → Identify ingredient & return
    └─ Is recipe → Continue
         ↓
3. Extract recipe from image
    ↓
4. Run Section Detection Agent
    ↓
5. Run Nutrition Calculation Agent
    ↓
6. Return complete recipe
```

**Key Files Modified**:
- `api/gemini.js` lines 630-672

---

## Context-Aware Chat System

### Conversation History

**Implementation**: `src/context/RecipeContext.tsx` lines 27-37

Tracks last 5 messages (excluding recipe-preview) to provide context for:
- Questions about current recipe
- Modification requests
- Follow-up queries

**Format**:
```
User: How do I make pasta?
Assistant: Boil water, add pasta...
User: What temperature?
```

### Enhanced Q&A

**Server Handler**: `api/gemini.js` lines 570-598

**Features**:
- Includes current recipe context (title + first 10 ingredients)
- Includes conversation history
- Provides context-aware answers

**Example**:
```
User: "What temperature should I use?"
→ System knows current recipe is "Roast Chicken"
→ Includes conversation history about roasting
→ Answers: "For roasting chicken, preheat oven to 375°F..."
```

### Enhanced Modification

**Server Handler**: `api/gemini.js` lines 600-642

**Features**:
- Preserves recipe sections during modifications
- Uses conversation context
- Generates changesDescription

---

## Recipe Data Structure

### Type Definition (`src/types/index.ts`)

```typescript
interface RecipeSection {
  title?: string;  // e.g., "For Marination"
  items: string[];
}

interface Recipe {
  title: string;
  ingredients: string[] | RecipeSection[];  // Supports both!
  instructions: string[] | RecipeSection[];
  prepTime?: string;
  cookTime?: string;
  nutrition?: NutritionInfo;
  changesDescription?: string;
}

interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}
```

### Server Response

**With Sections**:
```json
{
  "recipe": {
    "title": "Chicken Curry",
    "ingredients": [
      { "title": "For Marination", "items": ["750g chicken", "1/2 cup yogurt"] },
      { "title": "For Curry", "items": ["2 onions", "3 tomatoes"] }
    ],
    "instructions": [...],
    "nutrition": {
      "calories": 450,
      "protein": 35,
      "carbs": 25,
      "fat": 20,
      "fiber": 5
    }
  }
}
```

**Without Sections** (flat arrays still supported):
```json
{
  "recipe": {
    "title": "Simple Pasta",
    "ingredients": ["200g pasta", "2 cups water", "1 tsp salt"],
    "instructions": ["Boil water", "Add pasta", "Cook 10 mins"],
    "nutrition": {
      "calories": 300,
      "protein": 10,
      "carbs": 55,
      "fat": 2
    }
  }
}
```

---

## UI Enhancements

### Dynamic Section Filters (`CookingGuide.tsx`)

**Lines**: 24-42

**Behavior**:
- If recipe has sections → Display filter buttons for each section
- If flat array → Hide filters (only "All" available)
- Filter titles cleaned (removes "For" prefix)

**Example**:
Recipe with sections "For Marination" and "For Curry":
→ Buttons: [All] [Marination] [Curry]

### Real-Time Macro Display (`CookingGuide.tsx`)

**Lines**: 44-56, 206-260

**Features**:
- Shows actual calculated nutrition from `recipe.nutrition`
- Scales by portions selector
- Shows "Calculating..." if nutrition not yet available
- Updates label: "Total" for 1 portion, "For X Portions" for multiple

**Display**:
```
1000 Calories
For 2 Portions

35g Protein | 25g Carbs | 20g Fat
```

---

## Environment Variables

### Required

```env
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

### Client-Side (.env)

```env
VITE_GEMINI_API_ENDPOINT=/api/gemini
VITE_YOUTUBE_API_ENDPOINT=/api/youtube
```

---

## API Request Format

### Recipe Extraction with Context

**Endpoint**: `POST /api/gemini`

**Request Body**:
```javascript
{
  url: "https://example.com/recipe",  // OR
  filesData: [{mimeType, data}],      // OR
  question: true,                     // For Q&A
  modify: true,                       // For modifications
  currentRecipe: {...},               // Current recipe context
  conversationHistory: "User: ...\nAssistant: ...",
  prompt: "Extract this recipe"
}
```

### Validation Request

```javascript
{
  action: "validate",
  type: "message" | "content",
  content: "Is this cooking-related?"
}
```

**Response**:
```javascript
{
  isValid: true | false
}
```

---

## Error Handling

### Validation Errors

**Non-Cooking URL**:
```json
{
  "error": "This link does not appear to contain cooking or recipe content.",
  "details": "Please provide a URL to a recipe or cooking-related page."
}
```

**Non-Cooking YouTube**:
```json
{
  "error": "This YouTube video does not appear to be cooking or recipe-related.",
  "details": "Please provide a link to a cooking video."
}
```

**Recipe Not Found**:
```json
{
  "error": "Recipe not found in this YouTube video.",
  "details": "Could not find recipe in description, pinned comment, or linked websites."
}
```

### Graceful Degradation

**Section Detection Fails**: Returns flat arrays
**Nutrition Calculation Fails**: Recipe still returned without nutrition field
**Pinned Comment Unavailable**: Continues to description links
**Image OCR Fails**: Returns appropriate error message

---

## Testing

### Test URLs

**Valid Websites**:
- AllRecipes, Serious Eats, Food Network
- Recipe blogs with Schema.org JSON-LD
- Indian recipe sites (e.g., Veg Recipes of India)

**Valid YouTube**:
- Cooking channels with recipe in description
- Videos with pinned comment recipes
- Videos with recipe links in description

**Valid Images**:
- Recipe cards from cookbooks
- Screenshots of recipes
- Food photos (for ingredient identification)

### Test Scenarios

1. **Website with sections**: Extract "Chicken Biryani" → should detect Marination + Curry sections
2. **YouTube with pinned comment**: Cooking video → should find recipe in pinned comment
3. **Image of ingredient**: Photo of tomato → should identify and describe
4. **Non-cooking URL**: Wikipedia article → should reject with helpful error
5. **Context-aware question**: "What temperature?" after extracting recipe → should reference current recipe

---

## Performance Considerations

### Agent Execution

- **Sequential**: Section detection → Nutrition calculation (both quick)
- **Caching**: Gemini responses not cached (fresh data each time)
- **Timeout**: All Gemini calls have built-in timeout handling

### API Calls

- **YouTube**: 2-3 API calls (metadata + optional comments)
- **Recipe Extraction**: 1-3 Gemini calls (validation + extraction + agents)
- **Modifications**: 1 Gemini call (includes context)

---

## Future Enhancements

### Potential Additions

1. **Caching Layer**: Cache nutrition calculations for similar recipes
2. **Batch Processing**: Extract multiple recipes from single page
3. **Video Transcript**: Use YouTube transcript for recipes mentioned in video
4. **User Preferences**: Remember dietary restrictions, preferred units
5. **Recipe Scaling**: Smart ingredient quantity scaling based on servings

### Known Limitations

1. **Comments API**: Only checks top 10 comments for pinned
2. **Section Detection**: Works best with well-structured recipes
3. **Nutrition**: Estimates only, not exact values
4. **Image Quality**: OCR depends on image clarity

---

## Debugging

### Server Logs

Enable detailed logging in `api/gemini.js`:
- Line 405: YouTube title validation
- Line 476: Page content validation
- Line 641: Image OCR results
- Line 1044: Section detection results
- Line 1064: Nutrition calculation results

### Common Issues

**"API endpoint not accessible"**: Use `yarn dev:all` not just `yarn dev`
**Empty ingredients**: Check aggressive filters (lines 736-774, 859-907)
**No sections detected**: Recipe may not have clear groupings
**Missing nutrition**: Agent may have failed, check server logs

---

## Migration Guide

### From Old Architecture

**No Breaking Changes**: Flat arrays still fully supported

**Benefits of New System**:
- ✅ Automatic section detection
- ✅ Real nutrition data
- ✅ YouTube pinned comments
- ✅ Image validation
- ✅ Context-aware chat

**Existing Features Preserved**:
- ✅ URL extraction
- ✅ File uploads
- ✅ Recipe modifications
- ✅ Q&A system
- ✅ Message validation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     USER INPUT                          │
│         URL / YouTube / Image / Question                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              RecipeContext (Client)                      │
│  • Builds conversation context                          │
│  • Routes to appropriate API call                       │
│  • Validates cooking relevance                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Gemini API Handler (Server)                    │
│                                                          │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │   URL Flow    │  │  YouTube Flow  │  │ Image Flow │ │
│  │               │  │                │  │            │ │
│  │ 1. Validate   │  │ 1. Validate    │  │ 1. OCR     │ │
│  │ 2. Extract    │  │    title       │  │ 2. Validate│ │
│  │ 3. Sections   │  │ 2. Description │  │ 3. Extract │ │
│  │ 4. Nutrition  │  │ 3. Comment     │  │ 4. Sections│ │
│  │               │  │ 4. Links       │  │ 5. Nutrition│
│  └───────────────┘  └────────────────┘  └────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 AGENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Section    │  │  Nutrition   │  │    Image      │ │
│  │  Detection   │  │ Calculation  │  │   OCR/Valid   │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
│  ┌──────────────┐                                       │
│  │   YouTube    │                                       │
│  │   Comments   │                                       │
│  └──────────────┘                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              STRUCTURED RECIPE                           │
│  • Title, Ingredients (sections), Instructions          │
│  • Nutrition (calories, protein, carbs, fat)            │
│  • Times (prep, cook)                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   UI DISPLAY                             │
│  • Dynamic Section Filters (CookingGuide)               │
│  • Real Macro Display (scaled by portions)              │
│  • Context-Aware Chat                                   │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated**: 2025-01-20
**Architecture Version**: 2.0 (Agent-Based)
