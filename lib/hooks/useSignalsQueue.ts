"use client"

/**
 * useSignalsQueue — centralized priority queue for /api/legislative/signals requests.
 *
 * Replaces both useBackgroundSignals (background prefetch) and SubcategoryView's
 * eager fetch mode so all requests flow through one sequential pipeline.
 *
 * Priority lanes:
 *   HIGH — user-initiated (category/subcategory click) — drains first
 *   LOW  — background prefetch (user's selected topics on profile load)
 *
 * Guarantees:
 *   - One request at a time (400ms gap between requests)
 *   - 3s backoff + retry on HTTP 429
 *   - Deduplicates against current signalsCache and session storage
 *   - sessionStorage persistence with 4h TTL (matches server Redis TTL)
 *   - Resets automatically when geo scope / timeFilter changes
 */

import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react"
import type { LegislativeSignalsResponse } from "@/lib/types/api"

const FETCH_DELAY_MS = 400
const RESULT_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

// ---------- session storage ----------

interface SessionEntry {
  cacheKey: string
  data: LegislativeSignalsResponse
  fetchedAt: number
}

function buildSessionKey(
  geoScope: string,
  geoState: string | undefined,
  geoCity: string | undefined,
  timeFilter: string
): string {
  return `cv_sq:${geoScope}:${geoState ?? "n"}:${geoCity ?? "n"}:${timeFilter}`
}

function readSession(key: string): Record<string, SessionEntry> {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SessionEntry>
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => now - v.fetchedAt < RESULT_TTL_MS)
    )
  } catch {
    return {}
  }
}

function writeSession(key: string, entries: Record<string, SessionEntry>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entries))
  } catch {
    // quota exceeded or private mode — silent failure
  }
}

// ---------- cache key ----------
// Must match buildLegislativeCacheKey in app/search/page.tsx exactly.

export function makeCacheKey(
  subId: string,
  geoScope: string,
  geoState: string | undefined,
  geoCity: string | undefined,
  timeFilter: string
): string {
  const st = geoScope !== "national" ? (geoState ?? "n") : "n"
  const ci = geoScope === "city" ? (geoCity ?? "n") : "n"
  return `${subId}:${st}:${ci}:${timeFilter}:reddit,x:all`
}

// ---------- public API ----------

export interface SignalsQueueState {
  /** Add subcategory IDs to the queue. HIGH drains before LOW. Safe to call multiple times — deduplicates. */
  enqueue: (subcategoryIds: string[], priority: "high" | "low") => void
  /** ID of the subcategory currently being fetched, or null. */
  currentSubcategoryId: string | null
  /** How many subcategory IDs have been processed vs total enqueued. */
  progress: { done: number; total: number }
  /** True once all enqueued items have been processed. */
  isComplete: boolean
}

// ---------- hook ----------

