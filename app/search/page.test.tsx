import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession } from "next-auth/react";
import SearchPage from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ""),
  })),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Search Page", () => {
  it("renders greeting, search input, and start research button", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { name: "John Doe", email: "john@example.com" } },
      status: "authenticated",
    });

    render(<SearchPage />);

    // Check greeting shows first name for authenticated users
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
  });

  it("renders filter chips for source, time, and location", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    // Check filter chips exist
    const sourceButton = screen.getByTestId("source-filter-button");
    const timeChip = screen.getByTestId("time-filter-chip");
    const locationChip = screen.getByTestId("location-filter-chip");

    expect(sourceButton).toBeInTheDocument();
    expect(sourceButton).toHaveTextContent("X +1"); // X and TikTok by default
    expect(timeChip).toBeInTheDocument();
    expect(timeChip).toHaveTextContent("Last 3 months");
    expect(locationChip).toBeInTheDocument();
    expect(locationChip).toHaveTextContent("All regions");
  });

  it("clicking source filter button opens dropdown with all sources", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    const sourceButton = screen.getByTestId("source-filter-button");

    // Dropdown should not be visible initially
    expect(screen.queryByTestId("source-filter-dropdown")).not.toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(sourceButton);

    // Check dropdown and source options are now visible
    expect(screen.getByTestId("source-filter-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-x")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-tiktok")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-reddit")).toBeInTheDocument();
    expect(screen.getByTestId("source-option-instagram")).toBeInTheDocument();
  });

  it("toggling sources in dropdown updates selection", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    const sourceButton = screen.getByTestId("source-filter-button");

    // Open dropdown
    fireEvent.click(sourceButton);

    const xOption = screen.getByTestId("source-option-x");

    // X should be selected by default (aria-checked)
    expect(xOption).toHaveAttribute("aria-checked", "true");

    // Click X to deselect
    fireEvent.click(xOption);

    // Button label should update to show only TikTok
    expect(screen.getByTestId("source-filter-button")).toHaveTextContent("TikTok");
  });

  it("disabled sources show 'Coming soon' label", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    const sourceButton = screen.getByTestId("source-filter-button");

    // Open dropdown
    fireEvent.click(sourceButton);

    const redditOption = screen.getByTestId("source-option-reddit");

    // Reddit should show "Coming soon"
    expect(redditOption).toHaveTextContent("Coming soon");
    expect(redditOption).toBeDisabled();
  });

  it("shows default greeting when user has no name", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });

    render(<SearchPage />);

    const greeting = screen.getByTestId("dashboard-greeting");
    expect(greeting).toHaveTextContent("Discover what people buzz about");
  });

  it("start research button is disabled when no query or no sources selected", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    const startBtn = screen.getByTestId("start-research-btn");
    const searchInput = screen.getByTestId("search-input");

    // Initially disabled (no search query)
    expect(startBtn).toBeDisabled();

    // Type search query
    fireEvent.change(searchInput, {
      target: { value: "Climate change policy" },
    });

    // Should be enabled now (has query and X + TikTok are selected by default)
    expect(startBtn).not.toBeDisabled();

    // Open source dropdown and deselect both X and TikTok
    const sourceButton = screen.getByTestId("source-filter-button");
    fireEvent.click(sourceButton);
    const xOption = screen.getByTestId("source-option-x");
    const tiktokOption = screen.getByTestId("source-option-tiktok");
    fireEvent.click(xOption);
    fireEvent.click(tiktokOption);

    // Should be disabled again (no sources selected)
    expect(startBtn).toBeDisabled();
  });

  it("clicking time filter chip opens dropdown", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

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

    render(<SearchPage />);

    const locationChip = screen.getByTestId("location-filter-chip");

    // Click to open dropdown
    fireEvent.click(locationChip);

    // Check location options are visible
    expect(screen.getByTestId("location-option-all")).toBeInTheDocument();
    expect(screen.getByTestId("location-option-us")).toBeInTheDocument();
    expect(screen.getByTestId("location-option-nc")).toBeInTheDocument();
    expect(screen.getByTestId("location-option-dc")).toBeInTheDocument();
  });

  it("unauthenticated user clicking search opens auth modal", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    const searchInput = screen.getByTestId("search-input");
    const startBtn = screen.getByTestId("start-research-btn");

    // Type a search query
    fireEvent.change(searchInput, {
      target: { value: "Climate policy" },
    });

    // Auth modal should not be visible initially
    expect(screen.queryByText("Create your account")).not.toBeInTheDocument();

    // Click start research
    fireEvent.click(startBtn);

    // Auth modal should now be visible
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("authenticated user clicking search executes search directly", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { name: "John Doe", email: "john@example.com" } },
      status: "authenticated",
    });

    // Mock fetch for the search API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ posts: [], summary: {} }),
      } as Response)
    );

    render(<SearchPage />);

    const searchInput = screen.getByTestId("search-input");
    const startBtn = screen.getByTestId("start-research-btn");

    // Type a search query
    fireEvent.change(searchInput, {
      target: { value: "Climate policy" },
    });

    // Click start research
    fireEvent.click(startBtn);

    // Auth modal should NOT appear for authenticated users
    expect(screen.queryByText("Create your account")).not.toBeInTheDocument();

    // Search API should be called
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/search",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("auth modal displays Google OAuth button", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<SearchPage />);

    const searchInput = screen.getByTestId("search-input");
    const startBtn = screen.getByTestId("start-research-btn");

    // Type a search query and open modal
    fireEvent.change(searchInput, {
      target: { value: "Test query" },
    });
    fireEvent.click(startBtn);

    // Verify Google button is present
    const googleButton = screen.getByTestId("google-signin-btn");
    expect(googleButton).toBeInTheDocument();
    expect(googleButton).toHaveTextContent("Continue with Google");
  });
});
