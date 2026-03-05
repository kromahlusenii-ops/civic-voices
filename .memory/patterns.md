# Patterns

## Keyword chips with incremental fetch + merge
- **Where:** `IssueDetailView.tsx`
- **Pattern:** Show all `subcategory.socialKeywords` as chips. Track queried keywords in a `Set<string>`. On click, fetch signals API with that keyword, deduplicate by post ID, merge into `additionalPosts` state. An `allPosts` memo combines base + additional posts. All downstream (filters, sentiment, post count) operates on `allPosts`.
- **Key detail:** Initialize `queriedKeywords` from `cached.query` only when the set is empty (prevents wiping user-clicked keywords on effect re-runs). Reset keyword state in a separate effect keyed on `subcategory.id`.

## Platform-grouped post sections with load-more pagination
- **Where:** `IssueDetailView.tsx`
- **Pattern:** `groupedByPlatform` memo groups `filteredPosts` by `post.platform`, sorts groups by count descending. Inline `PlatformSection` component (same pattern as `FilterButton`) renders each group with: clickable header (left border accent from `PLATFORM_STYLES`, badge, count pill, rotating chevron), first 10 posts via `SearchPostCard`, and a "Load more (N remaining)" button. Two `Set<string>` states: `collapsedPlatforms` (which sections are collapsed) and `expandedPlatforms` (which show all posts). Both reset on `subcategory.id` change.
- **Key detail:** Works naturally with existing platform filter — when filter is set, `filteredPosts` already contains only that platform, so only one group renders. No special-casing needed.

## Signals API cache key extension
- **Where:** `app/api/legislative/signals/route.ts`
- **Pattern:** When adding a new query dimension (e.g. keyword), append it to the subcategoryId segment in `buildSignalsCacheKey` rather than modifying the function signature. Format: `subcategoryId:kw:<keyword>`.
