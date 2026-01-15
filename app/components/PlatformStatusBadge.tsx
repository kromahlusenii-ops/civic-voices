"use client"

import type { PlatformStatus } from "@/lib/hooks/useStreamingSearch"

interface PlatformStatusBadgeProps {
  platform: string
  status: PlatformStatus
  count?: number
  error?: string
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  x: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  tiktok: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  youtube: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  bluesky: (
    <svg className="h-4 w-4" viewBox="0 0 600 530" fill="currentColor">
      <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
  ),
  truthsocial: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
}

const PLATFORM_NAMES: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  truthsocial: "Truth Social",
}

const PLATFORM_COLORS: Record<string, string> = {
  x: "text-gray-900",
  tiktok: "text-black",
  youtube: "text-red-600",
  bluesky: "text-blue-500",
  truthsocial: "text-blue-700",
}

export default function PlatformStatusBadge({
  platform,
  status,
  count,
  error,
}: PlatformStatusBadgeProps) {
  const icon = PLATFORM_ICONS[platform] || PLATFORM_ICONS.x
  const name = PLATFORM_NAMES[platform] || platform
  const color = PLATFORM_COLORS[platform] || "text-gray-600"

  const getStatusIndicator = () => {
    switch (status) {
      case "pending":
        return (
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-pulse rounded-full bg-gray-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-300" />
          </span>
        )
      case "loading":
        return (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        )
      case "complete":
        return (
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {typeof count === "number" && (
              <span className="text-xs font-medium text-gray-600">{count}</span>
            )}
          </span>
        )
      case "error":
        return (
          <span className="group relative">
            <svg
              className="h-3 w-3 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {error && (
              <span className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                {error}
              </span>
            )}
          </span>
        )
      default:
        return null
    }
  }

  const getBadgeStyles = () => {
    const baseStyles =
      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all"

    switch (status) {
      case "pending":
        return `${baseStyles} bg-gray-100 text-gray-500`
      case "loading":
        return `${baseStyles} bg-blue-50 text-blue-700 ring-1 ring-blue-200`
      case "complete":
        return `${baseStyles} bg-green-50 text-green-700 ring-1 ring-green-200`
      case "error":
        return `${baseStyles} bg-red-50 text-red-700 ring-1 ring-red-200`
      default:
        return `${baseStyles} bg-gray-100 text-gray-500`
    }
  }

  return (
    <div className={getBadgeStyles()} title={error || `${name}: ${status}`}>
      <span className={color}>{icon}</span>
      <span className="hidden sm:inline">{name}</span>
      <span className="relative">{getStatusIndicator()}</span>
    </div>
  )
}

// Component to render multiple platform badges
interface PlatformStatusListProps {
  platforms: string[]
  platformStatus: Record<string, PlatformStatus>
  platformCounts: Record<string, number>
  platformErrors: Record<string, string>
}

export function PlatformStatusList({
  platforms,
  platformStatus,
  platformCounts,
  platformErrors,
}: PlatformStatusListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <PlatformStatusBadge
          key={platform}
          platform={platform}
          status={platformStatus[platform] || "pending"}
          count={platformCounts[platform]}
          error={platformErrors[platform]}
        />
      ))}
    </div>
  )
}
