import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ReportPage from "./page";

// Mock report data
const mockReportData = {
  report: {
    id: "test-report-123",
    query: "Climate change policy",
    sources: ["x", "tiktok"],
    status: "COMPLETED",
    createdAt: "2024-01-15T12:00:00Z",
    completedAt: "2024-01-15T12:05:00Z",
  },
  metrics: {
    totalMentions: 150,
    totalEngagement: 5000,
    avgEngagement: 33,
    sentimentBreakdown: {
      positive: 80,
      neutral: 50,
      negative: 20,
    },
    platformBreakdown: {
      x: 100,
      tiktok: 50,
    },
  },
  activityOverTime: [
    { date: "2024-01-10", count: 20, engagement: 500 },
    { date: "2024-01-11", count: 30, engagement: 800 },
  ],
  posts: [
    {
      id: "post-1",
      text: "Test post about climate change",
      author: "Test User",
      authorHandle: "testuser",
      platform: "x",
      url: "https://x.com/testuser/1",
      createdAt: "2024-01-15T10:00:00Z",
      engagement: { likes: 100, comments: 20, shares: 10 },
      sentiment: "positive",
    },
  ],
  aiAnalysis: {
    interpretation: "Analysis of climate change policy discussions.",
    keyThemes: ["Policy", "Environment"],
    sentimentBreakdown: { overall: "positive", summary: "Generally positive" },
    suggestedQueries: [],
    followUpQuestion: "What aspects would you like to explore further?",
  },
  topPosts: [],
};

// Mock getAccessToken function
const mockGetAccessToken = vi.fn().mockResolvedValue("mock-token");

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useParams: () => ({
    id: "test-report-123",
  }),
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

// Mock fetch API
global.fetch = vi.fn();

describe("Report Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockReportData,
    });
  });

  it("displays loading state initially for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    expect(screen.getByText("Loading report...")).toBeInTheDocument();
  });

  it("shows auth modal for unauthenticated users", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    // Auth modal should be visible
    await waitFor(() => {
      expect(screen.getByText("Civic Voices")).toBeInTheDocument();
      expect(screen.getByText("Log in")).toBeInTheDocument();
    });
  });

  it("displays query from report data after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId("report-query")).toHaveTextContent("Climate change policy");
    }, { timeout: 3000 });
  });

  it("displays metrics row after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId("metrics-row")).toBeInTheDocument();
      expect(screen.getByText("Est. engagements")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays emotions breakdown after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId("emotions-breakdown")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("does not redirect unauthenticated users", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    // Should show auth modal instead of redirecting
    await waitFor(() => {
      expect(screen.getByText("Civic Voices")).toBeInTheDocument();
    });

    // Should NOT redirect to /search
    expect(mockPush).not.toHaveBeenCalledWith("/search");
  });

  it("shows loading state during auth check", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      user: null,
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    // Should show loading spinner during auth check
    expect(screen.getByText("Loading report...")).toBeInTheDocument();
  });

  it("displays AI analysis content after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
      getAccessToken: mockGetAccessToken,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/Analysis of climate change policy/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays error state when API fails", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
      getAccessToken: mockGetAccessToken,
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch report")).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
