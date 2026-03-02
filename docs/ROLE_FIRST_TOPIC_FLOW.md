# Role-First Topic Selection Flow

## Overview

Updated the onboarding flow to **pre-select topics immediately after role selection**, then ask users to confirm, delete, or add topics. This creates a more streamlined experience with smart defaults.

## Updated User Journey

### New Flow (Optimized)
1. **Role Selection** → Select role (e.g., "Government Communications")
2. **Pre-selection Happens** → System auto-selects 5-8 relevant topics based on role
3. **Topic Confirmation** → User sees pre-selected topics, can:
   - ✅ Keep all recommended
   - ❌ Clear all and start fresh
   - ✏️ Uncheck unwanted topics
   - ➕ Expand categories to add more
4. **Geographic Focus** → Select National, State, or City
5. **Review & Launch** → Confirm all selections

### Old Flow (Removed)
- ~~Welcome Screen~~ → **REMOVED** (went straight to topics after role)

## Key Changes

### 1. Skip Welcome Screen
**File:** `app/onboarding/page.tsx`

```typescript
// After role selection, go directly to topics (not welcome)
const handleRoleContinue = () => {
  if (userUseCase) {
    setCurrentScreen('topics') // Changed from 'welcome'
  }
}
```

### 2. Auto-Expand Relevant Categories
**File:** `app/onboarding/components/TopicSelectionScreen.tsx`

```typescript
// Auto-expand categories that have recommended topics
const categoriesWithRecommendations = TAXONOMY
  .filter(cat => cat.subcategories.some(sub => recommendedTopics.includes(sub.id)))
  .map(cat => cat.id)

const [expandedCategories, setExpandedCategories] = useState<string[]>(
  categoriesWithRecommendations.length > 0 ? categoriesWithRecommendations : ['housing']
)
```

### 3. Enhanced Topic Selection Screen

**New Features:**
- **Instructional callout** explaining pre-selection
- **Quick action buttons**:
  - "Keep All Recommended" - accepts all pre-selected topics
  - "Clear All & Start Fresh" - removes all selections
- **Visual indicators**:
  - Categories with recommended topics show ⭐ icon
  - Category headers get yellow background tint
  - "⭐ PICK" badge on recommended topics
  - Counter shows "X of Y recommended kept"

**UI Components:**

```typescript
// Instructions box with quick actions
<div className="bg-white border-2 border-red-600">
  <div className="border-b-2 border-red-600 p-4 bg-red-50">
    📋 Review Pre-Selected Topics
  </div>
  <div className="p-4">
    <p>We've selected X topics based on your role...</p>
    <button onClick={() => onSetTopics?.(recommendedTopics)}>
      Keep All Recommended
    </button>
    <button onClick={() => onSetTopics?.([])}>
      Clear All & Start Fresh
    </button>
  </div>
</div>
```

### 4. Updated Header Messaging

**Before:**
```
Select Your Topics
Choose 3-10 civic issues to track
```

**After:**
```
Confirm Your Topics
We've pre-selected X topics based on your role. Add or remove as needed.
```

## Visual Design

### Instructional Callout
- **Border:** Red 2px border with red-50 header background
- **Icon:** 📋 emoji for visual anchor
- **Buttons:** Editorial style (stone-900 bg / white border)

### Category Headers with Recommendations
- **Background:** Yellow-50 tint (30% opacity)
- **Icon:** ⭐ next to category name
- **Badge:** Yellow "⭐ PICK" badge on individual topics

### Counter Display
```
12 TOPICS SELECTED (8 of 10 recommended kept)  [⭐ PICK = Recommended for your role]
```

## New Props

### TopicSelectionScreen
Added `onSetTopics` prop for bulk topic selection:

```typescript
interface TopicSelectionScreenProps {
  selectedTopics: string[]
  onToggleTopic: (topicId: string) => void
  onContinue: () => void
  userUseCase?: string | null
  onSetTopics?: (topicIds: string[]) => void // NEW
}
```

## User Actions

### 1. Keep All Recommended
```typescript
onSetTopics?.(recommendedTopics)
```
- Sets selected topics to all recommended topics
- Fast path for users who trust the recommendations

### 2. Clear All & Start Fresh
```typescript
onSetTopics?.([])
```
- Clears all selections
- Allows users to manually select from scratch

### 3. Individual Toggle (Existing)
```typescript
onToggleTopic(topicId)
```
- Check/uncheck individual topics
- Fine-grained control

## Examples by Role

### Government Communications (12 recommended topics)
**Pre-selected categories:**
- Housing & Development (2 topics)
- Public Safety & Justice (3 topics)
- Democracy & Governance (4 topics)
- Infrastructure & Transit (3 topics)

**User sees:**
- 4 expanded categories (auto-expanded)
- 12 topics pre-checked with ⭐ PICK badges
- Instructions: "We've selected 12 topics based on your role"
- Can uncheck unwanted ones or add more from collapsed categories

### Journalist (8 recommended topics)
**Pre-selected categories:**
- Public Safety & Justice
- Democracy & Governance
- Housing & Development

**User sees:**
- 3 expanded categories
- 8 topics pre-checked
- Can expand other categories (Education, Environment, etc.) to add more

## Benefits

1. **Reduced Cognitive Load:** Smart defaults based on role
2. **Faster Onboarding:** Most users can just click "Keep All"
3. **Transparency:** Clear instructions on what was pre-selected
4. **Flexibility:** Easy to override recommendations
5. **Progressive Disclosure:** Relevant categories auto-expanded

## Testing

To test the updated flow:

```bash
npm run dev
# 1. Navigate to /signup
# 2. Sign up with name/email
# 3. Select a role (e.g., "Government Communications")
# 4. Observe:
#    - Direct transition to topics (no welcome screen)
#    - Pre-selected topics with checkmarks
#    - Expanded categories with recommendations
#    - Instructional callout with quick actions
# 5. Try quick actions:
#    - "Keep All Recommended" button
#    - "Clear All & Start Fresh" button
# 6. Continue to location and review
```

## Files Modified

1. `app/onboarding/page.tsx`
   - Updated `handleRoleContinue` to skip welcome screen
   - Added `onSetTopics={setSelectedTopics}` prop

2. `app/onboarding/components/TopicSelectionScreen.tsx`
   - Auto-expand categories with recommendations
   - Added instructional callout box
   - Added quick action buttons
   - Enhanced header messaging
   - Added visual indicators for recommended topics
   - New `onSetTopics` prop for bulk operations

3. `app/onboarding/components/WelcomeScreen.tsx`
   - Still exists but currently unused (skipped in flow)
   - Can be re-enabled if needed

## Build Status

✅ **Build successful**
- TypeScript types verified
- ESLint checks passed
- Next.js optimization complete
- Build time: ~99 seconds

---

**Last Updated:** February 17, 2026  
**Flow Type:** Role-First with Pre-Selection  
**Status:** Production Ready
