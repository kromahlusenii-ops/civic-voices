/**
 * Utility to look up subreddits for local search by state and city
 */

import subredditsData from "@/data/subreddits.json";

interface SubredditMapping {
  subreddits: string[];
  cities: Record<string, string[]>;
}

type SubredditsData = Record<string, SubredditMapping>;

const subreddits = subredditsData as SubredditsData;

/**
 * Get subreddits for a state (includes state-level subreddits)
 */
export function getStateSubreddits(stateCode: string): string[] {
  const stateData = subreddits[stateCode];
  if (!stateData) {
    return [];
  }
  return stateData.subreddits || [];
}

/**
 * Get subreddits for a specific city within a state
 */
export function getCitySubreddits(stateCode: string, cityId: string): string[] {
  const stateData = subreddits[stateCode];
  if (!stateData || !stateData.cities) {
    return [];
  }
  return stateData.cities[cityId] || [];
}

/**
 * Get all relevant subreddits for a location
 * If city is specified, returns city subreddits
 * If only state is specified, returns state subreddits + all city subreddits in that state
 */
export function getSubredditsForLocation(
  stateCode: string,
  cityId?: string | null
): string[] {
  const stateData = subreddits[stateCode];
  if (!stateData) {
    return [];
  }

  if (cityId) {
    // City specified - return city-specific subreddits
    const citySubreddits = stateData.cities?.[cityId] || [];
    // Deduplicate and return
    return [...new Set(citySubreddits)];
  }

  // No city - return state subreddits + all city subreddits
  const allSubreddits = [...(stateData.subreddits || [])];

  if (stateData.cities) {
    for (const citySubreddits of Object.values(stateData.cities)) {
      allSubreddits.push(...citySubreddits);
    }
  }

  // Deduplicate and return
  return [...new Set(allSubreddits)];
}

/**
 * Check if we have subreddit data for a given state
 */
export function hasStateData(stateCode: string): boolean {
  return !!subreddits[stateCode];
}

/**
 * Check if we have subreddit data for a given city
 */
export function hasCityData(stateCode: string, cityId: string): boolean {
  const stateData = subreddits[stateCode];
  return !!(stateData?.cities?.[cityId]);
}
