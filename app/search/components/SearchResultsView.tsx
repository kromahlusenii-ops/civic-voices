"use client"

import { useState, useMemo, useCallback } from "react"
import type { UseStreamingSearchReturn } from "@/lib/hooks/useStreamingSearch"
import type { Post, AIAnalysis } from "@/lib/types/api"
import SearchPostCard from "./SearchPostCard"
import PlatformStatusBar from "./PlatformStatusBar"
import WarningBanner from "./WarningBanner"
import { PLATFORM_OPTIONS, SENTIMENT_OPTIONS } from "./platformConstants"

interface SearchResults {
  query: string
  posts: Post[]
  totalMentions: number
  qualityBadge: string | null
  dateRange: { start: string; end: string }
  aiAnalysis: AIAnalysis | null
  keyThemes: string[]
  searchId?: string
  warnings?: string[]
}

interface SearchResultsViewProps {
  results: SearchResults
  streamingState: UseStreamingSearchReturn
  isStreaming?: boolean
  onBackToDashboard: () => void
  selectedSources: string[]
}

export default function SearchResultsView({
  results,
  streamingState,
  onBackToDashboard,
  selectedSources,
}: SearchResultsViewProps) {
  const [platformFilter, setPlatformFilter] = useState("All")
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [dismissedWarnings, setDismissedWarnings] = useState<number[]>([])

  // Compute visible warnings (filter out dismissed)
  const visibleWarnings = useMemo(() => {
    const all = results.warnings ?? []
    return all.filter((_, i) => !dismissedWarnings.includes(i))
  }, [results.warnings, dismissedWarnings])

  const handleDismissWarning = useCallback((index: number) => {
    // Map visible index back to original index
    const all = results.warnings ?? []
    let visibleIdx = -1
    for (let i = 0; i < all.length; i++) {
      if (!dismissedWarnings.includes(i)) {
        visibleIdx++
        if (visibleIdx === index) {
          setDismissedWarnings((prev) => [...prev, i])
          return
        }
      }
    }
  }, [results.warnings, dismissedWarnings])

  // Filter posts by platform and sentiment
  const filteredPosts = useMemo(() => {
    let list = results.posts
    if (platformFilter !== "All") {
      const platformKey = platformFilter.toLowerCase()
      list = list.filter((p) => p.platform === platformKey)
    }
    if (sentimentFilter !== "all") {
      list = list.filter((p) => (p.sentiment ?? "neutral").toLowerCase() === sentimentFilter)
    }
    return list
  }, [results.posts, platformFilter, sentimentFilter])

  // Calculate sentiment percentages from all posts (not filtered)
  const sentimentCounts = useMemo(() => {
    if (!results.posts || results.posts.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 }
    }
    return results.posts.reduce(
      (acc, post) => {
        const sentiment = (post.sentiment ?? "neutral").toLowerCase()
        if (sentiment === "positive") acc.positive++
        else if (sentiment === "negative") acc.negative++
        else acc.neutral++
        return acc
      },
      { positive: 0, neutral: 0, negative: 0 },
    )
  }, [results.posts])

  const totalSent = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative || 1
  const negPct = Math.round((sentimentCounts.negative / totalSent) * 100)
  const neutPct = Math.round((sentimentCounts.neutral / totalSent) * 100)
  const posPct = Math.round((sentimentCounts.positive / totalSent) * 100)

  const postCount = results.posts.length
  const platformCount = new Set(results.posts.map((p) => p.platform)).size

  const FilterButton = ({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[5px] px-3 py-1.5 text-sm transition-colors"
      style={
        active
          ? { background: "rgba(0,0,0,0.08)", color: "#2C2519", fontWeight: 600 }
          : { background: "transparent", color: "rgba(0,0,0,0.35)" }
      }
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header: Back button + Query heading */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex h-9 items-center justify-center rounded-md transition-colors hover:bg-[rgba(0,0,0,0.06)]"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 6,
                color: "rgba(0,0,0,0.5)",
                padding: "6px 10px",
              }}
              aria-label="Back to dashboard"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold" style={{ color: "#2C2519", fontSize: 20 }}>
              {results.query}
            </h1>
          </div>

          {/* Platform status bar */}
          <PlatformStatusBar
            platformStatus={streamingState.platformStatus}
            platformCounts={streamingState.platformCounts}
            platformErrors={streamingState.platformErrors}
            aiAnalysisStatus={streamingState.aiAnalysisStatus}
            totalPosts={postCount}
            isComplete={streamingState.isComplete}
            selectedSources={selectedSources}
          />

          {/* Warning banners */}
          <WarningBanner
            warnings={visibleWarnings}
            onDismiss={handleDismissWarning}
          />
        </div>

        {/* Main content: sidebar + feed */}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left sidebar */}
          <div className="flex flex-col gap-6">
            {/* Post count card */}
            <div
              className="flex flex-col gap-3 rounded-xl p-6"
              style={{
                backgroundColor: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div className="grid w-full grid-cols-2 gap-2">
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                >
                  <p className="text-lg font-bold" style={{ color: "#2C2519" }}>
                    {postCount}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "rgba(0,0,0,0.45)",
                    }}
                  >
                    POSTS
                  </p>
                </div>
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                >
                  <p className="text-lg font-bold" style={{ color: "#2C2519" }}>
                    {platformCount}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "rgba(0,0,0,0.45)",
                    }}
                  >
                    PLATFORMS
                  </p>
                </div>
              </div>
            </div>

            {/* Sentiment bar */}
            <div className="space-y-2">
              <div
                className="flex h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
              >
                <div style={{ width: `${negPct}%`, backgroundColor: "#C62828" }} />
                <div style={{ width: `${neutPct}%`, backgroundColor: "#E65100" }} />
                <div style={{ width: `${posPct}%`, backgroundColor: "#2E7D32" }} />
              </div>
              <p
                className="text-[11px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "rgba(0,0,0,0.5)",
                }}
              >
                <span style={{ color: "#C62828" }}>Negative {negPct}%</span>{" "}
                <span style={{ color: "#E65100" }}>Neutral {neutPct}%</span>{" "}
                <span style={{ color: "#2E7D32" }}>Positive {posPct}%</span>
              </p>
            </div>

            {/* AI Briefing */}
            {results.aiAnalysis?.interpretation && (
              <div>
                <p
                  className="mb-2 text-xs font-semibold uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  ✦ AI BRIEFING
                </p>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: "rgba(0,0,0,0.7)", lineHeight: 1.65 }}
                >
                  {results.aiAnalysis.interpretation}
                </p>
                {results.aiAnalysis.sentimentBreakdown?.summary && (
                  <p
                    className="mt-3 text-[12px] italic leading-relaxed"
                    style={{ color: "rgba(0,0,0,0.55)", lineHeight: 1.6 }}
                  >
                    {results.aiAnalysis.sentimentBreakdown.summary}
                  </p>
                )}
              </div>
            )}

            {/* Key Themes */}
            {results.aiAnalysis?.keyThemes && results.aiAnalysis.keyThemes.length > 0 && (
              <div>
                <p
                  className="mb-2 text-xs font-semibold uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  KEY THEMES
                </p>
                <div className="flex flex-wrap gap-2">
                  {results.aiAnalysis.keyThemes.slice(0, 6).map((theme, i) => (
                    <span
                      key={i}
                      className="rounded-lg px-3 py-2.5 text-sm"
                      style={{
                        background: "rgba(0,0,0,0.02)",
                        borderLeft: "3px solid #D4A24A",
                        color: "rgba(0,0,0,0.75)",
                      }}
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Queries */}
            {results.aiAnalysis?.suggestedQueries && results.aiAnalysis.suggestedQueries.length > 0 && (
              <div>
                <p
                  className="mb-2 text-xs font-semibold uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  SUGGESTED QUERIES
                </p>
                <div className="flex flex-col gap-2">
                  {results.aiAnalysis.suggestedQueries.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        streamingState.startSearch({
                          query: suggestion.query,
                          sources: selectedSources,
                          timeFilter: "7d",
                        })
                      }}
                      className="group rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                      style={{
                        background: "rgba(212,162,74,0.08)",
                        border: "1px solid rgba(212,162,74,0.2)",
                        color: "rgba(0,0,0,0.75)",
                      }}
                    >
                      <span className="font-medium" style={{ color: "#2C2519" }}>
                        {suggestion.label}
                      </span>
                      {suggestion.description && (
                        <span
                          className="ml-1.5 text-xs"
                          style={{ color: "rgba(0,0,0,0.45)" }}
                        >
                          — {suggestion.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right feed */}
          <div className="min-w-0 space-y-4">
            {/* Platform / Sentiment filter row */}
            <div className="flex flex-nowrap gap-6 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{
                    color: "rgba(0,0,0,0.4)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Platform:
                </span>
                {PLATFORM_OPTIONS.map((p) => (
                  <FilterButton
                    key={p}
                    active={platformFilter === p}
                    onClick={() => setPlatformFilter(p)}
                  >
                    {p}
                  </FilterButton>
                ))}
              </div>
              <div
                className="h-4 w-px"
                style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
              />
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{
                    color: "rgba(0,0,0,0.4)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Sentiment:
                </span>
                {SENTIMENT_OPTIONS.map((o) => (
                  <FilterButton
                    key={o.id}
                    active={sentimentFilter === o.id}
                    onClick={() => setSentimentFilter(o.id)}
                  >
                    {o.label}
                  </FilterButton>
                ))}
              </div>
            </div>

            {/* Conversations header */}
            <p
              className="text-xs font-semibold uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                color: "rgba(0,0,0,0.45)",
              }}
            >
              CONVERSATIONS ({filteredPosts.length})
            </p>

            {/* Post feed */}
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <p className="text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>
                  No posts match the current filters.
                </p>
                {(platformFilter !== "All" || sentimentFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformFilter("All")
                      setSentimentFilter("all")
                    }}
                    className="mt-3 text-xs font-medium underline"
                    style={{ color: "#D4A24A" }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <SearchPostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
