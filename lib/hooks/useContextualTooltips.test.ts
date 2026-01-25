import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useContextualTooltips } from "./useContextualTooltips"

describe("useContextualTooltips", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null activeTooltip initially", () => {
    const { result } = renderHook(() => useContextualTooltips())
    expect(result.current.activeTooltip).toBeNull()
  })

  it("activates source-filter tooltip 2 seconds after onResultsLoaded", () => {
    const { result } = renderHook(() => useContextualTooltips())

    act(() => {
      result.current.onResultsLoaded()
    })

    // Not yet visible
    expect(result.current.activeTooltip).toBeNull()

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.activeTooltip).toBe("source-filter")
  })

  it("dismisses tooltip and persists to localStorage", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Activate source-filter
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.activeTooltip).toBe("source-filter")

    // Dismiss it
    act(() => {
      result.current.dismissTooltip("source-filter")
    })

    expect(result.current.activeTooltip).toBeNull()
    const stored = JSON.parse(localStorage.getItem("civicvoices_tooltips_dismissed") || "[]")
    expect(stored).toContain("source-filter")
  })

  it("auto-advances to time-filter 1 second after dismissing source-filter", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Activate and dismiss source-filter
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("source-filter")
    })

    // Immediately after dismiss, activeTooltip is null
    expect(result.current.activeTooltip).toBeNull()

    // After 1 second, time-filter auto-advances
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.activeTooltip).toBe("time-filter")
  })

  it("also activates time-filter via scroll trigger", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Activate and dismiss source-filter
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("source-filter")
    })

    // Scroll past 5 posts before auto-advance timer fires
    act(() => {
      result.current.onScroll(600, 120)
    })

    expect(result.current.activeTooltip).toBe("time-filter")
  })

  it("does not auto-advance to generate-report (requires hover)", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Activate source-filter, dismiss it, let time-filter auto-advance
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("source-filter")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("time-filter")

    // Dismiss time-filter
    act(() => {
      result.current.dismissTooltip("time-filter")
    })

    // Wait — generate-report should NOT auto-advance
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.activeTooltip).toBeNull()

    // Only hover triggers it
    act(() => {
      result.current.onReportButtonHover()
    })

    expect(result.current.activeTooltip).toBe("generate-report")
  })

  it("does not activate time-filter if source-filter is not yet dismissed", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Scroll without dismissing source-filter first
    act(() => {
      result.current.onScroll(600, 120)
    })

    expect(result.current.activeTooltip).toBeNull()
  })

  it("does not activate generate-report if time-filter is not yet dismissed", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Dismiss only source-filter
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("source-filter")
    })

    // Hover report button before time-filter auto-advance fires
    act(() => {
      result.current.onReportButtonHover()
    })

    // time-filter hasn't been shown/dismissed yet, so generate-report shouldn't activate
    expect(result.current.activeTooltip).toBeNull()
  })

  it("returns null when all tooltips are already dismissed in localStorage", () => {
    localStorage.setItem(
      "civicvoices_tooltips_dismissed",
      JSON.stringify(["source-filter", "time-filter", "generate-report"])
    )

    const { result } = renderHook(() => useContextualTooltips())

    // Try all triggers
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.onScroll(600, 120)
    })
    act(() => {
      result.current.onReportButtonHover()
    })

    expect(result.current.activeTooltip).toBeNull()
  })

  it("reads existing dismissed state from localStorage on mount", () => {
    localStorage.setItem(
      "civicvoices_tooltips_dismissed",
      JSON.stringify(["source-filter"])
    )

    const { result } = renderHook(() => useContextualTooltips())

    // source-filter already dismissed, so onResultsLoaded should not activate it
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.activeTooltip).toBeNull()

    // But scroll should activate time-filter
    act(() => {
      result.current.onScroll(600, 120)
    })

    expect(result.current.activeTooltip).toBe("time-filter")
  })

  it("does not activate tooltip if scroll is below threshold", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Scroll only 400px (below 5 * 120 = 600) — no source-filter dismissed yet
    act(() => {
      result.current.onScroll(400, 120)
    })

    expect(result.current.activeTooltip).toBeNull()
  })

  it("only triggers scroll once per session", () => {
    const { result } = renderHook(() => useContextualTooltips())

    // Dismiss source-filter
    act(() => {
      result.current.onResultsLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("source-filter")
    })

    // Scroll triggers time-filter (before auto-advance)
    act(() => {
      result.current.onScroll(600, 120)
    })
    expect(result.current.activeTooltip).toBe("time-filter")

    // Dismiss time-filter, then scroll again — should not re-trigger
    act(() => {
      result.current.dismissTooltip("time-filter")
    })
    act(() => {
      result.current.onScroll(1200, 120)
    })

    // Wait for any potential auto-advance
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // generate-report doesn't auto-advance and scroll already used
    expect(result.current.activeTooltip).toBeNull()
  })
})
