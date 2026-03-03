"use client"

import { useState, useEffect } from "react"
import type { UseStreamingSearchReturn } from "@/lib/hooks/useStreamingSearch"
import PlatformStatusBar from "./PlatformStatusBar"
import { SkeletonCardList } from "@/app/components/SkeletonCard"

interface SearchLoadingViewProps {
  streamingState: UseStreamingSearchReturn
  selectedSources: string[]
  isStreaming: boolean
  searchProgress: string
}

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <span
      className="text-xs tabular-nums"
      style={{
        color: "rgba(0,0,0,0.5)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, "0")}`
        : `${seconds}s`}
    </span>
  )
}

export default function SearchLoadingView({
  streamingState,
  selectedSources,
  isStreaming,
  searchProgress,
}: SearchLoadingViewProps) {
  if (isStreaming) {
    return (
      <div
        className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8"
        style={{ backgroundColor: "#F5F0E8" }}
        role="status"
        aria-live="polite"
      >
        {/* Platform status bar with real per-platform data */}
        <PlatformStatusBar
          platformStatus={streamingState.platformStatus}
          platformCounts={streamingState.platformCounts}
          platformErrors={streamingState.platformErrors}
          aiAnalysisStatus={streamingState.aiAnalysisStatus}
          totalPosts={streamingState.posts.length}
          isComplete={streamingState.isComplete}
          selectedSources={selectedSources}
        />

        {/* Live post count */}
        <div className="flex items-center justify-center gap-2">
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: "#D4654A" }}
          />
          <span
            className="text-sm"
            style={{
              color: "rgba(0,0,0,0.5)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {streamingState.posts.length} posts collected...
          </span>
        </div>

        {/* Skeleton placeholders */}
        <SkeletonCardList count={5} />
      </div>
    )
  }

  // Non-streaming mode
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8"
      style={{ backgroundColor: "#F5F0E8" }}
      role="status"
      aria-live="polite"
    >
      {/* Spinner + progress text + elapsed timer */}
      <div className="flex flex-col items-center gap-4 py-8">
        {/* Spinner */}
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "#D4654A" }}
        />

        {/* Progress text */}
        <p
          className="text-center text-sm"
          style={{
            color: "rgba(0,0,0,0.5)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {searchProgress}
        </p>

        {/* Elapsed timer */}
        <ElapsedTimer />
      </div>

      {/* Skeleton placeholders */}
      <SkeletonCardList count={5} />
    </div>
  )
}
