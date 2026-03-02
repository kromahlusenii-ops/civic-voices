"use client"

import { TAXONOMY } from "@/lib/data/taxonomy"
import type { LegislativeSignalsResponse } from "@/lib/types/api"

interface LegislativeSignalOverviewProps {
  city?: string
  state?: string
  onCategoryClick?: (categoryId: string, searchQuery: string) => void
  selectedTopicIds?: string[]
  /**
   * The shared legislativeSignalsCache from the parent, keyed by subcategoryId+geo.
   * Using this as the single source of truth means geo changes auto-produce cache
   * misses (new keys) → chips show skeleton until queue delivers new-scope data.
   */
  signalsCache?: Record<string, LegislativeSignalsResponse>
  /**
   * Compute the cache key for a given subcategory ID. Must match buildLegislativeCacheKey
   * in page.tsx. Called per subcategory for post-count lookups.
   */
  getCacheKey?: (subId: string) => string
  /** ID of the subcategory the queue is currently fetching. */
  loadingSubcategoryId?: string | null
  fetchProgress?: { done: number; total: number }
  isQueueComplete?: boolean
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function LegislativeSignalOverview({
  city = "Little Rock",
  state = "AR",
  onCategoryClick,
  selectedTopicIds = [],
  signalsCache = {},
  getCacheKey,
  loadingSubcategoryId = null,
  fetchProgress,
  isQueueComplete = false,
}: LegislativeSignalOverviewProps) {
  const filteredCategories =
    selectedTopicIds.length > 0
      ? TAXONOMY.filter((cat) =>
          cat.subcategories.some((sub) => selectedTopicIds.includes(sub.id))
        )
      : TAXONOMY

  const hasProgress = fetchProgress && fetchProgress.total > 0
  const showProgress = hasProgress && !isQueueComplete

  const loadingSubName = loadingSubcategoryId
    ? TAXONOMY.flatMap((c) => c.subcategories).find((s) => s.id === loadingSubcategoryId)?.name
    : null

  return (
    <section className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <p
          className="section-label"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "rgba(0,0,0,0.3)",
          }}
        >
          {selectedTopicIds.length > 0
            ? `YOUR TOPICS — ${city.toUpperCase()}, ${state} · LAST 7 DAYS`
            : `LEGISLATIVE SIGNAL OVERVIEW — ${city.toUpperCase()}, ${state} · LAST 7 DAYS`}
        </p>

        {/* Queue progress indicator */}
        {showProgress && (
          <span
            className="flex items-center gap-1.5 shrink-0"
            style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(0,0,0,0.4)" }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"
              aria-hidden
            />
            {loadingSubName
              ? `${loadingSubName}… (${fetchProgress.done}/${fetchProgress.total})`
              : `Loading… (${fetchProgress.done}/${fetchProgress.total})`}
          </span>
        )}
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {filteredCategories.map((cat) => {
          const searchQuery = cat.subcategories[0]?.searchQuery ?? cat.name

          const catSubs =
            selectedTopicIds.length > 0
              ? cat.subcategories.filter((s) => selectedTopicIds.includes(s.id))
              : cat.subcategories

          // Derive post count from the geo-keyed signalsCache (not a separate results obj).
          // This ensures geo changes immediately clear counts (new keys = no data yet).
          const loadedSubs = catSubs.filter((s) => {
            const key = getCacheKey?.(s.id) ?? ""
            return key && signalsCache[key]
          })
          const activelySub = catSubs.find((s) => s.id === loadingSubcategoryId)
          const totalPosts = loadedSubs.reduce((sum, s) => {
            const key = getCacheKey?.(s.id) ?? ""
            return sum + (signalsCache[key]?.posts?.length ?? 0)
          }, 0)
          const isLoading = !!activelySub
          const hasData = loadedSubs.length > 0

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryClick?.(cat.id, searchQuery)}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.03)]"
              style={{
                backgroundColor: "rgba(0,0,0,0.025)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderLeft: `3px solid ${cat.color}`,
              }}
            >
              <span className="text-lg" aria-hidden>
                {cat.icon}
              </span>
              <span className="min-w-0 flex-1" style={{ fontFamily: "var(--font-body)" }}>
                <span
                  className="block text-sm font-medium leading-snug"
                  style={{ color: "#2C2519" }}
                >
                  {cat.name}
                </span>

                {isLoading ? (
                  <span
                    className="mt-1 flex items-center gap-1"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      color: "rgba(0,0,0,0.35)",
                    }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full border border-current border-t-transparent animate-spin"
                      aria-hidden
                    />
                    fetching…
                  </span>
                ) : hasData ? (
                  <span
                    className="mt-1 block"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: cat.color }}
                  >
                    {formatCount(totalPosts)} posts
                  </span>
                ) : !isQueueComplete ? (
                  <span
                    className="mt-1 block h-2 w-10 rounded animate-pulse"
                    style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
