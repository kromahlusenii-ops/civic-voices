/**
 * Unified time filter utility for all search queries.
 * Converts time filter strings (e.g., "7d", "3m", "12m") into platform-specific parameters.
 */

export type TimeFilter = "7d" | "3m" | "12m" | "all"

export const TIME_FILTERS: TimeFilter[] = ["7d", "3m", "12m", "all"]

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  "7d": "Past Week",
  "3m": "Past 3 Months",
  "12m": "Past Year",
  "all": "All Time",
}

/**
 * Convert time filter to days for APIs that expect day counts
 */
export function timeFilterToDays(filter: TimeFilter): number | null {
  switch (filter) {
    case "7d":
      return 7
    case "3m":
      return 90
    case "12m":
      return 365
    case "all":
      return null // No time restriction
    default:
      return 7 // Default to 7 days
  }
}

/**
 * Convert time filter to ISO 8601 date string (for "since" parameters)
 */
export function timeFilterToISODate(filter: TimeFilter): string | null {
  const days = timeFilterToDays(filter)
  if (days === null) return null
  
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

/**
 * Convert time filter to Unix timestamp (seconds since epoch)
 */
export function timeFilterToUnixTimestamp(filter: TimeFilter): number | null {
  const isoDate = timeFilterToISODate(filter)
  if (!isoDate) return null
  
  return Math.floor(new Date(isoDate).getTime() / 1000)
}

/**
 * Convert time filter to platform-specific format
 */
export interface PlatformTimeParams {
  reddit?: { time_filter: string } // "day" | "week" | "month" | "year" | "all"
  x?: { since: string } // ISO 8601 date
  tiktok?: { days: number } // Number of days
  youtube?: { publishedAfter: string } // ISO 8601 date
  bluesky?: { since: string } // ISO 8601 date
  truthsocial?: { since: string } // ISO 8601 date
}

export function timeFilterToPlatformParams(filter: TimeFilter): PlatformTimeParams {
  const days = timeFilterToDays(filter)
  const isoDate = timeFilterToISODate(filter)
  
  // Reddit uses special time_filter values
  let redditTimeFilter = "all"
  if (filter === "7d") redditTimeFilter = "week"
  else if (filter === "3m") redditTimeFilter = "month"
  else if (filter === "12m") redditTimeFilter = "year"
  
  return {
    reddit: { time_filter: redditTimeFilter },
    x: isoDate ? { since: isoDate } : undefined,
    tiktok: days !== null ? { days } : undefined,
    youtube: isoDate ? { publishedAfter: isoDate } : undefined,
    bluesky: isoDate ? { since: isoDate } : undefined,
    truthsocial: isoDate ? { since: isoDate } : undefined,
  }
}

/**
 * Validate if a string is a valid time filter
 */
export function isValidTimeFilter(value: string | null | undefined): value is TimeFilter {
  return TIME_FILTERS.includes(value as TimeFilter)
}

/**
 * Get default time filter
 */
export function getDefaultTimeFilter(): TimeFilter {
  return "7d"
}

/**
 * Parse time filter from query string with fallback to default
 */
export function parseTimeFilter(value: string | null | undefined): TimeFilter {
  return isValidTimeFilter(value) ? value : getDefaultTimeFilter()
}
