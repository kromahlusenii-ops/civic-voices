import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthModal from "./AuthModal";

// Mock Firebase Auth
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

// Mock Firebase config
vi.mock("@/lib/firebase", () => ({
  auth: {},
  googleProvider: {},
}));

// Mock Next.js router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: mockRefresh,
  })),
}));

// Mock fetch for /api/auth/sync
global.fetch = vi.fn();

describe("AuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
  });

  it("does not render when isOpen is false", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Create your account")).not.toBeInTheDocument();
  });

  it("renders modal when isOpen is true", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("renders Google OAuth button", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const googleButton = screen.getByTestId("google-signin-btn");
    expect(googleButton).toBeInTheDocument();
    expect(googleButton).toHaveTextContent("Continue with Google");
  });

  it("calls Firebase signInWithPopup when Google button clicked", async () => {
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
    };

    mockSignInWithPopup.mockResolvedValue({
      user: mockUser,
    });

    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const googleButton = screen.getByTestId("google-signin-btn");
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithPopup).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/sync", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          firebaseUid: mockUser.uid,
          email: mockUser.email,
          name: mockUser.displayName,
        }),
      }));
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows divider between OAuth and credentials", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Or continue with email")).toBeInTheDocument();
  });

  it("renders credentials form below OAuth button", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("switches between signup and login modes", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Initially in signup mode
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("Already have an account? Log in")).toBeInTheDocument();

    // Click to switch to login
    fireEvent.click(screen.getByText("Already have an account? Log in"));

    // Now in login mode
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Don't have an account? Sign up")).toBeInTheDocument();
  });

  it("disables buttons when loading", async () => {
    mockSignInWithPopup.mockImplementation(() => new Promise(() => {})); // Never resolves

    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const googleButton = screen.getByTestId("google-signin-btn");

    // Initially enabled
    expect(googleButton).not.toBeDisabled();

    // Click to start loading
    fireEvent.click(googleButton);

    // Wait for loading state
    await waitFor(() => {
      expect(googleButton).toBeDisabled();
    });
  });
});
