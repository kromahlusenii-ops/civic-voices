import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchHistorySidebar, { groupSearchesByDate } from "./SearchHistorySidebar";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Next.js navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Helper to create search with specific date
const createSearch = (id: string, name: string, daysAgo: number) => ({
  id,
  name,
  queryText: name.toLowerCase(),
  sources: ["X"],
  filters: {},
  createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  reportId: `report-${id}`,
  totalResults: 10,
});

describe("groupSearchesByDate", () => {
  it("groups searches into 'recent' for today", () => {
    const searches = [createSearch("1", "Today Search", 0)];
    const grouped = groupSearchesByDate(searches);

    expect(grouped.recent).toHaveLength(1);
    expect(grouped.recent[0].name).toBe("Today Search");
    expect(grouped.previous7Days).toHaveLength(0);
    expect(grouped.previous30Days).toHaveLength(0);
    expect(grouped.older).toHaveLength(0);
  });

  it("groups searches into 'previous7Days' for 1-7 days ago", () => {
    const searches = [
      createSearch("1", "Yesterday Search", 1),
      createSearch("2", "3 Days Ago", 3),
      createSearch("3", "6 Days Ago", 6),
    ];
    const grouped = groupSearchesByDate(searches);

    expect(grouped.recent).toHaveLength(0);
    expect(grouped.previous7Days).toHaveLength(3);
    expect(grouped.previous30Days).toHaveLength(0);
    expect(grouped.older).toHaveLength(0);
  });

  it("groups searches into 'previous30Days' for 8-30 days ago", () => {
    const searches = [
      createSearch("1", "8 Days Ago", 8),
      createSearch("2", "15 Days Ago", 15),
      createSearch("3", "29 Days Ago", 29),
    ];
    const grouped = groupSearchesByDate(searches);

    expect(grouped.recent).toHaveLength(0);
    expect(grouped.previous7Days).toHaveLength(0);
    expect(grouped.previous30Days).toHaveLength(3);
    expect(grouped.older).toHaveLength(0);
  });

  it("groups searches into 'older' for more than 30 days ago", () => {
    const searches = [
      createSearch("1", "31 Days Ago", 31),
      createSearch("2", "60 Days Ago", 60),
      createSearch("3", "100 Days Ago", 100),
    ];
    const grouped = groupSearchesByDate(searches);

    expect(grouped.recent).toHaveLength(0);
    expect(grouped.previous7Days).toHaveLength(0);
    expect(grouped.previous30Days).toHaveLength(0);
    expect(grouped.older).toHaveLength(3);
  });

  it("correctly distributes searches across all groups", () => {
    const searches = [
      createSearch("1", "Today", 0),
      createSearch("2", "Yesterday", 1),
      createSearch("3", "5 Days Ago", 5),
      createSearch("4", "10 Days Ago", 10),
      createSearch("5", "25 Days Ago", 25),
      createSearch("6", "45 Days Ago", 45),
    ];
    const grouped = groupSearchesByDate(searches);

    expect(grouped.recent).toHaveLength(1);
    expect(grouped.previous7Days).toHaveLength(2);
    expect(grouped.previous30Days).toHaveLength(2);
    expect(grouped.older).toHaveLength(1);
  });

  it("returns empty groups for empty input", () => {
    const grouped = groupSearchesByDate([]);

    expect(grouped.recent).toHaveLength(0);
    expect(grouped.previous7Days).toHaveLength(0);
    expect(grouped.previous30Days).toHaveLength(0);
    expect(grouped.older).toHaveLength(0);
  });
});

describe("SearchHistorySidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("Visibility", () => {
    it("renders condensed (width 0) when isOpen is false", () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      render(<SearchHistorySidebar isOpen={false} onClose={vi.fn()} />);

      const sidebar = screen.getByTestId("search-history-sidebar");
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass("w-0");
      expect(sidebar).toHaveClass("opacity-0");
    });

    it("renders expanded when isOpen is true", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: [], total: 0 }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      const sidebar = screen.getByTestId("search-history-sidebar");
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass("w-64");
      expect(sidebar).toHaveClass("opacity-100");
      expect(screen.getByText("Search History")).toBeInTheDocument();
    });
  });

  describe("Loading and Display", () => {
    it("shows loading state initially", () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByTestId("search-history-sidebar")).toBeInTheDocument();
    });

    it("shows empty state when no searches exist", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: [], total: 0 }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("No search history")).toBeInTheDocument();
      });
    });

    it("shows error state when fetch fails", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load history")).toBeInTheDocument();
      });
    });
  });

  describe("Date Groups", () => {
    it("renders searches in correct date groups", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      const mockSearches = [
        createSearch("1", "Today Search", 0),
        createSearch("2", "Yesterday Search", 1),
        createSearch("3", "Week Ago Search", 10),
        createSearch("4", "Old Search", 45),
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("group-recent")).toBeInTheDocument();
      });

      expect(screen.getByText("Recent")).toBeInTheDocument();
      expect(screen.getByText("Previous 7 days")).toBeInTheDocument();
      expect(screen.getByText("Previous 30 days")).toBeInTheDocument();
      expect(screen.getByText("Older")).toBeInTheDocument();

      expect(screen.getByText("Today Search")).toBeInTheDocument();
      expect(screen.getByText("Yesterday Search")).toBeInTheDocument();
      expect(screen.getByText("Week Ago Search")).toBeInTheDocument();
      expect(screen.getByText("Old Search")).toBeInTheDocument();
    });

    it("only renders non-empty groups", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      const mockSearches = [createSearch("1", "Today Search", 0)];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("group-recent")).toBeInTheDocument();
      });

      expect(screen.getByText("Recent")).toBeInTheDocument();
      expect(screen.queryByTestId("group-7days")).not.toBeInTheDocument();
      expect(screen.queryByTestId("group-30days")).not.toBeInTheDocument();
      expect(screen.queryByTestId("group-older")).not.toBeInTheDocument();
    });
  });

  describe("Close Button", () => {
    it("calls onClose when close button is clicked", async () => {
      const mockOnClose = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: [], total: 0 }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByTestId("close-sidebar-btn");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Navigation", () => {
    it("navigates to report page when search with reportId is clicked", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      const mockSearches = [
        {
          id: "search-1",
          name: "Test Search",
          queryText: "test query",
          sources: ["X"],
          filters: {},
          createdAt: new Date().toISOString(),
          reportId: "job-123",
          totalResults: 10,
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("sidebar-search-item-search-1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("sidebar-search-item-search-1"));

      expect(mockRouterPush).toHaveBeenCalledWith("/report/job-123?message=test%20query");
    });

    it("navigates to search page when search without reportId is clicked", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
        isAuthenticated: true,
      });

      const mockSearches = [
        {
          id: "search-2",
          name: "No Report Search",
          queryText: "no report query",
          sources: ["X"],
          filters: {},
          createdAt: new Date().toISOString(),
          reportId: null,
          totalResults: 5,
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistorySidebar isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("sidebar-search-item-search-2")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("sidebar-search-item-search-2"));

      expect(mockRouterPush).toHaveBeenCalledWith("/search?message=no%20report%20query");
    });
  });
});
