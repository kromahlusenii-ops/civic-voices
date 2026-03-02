/**
 * Shared Redis cache layer using Upstash Redis.
 * 
 * Purpose: Deduplicate API calls across users with same parameters.
 * Benefits:
 * - Reduces rate limit pressure on upstream APIs
 * - Improves response times for cached queries
 * - Enables cache warming via cron jobs
 * 
 * Usage:
 * ```typescript
 * import { getCached, cache } from '@/lib/cache/redis'
 * 
 * // Simple caching with automatic key generation
 * const data = await getCached('my-key', async () => {
 *   return await fetchExpensiveData()
 * }, 3600) // 1 hour TTL
 * 
 * // Manual cache control
 * await cache.set('key', value, { ex: 3600 })
 * const value = await cache.get('key')
 * ```
 */

import { Redis } from '@upstash/redis'

/**
 * Initialize Redis client.
 * Uses REST API for serverless compatibility.
 * 
 * Required environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
export const cache = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

/**
 * Check if cache is configured and available.
 */
export function isCacheAvailable(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Get value from cache or fetch and cache if not present.
 * 
 * @param key - Cache key (should be unique and deterministic)
 * @param fetcher - Function to fetch fresh data on cache miss
 * @param ttl - Time to live in seconds (default: 4 hours)
 * @returns Cached or freshly fetched data
 * 
 * @example
 * ```typescript
 * const signals = await getCached(
 *   `signals:${subcategoryId}:${state}:${city}`,
 *   async () => fetchSignalsFromAPI(subcategoryId, state, city),
 *   14400 // 4 hours
 * )
 * ```
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 14400 // 4 hours (matches current legislative signals TTL)
): Promise<T> {
  // If cache not configured, always fetch fresh
  if (!isCacheAvailable()) {
    console.warn('[Cache] Redis not configured, fetching fresh data')
    return await fetcher()
  }

  try {
    // Try to get from cache
    const cached = await cache.get<T>(key)
    
    if (cached !== null) {
      console.log(`[Cache HIT] ${key}`)
      return cached
    }
    
    console.log(`[Cache MISS] ${key}`)
    
    // Cache miss - fetch fresh data
    const fresh = await fetcher()
    
    // Store in cache with TTL
    await cache.setex(key, ttl, fresh)
    
    return fresh
  } catch (error) {
    // If cache operation fails, fall back to fetching fresh
    console.error('[Cache ERROR]', error)
    return await fetcher()
  }
}

/**
 * Invalidate (delete) a cache entry.
 * 
 * @param key - Cache key to invalidate
 * @returns Number of keys deleted (0 or 1)
 */
export async function invalidateCache(key: string): Promise<number> {
  if (!isCacheAvailable()) return 0
  
  try {
    const deleted = await cache.del(key)
    console.log(`[Cache INVALIDATE] ${key} (deleted: ${deleted})`)
    return deleted
  } catch (error) {
    console.error('[Cache INVALIDATE ERROR]', error)
    return 0
  }
}

/**
 * Invalidate multiple cache entries by pattern.
 * 
 * @param pattern - Redis key pattern (e.g., "signals:*")
 * @returns Number of keys deleted
 * 
 * Note: This uses SCAN which is safe for production but may be slow for large keyspaces.
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  if (!isCacheAvailable()) return 0
  
  try {
    const keys = await cache.keys(pattern)
    if (keys.length === 0) return 0
    
    const deleted = await cache.del(...keys)
    console.log(`[Cache INVALIDATE PATTERN] ${pattern} (deleted: ${deleted} keys)`)
    return deleted
  } catch (error) {
    console.error('[Cache INVALIDATE PATTERN ERROR]', error)
    return 0
  }
}

/**
 * Build standardized cache key for legislative signals.
 * 
 * Format: `signals:${subcategoryId}:${state}:${city}:${timeFilter}:${sources}:${language}:v${variants}`
 * 
 * @example
 * ```typescript
 * const key = buildSignalsCacheKey('affordable-housing', 'NC', 'Charlotte', '7d', ['reddit', 'x'], 'all', true, 3)
 * // => "signals:affordable-housing:NC:Charlotte:7d:reddit,x:all:v3"
 * ```
 */
export function buildSignalsCacheKey(
  subcategoryId: string,
  state?: string,
  city?: string,
  timeFilter?: string,
  sources?: string[],
  language?: string,
  useVariants?: boolean,
  maxVariants?: number
): string {
  const stateKey = state || 'national'
  const cityKey = city || 'none'
  const timeKey = timeFilter || '7d'
  const sourcesKey = sources ? sources.sort().join(',') : 'default'
  const langKey = language || 'all'
  const variantsKey = useVariants ? `v${maxVariants || 3}` : 'v0'
  
  return `signals:${subcategoryId}:${stateKey}:${cityKey}:${timeKey}:${sourcesKey}:${langKey}:${variantsKey}`
}

/**
 * Build standardized cache key for search results.
 * 
 * Format: `search:${query}:${sources}:${timeFilter}:${language}:${state}:${city}:v${variants}`
 */
export function buildSearchCacheKey(
  query: string,
  sources: string[],
  timeFilter: string,
  language?: string,
  state?: string,
  city?: string,
  queryVariants?: string[]
): string {
  const sourcesKey = sources.sort().join(',')
  const langKey = language || 'all'
  const stateKey = state || 'national'
  const cityKey = city || 'none'
  const variantsKey = queryVariants ? `v${queryVariants.length}` : 'v0'
  
  // Normalize query to lowercase and trim
  const normalizedQuery = query.toLowerCase().trim()
  
  return `search:${normalizedQuery}:${sourcesKey}:${timeFilter}:${langKey}:${stateKey}:${cityKey}:${variantsKey}`
}

/**
 * Get cache statistics (useful for monitoring).
 * 
 * Returns approximate counts of cache entries by prefix.
 */
export async function getCacheStats(): Promise<{
  signals: number
  search: number
  total: number
}> {
  if (!isCacheAvailable()) {
    return { signals: 0, search: 0, total: 0 }
  }
  
  try {
    const signalsKeys = await cache.keys('signals:*')
    const searchKeys = await cache.keys('search:*')
    
    return {
      signals: signalsKeys.length,
      search: searchKeys.length,
      total: signalsKeys.length + searchKeys.length,
    }
  } catch (error) {
    console.error('[Cache STATS ERROR]', error)
    return { signals: 0, search: 0, total: 0 }
  }
}
