import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SourceFilter from "./SourceFilter";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    toString: vi.fn(() => ""),
  })),
}));

describe("SourceFilter", () => {
  it("renders button with correct label for single source", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube"]}
        onSourcesChange={mockOnChange}
      />
    );

    const button = screen.getByTestId("source-filter-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("YouTube");
    // SVG icon is rendered instead of emoji
  });

  it("renders button with +N modifier for multiple sources", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube", "tiktok", "reddit"]}
        onSourcesChange={mockOnChange}
      />
    );

    const button = screen.getByTestId("source-filter-button");
    expect(button).toHaveTextContent("YouTube +2");
  });

  it("opens dropdown when button is clicked", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube"]}
        onSourcesChange={mockOnChange}
      />
    );

    const button = screen.getByTestId("source-filter-button");

    // Dropdown should not be visible initially
    expect(screen.queryByTestId("source-filter-dropdown")).not.toBeInTheDocument();

    // Click button to open dropdown
    fireEvent.click(button);

    // Dropdown should now be visible
    expect(screen.getByTestId("source-filter-dropdown")).toBeInTheDocument();
  });

  it("toggles source selection when checkbox is clicked", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube"]}
        onSourcesChange={mockOnChange}
      />
    );

    // Open dropdown
    const button = screen.getByTestId("source-filter-button");
    fireEvent.click(button);

    // Click TikTok to add it
    const tiktokOption = screen.getByTestId("source-option-tiktok");
    fireEvent.click(tiktokOption);

    // Should call onSourcesChange with both sources
    expect(mockOnChange).toHaveBeenCalledWith(["youtube", "tiktok"]);
  });

  it("removes source when deselecting", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube", "tiktok"]}
        onSourcesChange={mockOnChange}
      />
    );

    // Open dropdown
    const button = screen.getByTestId("source-filter-button");
    fireEvent.click(button);

    // Click YouTube to remove it
    const youtubeOption = screen.getByTestId("source-option-youtube");
    fireEvent.click(youtubeOption);

    // Should call onSourcesChange with only tiktok
    expect(mockOnChange).toHaveBeenCalledWith(["tiktok"]);
  });

  it("disables non-functional sources with 'Coming soon' label", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube"]}
        onSourcesChange={mockOnChange}
      />
    );

    // Open dropdown
    const button = screen.getByTestId("source-filter-button");
    fireEvent.click(button);

    // Reddit should be disabled
    const redditOption = screen.getByTestId("source-option-reddit");
    expect(redditOption).toBeDisabled();
    expect(redditOption).toHaveTextContent("Coming soon");
  });

  it("does not change selection when clicking disabled source", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube"]}
        onSourcesChange={mockOnChange}
      />
    );

    // Open dropdown
    const button = screen.getByTestId("source-filter-button");
    fireEvent.click(button);

    // Click disabled Reddit option
    const redditOption = screen.getByTestId("source-option-reddit");
    fireEvent.click(redditOption);

    // Should not call onSourcesChange
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("shows correct checkbox states", () => {
    const mockOnChange = vi.fn();
    render(
      <SourceFilter
        selectedSources={["youtube", "tiktok"]}
        onSourcesChange={mockOnChange}
      />
    );

    // Open dropdown
    const button = screen.getByTestId("source-filter-button");
    fireEvent.click(button);

    // YouTube and TikTok should have checkmarks (checked)
    const youtubeOption = screen.getByTestId("source-option-youtube");
    expect(youtubeOption).toHaveAttribute("aria-checked", "true");

    const tiktokOption = screen.getByTestId("source-option-tiktok");
    expect(tiktokOption).toHaveAttribute("aria-checked", "true");

    // Reddit should not be checked
    const redditOption = screen.getByTestId("source-option-reddit");
    expect(redditOption).toHaveAttribute("aria-checked", "false");
  });
});
