# Architecture Decisions

## ADR-001: Signals API keyword parameter
- **Date:** 2026-03-04
- **Status:** Active
- **Context:** Each subcategory has 10–13 socialKeywords but the signals API only queried the first one. Users had no visibility into other keywords.
- **Decision:** Added optional `keyword` query param to `/api/legislative/signals`. When provided, overrides `getKeywordVariants()`. Keyword is embedded in Redis cache key as `:kw:<keyword>` so each keyword gets a separate cache entry.
- **Files:** `app/api/legislative/signals/route.ts`

## ADR-003: Group social posts by platform with collapsible sections
- **Date:** 2026-03-04
- **Status:** Active
- **Context:** With keyword chip merging, the flat post list grows large and becomes hard to scan. Users can't see which platforms contribute or jump to a specific platform's posts.
- **Decision:** Group `filteredPosts` by `post.platform` in a `groupedByPlatform` memo, sorted by post count descending. Each group renders in a `PlatformSection` inline component with: colored header bar (uses `PLATFORM_STYLES`/`PLATFORM_LABELS`), collapse/expand toggle, and "Load more" pagination (first 10 shown, button reveals rest). State: `collapsedPlatforms` and `expandedPlatforms` Sets, both reset on subcategory change. When a platform filter is active, `filteredPosts` already contains only that platform so a single group renders naturally.
- **Files:** `app/search/components/IssueDetailView.tsx`

## ADR-002: Remove Key Themes sidebar (duplicate of Synthesize panel)
- **Date:** 2026-03-04
- **Status:** Active
- **Context:** "Key Themes" (left sidebar) and "What People Want" (right Synthesize panel) showed overlapping info because both are generated from a single AI prompt call.
- **Decision:** Removed Key Themes from sidebar. Synthesize panel ("What People Want" + "Topic Breakdown") is the single source for thematic analysis.
- **Files:** `app/search/components/IssueDetailView.tsx`
