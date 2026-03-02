# Personalized Topics Loading State Fix

## Issue

When refreshing the search page, all categories were briefly shown before user's selected topics loaded, causing a confusing experience.

**User report:** "on refresh I am seeing all topics"

## Root Cause

The `userSelectedTopics` state was initialized as an empty array `[]`:

```typescript
const [userSelectedTopics, setUserSelectedTopics] = useState<string[]>([]);
```

**Problem flow:**
1. Page loads → `userSelectedTopics = []`
2. Components check: `selectedTopicIds.length > 0 ? filtered : ALL`
3. Since array is empty, shows ALL topics
4. ~500ms later, API returns user's topics
5. UI updates to show only user's topics
6. Result: Flickering from "all topics" → "user's topics"

## Solution

### 1. Added Loading State

Changed state to distinguish between "loading" vs "empty":

```typescript
// null = still loading, [] = loaded but empty
const [userSelectedTopics, setUserSelectedTopics] = useState<string[] | null>(null);
const [userTopicsLoaded, setUserTopicsLoaded] = useState(false);
```

### 2. Updated Fetch Logic

```typescript
useEffect(() => {
  if (!isAuthenticated || loading) return;
  
  fetch('/api/topics')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data?.selectedTopics) {
        setUserSelectedTopics(data.selectedTopics);
      } else {
        setUserSelectedTopics([]); // No topics selected
      }
      setUserTopicsLoaded(true); // Mark as loaded
    })
    .catch(err => {
      console.error('Failed to fetch user topics:', err);
      setUserSelectedTopics([]); // Fallback to empty on error
      setUserTopicsLoaded(true);
    });
}, [isAuthenticated, loading]);
```

### 3. Added Loading UI

```typescript
{viewMode === "dashboard" && (
  <>
    {!userTopicsLoaded ? (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Loading your topics...</p>
        </div>
      </div>
    ) : (
      <LegislativeSignalOverview
        selectedTopicIds={userSelectedTopics ?? []}
        ...
      />
    )}
  </>
)}
```

### 4. Updated Component Defaults

```typescript
export default function LegislativeSignalOverview({
  selectedTopicIds = [], // Default to empty array
  ...
}: LegislativeSignalOverviewProps) {
  const filteredCategories = selectedTopicIds.length > 0
    ? TAXONOMY.filter(cat => 
        cat.subcategories.some(sub => selectedTopicIds.includes(sub.id))
      )
    : TAXONOMY
```

## User Experience

**Before fix:**
1. Refresh page
2. See ALL 40+ topics briefly
3. Flicker to user's 5 selected topics
4. Confusing

**After fix:**
1. Refresh page
2. See "Loading your topics..." spinner
3. Smooth transition to user's 5 selected topics
4. No flickering, no confusion

## Benefits

1. **No flickering:** User never sees the wrong content
2. **Clear feedback:** Loading spinner shows something is happening
3. **Fast perceived performance:** Better than showing wrong content first
4. **Proper state management:** Distinguishes loading, empty, and populated states

---

**Fixed:** 2026-02-18  
**Type:** UX improvement - loading state  
**Impact:** Smooth page refresh experience with personalized topics
