import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ResearchJobPage from "./page";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ""),
  })),
}));

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
}));

// Mock Firebase config
vi.mock("@/lib/firebase", () => ({
  auth: {},
  googleProvider: {},
}));

const mockSearchResults = {
  posts: [
    {
      id: "1",
      text: "Test post from X",
      author: "John Doe",
      authorHandle: "@johndoe",
      createdAt: "2024-01-01T00:00:00Z",
      platform: "x",
      engagement: {
        likes: 100,
        comments: 50,
        shares: 25,
        views: 1000,
      },
      url: "https://x.com/johndoe/status/1",
    },
    {
      id: "2",
      text: "Test post from TikTok",
      author: "Jane Smith",
      authorHandle: "@janesmith",
      createdAt: "2024-01-02T00:00:00Z",
      platform: "tiktok",
      engagement: {
        likes: 200,
        comments: 75,
        shares: 50,
        views: 2000,
      },
      url: "https://tiktok.com/@janesmith/video/2",
    },
  ],
  summary: {
    totalPosts: 2,
    platforms: {
      x: 1,
      tiktok: 1,
    },
    sentiment: {
      positive: 1,
      neutral: 1,
      negative: 0,
    },
    timeRange: {
      start: "2024-01-01T00:00:00Z",
      end: "2024-01-02T00:00:00Z",
    },
  },
  query: "Test query",
};

const mockSearchParams = {
  query: "Test query",
  sources: ["x", "tiktok"],
  timeFilter: "7d",
  locationFilter: "all",
};

describe("Research Results Page", () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(async () => {
    // Clear sessionStorage before each test
    sessionStorage.clear();

    // Mock useAuth - authenticated user
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: {
        displayName: "Test User",
        email: "test@example.com",
      },
    });

    // Mock useRouter
    const { useRouter } = await import("next/navigation");
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    // Reset mock call counts
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it("displays loading state initially", () => {
    render(<ResearchJobPage />);

    expect(screen.getByText("Loading results...")).toBeInTheDocument();
  });

  it("redirects to search if no results in sessionStorage", async () => {
    const mockRouterPush = vi.fn();

    // Import useRouter to access the mock
    const { useRouter } = await import("next/navigation");
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockRouterPush,
      replace: vi.fn(),
    });

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/search");
    });
  });

  it("displays search query and results count", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(screen.getByTestId("results-query")).toHaveTextContent("Test query");
      expect(screen.getByText(/2 posts from 2 sources/)).toBeInTheDocument();
    });
  });

  it("displays sentiment analysis", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(screen.getByText("Sentiment")).toBeInTheDocument();
      expect(screen.getByText("Positive")).toBeInTheDocument();
      expect(screen.getByText("Neutral")).toBeInTheDocument();
      expect(screen.getByText("Negative")).toBeInTheDocument();
    });
  });

  it("displays platform breakdown", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(screen.getByText("Platform Breakdown")).toBeInTheDocument();
      // Verify platform names appear (multiple times is OK since they're in posts too)
      expect(screen.getAllByText("x").length).toBeGreaterThan(0);
      expect(screen.getAllByText("tiktok").length).toBeGreaterThan(0);
      // Verify post count appears
      const postCountElements = screen.getAllByText("1 posts");
      expect(postCountElements.length).toBeGreaterThan(0);
    });
  });

  it("displays all posts in feed", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      const postCards = screen.getAllByTestId("post-card");
      expect(postCards).toHaveLength(2);

      expect(screen.getByText("Test post from X")).toBeInTheDocument();
      expect(screen.getByText("Test post from TikTok")).toBeInTheDocument();
      expect(screen.getByText("@johndoe")).toBeInTheDocument();
      expect(screen.getByText("@janesmith")).toBeInTheDocument();
    });
  });

  it("displays engagement metrics for posts", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      // Verify engagement metrics appear (using getAllByText since numbers can appear multiple times)
      expect(screen.getAllByText(/100/).length).toBeGreaterThan(0); // likes
      expect(screen.getAllByText(/50/).length).toBeGreaterThan(0); // comments
      expect(screen.getAllByText(/25/).length).toBeGreaterThan(0); // shares
      expect(screen.getAllByText(/1,000/).length).toBeGreaterThan(0); // views
    });
  });

  it("displays source filter in header", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(screen.getByTestId("source-filter-button")).toBeInTheDocument();
    });
  });

  it("has New Search button", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(screen.getByText("New Search")).toBeInTheDocument();
    });
  });

  it("displays split-screen layout with Analysis and Posts sections", async () => {
    sessionStorage.setItem("searchResults", JSON.stringify(mockSearchResults));
    sessionStorage.setItem("searchParams", JSON.stringify(mockSearchParams));

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeInTheDocument();
      expect(screen.getByText(/Posts \(2\)/)).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated users to search page", async () => {
    const mockRouterPush = vi.fn();

    // Mock unauthenticated state
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    // Import useRouter to access the mock
    const { useRouter } = await import("next/navigation");
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockRouterPush,
      replace: vi.fn(),
    });

    render(<ResearchJobPage />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/search?auth=true");
    });
  });
});
