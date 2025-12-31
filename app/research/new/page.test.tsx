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
      "Search an issue, candidate, or ballot measure"
    );

    // Check start research button
    const startBtn = screen.getByTestId("start-research-btn");
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).toHaveTextContent("Start Research");
  });

  it("renders source chips with Reddit and at least 3 others", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    // Check Reddit chip
    const redditChip = screen.getByTestId("source-chip-reddit");
    expect(redditChip).toBeInTheDocument();
    expect(redditChip).toHaveTextContent("Reddit");

    // Check other chips exist
    const tiktokChip = screen.getByTestId("source-chip-tiktok");
    const instagramChip = screen.getByTestId("source-chip-instagram");
    const xChip = screen.getByTestId("source-chip-x");

    expect(tiktokChip).toBeInTheDocument();
    expect(instagramChip).toBeInTheDocument();
    expect(xChip).toBeInTheDocument();
  });

  it("toggling source chips updates selected state", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const redditChip = screen.getByTestId("source-chip-reddit");
    const tiktokChip = screen.getByTestId("source-chip-tiktok");

    // Reddit should be selected by default
    expect(redditChip).toHaveClass("border-accent-blue");
    expect(redditChip).toHaveClass("bg-accent-blue");

    // TikTok should not be selected
    expect(tiktokChip).toHaveClass("border-gray-300");
    expect(tiktokChip).toHaveClass("bg-white");

    // Click TikTok to select it
    fireEvent.click(tiktokChip);
    expect(tiktokChip).toHaveClass("border-accent-blue");
    expect(tiktokChip).toHaveClass("bg-accent-blue");

    // Click Reddit to deselect it
    fireEvent.click(redditChip);
    expect(redditChip).toHaveClass("border-gray-300");
    expect(redditChip).toHaveClass("bg-white");
  });

  it("non-Reddit chip shows coming soon indicator on hover", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ResearchDashboard />);

    const tiktokChip = screen.getByTestId("source-chip-tiktok");

    // Hover over TikTok chip
    fireEvent.mouseEnter(tiktokChip);

    // Coming soon tooltip should appear
    const tooltip = screen.getByTestId("coming-soon-tiktok");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("Coming soon");

    // Mouse leave should hide tooltip
    fireEvent.mouseLeave(tiktokChip);
    expect(screen.queryByTestId("coming-soon-tiktok")).not.toBeInTheDocument();
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

    // Deselect all sources
    const redditChip = screen.getByTestId("source-chip-reddit");
    fireEvent.click(redditChip);

    // Should be disabled again (no sources selected)
    expect(startBtn).toBeDisabled();
  });
});
