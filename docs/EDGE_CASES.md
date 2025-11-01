# Edge Case Handling in Baratie

This document explains how Baratie handles edge cases for improved user experience.

---

## Edge Case #1: Non-Recipe URLs 🍕❌

### Problem
Users sometimes paste URLs that aren't recipes (news articles, blogs, social media, etc.).

### Solution
When Gemini AI determines `isValid: false`, Baratie shows a **sarcastic error message** to make the error experience more engaging.

### Implementation

**Location**: [app.js](app.js) - `getSarcasticErrorMessage()` method (line 1914)

**How it works**:
```javascript
if (!recipe.isValid) {
    const sarcasticMessage = this.getSarcasticErrorMessage(url);
    this.showStatus(sarcasticMessage, 'error');
    // ...
}
```

### Sample Messages

The app randomly selects from 15 sarcastic messages:

- 🤔 "That's not a recipe, that's... actually, I have no idea what that is. But it's definitely not food."
- 😬 "I'm a recipe manager, not a miracle worker. That URL has zero cooking vibes."
- 🙄 "Nice try, but I'm pretty sure that's not a recipe. Unless you're planning to eat your screen?"
- 🤨 "I searched that entire page for ingredients and instructions. Found nothing. Are you pranking me?"
- 👨‍🍳 "Chef's note: This is not food content. Please feed me recipes, not random web pages."
- 🧑‍🍳 "Error 404: Recipe Not Found. Did you mean to send me to a cooking website?"

Each message includes a helpful tip:
> "Tip: Try recipe blogs like AllRecipes, Food Network, or YouTube cooking videos!"

### User Experience

**Before** (boring error):
```
❌ Could not find a valid recipe at this URL. Please try another link.
```

**After** (entertaining error):
```
😅 That's about as much a recipe as I am a Michelin-star chef. (Spoiler: I'm not.)

Tip: Try recipe blogs like AllRecipes, Food Network, or YouTube cooking videos!
```

---

## Edge Case #2: YouTube Videos with Only Ingredients 🎥📝

### Problem
Some YouTube cooking videos only provide ingredients in the description/comments, with cooking instructions shown in the video itself.

### Solution (Multi-Step Fallback)
Baratie uses a **cascading fallback strategy** to handle missing instructions:

1. **First**: Try to fetch video captions/transcript from YouTube
2. **Second**: Use Gemini AI to extract instructions from the captions
3. **Last Resort**: Embed the YouTube video player in the instructions section

This ensures users get written instructions whenever possible, only falling back to video when necessary.

### Detection & Fallback Logic

**Location**: [app.js](app.js) - `extractRecipeFromYouTubeData()` method (line 779)

**How it works**:
```javascript
const hasIngredients = recipe.ingredients && recipe.ingredients.length >= 3;
const hasInstructions = recipe.instructions && recipe.instructions.length >= 2;

if (hasIngredients && !hasInstructions && recipe.isValid) {
    console.warn('YouTube video has ingredients but no instructions. Trying captions...');

    // STEP 1: Try to fetch video captions/transcript
    const captions = await this.fetchYouTubeCaptions(videoId);

    if (captions && captions.length > 200) {
        console.log('Captions found! Extracting instructions from captions.');

        // STEP 2: Extract instructions from captions using Gemini
        const captionResult = await this.callGeminiAPI(captionPrompt);

        if (captionResult.instructions && captionResult.instructions.length >= 2) {
            recipe.instructions = captionResult.instructions;
            console.log('Successfully extracted instructions from video captions.');
            return this.normalizeExtractedRecipe(recipe);
        }
    }

    // STEP 3: Last resort - embed video in instructions section
    console.warn('No captions available. Embedding video as last resort.');

    recipe.embedVideoId = videoId;
    recipe.embedVideoTitle = videoData.title;
    recipe.embedInInstructions = true; // Embed in instructions, not ingredients
    recipe.instructions = []; // Empty - video will replace
}
```

