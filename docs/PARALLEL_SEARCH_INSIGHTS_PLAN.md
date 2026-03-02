# Parallel Multi-Query Search & AI Insights Plan

**Status:** Draft  
**Created:** February 2025  
**Context:** Low post returns for some subcategories; need more social posts and clearer insights.

---

## Problem Statement

1. **Sparse results:** Some subcategories return very few posts because a single combined query (e.g., `"Affordable Housing rent prices housing costs section 8 housing crisis"`) may not match how people actually post. Platform APIs vary in how they interpret space-separated terms.

2. **No parallel broadening:** We make one query per subcategory. Running multiple focused queries in parallel and merging could increase recall.

3. **AI insights gap:** AI analysis provides interpretation, key themes, sentiment. Missing: explicit coverage/quality insights (e.g., "Limited data from TikTok; Reddit drove most volume" or "Consider expanding time range for fuller picture").

---

## Part 1: Parallel Multi-Query Search Strategy

### Current Behavior

- One query per search: `subcategory.searchQuery` = `"{name} {k1} {k2} {k3} {k4}"`
- One API call per platform per query
- Platforms receive the same single string

### Target Behavior

Run **2–4 parallel queries per subcategory** and merge/deduplicate results:

| Query variant | Example | Purpose |
|---------------|---------|---------|
| **Primary** | `Affordable Housing rent prices` | Subcategory name + top 2 keywords (baseline) |
| **Keyword pair 1** | `housing costs section 8` | Broader match for people using different phrasing |
| **Keyword pair 2** | `housing crisis rent` | Alternative pairings |
| **Single high-volume** | `childcare` or `rent prices` | For sparse subcategories; one high-signal keyword |

### Design Choices

1. **Query count:** 2–4 per subcategory. More = more API cost and rate-limit risk.

2. **Platform behavior:**
   - **Reddit (SociaVault):** Supports boolean; can use `(q1) OR (q2)` for platforms that allow it.
   - **X, TikTok, YouTube:** Most do not support OR; run separate searches and merge.

3. **Deduplication:** Merge by `post.id` (platform + id). Prefer relevance order from primary query when sorting.

4. **Rate limits:** Stagger or cap parallel requests per platform (e.g., max 2 concurrent per platform for paid tiers).

5. **Cost control:** 
   - Option A: Always run parallel queries (higher cost).
   - Option B: Run parallel only when primary query returns &lt; N posts (e.g., &lt; 20).
   - **Recommendation:** Option B to keep costs predictable.

### Implementation Phases

#### P6.1 — Query Variants (Low Risk)

**Scope:** Build query variants from taxonomy without changing API flow.

1. Add `getQueryVariants(subcategory): string[]` in `lib/data/taxonomy.ts`:
   - Return `[primaryQuery, variant2, variant3]` (2–3 variants max).
   - Primary = current `searchQuery` (name + top 2–4 keywords).
   - Variants = keyword pairs or single high-volume terms from `socialKeywords`.

2. Unit test: verify variants are non-empty and distinct.

**Deliverable:** `lib/data/taxonomy.ts` + `lib/data/taxonomy.test.ts`

---

#### P6.2 — Parallel Search in Main Search API

**Scope:** Support multi-query search in `/api/search`.

1. Extend `SearchParams`: optional `queryVariants?: string[]`. If present, run searches for each variant.

2. For each platform:
   - If `queryVariants` provided: run N searches in parallel (or 2 at a time to limit load), merge and dedupe by `post.id`.
   - If single `query` (current): keep existing behavior.

3. Post-merge: apply time filter, credibility scoring, and sort as today.

4. Add `warnings` when merge yields many duplicates (e.g., "X returned overlapping results; showing unique posts only").

**Deliverable:** `app/api/search/route.ts` changes; optional `queryVariants` support.

---

#### P6.3 — Parallel Search in Legislative Signals

**Scope:** Use query variants when fetching legislative signals.

