import type { Post } from "@/lib/types/api";

/**
 * Format a number with K/M abbreviations
 * @param count - The number to format
 * @returns Formatted string (e.g., "1.2K", "3.5M", "500")
 */
export function formatMentions(count: number): string {
  if (count >= 1_000_000) {
    const formatted = (count / 1_000_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    const formatted = (count / 1_000).toFixed(1);
    return `${formatted.replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

/**
 * Calculate total mentions from posts by aggregating all engagement metrics
 * Includes: likes + comments + shares + views
 * @param posts - Array of posts with engagement data
 * @returns Total aggregated mentions count
 */
export function calculateTotalMentions(posts: Post[]): number {
  return posts.reduce((sum, post) => {
    const { likes, comments, shares, views } = post.engagement;
    return sum + likes + comments + shares + (views || 0);
  }, 0);
}

/**
 * Badge thresholds for total mentions (engagement-based)
 * - too_narrow: < 5K - Not enough data for meaningful analysis
 * - sweet_spot: 5K - 1M - Good volume for trend analysis
 * - too_broad: > 1M - Topic may be too broad, consider filtering
 */
export type MentionsBadge = "too_narrow" | "sweet_spot" | "too_broad" | null;

export const MENTIONS_THRESHOLDS = {
  TOO_NARROW_MAX: 5_000,
  SWEET_SPOT_MAX: 1_000_000,
} as const;

/**
 * Determine the quality badge based on total mentions count
 * @param totalMentions - Aggregated engagement count
 * @returns Badge type or null if in neutral zone
 */
export function getMentionsBadge(totalMentions: number): MentionsBadge {
  if (totalMentions < MENTIONS_THRESHOLDS.TOO_NARROW_MAX) {
    return "too_narrow";
  }
  if (totalMentions <= MENTIONS_THRESHOLDS.SWEET_SPOT_MAX) {
    return "sweet_spot";
  }
  return "too_broad";
}

/**
 * Badge display configuration
 */
export const MENTIONS_BADGE_STYLES: Record<string, string> = {
  sweet_spot: "bg-green-100 text-green-700",
  too_narrow: "bg-yellow-100 text-yellow-700",
  too_broad: "bg-orange-100 text-orange-700",
};

export const MENTIONS_BADGE_LABELS: Record<string, string> = {
  sweet_spot: "Sweet spot",
  too_narrow: "Limited data",
  too_broad: "High volume",
};
