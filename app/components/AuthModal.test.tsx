import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthModal from "./AuthModal";

// Mock Firebase Auth
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSendPasswordResetEmail = vi.fn();

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
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

    expect(screen.queryByText("Civic Voices")).not.toBeInTheDocument();
  });

  it("renders modal when isOpen is true with login tab by default", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Civic Voices")).toBeInTheDocument();
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  it("renders close button", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText("Close modal");
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders promotional content on desktop", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Discover What People/)).toBeInTheDocument();
    expect(screen.getByText("AI-Driven Insights")).toBeInTheDocument();
    expect(screen.getByText("Key Metrics Analysis")).toBeInTheDocument();
    expect(screen.getByText("Shareable Reports")).toBeInTheDocument();
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

  it("switches between login and signup tabs", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Initially on login tab
    expect(screen.getByText("Log in")).toHaveClass("border-gray-900");
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();

    // Click to switch to signup tab
    fireEvent.click(screen.getByText("Create account"));

    // Now on signup tab
    expect(screen.getByText("Create account")).toHaveClass("border-gray-900");
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("renders login form fields", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("renders signup form fields", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Create account"));

    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/)).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = passwordInput.parentElement?.querySelector("button");
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton!);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleButton!);
    expect(passwordInput.type).toBe("password");
  });

  it("shows forgot password flow", async () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Forgot password?"));

    expect(screen.getByText("Reset Password")).toBeInTheDocument();
    expect(screen.getByText(/Enter your email/)).toBeInTheDocument();
    expect(screen.getByText("Send Reset Link")).toBeInTheDocument();
  });

  it("sends password reset email", async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);

    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Forgot password?"));

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByText("Send Reset Link");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({}, "test@example.com");
      expect(screen.getByText(/Password reset email sent/)).toBeInTheDocument();
    });
  });

  it("goes back to login from password reset", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Forgot password?"));
    expect(screen.getByText("Reset Password")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back to login"));
    expect(screen.queryByText("Reset Password")).not.toBeInTheDocument();
    expect(screen.getByText("Log in")).toBeInTheDocument();
  });

  it("handles signup with email and password", async () => {
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: null,
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText("Create account"));

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });

    const continueButton = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith({}, "test@example.com", "password123");
      expect(mockUpdateProfile).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("handles login with email and password", async () => {
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
    };

    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });

    const continueButton = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith({}, "test@example.com", "password123");
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error on failed login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });

    const continueButton = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });

  it("disables buttons when loading", async () => {
    mockSignInWithPopup.mockImplementation(() => new Promise(() => {})); // Never resolves

    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const googleButton = screen.getByTestId("google-signin-btn");

    expect(googleButton).not.toBeDisabled();

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(googleButton).toBeDisabled();
    });
  });
});
