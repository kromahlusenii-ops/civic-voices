# UI Layout Shift Fix - Location Toggle

## Issue

The UI was shifting/jumping when toggling between location filters (Charlotte, NC, National). Platform badges and time dropdown would move around as the layout reflowed.

**User report:** "the UI shifts a little when I toggle location filter"

## Root Cause

**Dynamic content width** causing layout reflow.

**File:** `/app/search/page.tsx` lines 1199-1226

**Before:**
```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-wrap items-center gap-3">
    <GeoScopeToggle ... />  // Width changes based on text length
    <div className="flex items-center gap-2">
      <span>Time:</span>
      <select>...</select>
    </div>
  </div>
  <PlatformBadges ... />  // Shifts position as left side resizes
</div>
```

**Problem:**
- "Charlotte" (9 chars) vs "National" (8 chars) = different widths
- GeoScopeToggle expands/contracts based on content
- Other elements reflow to accommodate size changes
- Result: Visible jumping/shifting

## Solution Applied

### 1. Added Fixed Container Widths

**File:** `/app/search/page.tsx`

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-wrap items-center gap-3 min-w-0">
    <div className="shrink-0">  {/* Prevents shrinking */}
      <GeoScopeToggle ... />
    </div>
    <div className="flex items-center gap-2 shrink-0">  {/* Prevents shrinking */}
      <span className="whitespace-nowrap">Time:</span>  {/* Prevents wrapping */}
      <select>...</select>
    </div>
  </div>
  <div className="shrink-0">  {/* Prevents shrinking */}
    <PlatformBadges ... />
  </div>
</div>
```

### 2. Added Minimum Width to GeoScopeToggle

**File:** `/app/search/components/GeoScopeToggle.tsx`

```tsx
<div
  className="flex rounded-lg p-1"
  style={{
    backgroundColor: "rgba(0,0,0,0.025)",
    border: "1px solid rgba(0,0,0,0.06)",
    minWidth: "360px",  // Fixed minimum width
  }}
>
  {options.map((opt) => (
    <button
      className="flex flex-col rounded-md px-4 py-2 text-left transition-colors flex-1"  // flex-1 distributes space evenly
      ...
    >
```

## CSS Classes Added

| Class | Purpose |
|-------|---------|
| `shrink-0` | Prevents elements from shrinking in flex layout |
| `min-w-0` | Allows flex children to shrink below content size if needed |
| `whitespace-nowrap` | Prevents text from wrapping to new line |
| `flex-1` | Distributes available space evenly among children |

## Benefits

**Before:**
- Toggle location → Elements jump around
- Jarring visual experience
- Hard to track which button you're clicking

**After:**
- Toggle location → Smooth, stable layout
- GeoScopeToggle has consistent 360px minimum width
- Buttons expand/contract internally without affecting other elements
- Platform badges stay in same position
- Time dropdown stays in same position

## Testing

To verify the fix:
1. Navigate to search page
2. Toggle between "Charlotte", "NC", and "National"
3. ✅ UI should remain stable
4. ✅ Platform badges should not move
5. ✅ Time dropdown should not jump
6. ✅ Only the text inside GeoScopeToggle buttons should change

---

**Fixed:** 2026-02-18  
**Type:** UX improvement - layout stability  
**Impact:** Eliminated jarring UI shifts when changing location filters
