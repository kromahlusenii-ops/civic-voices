"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from "react"
import type { TaxonomyCategory, Subcategory } from "@/lib/data/taxonomy"
import type { GeoScope } from "./GeoScopeToggle"
import type { LegislativeSignalsResponse } from "@/lib/types/api"
import { PLATFORM_OPTIONS, SENTIMENT_OPTIONS } from "./platformConstants"
import SearchPostCard from "./SearchPostCard"

interface IssueDetailViewProps {
  category: TaxonomyCategory
  subcategory: Subcategory
  geoScope: GeoScope
  geoLabel: string
  city?: string
  state?: string
  timeFilter: string
  signalsCache: Record<string, LegislativeSignalsResponse>
  buildCacheKey: (subId: string, s?: string | null, c?: string | null) => string
  onSignalsLoaded: (key: string, data: LegislativeSignalsResponse) => void
  /** Called when the subcategory is not in cache — parent should enqueue it HIGH priority. */
  onMissing?: (subcategoryId: string) => void
  /** ID of the subcategory the queue is currently fetching, for the loading indicator. */
  loadingSubcategoryId?: string | null
  onBack: () => void
  onTrackIssue?: () => void
  isTracked?: boolean
}

export default function IssueDetailView({
  category,
  subcategory,
  geoScope,
  geoLabel,
  city,
  state,
  timeFilter,
  signalsCache,
  buildCacheKey,
  onSignalsLoaded,
  onMissing,
  loadingSubcategoryId,
  onBack,
  onTrackIssue,
  isTracked = false,
}: IssueDetailViewProps) {
  const [platformFilter, setPlatformFilter] = useState("All")
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [data, setData] = useState<LegislativeSignalsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cacheKey = buildCacheKey(subcategory.id, state, city)
    const cached = signalsCache[cacheKey]

    if (cached) {
      setData(cached)
      setLoading(false)
      setError(null)
      return
    }

    // Not in cache — ask the parent queue to fetch it (HIGH priority).
    // When the queue writes the result, signalsCache updates and this effect re-runs.
    setData(null)
    setLoading(true)
    onMissing?.(subcategory.id)
  }, [subcategory.id, state, city, geoScope, timeFilter, buildCacheKey, signalsCache, onMissing])

  const filteredPosts = useMemo(() => {
    if (!data?.posts) return []
    let list = data.posts
    if (platformFilter !== "All") {
      const platformKey = platformFilter.toLowerCase()
      list = list.filter((p) => p.platform === platformKey)
    }
    if (sentimentFilter !== "all") {
      list = list.filter((p) => (p.sentiment ?? "neutral").toLowerCase() === sentimentFilter)
    }
    if (verifiedOnly) {
      list = list.filter((p) => p.verificationBadge || (p.credibilityScore != null && p.credibilityScore >= 0.7))
    }
    return list
  }, [data?.posts, platformFilter, sentimentFilter, verifiedOnly])

  // Calculate sentiment from actual posts, not summary (ensures filter matches bar)
  const sentimentCounts = useMemo(() => {
    if (!data?.posts || data.posts.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 }
    }
    return data.posts.reduce(
      (acc, post) => {
        const sentiment = (post.sentiment ?? "neutral").toLowerCase()
        if (sentiment === "positive") acc.positive++
        else if (sentiment === "negative") acc.negative++
        else acc.neutral++
        return acc
      },
      { positive: 0, neutral: 0, negative: 0 }
    )
  }, [data?.posts])
  
  const totalSent = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative || 1
  const negPct = Math.round((sentimentCounts.negative / totalSent) * 100)
  const neutPct = Math.round((sentimentCounts.neutral / totalSent) * 100)
  const posPct = Math.round((sentimentCounts.positive / totalSent) * 100)

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

  if (loading) {
    return <IssueDetailSkeleton category={category} subcategory={subcategory} onBack={onBack} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24" style={{ backgroundColor: "#F5F0E8" }}>
        <p className="text-sm font-medium" style={{ color: "#C62828" }}>{error}</p>
        <p className="mt-2 text-xs" style={{ color: "rgba(0,0,0,0.5)" }}>
          Make sure search APIs (Reddit, X) are configured.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-lg px-4 py-2 text-sm"
          style={{ background: "rgba(0,0,0,0.06)", color: "#2C2519" }}
        >
          Back
        </button>
      </div>
    )
  }

  const postCount = data?.posts?.length ?? 0
  const platformCount = new Set(data?.posts?.map((p) => p.platform) ?? []).size
  const credibility = data?.summary?.credibility

  return (
    <div className="flex flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex h-9 items-center justify-center rounded-md transition-colors hover:bg-[rgba(0,0,0,0.06)]"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 6,
                  color: "rgba(0,0,0,0.5)",
                  padding: "6px 10px",
                }}
                aria-label="Back"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <span
                  className="inline-block rounded px-2 py-0.5 text-[9px] uppercase tracking-wider"
                  style={{
                    background: `${category.color}15`,
                    border: `1px solid ${category.color}30`,
                    color: category.color,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {category.name}
                </span>
                <h1 className="mt-2 text-xl font-bold" style={{ color: "#2C2519", fontSize: 20 }}>
                  {subcategory.name}
                </h1>
                <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.45)" }}>
                  {postCount} posts · {platformCount} platforms · last 7 days
                  {geoLabel && ` · ${geoLabel}`}
                  {credibility && credibility.verifiedCount > 0 && ` · ${credibility.verifiedCount} verified`}
                </p>
              </div>
            </div>
          </div>
          {onTrackIssue && (
            <button
              type="button"
              onClick={onTrackIssue}
              className="shrink-0 rounded-md px-3 py-2 text-xs"
              style={
                isTracked
                  ? { background: "rgba(212,162,74,0.12)", border: "1px solid rgba(212,162,74,0.3)", color: "#D4A24A", fontFamily: "var(--font-mono)" }
                  : { background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.5)", fontFamily: "var(--font-mono)" }
              }
            >
              {isTracked ? "✓ Tracked" : "Track Issue"}
            </button>
          )}
        </div>

        {/* AI Summary Bar - at the top for quick insights */}
        {data?.aiAnalysis?.sentimentBreakdown && (
          <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: "rgba(212,162,74,0.08)", border: "1px solid rgba(212,162,74,0.2)" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl" style={{ color: "#D4A24A" }}>✦</span>
              <div className="flex-1">
                <p className="mb-1 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                  AI QUICK SUMMARY
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.75)", lineHeight: 1.5 }}>
                  Overall sentiment: <strong style={{ color: data.aiAnalysis.sentimentBreakdown.overall === "positive" ? "#2E7D32" : data.aiAnalysis.sentimentBreakdown.overall === "negative" ? "#C62828" : "#E65100" }}>{data.aiAnalysis.sentimentBreakdown.overall}</strong>
                  {data.aiAnalysis.sentimentBreakdown.summary && ` — ${data.aiAnalysis.sentimentBreakdown.summary}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Row */}
        <div className="mb-6 flex flex-nowrap gap-6 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)", fontFamily: "var(--font-mono)" }}>Platform:</span>
            {PLATFORM_OPTIONS.map((p) => (
              <FilterButton key={p} active={platformFilter === p} onClick={() => setPlatformFilter(p)}>{p}</FilterButton>
            ))}
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: "rgba(0,0,0,0.1)" }} />
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)", fontFamily: "var(--font-mono)" }}>Sentiment:</span>
            {SENTIMENT_OPTIONS.map((o) => (
              <FilterButton key={o.id} active={sentimentFilter === o.id} onClick={() => setSentimentFilter(o.id)}>{o.label}</FilterButton>
            ))}
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: "rgba(0,0,0,0.1)" }} />
          <FilterButton active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>
            Verified only
          </FilterButton>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left — Signal Intelligence Panel */}
          <div className="flex flex-col gap-6">
            {/* Post count & Credibility */}
            <div className="flex flex-col gap-3 rounded-xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="grid w-full grid-cols-2 gap-2">
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                  <p className="text-lg font-bold" style={{ color: "#2C2519" }}>{postCount}</p>
                  <p className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.45)" }}>POSTS</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                  <p className="text-lg font-bold" style={{ color: "#2C2519" }}>
                    {credibility ? `${Math.round(credibility.averageScore * 100)}%` : "—"}
                  </p>
                  <p className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.45)" }}>SOURCE CREDIBILITY</p>
                </div>
              </div>
            </div>

            {/* Sentiment Bar */}
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full flex" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
                <div style={{ width: `${negPct}%`, backgroundColor: "#C62828" }} />
                <div style={{ width: `${neutPct}%`, backgroundColor: "#E65100" }} />
                <div style={{ width: `${posPct}%`, backgroundColor: "#2E7D32" }} />
              </div>
              <p className="text-[11px]" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.5)" }}>
                <span style={{ color: "#C62828" }}>Negative {negPct}%</span>{" "}
                <span style={{ color: "#E65100" }}>Neutral {neutPct}%</span>{" "}
                <span style={{ color: "#2E7D32" }}>Positive {posPct}%</span>
              </p>
            </div>

            {/* AI Briefing */}
            {data?.aiAnalysis?.interpretation && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                  ✦ AI BRIEFING
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: "rgba(0,0,0,0.7)", lineHeight: 1.65 }}>
                  {data.aiAnalysis.interpretation}
                </p>
                {data.aiAnalysis.sentimentBreakdown?.summary && (
                  <p className="mt-3 text-[12px] italic leading-relaxed" style={{ color: "rgba(0,0,0,0.55)", lineHeight: 1.6 }}>
                    {data.aiAnalysis.sentimentBreakdown.summary}
                  </p>
                )}
              </div>
            )}

            {/* Key Themes */}
            {data?.aiAnalysis?.keyThemes && data.aiAnalysis.keyThemes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                  KEY THEMES
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.aiAnalysis.keyThemes.slice(0, 6).map((theme, i) => (
                    <span
                      key={i}
                      className="rounded-lg py-2.5 px-3 text-sm"
                      style={{ background: "rgba(0,0,0,0.02)", borderLeft: "3px solid #D4A24A", color: "rgba(0,0,0,0.75)" }}
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-md py-2 text-center text-[11px]" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, color: "rgba(0,0,0,0.45)", fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                Export PDF
              </button>
              <button type="button" className="flex-1 rounded-md py-2 text-center text-[11px]" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, color: "rgba(0,0,0,0.45)", fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                Share Briefing
              </button>
            </div>
          </div>

          {/* Right — Synthesize + Post Feed */}
          <div className="min-w-0 space-y-6">
            {/* Synthesize Section */}
            {!data?.aiAnalysis && postCount > 0 && (
              <div className="rounded-xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="mb-2 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                  ✦ SYNTHESIZE
                </p>
                <p className="text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>
                  AI analysis is not available for this topic. Check your API configuration.
                </p>
              </div>
            )}
            
            {data?.aiAnalysis && (
              <div className="rounded-xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="mb-4 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                  ✦ SYNTHESIZE
                </p>

                {/* Key Insights */}
                {data.aiAnalysis.keyThemes && data.aiAnalysis.keyThemes.length > 0 && (
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold" style={{ color: "#2C2519" }}>Key Insights</h3>
                    <ul className="space-y-2">
                      {data.aiAnalysis.keyThemes.slice(0, 3).map((theme, i) => (
                        <li key={i} className="flex gap-2 text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
                          <span style={{ color: "#D4A24A", fontWeight: "bold" }}>•</span>
                          <span>{theme}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pain Points */}
                <div className="mb-5">
                  <h3 className="mb-2 text-sm font-semibold" style={{ color: "#2C2519" }}>Pain Points</h3>
                  <div className="space-y-2">
                    {sentimentCounts.negative > 0 && (
                      <div className="flex gap-2 text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
                        <span style={{ color: "#C62828", fontWeight: "bold" }}>•</span>
                        <span>
                          {negPct}% of conversations express negative sentiment about {subcategory.name.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {data.aiAnalysis.interpretation && (
                      <div className="flex gap-2 text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
                        <span style={{ color: "#C62828", fontWeight: "bold" }}>•</span>
                        <span>
                          {data.aiAnalysis.interpretation.split('.')[0]}.
                        </span>
                      </div>
                    )}
                    {postCount > 50 && (
                      <div className="flex gap-2 text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
                        <span style={{ color: "#C62828", fontWeight: "bold" }}>•</span>
                        <span>
                          High volume of discussion ({postCount} posts) indicates widespread concern
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* What People Want */}
                {data.aiAnalysis.suggestedQueries && data.aiAnalysis.suggestedQueries.length > 0 && (
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold" style={{ color: "#2C2519" }}>What People Want</h3>
                    <ul className="space-y-2">
                      {data.aiAnalysis.suggestedQueries.slice(0, 3).map((suggestion, i) => (
                        <li key={i} className="flex gap-2 text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
                          <span style={{ color: "#2E7D32", fontWeight: "bold" }}>→</span>
                          <span>{suggestion.label || suggestion.query}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topic Analysis */}
                {data.aiAnalysis.topicAnalysis && data.aiAnalysis.topicAnalysis.length > 0 && (
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold" style={{ color: "#2C2519" }}>Topic Breakdown</h3>
                    <div className="space-y-3">
                      {data.aiAnalysis.topicAnalysis.slice(0, 3).map((topic, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ background: "rgba(212,162,74,0.08)", border: "1px solid rgba(212,162,74,0.2)" }}>
                          <h4 className="mb-1 text-xs font-semibold" style={{ color: "#D4654A" }}>{topic.topic}</h4>
                          <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.65)" }}>
                            {topic.postsOverview}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Intentions Breakdown */}
                {data.aiAnalysis.intentionsBreakdown && data.aiAnalysis.intentionsBreakdown.length > 0 && (
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold" style={{ color: "#2C2519" }}>Post Intentions</h3>
                    <div className="space-y-2">
                      {data.aiAnalysis.intentionsBreakdown.map((intent, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>{intent.name}</span>
                          <span className="text-xs font-semibold" style={{ color: "#D4A24A" }}>{intent.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Question */}
                {data.aiAnalysis.followUpQuestion && (
                  <div className="rounded-lg p-4" style={{ background: "rgba(212,101,74,0.08)", border: "1px solid rgba(212,101,74,0.2)" }}>
                    <p className="mb-1 text-[10px] font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                      SUGGESTED FOLLOW-UP
                    </p>
                    <p className="text-sm" style={{ color: "rgba(0,0,0,0.75)", lineHeight: 1.5 }}>
                      {data.aiAnalysis.followUpQuestion}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Conversations Header */}
            <p className="text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.45)" }}>
              CONVERSATIONS ({filteredPosts.length})
            </p>

            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white/80 py-16 text-center">
                <p className="text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>
                  No posts found for {subcategory.name} {city && `in ${city}`}.
                </p>
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

function IssueDetailSkeleton({
  category,
  subcategory,
  onBack,
}: {
  category: TaxonomyCategory
  subcategory: Subcategory
  onBack: () => void
}) {
  return (
    <div className="flex flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex h-9 items-center justify-center rounded-md transition-colors hover:bg-[rgba(0,0,0,0.06)]"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 6,
                  color: "rgba(0,0,0,0.5)",
                  padding: "6px 10px",
                }}
                aria-label="Back"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <span
                  className="inline-block rounded px-2 py-0.5 text-[9px] uppercase tracking-wider"
                  style={{
                    background: `${category.color}15`,
                    border: `1px solid ${category.color}30`,
                    color: category.color,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {category.name}
                </span>
                <h1 className="mt-2 text-xl font-bold" style={{ color: "#2C2519", fontSize: 20 }}>
                  {subcategory.name}
                </h1>
                <div className="mt-2 h-3 w-48 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-nowrap gap-6 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-12 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: "rgba(0,0,0,0.1)" }} />
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="grid w-full grid-cols-2 gap-2">
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                  <div className="mx-auto mb-1 h-5 w-8 animate-pulse rounded bg-gray-200" />
                  <div className="mx-auto h-3 w-12 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                  <div className="mx-auto mb-1 h-5 w-10 animate-pulse rounded bg-gray-200" />
                  <div className="mx-auto h-3 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-200" />
              <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
            </div>
            <div>
              <div className="mb-2 h-3 w-24 animate-pulse rounded bg-gray-200" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 animate-pulse rounded-md bg-gray-100" />
              <div className="h-9 flex-1 animate-pulse rounded-md bg-gray-100" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-4 h-3 w-32 animate-pulse rounded bg-gray-200" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-lg p-3.5"
                  style={{ background: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="mb-2 flex gap-2">
                    <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                    <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
                    <div className="h-5 w-14 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

