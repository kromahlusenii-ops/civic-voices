# Social Keyword Search, Geo Indexing & Post Filters — Implementation Plan

**Status:** Complete (P1–P5 implemented)  
**Last updated:** February 2025  
**Source:** MASTER_PROMPT.md (Social Keyword Search & Geo Indexing section)

---

## Goals

1. **Improve social keyword search** — Get more posts back from platform APIs
2. **Index search params on city, state, national** — Correct geo scoping across all flows
3. **Social post view filters** — Ensure filters work and align with search scope

---

## Current State (Gaps)

| Area | Current | Gap |
|------|---------|-----|
| Keywords per subcategory | 2 (via `toSearchQuery` slice(0,2)) | Sparse recall; subcategories have 6–8 keywords |
| City for Reddit lookup | Passed as display name ("Charlotte") | `getSubredditsForLocation` expects city id ("charlotte") |
| Geo scope → API params | National: no params; State: state only; City: state+city | City name→id resolution missing |
| Legislative time range | Hardcoded 7d | No parity with main search (7d/3m/12m) |
| Post view filters | Platform + Sentiment (client-side) | No time selector; no geo filter chip |
| Cache key | `subcategoryId:state:city` | Missing `timeFilter` when time is configurable |

---

## Priorities

### P1 — Geo Indexing (City ID Resolution) ✅ DONE

**Problem:** Reddit subreddit lookup uses `subreddits[state].cities[cityId]` where keys are ids (e.g., `charlotte`). Settings and search page pass city **name** (e.g., `Charlotte`). Lookup fails → no local Reddit results.

**Implemented:**
1. `lib/utils/cityResolver.ts` — `resolveCityNameToId(stateCode, cityNameOrId)` using `data/cities.json`
2. `/api/search` route resolves city before `getSubredditsForLocation`; falls back to state-only on failure
3. Unit tests: `lib/utils/cityResolver.test.ts`

---

### P2 — Social Keyword Expansion ✅ DONE

**Problem:** Only 2 keywords used per subcategory; low post volume from APIs.

**Implemented:**
1. `toSearchQuery` now uses `slice(0, 4)` (up to 4 keywords)
2. Expanded 8 high-impact subcategories with 4th keyword (Affordable Housing, Homelessness, Gentrification, Public Housing, Immigration Enforcement, Childcare, Substance Abuse)

---

### P3 — Legislative Dashboard Time Range ✅ DONE

**Implemented:** Time range selector (Last 7 days / Last 3 months / Last year) next to GeoScopeToggle; `timeFilter` query param to API; cache key includes `timeFilter`; default 7d.

---

### P4 — Post View Filters (Verification) ✅ DONE

**Implemented:** Platform and Sentiment filters verified; "Verified only" filter added (filters by `verificationBadge` or `credibilityScore >= 0.7`).

---

### P5 — Cache & Search Param Consistency ✅ DONE

**Implemented:** Cache key = `subcategoryId:state:city:timeFilter`; `buildLegislativeCacheKey` includes timeFilter; API accepts and uses `timeFilter` param.

---

## Suggested Execution Order

1. **P1 (Geo)** — Unblocks local Reddit results; highest impact for city/state users
2. **P2 (Keywords)** — More posts globally; low risk
3. **P3 (Time)** — Improves parity and user control
4. **P4 (Filters)** — Verification pass + optional enhancements
5. **P5 (Cache)** — Align with P3; no separate sprint needed

---

## Acceptance Criteria

- [x] Charlotte, NC city search returns Reddit posts from r/Charlotte (P1 cityResolver)
- [x] State-only search (e.g., NC) returns posts from NC subreddits
- [x] National search returns posts without geo constraints
- [x] Subcategory searches return more posts (P2 keyword expansion)
- [x] Legislative dashboard time selector works; cache respects time param (P3)
- [x] Platform, Sentiment, and Verified only filters correctly filter the post feed (P4)
