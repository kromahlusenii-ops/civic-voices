# Feature Spec: X API Search Integration Fix

## Overview

Fix the X/Twitter API integration to properly fetch tweets using the **Basic (free) tier** `/2/tweets/search/recent` endpoint.

## Problem Statement

**Current Issues:**
1. Configuration inconsistency: `config.ts` uses `TWITTER_API_KEY` but `route.ts` uses `X_BEARER_TOKEN`
2. Duplicate implementations: Both `xApi.ts` and `XProvider.ts` exist
3. No language filtering passed to X API
4. Time filters > 7 days silently fail (API limitation)
5. No clear error messages for API failures

**Desired State:**
- Consistent configuration using centralized config
- Single consolidated X API provider
- Language filtering support
- Clear UI feedback when time filter exceeds 7-day limit
- Better error handling and logging

## API Constraints (Basic/Free Tier)

| Constraint | Value |
|------------|-------|
| Endpoint | `/2/tweets/search/recent` |
| Time Range | **Last 7 days only** |
| Max Results | 10-100 per request |
| Rate Limit | 450 requests/15 min |

## Technical Design

### 1. Configuration Updates

**File:** `lib/config.ts`

Add X/Twitter to providers section:
```typescript
x: {
  bearerToken: string;  // Required for API access
};
```

**Environment Variables:**
```
X_BEARER_TOKEN=<your_bearer_token>
```

### 2. Consolidate XProvider

**Keep:** `lib/providers/XProvider.ts` (full-featured with retry logic)
**Remove:** `lib/services/xApi.ts` (duplicate, simpler version)

#### Enhancements to XProvider:
1. **Language Filtering**: Add `lang:` operator to query
2. **Exclude Retweets**: Add `-is:retweet` for cleaner results
3. **Time Range Validation**: Warn if time filter > 7 days
4. **Better Error Messages**: Parse X API error responses

#### Updated Interface:
```typescript
export interface XSearchOptions {
  maxResults?: number;        // 10-100 for recent search
  startTime?: string;         // ISO 8601 timestamp (max 7 days ago)
  endTime?: string;           // ISO 8601 timestamp
  nextToken?: string;         // Pagination token
  language?: string;          // BCP47 language code (e.g., 'en')
  excludeRetweets?: boolean;  // Default: true
}
```

### 3. Query Building

Transform user query to X API format:
```
Input: "climate change"
Language: en

Output: "climate change" lang:en -is:retweet
```

**Supported operators:**
- `lang:en` - Filter by language
- `-is:retweet` - Exclude retweets (default)
- Quotes for exact phrases

### 4. Error Handling

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| 400 | Bad Request | "Invalid search query" |
| 401 | Unauthorized | "X API not configured" |
| 403 | Forbidden | "X API access denied" |
| 429 | Rate Limited | "Too many requests, try again later" |

### 5. Time Filter Handling

Since Basic tier only supports 7 days:
- **7d filter**: Works as expected
- **30d, 3m, 12m filters**: Clamp to 7 days + show info message

## Implementation Tasks

### Task 1: Update Configuration
- Add `X_BEARER_TOKEN` to `lib/config.ts`
- Update `.env.example`
- Remove direct `process.env` access in search route

### Task 2: Enhance XProvider
- Add language filtering to query builder
- Add `-is:retweet` by default
- Add time range validation (clamp to 7 days)
- Improve error parsing

### Task 3: Update Search Route
- Use XProvider instead of XApiService
- Pass language filter from request
- Use centralized config
- Return warning when time filter clamped

### Task 4: Remove Duplicate Code
- Delete `lib/services/xApi.ts`
- Update imports in search route

### Task 5: Add Tests
- Query building tests
- Error handling tests
- Time range clamping tests

## Test Cases

```typescript
describe('XProvider', () => {
  describe('query building', () => {
    it('adds language filter when specified');
    it('excludes retweets by default');
    it('handles quotes in query');
    it('handles special characters');
  });

  describe('time range', () => {
    it('accepts 7d filter');
    it('clamps 30d filter to 7 days');
    it('returns warning for clamped time');
  });

  describe('error handling', () => {
    it('retries on rate limit with backoff');
    it('throws descriptive error on 401');
    it('throws descriptive error on 403');
  });
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `lib/config.ts` | Add X bearer token config |
| `.env.example` | Add `X_BEARER_TOKEN` |
| `lib/providers/XProvider.ts` | Add language filter, time validation |
| `lib/services/xApi.ts` | **DELETE** (consolidate into XProvider) |
| `app/api/search/route.ts` | Use XProvider, pass language |
| `lib/providers/XProvider.test.ts` | Add tests |

## Success Metrics

- X search returns results correctly
- Language filtering works
- Clear error messages on failure
- No silent failures for time filters > 7 days
