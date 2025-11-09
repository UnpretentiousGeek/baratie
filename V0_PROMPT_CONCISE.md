# V0 Prompt (Concise Version - Copy This)

Create a modern recipe management app called "Baratie" with React, TypeScript, and Framer Motion.

**Hero Section:**
- Large heading: "What you wanna cook?"
- Subtitle: "Turn any recipe into an interactive cooking guide"
- Centered, minimalist design with white-to-light-pink gradient background

**Chat Input:**
- Large rounded input field (8px radius) with placeholder: "Ask Baratie to extract or make changes to a recipe..."
- White background, light gray border (#e5e1dd)
- Plus button (left) and red arrow-up button (right) on the right side
- Smooth hover effects

**File Attachment System (CRITICAL):**

**Fan Layout (Default):**
- Files display in a fan pattern to the left of input (absolute: left -39px, top -29px)
- Up to 5 files, each rotated: 300°, 315°, 330°, 345°, 0°
- Positions: left [0, 14, 32, 48, 63]px, top [14.16, 5.47, 0, 6.09, 11]px
- Image files: 46x46px square thumbnails, white background
- PDF files: 46px height, light pink (#fef5f4), border (#fcc0b9), PDF icon
- **On hover: ALL files scale to 1.1x simultaneously** with smooth animation
- Close button (X) on each file
- Staggered entrance animations (0.1s delay per file)

**List Layout (Edit Mode - Click to toggle):**
- Vertical list, 280px width per item, 46px height
- Light pink background (#fef5f4), border (#fcc0b9)
- Image: 36x36px thumbnail + filename (ellipsis if long)
- PDF: 20x20px icon + filename (ellipsis if long)
- Close button appears on hover (top-right, white, rounded)
- **Smooth transition between fan/list using Framer Motion layout animations**
- Files must NOT disappear during transition (use AnimatePresence mode="sync")

**Colors:**
- Primary: #f08b7d (red/orange)
- Light: #fef5f4 (pink)
- Border: #fcc0b9 (pink)
- Text: #2D2925 (dark), #5a544e (medium), #8f8782 (placeholder)

**Animations:**
- Layout transitions: 0.5s, ease [0.4, 0, 0.2, 1]
- Use layoutId for element identity across layout changes
- Scale animations: 0.3s
- All hover effects smooth and coordinated

**Requirements:**
- React 18 + TypeScript + Framer Motion
- Support image files (JPEG, PNG, GIF, WebP) and PDFs
- File preview generation
- Remove files individually
- Click fan ↔ list toggle
- Clean, modern UI matching the description

**Focus:** The file attachment fan/list animation system is the most complex feature - get the smooth transitions and coordinated hover behaviors working perfectly.