1. In `fetchSignalsInternal`, call `getQueryVariants(subcategory)`.
2. For each variant, call `/api/search` (or internal search routine).
3. Merge posts from all variants; dedupe by `post.id`.
4. Cache key remains `subcategoryId:state:city:timeFilter`; cache stores merged result.

**Consideration:** Legislative dashboard fetches many subcategories already. Running 2–3 queries per subcategory multiplies load. Options:
- **A:** Enable only when `subcategoryId` is for a single subcategory (e.g., IssueDetailView).
- **B:** Use parallel queries only for subcategories that historically return &lt; 15 posts (would need telemetry or config).

**Recommendation:** Start with A (IssueDetailView only); expand later if needed.

**Deliverable:** `app/api/legislative/signals/route.ts` + optional `useParallelSearch` or similar flag.

---

#### P6.4 — Conditional Parallel (Cost Control)

**Scope:** Run parallel queries only when primary returns few posts.

1. First request: run primary query only.
2. If `posts.length < THRESHOLD` (e.g., 15): run 1–2 additional variant queries, merge, return.
3. Threshold configurable via env or constant.

**Trade-off:** Two round-trips when sparse; slightly higher latency for those cases.

---

## Part 2: AI Coverage Insights (DEFERRED)

**Status:** On hold per product decision.

Planned addition: `coverageInsights` on AIAnalysis (platform breakdown, data quality note, recommendation). To be implemented when prioritized.

---

## Part 3: Progressive Display (Posts as They Arrive) — DONE

**Goal:** Show social posts as soon as each platform returns, not after all complete.

**Implemented:**
- Streaming search (`/api/search/stream`) sends `platform_complete` events as each platform finishes
- Client (`useStreamingSearch`) appends posts on each event; UI updates progressively
- Streaming now used for **all** searches (national + local) when `NEXT_PUBLIC_FEATURE_STREAMING_SEARCH !== "false"` (default: on)
- Added state/city params for local search
- Added Reddit to stream route (with local subreddit support)
- TikTok location suffix for local searches

---

## Suggested Execution Order

| Phase | Description | Effort | Impact |
|-------|-------------|--------|--------|
| **Progressive display** | Streaming for all searches; posts as each platform completes | Done | High |
| **P6.1** | Query variants helper | 0.5d | Foundation |
| **P6.2** | Main search parallel support | 1–2d | High (main search) |
| **P6.4** | Conditional parallel (sparse only) | 0.5d | Cost control |
| **P6.3** | Legislative parallel (IssueDetailView) | 1d | Medium |
| **P6.5** | AI coverage insights | Deferred | — |

---

## Acceptance Criteria

- [x] Posts display progressively as each platform completes (streaming).
- [x] Streaming works for national and local (state/city) search.
- [x] Reddit included in stream route with local subreddit support.
- [ ] `getQueryVariants(sub)` returns 2–3 non-empty, distinct query strings.
- [ ] Main search accepts `queryVariants` and merges/dedupes when provided.
- [ ] When primary returns < 15 posts, secondary variant queries run and results merge.
- [ ] Cache keys and rate limits unchanged for existing single-query flow.
- [ ] No regression in post relevance or sort order.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API rate limits | Cap concurrent queries per platform; use conditional parallel (sparse only). |
| Higher API cost | Option B (parallel only when sparse); monitor usage. |
| Duplicate-heavy results | Dedupe strictly by platform+id; prefer primary-query order. |
| Slower response when sparse | Accept 2-phase for sparse case; show loading state. |

---

## References

- `docs/MASTER_PROMPT.md` — Social Keyword Search & Geo Indexing
- `docs/SOCIAL_KEYWORD_GEO_PLAN.md` — Completed P1–P5
- `lib/data/taxonomy.ts` — `toSearchQuery`, `searchQuery`
- `app/api/search/route.ts` — Search orchestration
- `lib/services/aiAnalysis.ts` — AI prompt and parsing
