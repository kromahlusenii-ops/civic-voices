"use client"

import { useState, useRef, useCallback, useEffect } from "react"

const STORAGE_KEY = "civicvoices_report_tooltips_dismissed"
const TOOLTIP_SEQUENCE = [
  "summary",
  "activity-chart",
  "topics-table",
  "chat-button",
  "share-export",
  "create-alert",
] as const

export type ReportTooltipId = (typeof TOOLTIP_SEQUENCE)[number]

interface UseReportTooltipsOptions {
  skip?: ReportTooltipId[]
}

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

export function useReportTooltips({ skip = [] }: UseReportTooltipsOptions = {}) {
  const [, setDismissed] = useState<Set<string>>(() => loadDismissed())
  const [activeTooltip, setActiveTooltip] = useState<ReportTooltipId | null>(null)
  const [tourActive, setTourActive] = useState<boolean>(() => {
    // If all non-skipped tooltips are already dismissed, tour is not active
    const dismissed = loadDismissed()
    const skipS = new Set(skip)
    return !TOOLTIP_SEQUENCE.every((id) => dismissed.has(id) || skipS.has(id))
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipSet = useRef(new Set(skip))

  // Update skip set if it changes
  useEffect(() => {
    skipSet.current = new Set(skip)
  }, [skip])

  const findNextTooltip = useCallback(
    (dismissed: Set<string>): ReportTooltipId | null => {
      return TOOLTIP_SEQUENCE.find((id) => !dismissed.has(id) && !skipSet.current.has(id)) ?? null
    },
    []
  )

  const dismissTooltip = useCallback(
    (id: string) => {
      setDismissed((prev) => {
        const next = new Set(prev)
        next.add(id)
        saveDismissed(next)

        const nextTooltip = findNextTooltip(next)
        if (nextTooltip) {
          advanceTimerRef.current = setTimeout(() => {
            setDismissed((current) => {
              if (!current.has(nextTooltip) && !skipSet.current.has(nextTooltip)) {
                setActiveTooltip(nextTooltip)
              }
              return current
            })
          }, 1000)
        } else {
          // Tour is complete — reveal everything
          setTourActive(false)
        }

        return next
      })
      setActiveTooltip(null)
    },
    [findNextTooltip]
  )

  const onReportLoaded = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setDismissed((current) => {
        const next = findNextTooltip(current)
        if (next) {
          setActiveTooltip(next)
        } else {
          // All already dismissed
          setTourActive(false)
        }
        return current
      })
    }, 2000)
  }, [findNextTooltip])

  // Returns true if a section should be visible
  // During tour: only the active tooltip's section is shown
  // Tour complete or never started: everything visible
  const isRevealed = useCallback(
    (sectionId: string): boolean => {
      if (!tourActive) return true
      return activeTooltip === sectionId
    },
    [tourActive, activeTooltip]
  )

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
    onReportLoaded,
    tourActive,
    isRevealed,
  }
}
