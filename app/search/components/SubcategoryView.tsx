"use client"

import { useState, useEffect } from "react"
import type { TaxonomyCategory, Subcategory } from "@/lib/data/taxonomy"
import { MOCK_311_SIGNALS } from "@/lib/data/subcategorySignals"
import type { GeoScope } from "./GeoScopeToggle"
import type { LegislativeSignalsResponse } from "@/lib/types/api"

// Lazy mode: reads from signalsCache only. All fetching is handled by the
// centralized useSignalsQueue in the parent (page.tsx), which enqueues the
// clicked category's subcategories as HIGH priority before rendering this view.
const LAZY_LOAD_ENABLED = true
const CONCURRENT_FETCHES = 1

interface SubcategoryViewProps {
  category: TaxonomyCategory
  geoLabel: string
  city?: string
  state?: string
  geoScope: GeoScope
  timeFilter: string
  signalsCache: Record<string, LegislativeSignalsResponse>
  buildCacheKey: (subId: string, s?: string | null, c?: string | null) => string
  onSignalsLoaded: (key: string, data: LegislativeSignalsResponse) => void
  onBack: () => void
  onSubcategoryClick: (subcategory: Subcategory) => void
  onTrackCategory?: () => void
  isCategoryTracked?: boolean
  selectedTopicIds?: string[] | null
  /** ID of the subcategory currently being fetched by the queue (for spinner). */
  loadingSubcategoryId?: string | null
  /** True once the queue has no more items to process. */
  isQueueComplete?: boolean
}

