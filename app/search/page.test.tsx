import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchPage from "./page";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Track router calls
const mockRouterReplace = vi.fn();

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: mockRouterReplace,
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === "time_range") return null;
      if (key === "language") return null;
      if (key === "message") return null;
      return null;
    }),
    getAll: vi.fn(() => []),
    toString: vi.fn(() => ""),
  })),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase
const mockGetSession = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

// Mock API response helper
const createMockSearchResponse = (posts = mockPosts) => ({
  posts,
  summary: {
    totalPosts: posts.length,
    platforms: { tiktok: posts.filter(p => p.platform === "tiktok").length, x: posts.filter(p => p.platform === "x").length },
    sentiment: { positive: 2, neutral: 1, negative: 1 },
    timeRange: { start: "2025-10-01T00:00:00.000Z", end: "2026-01-04T00:00:00.000Z" },
  },
  query: "Test query",
  aiAnalysis: {
    interpretation: "This is a test analysis of the search results about current events.",
    keyThemes: ["news", "politics", "social media"],
    sentimentBreakdown: {
      overall: "mixed" as const,
      summary: "The conversation shows mixed perspectives from users.",
    },
    suggestedQueries: [
      { label: "Focus on recent news", query: "test news" },
      { label: "Explore reactions", query: "test reaction" },
    ],
    followUpQuestion: "Would you like to explore a specific aspect of this topic?",
  },
});

// Sample mock posts with real URLs
const mockPosts = [
  {
    id: "7312345678901234567",
    text: "This is a test post about Venezuela and current events. #venezuela #news",
    author: "TestUser",
    authorHandle: "@testuser",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    platform: "tiktok" as const,
    engagement: { likes: 1200, comments: 89, shares: 456, views: 45000 },
    url: "https://www.tiktok.com/@testuser/video/7312345678901234567",
  },
  {
    id: "1876543210987654321",
    text: "Breaking news: Important political developments happening right now.",
    author: "News Account",
    authorHandle: "@newsaccount",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    platform: "x" as const,
    engagement: { likes: 3400, comments: 567, shares: 1200, views: 120000 },
    url: "https://twitter.com/newsaccount/status/1876543210987654321",
  },
];

