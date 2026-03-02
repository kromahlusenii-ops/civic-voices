# Sentiment Filter Bug Fix

## Issue

When filtering posts by sentiment (Positive/Negative/Neutral), no posts were displayed even though the sentiment bar showed that posts with that sentiment existed.

**Example:**
- Sentiment bar shows: 41% Positive posts
- User clicks "Positive" filter
- Result: "No posts found" (incorrect)

## Root Causes

### 1. Case Sensitivity Mismatch

**Case sensitivity bug** in the sentiment filter comparison.

**File:** `/app/search/components/IssueDetailView.tsx` line 131

**Before:**
```typescript
if (sentimentFilter !== "all") {
  list = list.filter((p) => (p.sentiment ?? "neutral") === sentimentFilter)
}
```

**Problem:**
- Filter button value: `"positive"` (lowercase)
- Post sentiment value: `"Positive"` (capitalized from API)
- Comparison: `"Positive" === "positive"` → `false` ❌
- Result: No posts matched, even though they exist

## Solution

Added `.toLowerCase()` to normalize the sentiment comparison:

**After:**
```typescript
if (sentimentFilter !== "all") {
  list = list.filter((p) => (p.sentiment ?? "neutral").toLowerCase() === sentimentFilter)
}
```

Now:
- Post sentiment: `"Positive".toLowerCase()` → `"positive"`
- Filter value: `"positive"`
- Comparison: `"positive" === "positive"` → `true` ✅
- Result: Posts correctly filtered

### 2. Sentiment Bar Calculated from Wrong Data Source

**File:** `/app/search/components/IssueDetailView.tsx` line 139

**Before:**
```typescript
const sentiment = data?.summary?.sentiment ?? { positive: 0, neutral: 0, negative: 0 }
const totalSent = sentiment.positive + sentiment.neutral + sentiment.negative || 1
const negPct = Math.round((sentiment.negative / totalSent) * 100)
```

**Problem:**
- Sentiment bar percentages calculated from `data.summary.sentiment` (API summary)
- But filters use individual `post.sentiment` values
- These two data sources were not synchronized
- Result: Bar shows 43% positive, but no positive posts exist when filtered

**After:**
```typescript
// Calculate sentiment from actual posts, not summary (ensures filter matches bar)
const sentimentCounts = useMemo(() => {
  if (!data?.posts || data.posts.length === 0) {
    return { positive: 0, neutral: 0, negative: 0 }
  }
  return data.posts.reduce(
    (acc, post) => {
      const sentiment = (post.sentiment ?? "neutral").toLowerCase()
      if (sentiment === "positive") acc.positive++
      else if (sentiment === "negative") acc.negative++
      else acc.neutral++
      return acc
    },
    { positive: 0, neutral: 0, negative: 0 }
  )
}, [data?.posts])
```

Now sentiment bar percentages match the actual filterable posts.

## Impact

**Before fix:**
- Sentiment filters appeared broken
- Users couldn't filter by sentiment despite data showing different sentiments exist
- Confusing UX - data showed positive posts but filter showed none

**After fix:**
- ✅ Positive filter shows positive posts
- ✅ Negative filter shows negative posts
- ✅ Neutral filter shows neutral posts
- ✅ Filter behavior matches sentiment bar data

## Testing

To verify the fix:
1. Navigate to any subcategory view (e.g., "Public Transit")
2. Check sentiment bar shows non-zero percentages
3. Click "Positive" filter
4. ✅ Should see positive posts (not "No posts found")
5. Click "Negative" filter
6. ✅ Should see negative posts
7. Click "Neutral" filter
8. ✅ Should see neutral posts

## Related

This is a common bug pattern when:
- Backend returns capitalized values ("Positive", "Negative", "Neutral")
- Frontend filters use lowercase values ("positive", "negative", "neutral")
- Always use `.toLowerCase()` or `.toUpperCase()` for string comparisons unless you control both sides

---

**Fixed:** 2026-02-18  
**Type:** Bug fix - case sensitivity  
**Severity:** High (core filtering feature broken)  
**Impact:** Sentiment filtering now works correctly
