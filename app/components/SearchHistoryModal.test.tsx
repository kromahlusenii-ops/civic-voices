import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchHistoryModal from "./SearchHistoryModal";

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

// Sample mock searches
const mockSearches = [
  {
    id: "search-1",
    name: "Climate change policy",
    queryText: "climate change policy",
    sources: ["X", "TIKTOK"],
    filters: { timeFilter: "7d", language: "en" },
    createdAt: new Date().toISOString(),
    reportId: "job-1",
    totalResults: 25,
  },
  {
    id: "search-2",
    name: "Election 2024",
    queryText: "election 2024 results",
    sources: ["X"],
    filters: { timeFilter: "1d" },
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    reportId: "job-2",
    totalResults: 42,
  },
  {
    id: "search-3",
    name: "Healthcare reform",
    queryText: "healthcare reform debate",
    sources: ["TIKTOK", "REDDIT"],
    filters: { timeFilter: "3m" },
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    reportId: null,
    totalResults: 15,
  },
];

describe("SearchHistoryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("Modal Open/Close", () => {
    it("renders nothing when isOpen is false", () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      render(<SearchHistoryModal isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByTestId("search-history-modal")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByTestId("search-history-modal")).toBeInTheDocument();
      expect(screen.getByText("Search History")).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const mockOnClose = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByTestId("close-search-history-modal");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading and Display", () => {
    it("shows loading state initially", () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      // Don't resolve the fetch immediately
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      // Loading spinner should be visible
      expect(screen.getByTestId("search-history-modal")).toBeInTheDocument();
    });

    it("displays search history items after loading", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("search-history-list")).toBeInTheDocument();
      });

      // Check that search items are displayed
      expect(screen.getByText("Climate change policy")).toBeInTheDocument();
      expect(screen.getByText("Election 2024")).toBeInTheDocument();
      expect(screen.getByText("Healthcare reform")).toBeInTheDocument();
    });

    it("shows empty state when no searches exist", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: [], total: 0 }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("No saved searches yet")).toBeInTheDocument();
      });
    });

    it("shows error state when fetch fails", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load search history")).toBeInTheDocument();
      });
    });
  });

  describe("Filtering", () => {
    it("renders filter input", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByTestId("search-history-filter-input")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search reports")).toBeInTheDocument();
    });

    it("filters searches by query text", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("search-history-list")).toBeInTheDocument();
      });

      // Initially all searches visible
      expect(screen.getByText("Climate change policy")).toBeInTheDocument();
      expect(screen.getByText("Election 2024")).toBeInTheDocument();
      expect(screen.getByText("Healthcare reform")).toBeInTheDocument();

      // Filter by "climate"
      const filterInput = screen.getByTestId("search-history-filter-input");
      fireEvent.change(filterInput, { target: { value: "climate" } });

      // Only climate search should be visible
      await waitFor(() => {
        expect(screen.getByText("Climate change policy")).toBeInTheDocument();
        expect(screen.queryByText("Election 2024")).not.toBeInTheDocument();
        expect(screen.queryByText("Healthcare reform")).not.toBeInTheDocument();
      });
    });

    it("shows no matches message when filter has no results", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("search-history-list")).toBeInTheDocument();
      });

      // Filter by non-existent term
      const filterInput = screen.getByTestId("search-history-filter-input");
      fireEvent.change(filterInput, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText("No matching searches found")).toBeInTheDocument();
      });
    });

    it("clears filter and shows all results", async () => {
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("search-history-list")).toBeInTheDocument();
      });

      const filterInput = screen.getByTestId("search-history-filter-input");

      // Filter
      fireEvent.change(filterInput, { target: { value: "climate" } });
      await waitFor(() => {
        expect(screen.queryByText("Election 2024")).not.toBeInTheDocument();
      });

      // Clear filter
      fireEvent.change(filterInput, { target: { value: "" } });
      await waitFor(() => {
        expect(screen.getByText("Climate change policy")).toBeInTheDocument();
        expect(screen.getByText("Election 2024")).toBeInTheDocument();
        expect(screen.getByText("Healthcare reform")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("navigates to report page when search with reportId is clicked", async () => {
      const mockOnClose = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId("search-history-list")).toBeInTheDocument();
      });

      // Click on first search item (has reportId)
      const searchItem = screen.getByTestId("search-history-item-search-1");
      fireEvent.click(searchItem);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/report/job-1?message=climate%20change%20policy"
      );
    });

    it("navigates to search page when search without reportId is clicked", async () => {
      const mockOnClose = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: mockSearches, total: mockSearches.length }),
      });

      render(<SearchHistoryModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId("search-history-list")).toBeInTheDocument();
      });

      // Click on third search item (no reportId)
      const searchItem = screen.getByTestId("search-history-item-search-3");
      fireEvent.click(searchItem);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/search?message=healthcare%20reform%20debate"
      );
    });
  });
});
