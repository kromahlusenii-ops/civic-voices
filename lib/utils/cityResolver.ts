/**
 * Resolve city display name or id to city id for subreddit/geo lookups.
 * subreddits.json and getSubredditsForLocation use city id (e.g. "charlotte", "little-rock").
 * Settings and search params may pass city name (e.g. "Charlotte", "Little Rock").
 */

import citiesData from "@/data/cities.json"

type CitiesByState = Record<string, { id: string; name: string }[]>
const cities = citiesData as CitiesByState

/**
 * Resolve city name or id to city id for a given state.
 * @param stateCode - State code (e.g. "NC", "AR")
 * @param cityNameOrId - City display name ("Charlotte") or id ("charlotte")
 * @returns City id for subreddit lookup, or null if not found
 */
export function resolveCityNameToId(
  stateCode: string,
  cityNameOrId: string
): string | null {
  if (!stateCode?.trim() || !cityNameOrId?.trim()) return null

  const stateCities = cities[stateCode]
  if (!stateCities?.length) return null

  const normalized = cityNameOrId.trim()
  const lower = normalized.toLowerCase()

  for (const c of stateCities) {
    if (c.id === lower || c.id === normalized) return c.id
    if (c.name.toLowerCase() === lower || c.name === normalized) return c.id
  }
  return null
}
