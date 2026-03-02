# Unified Dashboard Experience

## User Request

"everything should be in on one dashboard so B"

User wanted **Option B**: Everything on one unified page - no redirects between different pages.

## Solution

The `/search` page already functions as a complete unified dashboard with:
- **Category overview** - Shows your personalized topics
- **Subcategory drill-down** - Click category → see your subcategories
- **Issue detail view** - Click subcategory → see search results
- **All on one page** - No redirects, seamless navigation with view states

## Implementation

### 1. Primary Destination: `/search`

After onboarding, users go directly to `/search` which serves as the unified dashboard.

**File:** `/app/onboarding/page.tsx`
```typescript
// Success! Redirect to search page (unified dashboard)
window.location.href = '/search'
```

### 2. Dashboard Redirects to Search

The `/dashboard` route now immediately redirects to `/search` to maintain a single unified experience.

**File:** `/app/dashboard/page.tsx`
```typescript
// Redirect to search page (unified dashboard)
useEffect(() => {
  router.push('/search')
}, [])
```

### 3. Personalized Content

The search page shows only YOUR selected topics from onboarding:
- Categories containing your topics
- Your subcategories within each category
- Labeled as "YOUR TOPICS" in the header

## User Journey

1. **Complete onboarding** → Select topics
2. **Land on `/search`** → See your categories
3. **Click a category** → See your subcategories (no redirect, same page)
4. **Click a subcategory** → See search results (no redirect, same page)
5. **Navigate back** → Return to category/overview (no redirect, same page)

All navigation happens via `viewMode` state:
- `"dashboard"` - Shows categories
- `"subcategory"` - Shows subcategories
- `"issue-detail"` - Shows results

## Benefits

### ✅ Single Unified Page
- No confusing redirects
- Everything in one place
- Seamless navigation

### ✅ Personalized Experience
- See only your topics
- Focus on what matters
- No information overload

### ✅ Efficient Architecture
- Reuses existing search page
- No duplicate functionality
- Clean, maintainable code

## Routes

| Route | Behavior |
|-------|----------|
| `/onboarding` | Complete → Redirect to `/search` |
| `/dashboard` | Immediately redirect to `/search` |
| `/search` | **Primary unified dashboard** |
| `/search?q=...` | Legacy search with query params (still works) |

## Technical Details

### View Mode State Machine

```typescript
viewMode: "dashboard" | "subcategory" | "issue-detail"

// Navigation flow:
dashboard → (click category) → subcategory → (click topic) → issue-detail
          ← (back button)    ←              ← (back button) ←
```

### Personalization

```typescript
// Fetches user's selected topics
const [userSelectedTopics, setUserSelectedTopics] = useState<string[]>([])

// Filters categories to show only those with selected subcategories
const filteredCategories = TAXONOMY.filter(cat => 
  cat.subcategories.some(sub => userSelectedTopics.includes(sub.id))
)
```

## Future Considerations

If we ever need a separate "quick overview" dashboard:
- Keep `/search` as the main unified experience
- Create `/overview` for a different purpose
- But for now, one unified page is cleaner

---

**Implemented:** 2026-02-18  
**Architecture:** Single-page dashboard with view state navigation  
**User Feedback:** "everything should be in on one dashboard"
