# V0 Prompt for Baratie Recipe Management App

## App Overview
Create a modern, AI-powered recipe management web application called "Baratie" that allows users to extract recipes from URLs or uploaded files (images/PDFs) and convert them into interactive cooking guides.

## Tech Stack
- React 18 with TypeScript
- Vite for build tooling
- Framer Motion for animations
- Modern CSS with CSS variables

## Core Features

### 1. Hero Section
- Large centered heading: "What you wanna cook?"
- Subtitle: "Turn any recipe into an interactive cooking guide"
- Clean, minimalist design with subtle white-to-light-pink gradient background
- Centered layout with plenty of whitespace

### 2. Chat Input Component
- Large rectangular input field with rounded corners (8px border-radius)
- White background with light gray border (#e5e1dd)
- Placeholder text: "Ask Baratie to extract or make changes to a recipe..."
- Two action buttons on the right side:
  - Plus icon button (left) - for adding files
  - Red/orange arrow-up button (right) - for submitting
- Smooth hover effects with subtle shadow elevation

### 3. File Attachment System (CRITICAL - Most Complex Feature)

#### Fan Layout (Default)
- When files are attached, display them in a "fan" layout to the left of the input field
- Position: absolute, left: -39px, top: -29px
- Files are stacked in a fan pattern with rotations:
  - Up to 5 files can be displayed
  - Each file rotated at different angles: 300°, 315°, 330°, 345°, 0°
  - Positioned at: left positions [0, 14, 32, 48, 63]px, top positions [14.16, 5.47, 0, 6.09, 11]px
- Each file card:
  - Images: 46x46px square thumbnails with rounded corners, white background
  - PDFs: 46px height, auto width, light pink background (#fef5f4), border (#fcc0b9), PDF icon
- **Hover Behavior**: When hovering over the fan container, ALL files scale to 1.1x simultaneously with smooth animation
- Close button (X) appears on each file in top-right corner
- Smooth entrance animations with staggered delays (0.1s per file)

#### List Layout (Edit Mode)
- Clicking the fan switches to list mode
- Files display vertically in a list to the left of input
- Each list item:
  - Fixed width: 280px
  - Height: 46px
  - Light pink background (#fef5f4) with border (#fcc0b9)
  - Rounded corners (8px)
  - Image thumbnails: 36x36px on left
  - PDF icon: 20x20px on left
  - Filename displayed with ellipsis if too long
  - Close button appears on hover (top-right, white background, rounded)
- Smooth transition animation between fan and list modes using Framer Motion layout animations
- Files should NOT disappear during transition - use AnimatePresence with mode="sync"

#### Animation Requirements
- Use Framer Motion for all animations
- Layout transitions: 0.5s duration, ease [0.4, 0, 0.2, 1]
- Scale animations: 0.3s duration
- Staggered entrance delays: 0.1s per file
- Smooth hover transitions
- Files should maintain their identity during layout changes (use layoutId)

### 4. Design System

#### Colors
- Background: White with subtle pink gradient
- Primary brand: #f08b7d (red/orange)
- Light brand: #fef5f4 (light pink)
- Border: #fcc0b9 (pink)
- Text primary: #2D2925 (dark gray)
- Text secondary: #5a544e (medium gray)
- Text placeholder: #8f8782 (light gray)
- Border default: #e5e1dd (light gray)

#### Typography
- Font: 'Sora', sans-serif
- Heading: Large, bold, dark
- Body: 16px, regular weight
- Filenames: 13px, regular weight

#### Spacing
- Use consistent spacing scale (8px base unit)
- Generous padding and margins
- Rounded corners: 8px standard, 4px for small elements, 20px for buttons

### 5. Layout Structure
```
┌─────────────────────────────────────┐
│         Header/Navigation           │
├─────────────────────────────────────┤
│                                     │
│      "What you wanna cook?"         │
│  "Turn any recipe into..."          │
│                                     │
│    [Fan of Files]  [Chat Input]     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### 6. Interactive Behaviors
- File upload via button click or drag-and-drop
- Support multiple file types: images (JPEG, PNG, GIF, WebP) and PDFs
- File preview generation for images
- Remove files individually
- Click fan to toggle to list view
- Click list to toggle back to fan view
- Smooth state transitions
- Loading states during recipe extraction

### 7. Responsive Considerations
- Centered max-width container (720px for chat input)
- Mobile-friendly touch targets
- Responsive file display

## Key Implementation Details

### File Attachment Component Structure
```typescript
- AttachedFiles (main container)
  - Fan Mode:
    - AttachedFileFanItem[] (absolute positioned, rotated)
  - List Mode:
    - AttachedFileListItem[] (vertical stack)
```

### Animation Patterns
- Use `layout` prop on motion.div for smooth position transitions
- Use `layoutId` to maintain element identity across layout changes
- Use `AnimatePresence` with `mode="sync"` to prevent disappearing during transitions
- Hover states controlled via React state, not CSS :hover

### File Handling
- Generate preview URLs for images using URL.createObjectURL
- Display PDF icon for PDF files
- Validate file types and sizes (10MB max per file)
- Clean up object URLs on unmount

## Reference Design
The design should match the clean, minimalist aesthetic of a modern recipe management tool with:
- Soft, warm color palette (pinks, whites, grays)
- Smooth, delightful animations
- Clear visual hierarchy
- Intuitive interactions
- Professional yet approachable feel

## Must-Have Features
1. ✅ Fan layout for attached files with rotations
2. ✅ Hover effect that scales ALL fan items together
3. ✅ Smooth transition to list view on click
4. ✅ List view with full filenames (280px width, ellipsis overflow)
5. ✅ Close buttons on hover in list mode
6. ✅ Smooth animations throughout
7. ✅ File type support (images + PDFs)
8. ✅ Clean, modern UI matching the description

## Nice-to-Have Features
- Drag and drop file upload
- File size validation
- Multiple file selection
- Loading states
- Error handling

---

**Note for V0**: Focus on getting the file attachment fan/list animation system working perfectly - this is the most complex and visually distinctive feature. The smooth transitions and hover behaviors are critical for the user experience.

