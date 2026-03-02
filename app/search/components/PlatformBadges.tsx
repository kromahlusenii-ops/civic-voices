"use client"

const PLATFORMS = [
  { id: "reddit", label: "Reddit", color: "#D4450A", bg: "rgba(255,87,34,0.12)" },
  { id: "x", label: "X", color: "#505050", bg: "rgba(80,80,80,0.08)" },
  { id: "tiktok", label: "TikTok", color: "#00897B", bg: "rgba(0,137,123,0.1)" },
  { id: "youtube", label: "YouTube", color: "#CC0000", bg: "rgba(204,0,0,0.08)" },
] as const

interface PlatformBadgesProps {
  selectedPlatforms: string[]
  onPlatformToggle?: (platform: string) => void
  /** When true, only badges for platforms in selectedPlatforms are shown (channels used in search). Default true. */
  showOnlySelected?: boolean
}

export default function PlatformBadges({
  selectedPlatforms,
  showOnlySelected = true,
}: PlatformBadgesProps) {
  const toShow = showOnlySelected
    ? PLATFORMS.filter((p) => selectedPlatforms.includes(p.id))
    : [...PLATFORMS]

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <div className="flex flex-wrap gap-1.5">
        {toShow.map((p) => (
          <span
            key={p.id}
            className="rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              color: p.color,
              backgroundColor: p.bg,
              border: `1px solid ${p.color}40`,
              fontFamily: "var(--font-body)",
            }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