async function fetchInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export default function SubcategoryView({
  category,
  geoLabel,
  city,
  state,
  geoScope,
  timeFilter,
  signalsCache,
  buildCacheKey,
  onSignalsLoaded,
  onBack,
  onSubcategoryClick,
  onTrackCategory,
  isCategoryTracked = false,
  selectedTopicIds = [],
  loadingSubcategoryId = null,
  isQueueComplete = false,
}: SubcategoryViewProps) {
  const [show311, setShow311] = useState(false)
  const [postCounts, setPostCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const threeElevenSignals = MOCK_311_SIGNALS[category.id]
  const has311 = threeElevenSignals && threeElevenSignals.length > 0

  useEffect(() => {
    if (LAZY_LOAD_ENABLED) {
      // Lazy mode: read from cache only. The parent queue enqueued this category's
      // subcategories as HIGH priority before rendering, so data arrives via signalsCache updates.
      const counts: Record<string, number> = {}
      let hasAnyData = false
      category.subcategories.forEach((sub) => {
        const key = buildCacheKey(sub.id, state, city)
        const cached = signalsCache[key]
        if (cached) {
          counts[sub.id] = cached.posts?.length ?? 0
          hasAnyData = true
        }
      })
      setPostCounts(counts)
      // Only stop loading if we have at least some data OR if the queue says it's complete
      setLoading(!hasAnyData && !isQueueComplete)
      return
    }

    // Eager mode (old behavior): Fetch all subcategories on mount
    let cancelled = false
    const params = (subId: string) => {
      const p = new URLSearchParams({ subcategoryId: subId })
      if (geoScope === "state" && state) p.set("state", state)
      if (geoScope === "city" && state) p.set("state", state)
      if (geoScope === "city" && city) p.set("city", city)
      p.set("timeFilter", timeFilter)
      return p
    }

    const subsToFetch = category.subcategories.filter((sub) => {
      const key = buildCacheKey(sub.id, state, city)
      return !signalsCache[key]
    })

    if (subsToFetch.length === 0) {
      const counts: Record<string, number> = {}
      category.subcategories.forEach((sub) => {
        const key = buildCacheKey(sub.id, state, city)
        const cached = signalsCache[key]
        counts[sub.id] = cached?.posts?.length ?? 0
      })
      setPostCounts(counts)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchInBatches(subsToFetch, CONCURRENT_FETCHES, async (sub) => {
      const res = await fetch(`/api/legislative/signals?${params(sub.id)}`)
      if (!res.ok) return { id: sub.id, data: null }
      const json: LegislativeSignalsResponse = await res.json()
      const key = buildCacheKey(sub.id, state, city)
      onSignalsLoaded(key, json)
      return { id: sub.id, data: json }
    })
      .then((results) => {
        if (cancelled) return
        const counts: Record<string, number> = {}
        category.subcategories.forEach((sub) => {
          const wasFetched = subsToFetch.some((s) => s.id === sub.id)
          if (wasFetched) {
            const r = results.find((x) => x.id === sub.id)
            counts[sub.id] = r?.data?.posts?.length ?? 0
          } else {
            const key = buildCacheKey(sub.id, state, city)
            counts[sub.id] = signalsCache[key]?.posts?.length ?? 0
          }
        })
        setPostCounts(counts)
      })
      .catch(() => {
        if (!cancelled) setPostCounts({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [category.id, category.subcategories, state, city, geoScope, timeFilter, buildCacheKey, onSignalsLoaded, signalsCache, isQueueComplete])

  return (
    <div className="flex flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Category Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex h-9 items-center justify-center rounded-md px-2.5 transition-colors hover:bg-[rgba(0,0,0,0.06)]"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 6,
                  color: "rgba(0,0,0,0.5)",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
                aria-label="Back to dashboard"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold" style={{ color: category.color }}>
                  {category.icon} {category.name}
                </h1>
                <p
                  className="mt-1 text-xs"
                  style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.45)" }}
                >
                  {category.subcategories.length} subcategories · {geoLabel}
                </p>
              </div>
            </div>
          </div>
          {onTrackCategory && (
            <button
              type="button"
              onClick={onTrackCategory}
              className="shrink-0 rounded-md px-3 py-2 text-xs transition-colors"
              style={
                isCategoryTracked
                  ? {
                      background: "rgba(212,162,74,0.12)",
                      border: "1px solid rgba(212,162,74,0.3)",
                      color: "#D4A24A",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      padding: "6px 12px",
                    }
                  : {
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.08)",
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      padding: "6px 12px",
                    }
              }
            >
              {isCategoryTracked ? "✓ Tracked" : "Track Category"}
            </button>
          )}
        </div>

        {/* Subcategory Cards Grid — real post counts */}
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
          style={{ gap: 8 }}
        >
          {category.subcategories
            .filter(sub => !selectedTopicIds || selectedTopicIds.length === 0 || (Array.isArray(selectedTopicIds) && selectedTopicIds.includes(sub.id)))
            .map((sub) => {
            const key = buildCacheKey(sub.id, state, city)
            const cached = signalsCache[key]
            const count = postCounts[sub.id] ?? cached?.posts?.length
            const hasCount = typeof count === "number"
            const isFetching = loadingSubcategoryId === sub.id
            const isPending = !hasCount && !isFetching && !isQueueComplete
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubcategoryClick(sub)}
                className="flex items-center justify-between gap-3 rounded-lg p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-[rgba(0,0,0,0.03)]"
                style={{
                  backgroundColor: "rgba(0,0,0,0.025)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderLeft: `3px solid ${category.color}`,
                }}
              >
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug" style={{ color: "#2C2519", fontFamily: "var(--font-body)" }}>
                  {sub.name}
                </span>
                {isFetching ? (
                  <span className="flex items-center gap-1 shrink-0" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(0,0,0,0.35)" }}>
                    <span className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" aria-hidden />
                    fetching
                  </span>
                ) : hasCount ? (
                  <span className="shrink-0 text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.45)" }}>
                    {count} posts
                  </span>
                ) : isPending ? (
                  <span className="h-2 w-10 rounded animate-pulse shrink-0" style={{ backgroundColor: "rgba(0,0,0,0.07)" }} aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>

        {/* 311 Signals Section (collapsed accordion) */}
        {has311 && (
          <div
            className="rounded-lg"
            style={{
              backgroundColor: "rgba(0,0,0,0.025)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <button
              type="button"
              onClick={() => setShow311(!show311)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              style={{ color: "#2C2519" }}
            >
              <div>
                <p className="text-xs font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
                  311 MUNICIPAL SIGNALS
                </p>
                <p className="mt-1 text-sm" style={{ color: "rgba(0,0,0,0.6)" }}>
                  Related 311 service requests in {city || geoLabel} — last 30 days
                </p>
              </div>
              <svg
                className={`h-5 w-5 transition-transform ${show311 ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {show311 && threeElevenSignals && (
              <div className="border-t px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <div className="flex flex-wrap gap-2">
                  {threeElevenSignals.map(({ label, count }) => (
                    <span
                      key={label}
                      className="rounded-full px-3 py-1.5 text-xs"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.04)",
                        color: "rgba(0,0,0,0.65)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {label} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
