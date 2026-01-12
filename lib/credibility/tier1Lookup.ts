/**
 * Tier 1 Source Lookup Utilities
 *
 * Provides fast O(1) lookup for checking if a source is in the Tier 1 registry.
 * Uses a Map keyed by "platform:handle" for efficient access.
 */

import { tier1Sources, Tier1Source, Tier1Category, Platform } from './tier1Sources';

// Build lookup map: "platform:handle" -> Tier1Source
const tier1Map = new Map<string, Tier1Source>();

// Initialize map on module load
for (const source of tier1Sources) {
  const key = `${source.platform}:${source.identifier.toLowerCase()}`;
  tier1Map.set(key, source);
}

/**
 * Generate lookup key from platform and handle
 */
function makeKey(platform: string, handle: string): string {
  // Normalize: remove @ prefix, lowercase
  const normalizedHandle = handle.replace(/^@/, '').toLowerCase();
  return `${platform.toLowerCase()}:${normalizedHandle}`;
}

/**
 * Look up a Tier 1 source by platform and handle
 * @param platform - Platform identifier (x, youtube, bluesky, etc.)
 * @param handle - User handle/username (with or without @)
 * @returns Tier1Source if found, null otherwise
 */
export function lookupTier1(platform: string, handle: string): Tier1Source | null {
  const key = makeKey(platform, handle);
  return tier1Map.get(key) || null;
}

/**
 * Check if a source is in the Tier 1 registry
 * @param platform - Platform identifier
 * @param handle - User handle/username
 * @returns true if source is Tier 1
 */
export function isTier1Source(platform: string, handle: string): boolean {
  const key = makeKey(platform, handle);
  return tier1Map.has(key);
}

/**
 * Get the Tier 1 category for a source
 * @param platform - Platform identifier
 * @param handle - User handle/username
 * @returns Category if Tier 1 source, null otherwise
 */
export function getTier1Category(platform: string, handle: string): Tier1Category | null {
  const source = lookupTier1(platform, handle);
  return source?.category || null;
}

/**
 * Get the display name for a Tier 1 source
 * @param platform - Platform identifier
 * @param handle - User handle/username
 * @returns Display name if Tier 1 source, null otherwise
 */
export function getTier1Name(platform: string, handle: string): string | null {
  const source = lookupTier1(platform, handle);
  return source?.name || null;
}

/**
 * Get all Tier 1 sources for a specific platform
 * @param platform - Platform identifier
 * @returns Array of Tier 1 sources for that platform
 */
export function getTier1SourcesForPlatform(platform: Platform): Tier1Source[] {
  return tier1Sources.filter(s => s.platform === platform);
}

/**
 * Get all Tier 1 sources in a specific category
 * @param category - Category to filter by
 * @returns Array of Tier 1 sources in that category
 */
export function getTier1SourcesByCategory(category: Tier1Category): Tier1Source[] {
  return tier1Sources.filter(s => s.category === category);
}

/**
 * Get the base credibility score for a Tier 1 category
 * @param category - Tier 1 category
 * @returns Base credibility score (0-1)
 */
export function getTier1BaseScore(category: Tier1Category): number {
  switch (category) {
    case 'official':
      return 0.95;
    case 'news':
      return 0.90;
    case 'journalist':
      return 0.85;
    case 'expert':
      return 0.80;
    default:
      return 0.80;
  }
}

/**
 * Get the total count of Tier 1 sources
 */
export function getTier1Count(): number {
  return tier1Sources.length;
}

/**
 * Get counts by category
 */
export function getTier1CountsByCategory(): Record<Tier1Category, number> {
  const counts: Record<Tier1Category, number> = {
    official: 0,
    news: 0,
    journalist: 0,
    expert: 0,
  };

  for (const source of tier1Sources) {
    counts[source.category]++;
  }

  return counts;
}

// Export the map for direct access if needed
export { tier1Map };
