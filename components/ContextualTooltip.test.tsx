import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import ContextualTooltip from "./ContextualTooltip"

describe("ContextualTooltip", () => {
  it("renders children when not visible", () => {
    render(
      <ContextualTooltip
        isVisible={false}
        title="Test title"
        description="Test description"
        onDismiss={vi.fn()}
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    expect(screen.getByText("Target")).toBeInTheDocument()
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("renders tooltip when visible", () => {
    render(
      <ContextualTooltip
        isVisible={true}
        title="Filter by platform"
        description="Toggle sources to focus on specific platforms."
        onDismiss={vi.fn()}
        testId="tooltip-source"
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    expect(screen.getByText("Target")).toBeInTheDocument()
    expect(screen.getByRole("tooltip")).toBeInTheDocument()
    expect(screen.getByText("Filter by platform")).toBeInTheDocument()
    expect(screen.getByText("Toggle sources to focus on specific platforms.")).toBeInTheDocument()
    expect(screen.getByText("Got it")).toBeInTheDocument()
  })

  it("calls onDismiss when Got it button is clicked", () => {
    const onDismiss = vi.fn()

    render(
      <ContextualTooltip
        isVisible={true}
        title="Test"
        description="Test desc"
        onDismiss={onDismiss}
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    fireEvent.click(screen.getByText("Got it"))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("calls onDismiss when Escape key is pressed", () => {
    const onDismiss = vi.fn()

    render(
      <ContextualTooltip
        isVisible={true}
        title="Test"
        description="Test desc"
        onDismiss={onDismiss}
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("does not call onDismiss on Escape when not visible", () => {
    const onDismiss = vi.fn()

    render(
      <ContextualTooltip
        isVisible={false}
        title="Test"
        description="Test desc"
        onDismiss={onDismiss}
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it("has correct accessibility attributes", () => {
    render(
      <ContextualTooltip
        isVisible={true}
        title="Test"
        description="Test desc"
        onDismiss={vi.fn()}
        testId="my-tooltip"
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    const tooltip = screen.getByRole("tooltip")
    expect(tooltip).toHaveAttribute("aria-live", "polite")
    expect(tooltip).toHaveAttribute("data-testid", "my-tooltip")
  })

  it("renders with bottom position by default", () => {
    render(
      <ContextualTooltip
        isVisible={true}
        title="Test"
        description="Test desc"
        onDismiss={vi.fn()}
        testId="tooltip-bottom"
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    const tooltip = screen.getByRole("tooltip")
    expect(tooltip.className).toContain("top-full")
  })

  it("renders with top position when specified", () => {
    render(
      <ContextualTooltip
        isVisible={true}
        title="Test"
        description="Test desc"
        onDismiss={vi.fn()}
        position="top"
        testId="tooltip-top"
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    const tooltip = screen.getByRole("tooltip")
    expect(tooltip.className).toContain("bottom-full")
  })

  it("renders dismiss button with correct test id", () => {
    render(
      <ContextualTooltip
        isVisible={true}
        title="Test"
        description="Test desc"
        onDismiss={vi.fn()}
        testId="tooltip-test"
      >
        <button>Target</button>
      </ContextualTooltip>
    )

    expect(screen.getByTestId("tooltip-test-dismiss")).toBeInTheDocument()
  })
})
