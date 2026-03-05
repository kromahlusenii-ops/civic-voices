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

## ADR-005: Topic editing from settings modal
- **Date:** 2026-03-05
- **Status:** Active
- **Context:** Users could only select topics during onboarding. No way to change tracked topics afterward without re-doing onboarding.
- **Decision:** Added "Tracked topics" section to Settings > Preferences tab with category accordion, subcategory checkboxes, auto-save (800ms debounce), and `onTopicsChange` callback that updates the search dashboard without page reload. Updated `/api/topics` POST to support partial updates (topics-only without clearing geo preferences).
- **Files:** `components/SettingsModal.tsx`, `app/api/topics/route.ts`, `app/search/page.tsx`

## ADR-004: Added Arts & Culture as 10th taxonomy category
- **Date:** 2026-03-05
- **Status:** Active
- **Context:** Taxonomy had 9 categories / 56 subcategories. Arts & culture topics (public art, arts funding, cultural venues, festivals, arts education, heritage preservation, creative economy, local journalism) had no home in the existing taxonomy.
- **Decision:** Added "Arts & Culture" category (sortOrder: 10, color #C06090) with 8 subcategories. All components (dashboard, search, onboarding) consume the TAXONOMY array reactively so no other files needed changes.
- **Files:** `lib/data/taxonomy.ts`
