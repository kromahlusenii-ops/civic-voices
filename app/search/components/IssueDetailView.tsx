"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from "react"
import type { TaxonomyCategory, Subcategory } from "@/lib/data/taxonomy"
import type { GeoScope } from "./GeoScopeToggle"
import type { LegislativeSignalsResponse, Post } from "@/lib/types/api"
import { PLATFORM_OPTIONS, SENTIMENT_OPTIONS, PLATFORM_LABELS, PLATFORM_STYLES } from "./platformConstants"
import SearchPostCard from "./SearchPostCard"
import SubscriptionPaywall from "./SubscriptionPaywall"

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
  isSubscribed?: boolean
  isAuthenticated?: boolean
  onSubscribe?: () => void
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
  isSubscribed = true,
  isAuthenticated = false,
  onSubscribe,
}: IssueDetailViewProps) {
  const [platformFilter, setPlatformFilter] = useState("All")
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [data, setData] = useState<LegislativeSignalsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queriedKeywords, setQueriedKeywords] = useState<Set<string>>(new Set())
  const [additionalPosts, setAdditionalPosts] = useState<Post[]>([])
  const [loadingKeyword, setLoadingKeyword] = useState<string | null>(null)
  const [collapsedPlatforms, setCollapsedPlatforms] = useState<Set<string>>(new Set())
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())

  // Reset keyword state when subcategory changes
  useEffect(() => {
    setQueriedKeywords(new Set())
    setAdditionalPosts([])
    setLoadingKeyword(null)
    setCollapsedPlatforms(new Set())
    setExpandedPlatforms(new Set())
  }, [subcategory.id])

  useEffect(() => {
    const cacheKey = buildCacheKey(subcategory.id, state, city)
    const cached = signalsCache[cacheKey]

    if (cached) {
      setData(cached)
      setLoading(false)
      setError(null)
      // Seed queriedKeywords from the initial API query
      setQueriedKeywords((prev) => {
        if (prev.size === 0 && cached.query) return new Set([cached.query])
        return prev
      })
      return
    }

    // Not in cache — ask the parent queue to fetch it (HIGH priority).
    // When the queue writes the result, signalsCache updates and this effect re-runs.
    setData(null)
    setLoading(true)
    onMissing?.(subcategory.id)
  }, [subcategory.id, state, city, geoScope, timeFilter, buildCacheKey, signalsCache, onMissing])

  const allPosts = useMemo(() => {
    if (!data?.posts) return []
    const baseIds = new Set(data.posts.map((p) => p.id))
    const unique = additionalPosts.filter((p) => !baseIds.has(p.id))
    return [...data.posts, ...unique]
  }, [data?.posts, additionalPosts])

  const filteredPosts = useMemo(() => {
    if (allPosts.length === 0) return []
    let list = allPosts
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
  }, [allPosts, platformFilter, sentimentFilter, verifiedOnly])

  const groupedByPlatform = useMemo(() => {
    const groups: Record<string, Post[]> = {}
    for (const post of filteredPosts) {
      if (!groups[post.platform]) groups[post.platform] = []
      groups[post.platform].push(post)
    }
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([platform, posts]) => ({ platform, posts }))
  }, [filteredPosts])

  // Calculate sentiment from actual posts, not summary (ensures filter matches bar)
  const sentimentCounts = useMemo(() => {
    if (allPosts.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 }
    }
    return allPosts.reduce(
      (acc, post) => {
        const sentiment = (post.sentiment ?? "neutral").toLowerCase()
        if (sentiment === "positive") acc.positive++
        else if (sentiment === "negative") acc.negative++
        else acc.neutral++
        return acc
      },
      { positive: 0, neutral: 0, negative: 0 }
    )
  }, [allPosts])
  
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

  function togglePlatformCollapse(platform: string) {
    setCollapsedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) next.delete(platform)
      else next.add(platform)
      return next
    })
  }

  function toggleShowAll(platform: string) {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) next.delete(platform)
      else next.add(platform)
      return next
    })
  }

  const PlatformSection = ({
    platform,
    posts,
    isCollapsed,
    isShowingAll,
    onToggleCollapse,
    onToggleShowAll,
  }: {
    platform: string
    posts: Post[]
    isCollapsed: boolean
    isShowingAll: boolean
    onToggleCollapse: () => void
    onToggleShowAll: () => void
  }) => {
    const style = PLATFORM_STYLES[platform] ?? { color: "rgba(0,0,0,0.5)", bg: "rgba(0,0,0,0.05)" }
    const label = PLATFORM_LABELS[platform] ?? platform
    const PAGE_SIZE = 10
    const visiblePosts = isShowingAll ? posts : posts.slice(0, PAGE_SIZE)
    const remaining = posts.length - PAGE_SIZE

    return (
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.02)]"
          style={{ borderLeft: `3px solid ${style.color}` }}
        >
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {label}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)", fontFamily: "var(--font-mono)" }}
          >
            {posts.length}
          </span>
          <span className="flex-1" />
          <svg
            className="h-4 w-4 transition-transform"
            style={{
              color: "rgba(0,0,0,0.3)",
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!isCollapsed && (
          <div className="space-y-3 px-4 pb-4 pt-1">
            {visiblePosts.map((post) => (
              <SearchPostCard key={post.id} post={post} />
            ))}
            {remaining > 0 && !isShowingAll && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="w-full rounded-lg py-2.5 text-center text-xs font-medium transition-colors hover:bg-[rgba(0,0,0,0.06)]"
                style={{
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: "rgba(0,0,0,0.5)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Load more ({remaining} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  async function handleKeywordClick(keyword: string) {
    if (queriedKeywords.has(keyword) || loadingKeyword) return
    setLoadingKeyword(keyword)
    try {
      const url = new URL("/api/legislative/signals", window.location.origin)
      url.searchParams.set("subcategoryId", subcategory.id)
      url.searchParams.set("keyword", keyword)
      url.searchParams.set("timeFilter", timeFilter)
      url.searchParams.set("sources", "reddit,x")
      if (state) url.searchParams.set("state", state)
      if (city) url.searchParams.set("city", city)
      const res = await fetch(url.toString())
      if (res.ok) {
        const result: LegislativeSignalsResponse = await res.json()
        setAdditionalPosts((prev) => {
          const existingIds = new Set([...(data?.posts ?? []).map((p) => p.id), ...prev.map((p) => p.id)])
          const newPosts = (result.posts ?? []).filter((p) => !existingIds.has(p.id))
          return [...prev, ...newPosts]
        })
        setQueriedKeywords((prev) => new Set([...prev, keyword]))
      }
    } catch (err) {
      console.warn("[IssueDetailView] keyword fetch failed:", err)
    } finally {
      setLoadingKeyword(null)
    }
  }

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

  const postCount = allPosts.length
  const platformCount = new Set(allPosts.map((p) => p.platform)).size
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

        {/* Search Terms */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)", fontFamily: "var(--font-mono)" }}>
              Search terms:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {subcategory.socialKeywords.map((kw) => {
              const isQueried = queriedKeywords.has(kw)
              const isLoading = loadingKeyword === kw
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleKeywordClick(kw)}
                  disabled={isQueried || isLoading}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all"
                  style={
                    isQueried
                      ? { background: "rgba(212,162,74,0.15)", border: "1px solid rgba(212,162,74,0.3)", color: "#D4A24A", fontWeight: 600 }
                      : isLoading
                        ? { background: "rgba(212,162,74,0.08)", border: "1px solid rgba(212,162,74,0.25)", color: "#D4A24A" }
                        : { background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.5)", cursor: "pointer" }
                  }
                >
                  {isLoading && (
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  {isQueried && <span>✓</span>}
                  {kw}
                </button>
              )
            })}
          </div>
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
            {!isSubscribed && onSubscribe ? (
              <>
                {/* Teaser: show a faded preview of synthesize content */}
                <div className="relative max-h-[200px] overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, black 30%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 100%)" }}>
                  {data?.aiAnalysis && (
                    <div className="rounded-xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
                      <p className="mb-4 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                        ✦ SYNTHESIZE
                      </p>
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
                    </div>
                  )}
                  {!data?.aiAnalysis && postCount > 0 && (
                    <div className="rounded-xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
                      <p className="mb-2 text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                        ✦ SYNTHESIZE
                      </p>
                    </div>
                  )}
                </div>
                <SubscriptionPaywall onSubscribe={onSubscribe} isAuthenticated={isAuthenticated ?? false} />
              </>
            ) : (
            <>
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

                {/* Topic Breakdown */}
                {data.aiAnalysis.topicAnalysis && data.aiAnalysis.topicAnalysis.length > 0 && (
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold" style={{ color: "#2C2519" }}>Topic Breakdown</h3>
                    <ul className="space-y-2">
                      {data.aiAnalysis.topicAnalysis.slice(0, 5).map((topic, i) => (
                        <li key={i} className="flex gap-2 text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
                          <span style={{ color: "#D4A24A", fontWeight: "bold" }}>•</span>
                          <span>
                            <strong>{topic.topic}</strong>
                            {topic.postsOverview && ` — ${topic.postsOverview.split('.')[0]}.`}
                          </span>
                        </li>
                      ))}
                    </ul>
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
              <div className="space-y-6">
                {groupedByPlatform.map(({ platform, posts }) => (
                  <PlatformSection
                    key={platform}
                    platform={platform}
                    posts={posts}
                    isCollapsed={collapsedPlatforms.has(platform)}
                    isShowingAll={expandedPlatforms.has(platform)}
                    onToggleCollapse={() => togglePlatformCollapse(platform)}
                    onToggleShowAll={() => toggleShowAll(platform)}
                  />
                ))}
              </div>
            )}
            </>
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

