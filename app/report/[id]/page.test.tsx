import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ReportPage from "./page";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockGetAll = vi.fn();
const mockGet = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockGet,
    getAll: mockGetAll,
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

describe("Report Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default URL params
    mockGet.mockImplementation((key: string) => {
      if (key === "message" || key === "query") return "Climate change policy";
      return null;
    });
    mockGetAll.mockImplementation((key: string) => {
      if (key === "sources") return ["x", "tiktok"];
      return [];
    });
  });

  it("displays loading state initially for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("shows auth modal for unauthenticated users", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    render(<ReportPage />);

    // Auth modal should be visible
    await waitFor(() => {
      expect(screen.getByText("Civic Voices")).toBeInTheDocument();
      expect(screen.getByText("Log in")).toBeInTheDocument();
    });
  });

  it("displays query from URL params after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId("report-query")).toHaveTextContent("Climate change policy");
    }, { timeout: 3000 });
  });

  it("displays follow-up search input", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      const followUpInput = screen.getByTestId("follow-up-input");
      expect(followUpInput).toBeInTheDocument();
      expect(followUpInput).toHaveAttribute("placeholder", "Search a topic or paste a URL");
    }, { timeout: 3000 });
  });

  it("displays source filter button", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId("left-source-filter")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays Start research button in posts header", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("Start research")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("does not redirect unauthenticated users", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
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
    });

    render(<ReportPage />);

    // Should show loading spinner during auth check
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("displays AI analysis content after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-interpretation")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays posts preview section", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("Posts preview for query")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays total mentions after loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { displayName: "Test User", email: "test@example.com" },
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/167,700 total mentions/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