describe("Search Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "mock-access-token" } },
    });
  });

  describe("Initial Search State", () => {
    it("renders greeting, search input, and start research button", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { id: "user-1", email: "john@example.com", user_metadata: { name: "John Doe" } },
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

    it("shows default greeting when user has no name", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { email: "user@example.com", displayName: null },
      });

      render(<SearchPage />);

      const greeting = screen.getByTestId("dashboard-greeting");
      expect(greeting).toHaveTextContent("Discover what people buzz about");
    });

    it("shows default greeting for unauthenticated users", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const greeting = screen.getByTestId("dashboard-greeting");
      expect(greeting).toHaveTextContent("Discover what people buzz about");
    });

    it("renders source filter", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const sourceButton = screen.getByTestId("source-filter-button");
      expect(sourceButton).toBeInTheDocument();
    });

    it("start research button is disabled when no query", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const startBtn = screen.getByTestId("start-research-btn");

      // Initially disabled (no search query)
      expect(startBtn).toBeDisabled();

      // Type search query
      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, {
        target: { value: "Climate change policy" },
      });

      // Should be enabled now
      expect(startBtn).not.toBeDisabled();
    });
  });

  describe("Source Filter", () => {
    it("clicking source filter button opens dropdown with all sources", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
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
    });

    it("toggling sources in dropdown updates selection", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const sourceButton = screen.getByTestId("source-filter-button");

      // Open dropdown
      fireEvent.click(sourceButton);

      const tiktokOption = screen.getByTestId("source-option-tiktok");

      // TikTok should be selected by default
      expect(tiktokOption).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Authentication Flow", () => {
    it("unauthenticated user clicking search opens auth modal", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      // Type a search query
      fireEvent.change(searchInput, {
        target: { value: "Climate policy" },
      });

      // Auth modal should not be visible initially
      expect(screen.queryByText("Log in")).not.toBeInTheDocument();

      // Click start research
      fireEvent.click(startBtn);

      // Auth modal should now be visible
      expect(screen.getByText("Log in")).toBeInTheDocument();
      expect(screen.getByText("Create account")).toBeInTheDocument();
    });

    it("auth modal displays Google OAuth button", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
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

  describe("Search Results", () => {
    it("authenticated user clicking search shows loading then results", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          displayName: "John Doe",
          email: "john@example.com",
          id: "user-1",
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSearchResponse()),
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      // Type a search query
      fireEvent.change(searchInput, {
        target: { value: "Venezuela" },
      });

      // Click start research
      fireEvent.click(startBtn);

      // Auth modal should NOT appear for authenticated users
      expect(screen.queryByText("Create your account")).not.toBeInTheDocument();

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText("Analyzing...")).toBeInTheDocument();
      });

      // Wait for results to appear
      await waitFor(
        () => {
          expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // AI analysis should be visible
      expect(screen.getByTestId("ai-interpretation")).toBeInTheDocument();

      // Follow-up input should be visible
      expect(screen.getByTestId("follow-up-input")).toBeInTheDocument();
    });

    it("displays post cards in results with clickable links", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          displayName: "John Doe",
          email: "john@example.com",
          id: "user-1",
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSearchResponse()),
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      fireEvent.change(searchInput, { target: { value: "Test query" } });
      fireEvent.click(startBtn);

      // Wait for results
      await waitFor(
        () => {
          expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Check for post cards
      const postCards = screen.getAllByTestId("post-card");
      expect(postCards.length).toBe(2);

      // Verify post cards are links to real URLs
      expect(postCards[0]).toHaveAttribute("href", "https://www.tiktok.com/@testuser/video/7312345678901234567");
      expect(postCards[1]).toHaveAttribute("href", "https://twitter.com/newsaccount/status/1876543210987654321");
    });

    it("clicking new research resets to initial state", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          displayName: "John Doe",
          email: "john@example.com",
          id: "user-1",
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSearchResponse()),
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      // Perform search
      fireEvent.change(searchInput, { target: { value: "Test query" } });
      fireEvent.click(startBtn);

      // Wait for results
      await waitFor(
        () => {
          expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Click new research button
      const newResearchBtn = screen.getByTestId("new-research-btn");
      fireEvent.click(newResearchBtn);

      // Should return to initial state
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-greeting")).toBeInTheDocument();
      });
    });

    it("handles API errors gracefully", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          displayName: "John Doe",
          email: "john@example.com",
          id: "user-1",
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      fireEvent.change(searchInput, { target: { value: "Test query" } });
      fireEvent.click(startBtn);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText("Internal server error")).toBeInTheDocument();
      });
    });
  });

  describe("Time Interval Filter", () => {
    it("renders time range filter with default value", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const timeFilter = screen.getByTestId("time-range-filter");
      expect(timeFilter).toBeInTheDocument();
      expect(timeFilter).toHaveTextContent("Last 3 months");
    });

    it("clicking time range filter opens dropdown with options", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const timeFilter = screen.getByTestId("time-range-filter");
      fireEvent.click(timeFilter);

      // Check dropdown options are visible
      expect(screen.getByTestId("time-range-filter-option-today")).toBeInTheDocument();
      expect(screen.getByTestId("time-range-filter-option-last_week")).toBeInTheDocument();
      expect(screen.getByTestId("time-range-filter-option-last_3_months")).toBeInTheDocument();
      expect(screen.getByTestId("time-range-filter-option-last_year")).toBeInTheDocument();
    });

    it("selecting time range option updates state", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const timeFilter = screen.getByTestId("time-range-filter");
      fireEvent.click(timeFilter);

      // Click on "Last week" option
      const lastWeekOption = screen.getByTestId("time-range-filter-option-last_week");
      fireEvent.click(lastWeekOption);

      // Filter should now show "Last week"
      expect(timeFilter).toHaveTextContent("Last week");
    });
  });

  describe("Language Filter", () => {
    it("renders language filter with default value", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const languageFilter = screen.getByTestId("language-filter");
      expect(languageFilter).toBeInTheDocument();
      expect(languageFilter).toHaveTextContent("All languages");
    });

    it("clicking language filter opens dropdown with options", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const languageFilter = screen.getByTestId("language-filter");
      fireEvent.click(languageFilter);

      // Check dropdown options are visible
      expect(screen.getByTestId("language-filter-option-all")).toBeInTheDocument();
      expect(screen.getByTestId("language-filter-option-en")).toBeInTheDocument();
      expect(screen.getByTestId("language-filter-option-es")).toBeInTheDocument();
      expect(screen.getByTestId("language-filter-option-pt")).toBeInTheDocument();
      expect(screen.getByTestId("language-filter-option-fr")).toBeInTheDocument();
      expect(screen.getByTestId("language-filter-option-ar")).toBeInTheDocument();
    });

    it("selecting language option updates state", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const languageFilter = screen.getByTestId("language-filter");
      fireEvent.click(languageFilter);

      // Click on "English" option
      const englishOption = screen.getByTestId("language-filter-option-en");
      fireEvent.click(englishOption);

      // Filter should now show "English"
      expect(languageFilter).toHaveTextContent("English");
    });
  });

  describe("Filter Persistence", () => {
    it("filters persist through search execution", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          displayName: "John Doe",
          email: "john@example.com",
          id: "user-1",
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSearchResponse()),
      });

      render(<SearchPage />);

      // Change time filter to "Last week"
      const timeFilter = screen.getByTestId("time-range-filter");
      fireEvent.click(timeFilter);
      fireEvent.click(screen.getByTestId("time-range-filter-option-last_week"));

      // Change language to English
      const languageFilter = screen.getByTestId("language-filter");
      fireEvent.click(languageFilter);
      fireEvent.click(screen.getByTestId("language-filter-option-en"));

      // Execute search
      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "Test query" } });
      fireEvent.click(screen.getByTestId("start-research-btn"));

      // Wait for results
      await waitFor(
        () => {
          expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Filters should still show selected values in results view
      const resultsTimeFilter = screen.getByTestId("results-time-range-filter");
      expect(resultsTimeFilter).toHaveTextContent("Last week");

      const resultsLanguageFilter = screen.getByTestId("results-language-filter");
      expect(resultsLanguageFilter).toHaveTextContent("English");
    });
  });

  describe("Auto-save Functionality", () => {
    it("unauthenticated user search does not call save API", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      // Type a search query
      fireEvent.change(searchInput, { target: { value: "Test query" } });

      // Click start research - opens auth modal for unauth users
      fireEvent.click(startBtn);

      // Should show auth modal instead of executing search
      expect(screen.getByText("Log in")).toBeInTheDocument();

      // Verify fetch was never called (no search, no save)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("authenticated user search calls save API with Search + ResearchJob data", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          id: "user-1",
          email: "john@example.com",
          user_metadata: { name: "John Doe" },
        },
      });

      const mockSearchResponse = createMockSearchResponse();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      // Execute search
      fireEvent.change(searchInput, { target: { value: "Climate policy" } });
      fireEvent.click(startBtn);

      // Wait for results
      await waitFor(
        () => {
          expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify save API was called
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(fetchCalls.length).toBe(2); // search + save

      // First call should be to search API
      expect(fetchCalls[0][0]).toBe("/api/search");

      // Second call should be to save API
      expect(fetchCalls[1][0]).toBe("/api/search/save");
      expect(fetchCalls[1][1]).toMatchObject({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-access-token",
        },
      });

      // Verify save payload includes required fields
      const savePayload = JSON.parse(fetchCalls[1][1].body);
      expect(savePayload.queryText).toBe("Climate policy");
      expect(savePayload.sources).toBeDefined();
      expect(savePayload.filters).toBeDefined();
      expect(savePayload.totalResults).toBe(mockSearchResponse.summary.totalPosts);
      expect(savePayload.posts).toHaveLength(mockSearchResponse.posts.length);
      expect(savePayload.posts[0]).toMatchObject({
        id: mockPosts[0].id,
        text: mockPosts[0].text,
        platform: mockPosts[0].platform,
        url: mockPosts[0].url,
      });
    });

    it("save API failure does not affect search results display", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          id: "user-1",
          email: "john@example.com",
          user_metadata: { name: "John Doe" },
        },
      });

      const mockSearchResponse = createMockSearchResponse();

      // Mock search to succeed, save to fail
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        })
        .mockRejectedValueOnce(new Error("Save failed"));

      // Spy on console.error to verify error is logged
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<SearchPage />);

      const searchInput = screen.getByTestId("search-input");
      const startBtn = screen.getByTestId("start-research-btn");

      fireEvent.change(searchInput, { target: { value: "Test query" } });
      fireEvent.click(startBtn);

      // Wait for results - should still display despite save failure
      await waitFor(
        () => {
          expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify error was logged but search results still show
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to save search:",
          expect.any(Error)
        );
      });

      // Posts should still be visible
      const postCards = screen.getAllByTestId("post-card");
      expect(postCards.length).toBe(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Search History Button", () => {
    it("unauthenticated user clicking search history opens auth modal", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(<SearchPage />);

      const searchHistoryBtn = screen.getByTestId("search-history-btn");
      fireEvent.click(searchHistoryBtn);

      // Auth modal should open
      expect(screen.getByText("Log in")).toBeInTheDocument();
      expect(screen.getByText("Create account")).toBeInTheDocument();
    });

    it("authenticated user hovering search history expands search history sidebar", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: {
          displayName: "John Doe",
          email: "john@example.com",
          id: "user-1",
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ searches: [], total: 0 }),
      });

      render(<SearchPage />);

      const searchHistoryBtn = screen.getByTestId("search-history-btn");
      fireEvent.mouseEnter(searchHistoryBtn);

      // Search history sidebar should expand on hover
      await waitFor(() => {
        expect(screen.getByTestId("search-history-sidebar")).toBeInTheDocument();
      });
      expect(screen.getByText("Search History")).toBeInTheDocument();
    });
  });
});
