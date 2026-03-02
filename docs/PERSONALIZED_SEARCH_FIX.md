# Personalized Search Page Fix

## Issue

After completing onboarding, the search page was showing **ALL** categories and subcategories from the taxonomy, not just the ones the user selected during onboarding.

**User expectation:** "I thought I would just see the search screen with categories and subcategories we selected"

## Solution

Modified the search page to display only the user's selected topics from onboarding, creating a personalized experience.

## Changes Made

### 1. Updated `LegislativeSignalOverview` Component

**File:** `/app/search/components/LegislativeSignalOverview.tsx`

- Added `selectedTopicIds` prop (array of subcategory IDs from onboarding)
- Filters categories to show only those containing selected subcategories
- Updates header text from "LEGISLATIVE SIGNAL OVERVIEW" to "YOUR TOPICS" when personalized

**Before:**
```typescript
// Shows ALL categories
{TAXONOMY.map((cat) => { ... })}
```

**After:**
```typescript
// Shows only categories with selected subcategories
const filteredCategories = selectedTopicIds && selectedTopicIds.length > 0
  ? TAXONOMY.filter(cat => 
      cat.subcategories.some(sub => selectedTopicIds.includes(sub.id))
    )
  : TAXONOMY // Fallback to all if no topics selected

{filteredCategories.map((cat) => { ... })}
```

### 2. Updated `SubcategoryView` Component

**File:** `/app/search/components/SubcategoryView.tsx`

- Added `selectedTopicIds` prop
- Filters subcategories within a category to show only selected ones

**Before:**
```typescript
{category.subcategories.map((sub) => { ... })}
```

**After:**
```typescript
{category.subcategories
  .filter(sub => !selectedTopicIds || selectedTopicIds.length === 0 || selectedTopicIds.includes(sub.id))
  .map((sub) => { ... })}
```

### 3. Updated Search Page

**File:** `/app/search/page.tsx`

- Added `userSelectedTopics` state to store user's selections
- Added `useEffect` to fetch user's topics from `/api/topics` on mount
- Passed `selectedTopicIds` to both `LegislativeSignalOverview` and `SubcategoryView`

**New code:**
```typescript
// State for user's selected topics
const [userSelectedTopics, setUserSelectedTopics] = useState<string[]>([]);

// Fetch user's selected topics from onboarding
useEffect(() => {
  if (!isAuthenticated || loading) return;
  
  fetch('/api/topics')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data?.selectedTopics) {
        setUserSelectedTopics(data.selectedTopics);
      }
    })
    .catch(err => console.error('Failed to fetch user topics:', err));
}, [isAuthenticated, loading]);

// Pass to components
<LegislativeSignalOverview
  selectedTopicIds={userSelectedTopics}
  ...
/>

<SubcategoryView
  selectedTopicIds={userSelectedTopics}
  ...
/>
```

## User Experience Flow

### Before Fix:
1. Complete onboarding → Select 5 topics
2. Redirected to search page → See ALL 40+ topics
3. Overwhelming, not personalized

### After Fix:
1. Complete onboarding → Select 5 topics (e.g., "Affordable Housing", "Healthcare Access")
2. Redirected to search page → See only categories containing those 5 topics
3. Click category → See only your 5 selected subcategories
4. Personalized, focused experience

## Benefits

1. **Personalization:** Users see only what they care about
2. **Reduced cognitive load:** Fewer options = faster navigation
3. **Immediate value:** Straight to the topics they selected
4. **Consistency:** Onboarding selections carry through to main app

## Fallback Behavior

If user has no selected topics (edge case):
- Shows ALL categories and subcategories
- Ensures app is still usable even without onboarding completion

## Testing

To verify the personalization:
1. Complete onboarding and select 3-5 topics
2. Land on search page
3. ✅ Should see only categories containing your topics (not all categories)
4. Click a category
5. ✅ Should see only your selected subcategories within that category

---

**Fixed:** 2026-02-18  
**Feature:** Personalized search page based on onboarding selections  
**Impact:** Improved UX, reduced information overload
