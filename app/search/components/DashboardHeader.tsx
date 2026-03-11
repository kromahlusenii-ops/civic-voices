"use client"

import Link from "next/link"
import { useAuth } from "@/app/contexts/AuthContext"
import { LOCATION_STORAGE_KEY, US_STATES } from "@/lib/search-suggestions"

function getStoredStateCode(): string | null {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LOCATION_STORAGE_KEY) : null
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: string }
      return parsed.state ?? null
    }
  } catch {
    // ignore parsing errors
  }
  return null
}

interface DashboardHeaderProps {
  onShowAuth: () => void
  onShowSettings?: () => void
  onNewResearch?: () => void
  showUserMenu?: boolean
  onToggleUserMenu?: () => void
  /** User's selected state code (e.g. "AR"). When set, display state name only, not city. */
  selectedState?: string | null
  geoScope?: "national" | "state" | "city"
}

export default function DashboardHeader(props: DashboardHeaderProps) {
  const {
    onShowAuth,
    onShowSettings,
    onNewResearch,
    showUserMenu = false,
    onToggleUserMenu,
    selectedState,
    geoScope = "national",
  } = props
  const { isAuthenticated, user } = useAuth()
  const firstName = user?.user_metadata?.name
    ? (user.user_metadata.name as string).split(" ")[0]
    : null

  // Resolve location: state only (per user preference)
  const stateCode = selectedState ?? getStoredStateCode()
  const stateName = stateCode ? (US_STATES.find((s) => s.code === stateCode)?.name ?? null) : null
  const location = geoScope === "national" ? "National" : (stateName ?? "Select location")

  return (
    <header
      className="sticky top-0 z-50 flex h-14 items-center justify-between border-b px-4 backdrop-blur-[24px]"
      style={{
        backgroundColor: "rgba(245,240,232,0.95)",
        borderColor: "rgba(0,0,0,0.06)",
      }}
    >
      {/* Left: Logo + Wordmark + Label */}
      <div className="flex items-center gap-3">
        {onNewResearch ? (
          <button
            type="button"
            onClick={onNewResearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:opacity-95"
            style={{ background: "linear-gradient(135deg, #D4654A, #D4A24A)" }}
            aria-label="New search"
          >
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-body)" }}>
              CV
            </span>
          </button>
        ) : (
          <Link
            href="/search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #D4654A, #D4A24A)" }}
            aria-label="Civic Voices home"
          >
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-body)" }}>
              CV
            </span>
          </Link>
        )}
        <span className="hidden font-medium sm:inline" style={{ color: "#2C2519", fontFamily: "var(--font-body)" }}>
          Civic Voices
        </span>
      </div>

      {/* Right: User */}
      <div className="flex items-center gap-3">
        {onShowSettings && (
          <button
            type="button"
            onClick={onShowSettings}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            aria-label="Settings"
            style={{ color: "#2C2519" }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
            </svg>
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => (isAuthenticated ? onToggleUserMenu?.() : onShowAuth())}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            aria-label="User profile"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: "#00897B" }}
            >
              {isAuthenticated
                ? (firstName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U")
                : "?"}
            </div>
            {isAuthenticated && (
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium" style={{ color: "#2C2519" }}>
                  {firstName || "User"}
                </p>
              </div>
            )}
          </button>
          {showUserMenu && isAuthenticated && onShowSettings && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl py-2 shadow-lg"
              style={{
                backgroundColor: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onShowSettings()
                  onToggleUserMenu?.()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[rgba(0,0,0,0.04)]"
                style={{ color: "#2C2519" }}
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
