"use client"

import { PlatformStatusList } from "@/app/components/PlatformStatusBadge"
import type { PlatformStatus } from "@/lib/hooks/useStreamingSearch"

interface PlatformStatusBarProps {
  platformStatus: Record<string, PlatformStatus>
  platformCounts: Record<string, number>
  platformErrors: Record<string, string>
  aiAnalysisStatus: "idle" | "loading" | "complete" | "error"
  totalPosts: number
  isComplete: boolean
  selectedSources: string[]
}

export default function PlatformStatusBar({
  platformStatus,
  platformCounts,
  platformErrors,
  aiAnalysisStatus,
  totalPosts,
  isComplete,
  selectedSources,
}: PlatformStatusBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-xl px-4 py-3"
      style={{
        backgroundColor: "rgba(0,0,0,0.025)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Per-platform status badges */}
      <PlatformStatusList
        platforms={selectedSources}
        platformStatus={platformStatus}
        platformCounts={platformCounts}
        platformErrors={platformErrors}
      />

      {/* Separator */}
      <div
        className="hidden h-6 w-px sm:block"
        style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
      />

      {/* AI analysis indicator */}
      {aiAnalysisStatus !== "idle" && (
        <div className="flex items-center gap-1.5">
          {aiAnalysisStatus === "loading" && (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span
                className="text-xs"
                style={{
                  color: "rgba(0,0,0,0.5)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Analyzing...
              </span>
            </>
          )}
          {aiAnalysisStatus === "complete" && (
            <>
              <svg
                className="h-3.5 w-3.5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span
                className="text-xs"
                style={{
                  color: "rgba(0,0,0,0.5)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Analysis ready
              </span>
            </>
          )}
          {aiAnalysisStatus === "error" && (
            <>
              <svg
                className="h-3.5 w-3.5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span
                className="text-xs"
                style={{
                  color: "rgba(0,0,0,0.5)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Analysis unavailable
              </span>
            </>
          )}
        </div>
      )}

      {/* Live post counter */}
      <div className="ml-auto">
        <span
          className="text-xs font-medium"
          style={{
            color: isComplete ? "#2C2519" : "rgba(0,0,0,0.5)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {totalPosts} {totalPosts === 1 ? "post" : "posts"} found
        </span>
      </div>
    </div>
  )
}
