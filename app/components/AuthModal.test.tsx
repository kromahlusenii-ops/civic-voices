import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthModal from "./AuthModal";

// Mock Supabase Auth
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
    },
  },
}));

// Mock Next.js router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: mockRefresh,
  })),
}));

describe("AuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("calls Supabase signInWithOAuth when Google button clicked", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const googleButton = screen.getByTestId("google-signin-btn");
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringContaining("/auth/callback"),
        },
      });
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
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Forgot password?"));

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByText("Send Reset Link");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
        redirectTo: expect.stringContaining("/auth/reset-password"),
      });
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
    mockSignUp.mockResolvedValue({
      data: { user: { id: "test-id", email: "test@example.com" } },
      error: null,
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
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          data: {
            name: "John Doe",
          },
        },
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("handles login with email and password", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "test-id", email: "test@example.com" } },
      error: null,
    });

    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(<AuthModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });

    const continueButton = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error on failed login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials" },
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
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {})); // Never resolves

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
