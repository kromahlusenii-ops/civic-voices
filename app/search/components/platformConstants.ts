export const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  reddit: "Reddit",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  truthsocial: "Truth Social",
  instagram: "Instagram",
  linkedin: "LinkedIn",
}

export const PLATFORM_STYLES: Record<string, { color: string; bg: string }> = {
  reddit: { color: "#D4450A", bg: "rgba(255,87,34,0.12)" },
  x: { color: "#505050", bg: "rgba(80,80,80,0.08)" },
  tiktok: { color: "#00897B", bg: "rgba(0,137,123,0.1)" },
  youtube: { color: "#CC0000", bg: "rgba(204,0,0,0.08)" },
  bluesky: { color: "#0085FF", bg: "rgba(0,133,255,0.1)" },
  truthsocial: { color: "#6366F1", bg: "rgba(99,102,241,0.1)" },
}

export const SENTIMENT_STYLES: Record<string, { color: string; bg: string }> = {
  negative: { color: "#C62828", bg: "rgba(198,40,40,0.1)" },
  mixed: { color: "#E65100", bg: "rgba(230,81,0,0.1)" },
  neutral: { color: "#E65100", bg: "rgba(230,81,0,0.1)" },
  positive: { color: "#2E7D32", bg: "rgba(46,125,50,0.1)" },
}

export const PLATFORM_OPTIONS = ["All", "Reddit", "X", "TikTok", "YouTube"]
export const SENTIMENT_OPTIONS = [
  { id: "all", label: "All" },
  { id: "negative", label: "Negative" },
  { id: "neutral", label: "Neutral" },
  { id: "positive", label: "Positive" },
]
