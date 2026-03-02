# Editorial Design Update - Onboarding Flow

## Overview

Updated the entire onboarding flow to match the home page's editorial/newspaper aesthetic. The design now features a cohesive, professional look inspired by classic newspaper layouts.

## Design Language

### Typography
- **Headings**: `font-display` (Anybody) with tight tracking
- **Body/Labels**: `font-mono` (DM Mono) in small caps with wide tracking
- **Hierarchy**: UPPERCASE labels, sentence case for content

### Colors
- **Primary**: `stone-900` (black) for borders and text
- **Accent**: `red-600` for selected states and hovers
- **Background**: `stone-50` with grain texture
- **Neutrals**: `stone-300`, `stone-600` for subtle elements
- **Highlights**: `yellow-200`/`yellow-500` for recommended topics

### Layout Elements
- **Borders**: Bold 2-4px borders (`border-2`, `border-4`)
- **Grain Texture**: Fixed grain overlay on all backgrounds
- **Sharp Corners**: No rounded corners (editorial boxes)
- **Heavy Typography**: Bold mono fonts with wide letter-spacing

## Updated Components

### 1. RoleSelectionScreen (`app/onboarding/components/RoleSelectionScreen.tsx`)
**Changes:**
- Newspaper masthead header with "CIVIC VOICES" branding
- Grid layout of role cards with bold borders
- Corner ribbon indicator for selected role
- Search input removed in favor of cleaner card selection
- 12 specific roles displayed in categorized grid

**Visual Features:**
- 2px borders on unselected cards, red border + bg on selected
- Category grouping maintained but simplified
- Check icon in corner ribbon for selection feedback

### 2. WelcomeScreen (`app/onboarding/components/WelcomeScreen.tsx`)
**Changes:**
- Editorial header with publication details
- Three-column layout (newspaper style)
- Feature boxes with bold borders
- Removed rounded elements
- Editorial CTA button

**Visual Features:**
- Border-heavy card layout
- Mono font for all text
- Time estimate in bordered banner
- Feature callout with left border accent

### 3. TopicSelectionScreen (`app/onboarding/components/TopicSelectionScreen.tsx`)
**Changes:**
- Full-width editorial header
- Selection counter in header bar
- Accordion sections with section mastheads
- Checkbox listings (classified ad style)
- Yellow left border for recommended topics

**Visual Features:**
- Bold 2px category borders
- Masthead-style headers for each category
- "⭐ PICK" badge for recommended topics
- Square checkboxes (no rounded corners)
- Stone-50 background for expanded sections

### 4. GeographicFocusScreen (`app/onboarding/components/GeographicFocusScreen.tsx`)
**Changes:**
- Three scope cards (National, State, City)
- Editorial form box for dropdowns
- Bold navigation buttons
- Red border for selected scope

**Visual Features:**
- Grid of scope option cards
- Form container with section masthead
- UPPERCASE dropdown options
- Back/Continue buttons with borders

### 5. ReviewScreen (`app/onboarding/components/ReviewScreen.tsx`)
**Changes:**
- Review sections as editorial boxes
- Category grouping with left border accents
- Edit buttons styled as editorial links
- Disclaimer banner with left border
- Large launch CTA button

**Visual Features:**
- Topic tags as bordered chips (stone-100)
- Category headers in small uppercase mono
- Section mastheads with edit links
- Loading spinner in button

## New CSS Classes

Added to `app/globals.css`:

```css
.grain::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.03;
  pointer-events: none;
  z-index: 1;
}
```

## Color Palette Reference

```css
/* Primary Text & Borders */
stone-900: #1c1917

/* Secondary Text */
stone-600: #57534e
stone-500: #78716c

/* Backgrounds */
stone-50: #fafaf9
stone-100: #f5f5f4

/* Accents */
red-600: #dc2626
red-50: #fef2f2

/* Recommended Topics */
yellow-200: #fef08a
yellow-400: #facc15
yellow-500: #eab308
```

## Typography Classes

```css
/* Section Headers */
.font-mono text-xs font-bold tracking-[0.15em] uppercase

/* Body Text */
.font-mono text-[10px] text-stone-600 leading-relaxed

/* Headings */
.font-display text-4xl md:text-5xl tracking-tight
```

## Responsive Behavior

All screens maintain the editorial aesthetic across breakpoints:
- Mobile: Single column, full-width sections
- Tablet: Grid layouts (md:grid-cols-2 or md:grid-cols-3)
- Desktop: Max-width constraint (max-w-4xl)

## Testing

To test the updated design:

```bash
npm run dev
# Navigate to http://localhost:3000/signup
# Complete sign-up and observe the onboarding flow
```

## Files Modified

1. `app/onboarding/components/RoleSelectionScreen.tsx`
2. `app/onboarding/components/WelcomeScreen.tsx`
3. `app/onboarding/components/TopicSelectionScreen.tsx`
4. `app/onboarding/components/GeographicFocusScreen.tsx`
5. `app/onboarding/components/ReviewScreen.tsx`
6. `app/onboarding/page.tsx` (removed `handleSkip` function)
7. `app/globals.css` (added `.grain` class)

## Build Status

✅ Build successful with no errors
- All TypeScript types verified
- ESLint checks passed
- Next.js optimization complete

---

**Last Updated:** February 17, 2026  
**Design System:** Newspaper Editorial Aesthetic  
**Status:** Production Ready
