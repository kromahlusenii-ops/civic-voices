# Real Data & Credibility — Legislative Dashboard Roadmap

**Status:** Phase 1 in progress  
**Last updated:** February 2025

**Implemented:**
- `GET /api/legislative/signals?subcategoryId=&state=&city=` — runs search + AI for a subcategory, returns posts + analysis + credibility
- IssueDetailView fetches real data on mount, shows posts with credibility badges, AI briefing, sentiment bar

The legislative dashboard (categories → subcategories → issue detail) currently uses mock data. This doc outlines how to wire real social post data, AI analysis, and credibility scores.

---

## Current State

| Layer | Data source | Status |
|-------|-------------|--------|
| **Search results** (main search box) | X, Reddit, TikTok, YouTube APIs | ✅ Real |
| **AI analysis** (search results) | Claude on real posts | ✅ Real |
| **Credibility scores** (search results) | `processPostsCredibility()` on real posts | ✅ Real |
| **Legislative dashboard** | `lib/data/subcategorySignals.ts` | ❌ Mock |
| **Subcategory cards** | `SUBCATEGORY_SIGNALS` (score, delta, postCount, sentiment) | ❌ Mock |
| **Issue detail** | `ISSUE_DETAIL_MOCK` (summary, conversations, bill angles) | ❌ Mock |
| **311 signals** | `MOCK_311_SIGNALS` | ❌ Mock |

**Credibility already exists** for real posts. Each post gets `credibilityScore` (0–1) and `credibilityTier` (official, news, journalist, expert, verified, unknown). See `lib/credibility/`, `VerificationBadge`, and report Top Voices.

---

## Goal

1. **Pull real data** — Run searches per subcategory using taxonomy search queries, store results
2. **AI analysis** — Run AI on real posts per subcategory for briefings, sentiment, bill angles
3. **Credibility** — Surface credibility in dashboard: per-post badges, aggregate “source quality” metric

---

## Phased Plan

### Phase 1: Background search + cache (MVP)

1. **On-demand search per subcategory**
   - When user opens a category or subcategory, trigger search using `subcategory.searchQuery` + taxonomy keywords + user’s geo (city/state)
   - Reuse existing `/api/search` or streaming route; pass `query`, `state`, `city`, `sources`
   - Cache results (Redis or DB) keyed by `subcategoryId + geoScope + timeRange` (e.g. 24h TTL)

2. **Show real post count**
   - Replace mock `postCount` with `posts.length` from cached search
   - Only show count when real data exists; hide or show “—” when no data

3. **API shape**
   - New endpoint: `GET /api/legislative/signals?categoryId=&subcategoryId=&state=&city=` (optional)
   - Returns: `{ posts: Post[], aiAnalysis: AIAnalysis | null, credibility?: { avgScore, verifiedCount } }`
   - Backend: run search, run AI analysis, run `processPostsCredibility`, return

### Phase 2: Issue detail from real data

1. **Replace Issue Detail mock**
   - When user clicks subcategory, load cached search results for that subcategory
   - Show: real posts (with credibility badges), real AI briefing, real sentiment breakdown
   - “Who’s Talking” = top posts by engagement, with credibility tier labels
   - “Potential Bill Angles” = from AI analysis (already in AI response shape)

2. **Credibility in UI**
   - Post cards: `VerificationBadge` / `CredibilityIndicator` (already used in search results)
   - Aggregate: e.g. “12 verified sources” or “Avg. source credibility: 72%” from `credibilitySummary`

### Phase 3: Signal score from real data

1. **Compute legislative signal score** (per MASTER_PROMPT formula)
   - Volume (20%), velocity (20%), sentiment intensity (15%), cross-platform (15%), 311 (15%), engagement (10%), geo concentration (5%)
   - Requires: historical post counts (batch job or time-series), 311 integration when available
   - Start with simplified: volume + sentiment + engagement from current search

2. **Display**
   - Show score only when computed from real data
   - Add tooltip: “Based on 534 posts from last 7 days”

---

## Credibility Integration Points

| Where | How |
|-------|-----|
| **Subcategory cards** | “N posts · 8 verified sources” when real data loaded |
| **Issue detail — conversation feed** | Credibility badge on each post (same as search results) |
| **Issue detail — Who’s Talking** | Sort by credibility tier, then engagement |
| **AI briefing** | Optional: “Sources include 3 news outlets, 2 official accounts” in prompt or post-processing |

No new credibility logic needed — reuse `processPostsCredibility` and existing types.

---

## Tech Notes

- **Search API** already supports `state`, `city` for geo-scoped search
- **Taxonomy** has `searchQuery` and keywords per subcategory (`lib/data/taxonomy.ts`)
- **Caching** — consider Upstash Redis or Prisma `LegislativeSignalCache` table
- **Cost** — each subcategory search = 1 search + 1 AI call; cache aggressively, respect rate limits

---

## Immediate Next Steps

1. Add `GET /api/legislative/signals` that runs search + AI for a subcategory + geo
2. In SubcategoryView: fetch signals on mount, show real post count when available
3. In IssueDetailView: fetch and show real posts + AI briefing instead of mock
4. Add credibility summary to API response and surface in UI
