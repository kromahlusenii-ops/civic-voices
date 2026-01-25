"use client"

import { useState, useRef, useCallback, useEffect } from "react"

const STORAGE_KEY = "civicvoices_tooltips_dismissed"
const TOOLTIP_SEQUENCE = ["source-filter", "time-filter", "generate-report"] as const

export type TooltipId = (typeof TOOLTIP_SEQUENCE)[number]

function loadDismissed(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveDismissed(dismissed: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]))
  } catch {
    // localStorage may be unavailable
  }
}

export function useContextualTooltips() {
  const [, setDismissed] = useState<Set<string>>(() => loadDismissed())
  const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasTriggeredScroll = useRef(false)
  const hasTriggeredHover = useRef(false)

  const dismissTooltip = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)

      // Auto-advance to next tooltip after a brief delay
      // (except generate-report which requires hover)
      const nextTooltip = TOOLTIP_SEQUENCE.find((tid) => !next.has(tid)) ?? null
      if (nextTooltip && nextTooltip !== "generate-report") {
        advanceTimerRef.current = setTimeout(() => {
          // Re-check dismissed state before activating
          setDismissed((current) => {
            if (!current.has(nextTooltip)) {
              setActiveTooltip(nextTooltip)
            }
            return current
          })
        }, 1000)
      }

      return next
    })
    setActiveTooltip(null)
  }, [])

  const onResultsLoaded = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setDismissed((current) => {
        const next = TOOLTIP_SEQUENCE.find((id) => !current.has(id)) ?? null
        if (next === "source-filter") {
          setActiveTooltip("source-filter")
        }
        return current
      })
    }, 2000)
  }, [])

  const onScroll = useCallback((scrollTop: number, postHeight: number) => {
    if (hasTriggeredScroll.current) return
    if (scrollTop < 5 * postHeight) return

    hasTriggeredScroll.current = true
    setDismissed((current) => {
      const next = TOOLTIP_SEQUENCE.find((id) => !current.has(id)) ?? null
      if (next === "time-filter") {
        setActiveTooltip("time-filter")
      }
      return current
    })
  }, [])

  const onReportButtonHover = useCallback(() => {
    if (hasTriggeredHover.current) return

    hasTriggeredHover.current = true
    setDismissed((current) => {
      const next = TOOLTIP_SEQUENCE.find((id) => !current.has(id)) ?? null
      if (next === "generate-report") {
        setActiveTooltip("generate-report")
      }
      return current
    })
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  return {
    activeTooltip,
    dismissTooltip,
    onResultsLoaded,
    onScroll,
    onReportButtonHover,
  }
}
