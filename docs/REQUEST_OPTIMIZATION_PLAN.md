# Request Optimization Plan - 429 Rate Limit Mitigation

## Current Issues

**Rate Limit Hit:** 15 requests/minute per IP on `/api/search`

**Request Multipliers:**
- **SubcategoryView:** Fetches 6-10 subcategories × 2 platforms = 12-20 search requests on page load
- **TikTok:** Queries BOTH SociaVault (8 pages) + TikAPI in parallel = 2× TikTok requests
- **Reddit:** 5 pages of pagination = 5× Reddit requests
- **YouTube:** 4 pages of pagination = 4× YouTube requests
- **Comments:** Up to 30 comments × N posts = many additional API calls

**Example:** Opening Public Safety category = 7 subcategories × (Reddit 5 pages + X 1 req + TikTok 2 APIs) = ~56 requests in <10 seconds → **Rate limit hit**

---

## Quick Wins (Immediate Implementation)

### 1. **Reduce Pagination** ⚡
**Impact:** -60% platform API requests

```typescript
// app/api/search/route.ts
-  maxPages: 8,  // TikTok SociaVault
+  maxPages: 3,  // TikTok SociaVault

-  maxPages: 5,  // Reddit
+  maxPages: 2,  // Reddit

-  maxPages: 4,  // YouTube
+  maxPages: 2,  // YouTube
```

**Why:** Most relevant results are on page 1-2. Diminishing returns after that.

### 2. **Smart TikTok Fallback** ⚡
**Impact:** -50% TikTok requests

```typescript
// app/api/search/route.ts - Try SociaVault first, only use TikAPI if empty
if (config.sociaVault.apiKey) {
  const svResult = await sociaVaultService.searchTikTokVideos(...)
  if (svResult.data && svResult.data.length > 5) {
    // SociaVault returned results, skip TikAPI
    tiktokPosts = svResult.data
  } else if (config.tiktok.apiKey) {
    // Fallback to TikAPI only if SociaVault returned few/no results
    tiktokPosts = await tiktokService.searchVideos(...)
  }
}
```

**Why:** Running both APIs in parallel doubles requests. Use fallback pattern instead.

### 3. **Disable Comment Fetching by Default** ⚡
**Impact:** -30-50 requests per search

```typescript
// app/api/search/route.ts
- const ENABLE_COMMENT_FETCHING = true
+ const ENABLE_COMMENT_FETCHING = false // Or make it user-configurable
```

**Why:** Comments are nice-to-have, not essential. User can opt-in if needed.

### 4. **Increase Cache TTL** ⚡
**Impact:** +80% cache hit rate

```typescript
// app/api/legislative/signals/route.ts
- const CACHE_TTL_SECONDS = 3600 // 1 hour
+ const CACHE_TTL_SECONDS = 14400 // 4 hours
```

**Why:** Legislative signals don't change every hour. 4-hour cache is acceptable for civic topics.

---

## Medium-Term Optimizations (Next Sprint)

### 5. **Lazy Load Subcategories** 🔄
**Impact:** -90% subcategory requests on category open

```typescript
// app/search/components/SubcategoryView.tsx
// Option A: Fetch on hover (prefetch)
<button onMouseEnter={() => prefetchSubcategory(sub.id)}>

// Option B: Fetch on click only
<button onClick={() => {
  fetchSubcategory(sub.id)
  onSubcategoryClick(sub)
}}>

// Option C: Virtual scroll with visible range only
// Fetch top 3 subcategories, load more on scroll
```

**Why:** User doesn't need data for all 10 subcategories if they only click 1-2.

### 6. **Request Debouncing** 🔄
**Impact:** -20% duplicate requests

```typescript
// lib/hooks/useDebounce.ts
export function useDebouncedFetch(url: string, delay = 300) {
  const [data, setData] = useState(null)
  const debounced = useMemo(() => 
    debounce(async () => {
      const res = await fetch(url)
      setData(await res.json())
    }, delay),
    [url, delay]
  )
  useEffect(() => { debounced() }, [debounced])
  return data
}
```

**Why:** Rapid clicks/navigation triggers duplicate requests.

### 7. **Platform Priority Queue** 🔄
**Impact:** Better rate limit distribution

```typescript
// app/api/search/route.ts
// Instead of Promise.all(searchPromises), use priority queue:
// 1. Reddit (fast, reliable)
// 2. X (rate limited but important)
// 3. TikTok (slow, optional)
// 4. YouTube (slow, optional)

const queue = new PQueue({ concurrency: 2, interval: 1000, intervalCap: 2 })
await queue.addAll([
  () => redditSearch(),
  () => xSearch(),
  () => tiktokSearch(),  // Delayed
  () => youtubeSearch(), // Delayed
])
```

**Why:** Prevents all platforms hitting rate limits simultaneously.

### 8. **Preview/Skeleton Data** 🔄
**Impact:** Perceived performance + reduced urgency

```typescript
// Show cached/estimated data immediately, refresh in background
const [data, setData] = useState(getCachedOrEstimate(subcategoryId))
const [isRefreshing, setIsRefreshing] = useState(false)

useEffect(() => {
  // Show stale data immediately
  const cached = cache[key]
  if (cached && Date.now() - cached.timestamp < 3600000) {
    setData(cached.data) // Show 1h old data
  }
  
  // Fetch fresh in background
  setIsRefreshing(true)
  fetch(url).then(fresh => {
    setData(fresh)
    setIsRefreshing(false)
  })
}, [subcategoryId])
```

**Why:** Users see instant results (cached), fresh data loads async.

---

## Long-Term Solutions (Future)

### 9. **Redis-Based Rate Limiting** 📅
**Current:** In-memory per-instance
**Future:** Shared Redis pool across all Vercel instances
**Why:** Current rate limit is per-instance; Redis gives global view

### 10. **Background Job Queue** 📅
**Pattern:** User requests → Job queued → Poll for results
**Why:** Expensive searches run async, no blocking

### 11. **Streaming Results** 📅
**Already implemented for main search, extend to legislative signals**
**Why:** User sees posts as they arrive, no waiting for all platforms

### 12. **Tiered Search** 📅
- **Fast tier:** Reddit only (1-2 sec, always available)
- **Standard tier:** Reddit + X (5-10 sec, most searches)
- **Deep tier:** All 6 platforms (20-30 sec, opt-in)

---

## Recommended Implementation Order

### Phase 1 (Today - 30 min)
✅ Reduce pagination (maxPages: 3 for TikTok, 2 for Reddit/YouTube)
✅ Smart TikTok fallback (try SociaVault first, TikAPI only if needed)
✅ Disable comment fetching by default
✅ Increase cache TTL to 4 hours

**Expected:** 60-70% request reduction

### Phase 2 (This Week - 2 hours)
- Lazy load subcategories (fetch on click, not on category open)
- Request debouncing (300ms)
- Preview/skeleton with background refresh

**Expected:** Additional 20-30% reduction

### Phase 3 (Next Sprint - 1 day)
- Platform priority queue
- Tiered search (Fast/Standard/Deep)
- Better error handling for 429s (exponential backoff)

**Expected:** Smooth experience even under load

---

## Monitoring

Add request metrics:
```typescript
// Track requests per minute
console.log(`[Metrics] Search requests: ${requestCount}/min, Cache hits: ${cacheHits}/${totalRequests}`)
```

Set alerts:
- Alert if >10 requests/min per user
- Alert if cache hit rate <70%
- Alert if 429 errors >5/hour