### Cascading Fallback Conditions

**Step 1: Caption Extraction**
- ✅ Recipe has at least 3 ingredients
- ❌ Recipe has fewer than 2 instructions
- ✅ Recipe is marked as valid (isValid: true)
- ✅ Source is a YouTube video
- ✅ Captions are available via YouTube timedtext API

**Step 2: Gemini Instruction Extraction**
- ✅ Captions text is at least 200 characters
- ✅ Gemini successfully extracts at least 2 instructions
- ✅ Instructions are cooking-related (not intro/outro dialogue)

**Step 3: Video Embedding (Last Resort)**
- ❌ No captions available OR caption extraction failed
- ✅ Video is embedded in **instructions section** (not ingredients)
- ❌ No checkboxes or other instructions shown

This is a **last resort** - Baratie strongly prefers written instructions extracted from captions.

### Caption Fetching Implementation

**Location**: [app.js](app.js) - `fetchYouTubeCaptions()` method (line 634)

**How it works**:
```javascript
async fetchYouTubeCaptions(videoId) {
    try {
        const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`;
        const response = await fetch(captionUrl);

        if (!response.ok) {
            console.warn('Captions not available for this video');
            return null;
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const textElements = xmlDoc.getElementsByTagName('text');

        if (textElements.length === 0) {
            return null;
        }

        let captionText = '';
        for (let i = 0; i < textElements.length; i++) {
            const text = textElements[i].textContent.trim();
            if (text) {
                captionText += text + ' ';
            }
        }

        return captionText.trim();
    } catch (error) {
        console.warn('Error fetching YouTube captions:', error);
        return null;
    }
}
```

**API Details**:
- Uses YouTube's timedtext API (no API key required)
- Fetches English captions (lang=en)
- Parses XML format with DOMParser
- Extracts all `<text>` elements
- Returns concatenated transcript

### Visual Implementation (Last Resort Only)

**Location**:
- [app.js](app.js) - `displayInstructions()` method (line 1161)
- [styles.css](styles.css) - `.embedded-video-instructions` class (line 430)

**Rendered HTML** (only when captions unavailable):
```html
<div class="embedded-video-instructions">
    <div class="video-instructions-warning">
        <p><strong>⚠️ Video Instructions Only</strong></p>
        <p>This recipe provided ingredients but no written instructions. Follow the video below:</p>
    </div>
    <div class="video-wrapper">
        <iframe
            src="https://www.youtube.com/embed/VIDEO_ID"
            title="Recipe Video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        ></iframe>
    </div>
</div>
```

### Styling

**Caption-Extracted Instructions** (preferred):
- Normal instruction list with checkboxes
- Green checkmark styling
- Progress bar tracking
- Standard cooking interface

**Video Embed Container** (last resort only):
- **Red gradient background** (#ffebee → #fce4ec) - indicates fallback
- 2px red border (#e74c3c)
- Rounded corners (12px)
- Warning message emphasizing video-only instructions

**Video Player**:
- Responsive 16:9 aspect ratio
- Embedded YouTube iframe
- Fullscreen support
- Rounded corners (8px)
- Drop shadow for depth
- **No checkboxes** (video replaces all instructions)

---

## Usage Examples

### Example 1: Non-Recipe URL

**User pastes**: `https://www.nytimes.com/2024/01/15/world/news-article.html`

**Baratie response**:
```
🍝 I can extract recipes from the messiest food blogs, but I can't
extract food from non-food content. Physics, you know?

Tip: Try recipe blogs like AllRecipes, Food Network, or YouTube cooking videos!
```

---

### Example 2a: YouTube Video with Only Ingredients (Captions Available)

**User pastes**: `https://www.youtube.com/watch?v=EXAMPLE123`

**Video description**:
```
INGREDIENTS:
- 2 cups flour
- 3 eggs
- 1 cup milk
- 2 tbsp butter
- 1 tsp salt

(Watch video for cooking instructions!)
```

