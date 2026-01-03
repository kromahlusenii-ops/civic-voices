import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { signIn } from "next-auth/react";
import AuthModal from "./AuthModal";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

describe("AuthModal", () => {
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

  it("calls signIn with google provider when Google button clicked", async () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const googleButton = screen.getByTestId("google-signin-btn");
    fireEvent.click(googleButton);

    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: expect.any(String),
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

  it("disables buttons when loading", () => {
    const mockOnClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const googleButton = screen.getByTestId("google-signin-btn");

    // Initially enabled
    expect(googleButton).not.toBeDisabled();

    // Click to start loading
    fireEvent.click(googleButton);

    // Should be disabled during loading
    expect(googleButton).toBeDisabled();
  });
});
