# Nutrition & Macros Tab Feature

Complete documentation for the Nutrition/Macros tab feature in Baratie.

## Overview

The Nutrition tab provides AI-calculated nutritional information for recipes, displayed in an easy-to-read format with automatic updates when the recipe is modified.

## Features

### Tabbed Interface
- **Recipe Tab**: Shows ingredients and cooking instructions (default view)
- **Nutrition Tab**: Displays comprehensive nutritional breakdown
- Seamless tab switching with visual active state

### Nutritional Information Displayed

**Per Serving Breakdown:**
- **Total Calories**: Large, prominent display with gradient background
- **Macronutrients** (with percentages of total macros):
  - Protein (grams + %)
  - Carbohydrates (grams + %)
  - Fats (grams + %)
  - Fiber (grams only)
- **Additional Nutrients**:
  - Sodium (mg)
  - Sugar (g)
  - Cholesterol (mg)

### Smart Calculation
- **AI-Powered**: Uses Gemini API to calculate nutrition based on ingredients
- **Lazy Loading**: Only calculates when user switches to Nutrition tab
- **Automatic Recalculation**: Updates when:
  - Servings are adjusted
  - Ingredients are substituted via chat
- **Session Persistence**: Macros are saved and restored with recipe session

### Visual Design
- **Calories Circle**: 180px gradient circle displaying total calories
- **Color-Coded Macro Cards**:
  - Protein: Red border (#e74c3c)
  - Carbs: Orange border (#f39c12)
  - Fats: Blue border (#3498db)
  - Fiber: Green border (#2ecc71)
- **Loading State**: Animated spinner while calculating
- **Error State**: Friendly error message with recalculate button
- **Disclaimer**: Clear notice that values are AI estimates

## Technical Implementation

### File Changes

**[index.html](index.html)** (lines 115-223):
- Added `.recipe-tabs` with Recipe/Nutrition buttons
- Wrapped existing ingredients/instructions in `#recipe-tab`
- Created complete `#macros-tab` structure with all UI elements

**[styles.css](styles.css)** (lines 384-806):
- Tab button styling with active states
- `.tab-content` show/hide logic
- Complete macros section styling
- Calories circle with gradient
- Macro cards grid layout
- Loading and error states

**[app.js](app.js)**:
- Constructor: Added `this.currentMacros = null` (line 12)
- Event Listeners: Tab switching and recalculate button (lines 66-72)
- `switchTab(tabName)` - Tab switching logic (lines 968-985)
- `calculateMacros()` - AI calculation via Gemini (lines 991-1075)
- `displayMacros(macros)` - Update UI with calculated values (lines 1077-1105)
- `setServings()` - Triggers recalculation (lines 1123-1126)
- `processRecipeActions()` - Recalculates on ingredient substitution (lines 1408-1411)
- Session storage: Save/restore macros (lines 1696, 1725, 1732-1734, 1746)

## Usage

### For Users

1. **Load a Recipe**: Process any recipe URL
2. **Start Cooking**: Navigate to the cooking interface
3. **Switch to Nutrition Tab**: Click "Nutrition" button at the top
4. **View Macros**: Nutritional information calculates automatically
5. **Adjust Recipe**: Change servings or substitute ingredients
6. **Auto-Update**: Macros recalculate automatically

### Example User Flow

```
User loads recipe with 4 servings
→ Clicks "Nutrition" tab
→ Macros calculate (shows loading spinner)
→ Displays: 450 calories, 25g protein, 50g carbs, 18g fat per serving
→ User adjusts to 6 servings
→ Macros recalculate automatically
→ New display reflects adjusted servings
```

## API Integration

### Gemini API Call

**Endpoint**: Same as recipe extraction (`gemini-2.0-flash`)

**Prompt Structure**:
```javascript
`You are a nutrition expert. Calculate approximate nutritional information for this recipe.

Recipe: ${title}
Servings: ${currentServings}

Ingredients:
${scaledIngredients}

Instructions:
${instructions}

Response format (JSON, no markdown):
{
  "calories": 0,
  "protein_grams": 0,
  "carbs_grams": 0,
  "fats_grams": 0,
  "fiber_grams": 0,
  "sodium_mg": 0,
  "sugar_grams": 0,
  "cholesterol_mg": 0
}`
```

**Response Processing**:
- Parses JSON response from Gemini
- Calculates macro percentages:
  - Protein: 4 cal/gram
  - Carbs: 4 cal/gram
  - Fats: 9 cal/gram
- Rounds all values to integers
- Stores in `this.currentMacros`

### Quota Usage

**Per Macros Calculation**: 1 Gemini API call (~1 quota unit)

**Typical Usage**:
- Initial calculation: 1 call
- Each serving adjustment: 1 call
- Each ingredient substitution: 1 call

**Cost Consideration**:
- Free tier: 15 requests/minute for Gemini Flash
- Negligible compared to recipe extraction calls
- Cached in session storage to minimize recalculations

## Data Structure

### Macros Object

```javascript
{
  calories: 450,              // Total calories per serving
  protein: {
    grams: 25,                // Protein in grams
    percentage: 22            // % of total macros (by calories)
  },
  carbs: {
    grams: 50,
    percentage: 44
  },
  fats: {
    grams: 18,
    percentage: 34
  },
  fiber: 8,                   // Fiber in grams (no percentage)
  sodium: 680,                // Sodium in mg
  sugar: 12,                  // Sugar in grams
  cholesterol: 65             // Cholesterol in mg
}
```

### Session Storage

Macros are saved as part of session:
```javascript
{
  recipe: {...},
  currentServings: 6,
  originalServings: 4,
  completedSteps: [0, 1, 2],
  macros: {...},              // Full macros object
  timestamp: 1635789012345
}
```

## UI States

### Loading State
```html
<div id="macros-loading" style="display: flex;">
  <div class="spinner"></div>
  <p>Calculating nutrition information...</p>
</div>
```

### Success State
```html
<div id="macros-content" style="display: block;">
  <!-- Calories circle, macro cards, nutrients -->
</div>
```

### Error State
```html
<div id="macros-error" style="display: block;">
  <p>Unable to calculate nutrition. Please try again.</p>
  <button id="recalculate-macros">Recalculate</button>
</div>
```

## Percentage Calculation Logic

**Formula**:
```javascript
const totalMacroCalories =
  (protein_grams * 4) +
  (carbs_grams * 4) +
  (fats_grams * 9);

const proteinPercentage = Math.round(
  (protein_grams * 4 / totalMacroCalories) * 100
);
```

**Example**:
- Protein: 25g → 100 calories (25 × 4)
- Carbs: 50g → 200 calories (50 × 4)
- Fats: 18g → 162 calories (18 × 9)
- Total: 462 calories from macros

**Percentages**:
- Protein: 100/462 = 22%
- Carbs: 200/462 = 43%
- Fats: 162/462 = 35%

## Automatic Recalculation Triggers

### Serving Adjustments
```javascript
setServings(servings) {
  this.currentServings = servings;
  if (this.currentMacros) {
    this.calculateMacros(); // Recalculate with new servings
  }
}
```

### Ingredient Substitutions
```javascript
processRecipeActions(aiResponse) {
  // After substituting ingredient...
  if (this.currentMacros) {
    this.calculateMacros(); // Recalculate with new ingredient
  }
}
```

## Error Handling

### Common Errors

1. **Gemini API Error**
   - Shows error state with recalculate button
   - Logs error to console
   - Allows manual retry

2. **Invalid Response**
   - Catches JSON parsing errors
   - Falls back to error state
   - User can recalculate

3. **Missing Recipe**
   - `calculateMacros()` returns early if no recipe
   - Prevents unnecessary API calls

### Graceful Degradation

- If macros calculation fails, recipe tab still works
- Error state allows retry without reloading page
- Session restore works even if macros are missing

## Future Enhancements

### Planned Features

- **Micronutrients**: Vitamins (A, C, D, etc.), minerals (iron, calcium, etc.)
- **Daily Value Percentages**: % of recommended daily intake
- **Visual Charts**: Pie chart for macro distribution
- **Nutrition Facts Label**: FDA-style nutrition facts panel
- **Detailed Breakdown**: Per-ingredient nutrition contribution
- **Export to PDF**: Include nutrition info in PDF downloads
- **Custom Goals**: Compare against user's dietary goals
- **Allergen Information**: Detect common allergens

### Technical Improvements

- **Client-Side Caching**: Cache nutrition data for common ingredients
- **Batch Calculations**: Calculate nutrition for multiple servings at once
- **Nutritional Database**: Use USDA FoodData Central API for more accuracy
- **Confidence Scores**: Show confidence level of AI estimates
- **Manual Overrides**: Allow users to manually adjust calculated values

## Accessibility

- **Semantic HTML**: Proper heading hierarchy (h3, h4)
- **ARIA Labels**: Screen reader support for all interactive elements
- **Keyboard Navigation**: Tab through tabs and recalculate button
- **Color Contrast**: All text meets WCAG AA standards
- **Loading States**: Clear feedback for visual and screen reader users

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **CSS Grid**: Full support for macro cards layout
- **Flexbox**: Tab buttons and loading state
- **sessionStorage**: All modern browsers
- **No Polyfills Required**: Pure ES6+ features

## Testing Checklist

- [ ] Tab switching works between Recipe and Nutrition
- [ ] Macros calculate when first switching to Nutrition tab
- [ ] Loading spinner appears during calculation
- [ ] All nutrition values display correctly
- [ ] Macro percentages sum to ~100%
- [ ] Servings adjustment triggers recalculation
- [ ] Ingredient substitution triggers recalculation
- [ ] Session storage saves macros
- [ ] Session restore displays saved macros
- [ ] Error state shows on API failure
- [ ] Recalculate button retries calculation
- [ ] Reset button clears macros
- [ ] Disclaimer text is visible

## Known Limitations

1. **AI Estimates**: Values are estimates, not lab-tested nutrition facts
2. **Ingredient Variations**: Different brands have different nutrition
3. **Cooking Methods**: Doesn't account for oil absorption, water evaporation
4. **Recipe Complexity**: Complex recipes may have less accurate estimates
5. **No Verification**: No cross-checking with nutritional databases
6. **Missing Context**: Doesn't consider preparation losses/gains

## Disclaimer

**Displayed to Users**:
> Nutritional values are estimates calculated by AI and may vary based on specific ingredients and preparation methods.

**Recommendations**:
- Use for general meal planning
- Consult nutritionist for medical dietary needs
- Cross-check with official nutrition labels when available
- Consider ingredient brand variations

---

**Feature Status**: ✅ Complete and Ready to Use
**Last Updated**: 2025-10-30
**Added in Version**: 1.5
**Dependencies**: Gemini API, jsPDF (for future PDF export)