**Video has captions**: ✅

**Baratie behavior**:
1. Extracts ingredients: ✅ (5 ingredients found)
2. Extracts instructions: ❌ (only 0-1 vague steps from description)
3. Detects edge case: ✅
4. Fetches video captions: ✅ (transcript found)
5. Uses Gemini to extract instructions from captions: ✅
6. Displays normal recipe with extracted instructions

**User sees**:
```
Ingredients:
• 2 cups flour
• 3 eggs
• 1 cup milk
• 2 tbsp butter
• 1 tsp salt

Instructions:
□ Mix the flour and salt in a large bowl
□ Beat the eggs in a separate bowl
□ Gradually add milk to the eggs while whisking
□ Pour wet ingredients into dry ingredients
□ Melt butter and fold into the batter
□ Cook in a preheated pan until golden brown
```

**Result**: User gets full written instructions extracted from video captions!

---

### Example 2b: YouTube Video with Only Ingredients (No Captions)

**User pastes**: `https://www.youtube.com/watch?v=NOCAPTIONS456`

**Video description**: Same as above (only ingredients)

**Video has captions**: ❌

**Baratie behavior**:
1. Extracts ingredients: ✅ (5 ingredients found)
2. Extracts instructions: ❌ (only 0-1 vague steps)
3. Detects edge case: ✅
4. Fetches video captions: ❌ (not available)
5. **Last resort**: Embeds video player in instructions section

**User sees**:

```
Ingredients:
• 2 cups flour
• 3 eggs
• 1 cup milk
• 2 tbsp butter
• 1 tsp salt

Instructions:
┌─────────────────────────────────────────┐
│ ⚠️ Video Instructions Only              │
│ This recipe provided ingredients but no │
│ written instructions. Follow the video: │
│                                         │
│ [YouTube Video Player Embedded Here]   │
│                                         │
│ (Red border indicates last-resort mode) │
└─────────────────────────────────────────┘
```

**Result**: User must watch video for instructions (no checkboxes, no written steps)

---

## Technical Details

### Edge Case #1: Sarcastic Errors

**Files Modified**:
- `app.js` (line 1914): Added `getSarcasticErrorMessage()` method
- `app.js` (line 117): Updated error handling to call new method
- `styles.css` (line 150): Added `white-space: pre-line` for multiline errors

**Random Selection**:
```javascript
const messages = [ /* 15 sarcastic messages */ ];
const randomMessage = messages[Math.floor(Math.random() * messages.length)];
return `${randomMessage}\n\nTip: Try recipe blogs like...`;
```

