import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession } from "next-auth/react";
import ResearchDashboard from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Research Dashboard", () => {
  it("renders greeting, search input, and start research button", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { name: "John Doe", email: "john@example.com" } },
      status: "authenticated",
    });

    render(<ResearchDashboard />);

    // Check greeting
    const greeting = screen.getByTestId("dashboard-greeting");
    expect(greeting).toBeInTheDocument();
    expect(greeting).toHaveTextContent("Hello, John");

    // Check search input
    const searchInput = screen.getByTestId("search-input");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute(
      "placeholder",
      "Search a topic or paste a URL"
    );

    // Check start research button
    const startBtn = screen.getByTestId("start-research-btn");
    expect(startBtn).toBeInTheDocument();
  });

  it("renders filter chips for source, time, and location", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    // Check filter chips exist
    const sourceChip = screen.getByTestId("source-filter-chip");
    const timeChip = screen.getByTestId("time-filter-chip");
    const locationChip = screen.getByTestId("location-filter-chip");

    expect(sourceChip).toBeInTheDocument();
    expect(sourceChip).toHaveTextContent("Reddit");
    expect(timeChip).toBeInTheDocument();
    expect(timeChip).toHaveTextContent("Last 3 months");
    expect(locationChip).toBeInTheDocument();
    expect(locationChip).toHaveTextContent("All regions");
  });

  it("clicking source filter chip opens dropdown with all sources", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const sourceChip = screen.getByTestId("source-filter-chip");

    // Dropdown should not be visible initially
    expect(screen.queryByTestId("source-option-reddit")).not.toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(sourceChip);

    // Check all source options are now visible
    expect(screen.getByTestId("source-option-reddit")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-tiktok")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-instagram")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-x")).toBeInTheDocument();
  });

  it("toggling sources in dropdown updates selection", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const sourceChip = screen.getByTestId("source-filter-chip");

    // Open dropdown
    fireEvent.click(sourceChip);

    const redditOption = screen.getByTestId("source-option-reddit");

    // Reddit should be selected by default (has checkmark)
    expect(redditOption.querySelector("svg")).toBeInTheDocument();

    // Click Reddit to deselect
    fireEvent.click(redditOption);

    // Chip label should update
    fireEvent.click(sourceChip); // Reopen to check
    expect(screen.getByTestId("source-filter-chip")).toHaveTextContent("Select source");
  });

  it("disabled sources show 'Coming soon' label", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const sourceChip = screen.getByTestId("source-filter-chip");

    // Open dropdown
    fireEvent.click(sourceChip);

    const tiktokOption = screen.getByTestId("source-option-tiktok");

    // TikTok should show "Coming soon"
    expect(tiktokOption).toHaveTextContent("Coming soon");
    expect(tiktokOption).toBeDisabled();
  });

  it("renders greeting without name when user has no name", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });

    render(<ResearchDashboard />);

    const greeting = screen.getByTestId("dashboard-greeting");
    expect(greeting).toHaveTextContent("Hello");
    expect(greeting).not.toHaveTextContent("Hello,");
  });

  it("start research button is disabled when no query or no sources selected", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const startBtn = screen.getByTestId("start-research-btn");
    const searchInput = screen.getByTestId("search-input");

    // Initially disabled (no search query)
    expect(startBtn).toBeDisabled();

    // Type search query
    fireEvent.change(searchInput, {
      target: { value: "Climate change policy" },
    });

    // Should be enabled now (has query and Reddit is selected by default)
    expect(startBtn).not.toBeDisabled();

    // Open source dropdown and deselect Reddit
    const sourceChip = screen.getByTestId("source-filter-chip");
    fireEvent.click(sourceChip);
    const redditOption = screen.getByTestId("source-option-reddit");
    fireEvent.click(redditOption);

    // Should be disabled again (no sources selected)
    expect(startBtn).toBeDisabled();
  });

  it("clicking time filter chip opens dropdown", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const timeChip = screen.getByTestId("time-filter-chip");

    // Click to open dropdown
    fireEvent.click(timeChip);

    // Check time options are visible
    expect(screen.getByTestId("time-option-7d")).toBeInTheDocument();
    expect(screen.getByTestId("time-option-30d")).toBeInTheDocument();
    expect(screen.getByTestId("time-option-3m")).toBeInTheDocument();
    expect(screen.getByTestId("time-option-12m")).toBeInTheDocument();
  });

  it("clicking location filter chip opens dropdown", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const locationChip = screen.getByTestId("location-filter-chip");

    // Click to open dropdown
    fireEvent.click(locationChip);

    // Check location options are visible
    expect(screen.getByTestId("location-option-all")).toBeInTheDocument();
    expect(screen.getByTestId("location-option-us")).toBeInTheDocument();
    expect(screen.getByTestId("location-option-nc")).toBeInTheDocument();
    expect(screen.getByTestId("location-option-dc")).toBeInTheDocument();
  });
});
