/**
 * Platform-specific geographic query builder.
 * Each platform has different geo capabilities and search syntax.
 * 
 * Strategy:
 * - X (Twitter): Use `near:` operator with location geocode
 * - Reddit: Target location-specific subreddits
 * - TikTok: Append location to query text
 * - YouTube: Use `location` and `locationRadius` params
 * - Bluesky: Append location to query text (no native geo)
 * - Truth Social: Append location to query text (no native geo)
 */

export interface GeoContext {
  state?: string
  city?: string
  geoScope?: 'national' | 'state' | 'city'
}

export interface PlatformGeoQuery {
  query: string // Modified query with geo context
  params?: Record<string, string | boolean | undefined> // Platform-specific geo parameters
}

/**
 * X (Twitter) geographic query builder.
 * Uses plain text append (same as TikTok/Bluesky/Truth Social) for volume.
 *
 * place: operator only matches ~1-2% of posts (requires explicit location tag).
 * near: is deprecated in v2. Text append casts the widest net.
 *
 * Examples:
 * - "deepfake Charlotte NC"
 * - "gun violence North Carolina"
 */
export function buildXGeoQuery(baseQuery: string, geo: GeoContext): PlatformGeoQuery {
  if (geo.geoScope === 'national' || (!geo.state && !geo.city)) {
    return { query: baseQuery }
  }

  if (geo.city && geo.geoScope === 'city') {
    const loc = geo.state ? `${geo.city} ${geo.state}` : geo.city
    return { query: `${baseQuery} ${loc}` }
  }

  if (geo.state) {
    return { query: `${baseQuery} ${geo.state}` }
  }

  return { query: baseQuery }
}

/**
 * Reddit geographic query builder.
 * Uses location-specific subreddits rather than query modification.
 * 
 * Note: This returns the base query unchanged. The actual subreddit
 * filtering is handled by getSubredditsForLocation() utility.
 */
export function buildRedditGeoQuery(baseQuery: string, geo: GeoContext): PlatformGeoQuery {
  // Reddit uses subreddit filtering, not query modification
  // The actual geo logic is in getSubredditsForLocation()
  return {
    query: baseQuery,
    params: {
      useLocationSubreddits: !!(geo.state || geo.city),
      state: geo.state,
      city: geo.city,
    },
  }
}

/**
 * TikTok geographic query builder.
 * Appends location to query text (no native geo API).
 * 
 * Examples:
 * - "affordable housing in Charlotte NC"
 * - "police reform in North Carolina"
 */
export function buildTikTokGeoQuery(baseQuery: string, geo: GeoContext): PlatformGeoQuery {
  if (geo.geoScope === 'national' || (!geo.state && !geo.city)) {
    return { query: baseQuery }
  }
  
  // City-level
  if (geo.city && geo.geoScope === 'city') {
    const locationSuffix = geo.state ? `in ${geo.city}, ${geo.state}` : `in ${geo.city}`
    return {
      query: `${baseQuery} ${locationSuffix}`,
    }
  }
  
  // State-level
  if (geo.state) {
    return {
      query: `${baseQuery} in ${geo.state}`,
    }
  }
  
  return { query: baseQuery }
}

/**
 * YouTube geographic query builder.
 * Uses `location` and `locationRadius` parameters.
 * 
 * Note: YouTube's geo requires lat/lng coordinates.
 * For simplicity, we append location to query text instead.
 */
export function buildYouTubeGeoQuery(baseQuery: string, geo: GeoContext): PlatformGeoQuery {
  if (geo.geoScope === 'national' || (!geo.state && !geo.city)) {
    return { query: baseQuery }
  }
  
  // Append location to query text (easier than lat/lng lookup)
  // City-level
  if (geo.city && geo.geoScope === 'city') {
    const locationSuffix = geo.state ? `${geo.city} ${geo.state}` : geo.city
    return {
      query: `${baseQuery} ${locationSuffix}`,
    }
  }
  
  // State-level
  if (geo.state) {
    return {
      query: `${baseQuery} ${geo.state}`,
    }
  }
  
  return { query: baseQuery }
}

/**
 * Bluesky geographic query builder.
 * Appends location to query text (no native geo API).
 */
export function buildBlueskyGeoQuery(baseQuery: string, geo: GeoContext): PlatformGeoQuery {
  if (geo.geoScope === 'national' || (!geo.state && !geo.city)) {
    return { query: baseQuery }
  }
  
  // City-level
  if (geo.city && geo.geoScope === 'city') {
    const locationSuffix = geo.state ? `${geo.city}, ${geo.state}` : geo.city
    return {
      query: `${baseQuery} ${locationSuffix}`,
    }
  }
  
  // State-level
  if (geo.state) {
    return {
      query: `${baseQuery} ${geo.state}`,
    }
  }
  
  return { query: baseQuery }
}

/**
 * Truth Social geographic query builder.
 * Appends location to query text (no native geo API).
 */
export function buildTruthSocialGeoQuery(baseQuery: string, geo: GeoContext): PlatformGeoQuery {
  if (geo.geoScope === 'national' || (!geo.state && !geo.city)) {
    return { query: baseQuery }
  }
  
  // City-level
  if (geo.city && geo.geoScope === 'city') {
    const locationSuffix = geo.state ? `${geo.city}, ${geo.state}` : geo.city
    return {
      query: `${baseQuery} ${locationSuffix}`,
    }
  }
  
  // State-level
  if (geo.state) {
    return {
      query: `${baseQuery} ${geo.state}`,
    }
  }
  
  return { query: baseQuery }
}

/**
 * Build platform-specific geo query for any platform.
 * Routes to the appropriate builder function.
 */
export function buildPlatformGeoQuery(
  platform: string,
  baseQuery: string,
  geo: GeoContext
): PlatformGeoQuery {
  switch (platform.toLowerCase()) {
    case 'x':
    case 'twitter':
      return buildXGeoQuery(baseQuery, geo)
    case 'reddit':
      return buildRedditGeoQuery(baseQuery, geo)
    case 'tiktok':
      return buildTikTokGeoQuery(baseQuery, geo)
    case 'youtube':
      return buildYouTubeGeoQuery(baseQuery, geo)
    case 'bluesky':
      return buildBlueskyGeoQuery(baseQuery, geo)
    case 'truthsocial':
      return buildTruthSocialGeoQuery(baseQuery, geo)
    default:
      return { query: baseQuery }
  }
}

/**
 * Determine geo scope from state and city params.
 */
export function determineGeoScope(state?: string, city?: string): GeoContext['geoScope'] {
  if (city) return 'city'
  if (state) return 'state'
  return 'national'
}