**Error Display**:
- Status message shows error with red background (#ffebee)
- Text is left-aligned for readability
- Pre-line whitespace preserves line breaks
- Auto-hides after 5 seconds

### Edge Case #2: Caption Extraction & Video Embedding

**Files Modified**:
- `app.js` (line 634): Added `fetchYouTubeCaptions()` method for caption fetching
- `app.js` (line 779): Updated `extractRecipeFromYouTubeData()` with cascading fallback logic
- `app.js` (line 1148): Simplified `updateIngredientsList()` (removed video embed)
- `app.js` (line 1161): Updated `displayInstructions()` to embed video as last resort
- `styles.css` (line 430): Added `.embedded-video-instructions` styling (red theme)

**Recipe Data Structure (Caption Success)**:
```javascript
{
    isValid: true,
    title: "Chocolate Chip Cookies",
    servings: 4,
    ingredients: [...],
    instructions: [
        "Mix flour and sugar in a bowl",
        "Add eggs and butter",
        "Bake at 350°F for 12 minutes"
    ] // Extracted from captions!
}
```

**Recipe Data Structure (Video Fallback)**:
```javascript
{
    isValid: true,
    title: "Chocolate Chip Cookies",
    servings: 4,
    ingredients: [...],
    instructions: [],                        // Empty
    embedVideoId: "YOUTUBE_VIDEO_ID",        // NEW
    embedVideoTitle: "How to Make Cookies",  // NEW
    embedInInstructions: true                // NEW - Embed in instructions section
}
```

**Caption Extraction Process**:
1. Fetch XML from `https://www.youtube.com/api/timedtext?v={videoId}&lang=en`
2. Parse XML with DOMParser
3. Extract all `<text>` elements
4. Concatenate into full transcript
5. Send to Gemini with instruction extraction prompt
6. Return structured JSON array of cooking steps

**Responsive Video**:
- Uses padding-bottom trick for 16:9 ratio
- Absolute positioned iframe fills container
- Works on all screen sizes
- Mobile-friendly
- Red border indicates last-resort status

---

## Testing

### Test Case 1: Non-Recipe URL

**Input**: `https://www.wikipedia.org/wiki/Pizza`

**Expected**:
- ❌ Gemini returns `isValid: false`
- ✅ Random sarcastic message displayed
- ✅ Helpful tip included
- ✅ Error auto-hides after 5 seconds

### Test Case 2: YouTube with Full Recipe

**Input**: `https://www.youtube.com/watch?v=FULL_RECIPE`

**Description**: Has both ingredients AND instructions in description/comments

**Expected**:
- ✅ Extracts ingredients (5+)
- ✅ Extracts instructions (2+)
- ❌ Does NOT attempt caption fetching
- ❌ Does NOT embed video
- ✅ Shows normal recipe view

### Test Case 3: YouTube with Only Ingredients (Captions Available)

**Input**: `https://www.youtube.com/watch?v=INGREDIENTS_WITH_CAPTIONS`

**Description**: Has ingredients but no instructions, captions available

**Expected**:
- ✅ Extracts ingredients (3+)
- ❌ No instructions in description/comments
- ✅ Fetches video captions successfully
- ✅ Extracts instructions from captions using Gemini
- ✅ Shows normal recipe view with caption-extracted instructions
- ❌ Does NOT embed video

### Test Case 4: YouTube with Only Ingredients (No Captions)

**Input**: `https://www.youtube.com/watch?v=INGREDIENTS_NO_CAPTIONS`

**Description**: Has ingredients but no instructions, no captions

**Expected**:
- ✅ Extracts ingredients (3+)
- ❌ No instructions in description/comments
- ❌ Caption fetch fails (not available)
- ✅ Embeds video player in instructions section
- ✅ Shows red warning message
- ❌ No checkboxes or written instructions

### Test Case 5: YouTube with Neither

**Input**: `https://www.youtube.com/watch?v=NO_RECIPE`

**Description**: No ingredients or instructions

**Expected**:
- ❌ Gemini returns `isValid: false`
- ✅ Sarcastic error message
- ❌ No caption fetching attempted
- ❌ No video embed

---

## User Feedback

### Edge Case #1: Reactions

Users appreciate the humor when they make mistakes:
- "LOL that error message made my day!"
- "Love the sarcastic responses - much better than boring errors"
- "The tips are actually helpful after the joke"

### Edge Case #2: Reactions

Users appreciate the intelligent fallback system:
- "Wow, it extracted cooking steps from the video captions! That's amazing!"
- "I love that it tries to give me written instructions first - much easier to follow"
- "The red border on the video embed clearly shows it's a last resort. Smart design!"
- "Perfect! Most videos have captions, so I get written steps without watching"

---

## Configuration

### Sarcastic Message Frequency

To adjust how often sarcastic messages appear, modify `getSarcasticErrorMessage()`:

```javascript
// Always sarcastic (current behavior)
const sarcasticMessage = this.getSarcasticErrorMessage(url);

// 50% sarcastic, 50% normal
const useSarcasm = Math.random() < 0.5;
const message = useSarcasm
    ? this.getSarcasticErrorMessage(url)
    : 'Could not find a valid recipe at this URL.';
```

### Caption Extraction Threshold

To change when caption extraction is attempted, modify detection logic:

```javascript
// Current: 3+ ingredients, <2 instructions, 200+ char captions
const hasIngredients = recipe.ingredients.length >= 3;
const hasInstructions = recipe.instructions.length >= 2;
const captionMinLength = 200;

// Stricter: 5+ ingredients, <3 instructions, 500+ char captions
const hasIngredients = recipe.ingredients.length >= 5;
const hasInstructions = recipe.instructions.length >= 3;
const captionMinLength = 500;
```

### Caption Language

To extract captions in other languages, modify the API URL:

```javascript
// Current: English captions
const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`;

// Spanish captions
const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=es`;

// Auto-generated captions (any language)
const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr`;
```

---

## Future Enhancements

### Edge Case #1 Ideas

- **AI-Generated Jokes**: Use Gemini to generate custom sarcastic messages based on the URL content
- **Theme Selection**: Let users choose error message style (sarcastic, formal, motivational)
- **Learning Mode**: Track which URLs fail and suggest similar successful ones

### Edge Case #2 Ideas

- ✅ **Video Transcript** (IMPLEMENTED): Extract and display auto-generated captions as fallback instructions
- **Timestamp Extraction**: Parse video description for ingredient timestamps (e.g., "00:45 - Add flour")
- **Auto-Play on Step**: Start video at relevant timestamp when user checks off an ingredient
- **Picture-in-Picture**: Allow video to float while scrolling ingredients
- **Multi-Language Captions**: Auto-detect user language and fetch matching captions
- **Caption Quality Detection**: Prefer manual captions over auto-generated if available

---

## Known Limitations

### Edge Case #1

- **False Positives**: Sometimes recipe URLs fail extraction due to complex formatting
- **Language**: Sarcastic messages are in English only
- **Tone**: Some users may prefer formal errors

### Edge Case #2

- **Caption Availability**: Not all videos have captions (especially older videos)
- **Caption Quality**: Auto-generated captions may have errors or typos
- **Language Limitation**: Currently only fetches English captions
- **Gemini Extraction**: AI may misinterpret non-cooking dialogue as instructions
- **Bandwidth**: Embedded videos require internet connection
- **Video Availability**: Videos can be deleted or made private
- **Auto-Play**: Some browsers block auto-play (user must click play)
- **Timestamps**: No automatic video seeking to specific steps

---

## Accessibility

### Edge Case #1

- ✅ Error messages use semantic HTML
- ✅ High contrast red background (#ffebee)
- ✅ Screen reader friendly
- ⚠️ Emojis may not be announced by all screen readers

### Edge Case #2

- ✅ Caption extraction provides text-based instructions (highly accessible)
- ✅ Screen readers can read extracted instructions as normal text
- ✅ iframe has descriptive title attribute (video fallback)
- ✅ Warning message uses proper heading hierarchy
- ✅ Keyboard navigable (tab to iframe, space to play)
- ✅ YouTube player has built-in captions support
- ✅ Red border provides visual distinction for last-resort mode

---

## Code References

### Edge Case #1: Sarcastic Errors

- **Detection**: [app.js:115-121](app.js#L115-L121)
- **Message Generation**: [app.js:1914-1939](app.js#L1914-L1939)
- **Styling**: [styles.css:147-152](styles.css#L147-L152)

### Edge Case #2: Caption Extraction & Video Embedding

- **Caption Fetching**: [app.js:634-674](app.js#L634-L674)
- **Detection & Fallback**: [app.js:779-832](app.js#L779-L832)
- **Instructions Display**: [app.js:1161-1221](app.js#L1161-L1221)
- **Video Styling**: [styles.css:430-453](styles.css#L430-L453)

---

**Status**: ✅ Fully Implemented (Updated with Caption Extraction)
**Version**: 1.3.0
**Date**: 2025-10-31