export function useSignalsQueue(
  /** Stable ref that always points to the latest legislativeSignalsCache value. */
  signalsCacheRef: React.RefObject<Record<string, LegislativeSignalsResponse>>,
  setSignalsCache: Dispatch<SetStateAction<Record<string, LegislativeSignalsResponse>>>,
  geoState: string | undefined,
  geoCity: string | undefined,
  geoScope: string,
  timeFilter: string
): SignalsQueueState {
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [isComplete, setIsComplete] = useState(false)

  // All mutable queue state in refs so the processing loop never has stale closures.
  const highRef = useRef<string[]>([])
  const lowRef = useRef<string[]>([])
  const runningRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const sessionKeyRef = useRef("")
  const sessionEntriesRef = useRef<Record<string, SessionEntry>>({})
  const seenRef = useRef(new Set<string>())   // every ID ever enqueued this geo context
  const doneRef = useRef(new Set<string>())   // every ID fully processed (success or error)

  // Stable geo/time refs so the async loop always reads current values.
  const geoStateRef = useRef(geoState)
  const geoCityRef = useRef(geoCity)
  const geoScopeRef = useRef(geoScope)
  const timeFilterRef = useRef(timeFilter)
  useEffect(() => { geoStateRef.current = geoState }, [geoState])
  useEffect(() => { geoCityRef.current = geoCity }, [geoCity])
  useEffect(() => { geoScopeRef.current = geoScope }, [geoScope])
  useEffect(() => { timeFilterRef.current = timeFilter }, [timeFilter])

  // The processing loop is stored in a ref so it can recurse without dep issues.
  const loopRef = useRef<() => Promise<void>>(null!)
  loopRef.current = async () => {
    const nextId = highRef.current.shift() ?? lowRef.current.shift()

    if (!nextId) {
      runningRef.current = false
      setCurrentSubcategoryId(null)
      setProgress({ done: doneRef.current.size, total: seenRef.current.size })
      setIsComplete(seenRef.current.size > 0 && doneRef.current.size >= seenRef.current.size)
      return
    }

    const gs = geoScopeRef.current
    const st = geoStateRef.current
    const ci = geoCityRef.current
    const tf = timeFilterRef.current
    const cacheKey = makeCacheKey(nextId, gs, st, ci, tf)

    // Already in React cache — skip.
    if (signalsCacheRef.current?.[cacheKey]) {
      doneRef.current.add(nextId)
      setProgress({ done: doneRef.current.size, total: seenRef.current.size })
      loopRef.current()
      return
    }

    // Already in session — restore and skip.
    const sessionEntry = sessionEntriesRef.current[nextId]
    if (sessionEntry && sessionEntry.cacheKey === cacheKey) {
      setSignalsCache((prev) => ({ ...prev, [cacheKey]: sessionEntry.data }))
      doneRef.current.add(nextId)
      setProgress({ done: doneRef.current.size, total: seenRef.current.size })
      loopRef.current()
      return
    }

    setCurrentSubcategoryId(nextId)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const url = new URL("/api/legislative/signals", window.location.origin)
      url.searchParams.set("subcategoryId", nextId)
      url.searchParams.set("timeFilter", tf)
      url.searchParams.set("sources", "reddit,x")
      if ((gs === "state" || gs === "city") && st) url.searchParams.set("state", st)
      if (gs === "city" && ci) url.searchParams.set("city", ci)

      const res = await fetch(url.toString(), { signal: controller.signal })

      if (!res.ok) {
        if (res.status === 429) {
          // Re-queue at front of LOW after a backoff pause.
          seenRef.current.delete(nextId)
          lowRef.current.unshift(nextId)
          setCurrentSubcategoryId(null)
          await new Promise((r) => setTimeout(r, 3000))
          loopRef.current()
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }

      const data: LegislativeSignalsResponse = await res.json()
      setSignalsCache((prev) => ({ ...prev, [cacheKey]: data }))

      const entry: SessionEntry = { cacheKey, data, fetchedAt: Date.now() }
      sessionEntriesRef.current[nextId] = entry
      writeSession(sessionKeyRef.current, sessionEntriesRef.current)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        runningRef.current = false
        return
      }
      console.warn(`[useSignalsQueue] ${nextId}:`, err instanceof Error ? err.message : err)
    }

    doneRef.current.add(nextId)
    setCurrentSubcategoryId(null)
    setProgress({ done: doneRef.current.size, total: seenRef.current.size })

    if (highRef.current.length > 0 || lowRef.current.length > 0) {
      await new Promise((r) => setTimeout(r, FETCH_DELAY_MS))
    }
    loopRef.current()
  }

  const startLoop = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    loopRef.current()
  }, [])

  const enqueue = useCallback(
    (subcategoryIds: string[], priority: "high" | "low") => {
      const fresh = subcategoryIds.filter((id) => {
        if (seenRef.current.has(id)) return false
        const key = makeCacheKey(
          id,
          geoScopeRef.current,
          geoStateRef.current,
          geoCityRef.current,
          timeFilterRef.current
        )
        return !signalsCacheRef.current?.[key]
      })
      if (fresh.length === 0) return

      fresh.forEach((id) => seenRef.current.add(id))
      setProgress((prev) => ({ ...prev, total: seenRef.current.size }))
      setIsComplete(false)

      if (priority === "high") {
        // Move any LOW-queued items to the back; insert fresh at front of HIGH.
        lowRef.current = lowRef.current.filter((id) => !fresh.includes(id))
        highRef.current = [
          ...fresh.filter((id) => !highRef.current.includes(id)),
          ...highRef.current,
        ]
      } else {
        const inQueue = new Set([...highRef.current, ...lowRef.current])
        fresh.filter((id) => !inQueue.has(id)).forEach((id) => lowRef.current.push(id))
      }

      startLoop()
    },
    [signalsCacheRef, startLoop]
  )

  // Reset everything when geo context or time filter changes.
  useEffect(() => {
    abortRef.current?.abort()
    runningRef.current = false
    highRef.current = []
    lowRef.current = []
    seenRef.current = new Set()
    doneRef.current = new Set()

    const sk = buildSessionKey(geoScope, geoState, geoCity, timeFilter)
    sessionKeyRef.current = sk
    const entries = readSession(sk)
    sessionEntriesRef.current = entries

    // Restore session entries into React cache and mark as seen+done.
    const sessionIds = Object.keys(entries)
    if (sessionIds.length > 0) {
      setSignalsCache((prev) => {
        const updates: Record<string, LegislativeSignalsResponse> = {}
        for (const [, entry] of Object.entries(entries)) {
          if (!prev[entry.cacheKey]) updates[entry.cacheKey] = entry.data
        }
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev
      })
      sessionIds.forEach((id) => {
        seenRef.current.add(id)
        doneRef.current.add(id)
      })
    }

    setCurrentSubcategoryId(null)
    const restored = sessionIds.length
    setProgress({ done: restored, total: restored })
    setIsComplete(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoScope, geoState, geoCity, timeFilter])

  return { enqueue, currentSubcategoryId, progress, isComplete }
}
