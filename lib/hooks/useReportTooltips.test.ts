import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useReportTooltips } from "./useReportTooltips"

const STORAGE_KEY = "civicvoices_report_tooltips_dismissed"

describe("useReportTooltips", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null activeTooltip initially", () => {
    const { result } = renderHook(() => useReportTooltips())
    expect(result.current.activeTooltip).toBeNull()
  })

  it("activates summary tooltip 2 seconds after onReportLoaded", () => {
    const { result } = renderHook(() => useReportTooltips())

    act(() => {
      result.current.onReportLoaded()
    })

    expect(result.current.activeTooltip).toBeNull()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.activeTooltip).toBe("summary")
  })

  it("dismisses tooltip and persists to localStorage", () => {
    const { result } = renderHook(() => useReportTooltips())

    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.activeTooltip).toBe("summary")

    act(() => {
      result.current.dismissTooltip("summary")
    })

    expect(result.current.activeTooltip).toBeNull()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    expect(stored).toContain("summary")
  })

  it("auto-advances to activity-chart 1 second after dismissing summary", () => {
    const { result } = renderHook(() => useReportTooltips())

    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("summary")
    })

    expect(result.current.activeTooltip).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.activeTooltip).toBe("activity-chart")
  })

  it("advances through the full sequence: summary → activity-chart → topics-table → create-alert → chat-button → share-export", () => {
    const { result } = renderHook(() => useReportTooltips())

    // Activate first tooltip
    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.activeTooltip).toBe("summary")

    // summary → activity-chart
    act(() => {
      result.current.dismissTooltip("summary")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("activity-chart")

    // activity-chart → topics-table
    act(() => {
      result.current.dismissTooltip("activity-chart")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("topics-table")

    // topics-table → create-alert
    act(() => {
      result.current.dismissTooltip("topics-table")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("create-alert")

    // create-alert → chat-button
    act(() => {
      result.current.dismissTooltip("create-alert")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("chat-button")

    // chat-button → share-export
    act(() => {
      result.current.dismissTooltip("chat-button")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("share-export")

    // share-export → done
    act(() => {
      result.current.dismissTooltip("share-export")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBeNull()
  })

  it("after all dismissed, activeTooltip stays null", () => {
    // Pre-dismiss all
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["summary", "activity-chart", "topics-table", "chat-button", "create-alert", "share-export"])
    )

    const { result } = renderHook(() => useReportTooltips())

    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.activeTooltip).toBeNull()
  })

  it("reads existing dismissed state from localStorage and resumes from first undismissed", () => {
    // Partially dismissed
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["summary", "activity-chart"])
    )

    const { result } = renderHook(() => useReportTooltips())

    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Should resume at topics-table (first undismissed)
    expect(result.current.activeTooltip).toBe("topics-table")
  })

  it("skips tooltips in the skip array", () => {
    const { result } = renderHook(() =>
      useReportTooltips({ skip: ["create-alert", "share-export"] })
    )

    // Walk through to chat-button
    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      result.current.dismissTooltip("summary")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      result.current.dismissTooltip("activity-chart")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      result.current.dismissTooltip("topics-table")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeTooltip).toBe("chat-button")

    // Dismiss chat-button — should skip create-alert and share-export
    act(() => {
      result.current.dismissTooltip("chat-button")
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.activeTooltip).toBeNull()
  })

  it("skips tooltips when resuming from localStorage", () => {
    // summary already dismissed, and we skip activity-chart
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["summary"]))

    const { result } = renderHook(() =>
      useReportTooltips({ skip: ["activity-chart"] })
    )

    act(() => {
      result.current.onReportLoaded()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Should skip activity-chart and go to topics-table
    expect(result.current.activeTooltip).toBe("topics-table")
  })

  it("cleans up timers on unmount", () => {
    const { result, unmount } = renderHook(() => useReportTooltips())

    act(() => {
      result.current.onReportLoaded()
    })

    // Unmount before timer fires
    unmount()

    // Advancing timers should not cause errors
    act(() => {
      vi.advanceTimersByTime(5000)
    })
  })
})
