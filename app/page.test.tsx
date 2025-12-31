import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Landing Page", () => {
  it("renders hero headline and typewriter text and primary CTA", () => {
    render(<Home />);

    // Check for hero headline
    expect(
      screen.getByText(/Research Social Media Conversations for/i)
    ).toBeInTheDocument();

    // Check for typewriter text (should show initial word "Pains")
    const typewriterText = screen.getByTestId("typewriter-text");
    expect(typewriterText).toBeInTheDocument();
    expect(typewriterText).toHaveTextContent("Pains");

    // Check for primary CTA
    const heroCTA = screen.getByTestId("hero-cta");
    expect(heroCTA).toBeInTheDocument();
    expect(heroCTA).toHaveTextContent(/Try for free/i);
  });

  it("renders nav with Log in and Try for free buttons", () => {
    render(<Home />);

    // Check for nav buttons
    const loginButton = screen.getByTestId("nav-login");
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveTextContent(/Log in/i);

    const signupButton = screen.getByTestId("nav-signup");
    expect(signupButton).toBeInTheDocument();
    expect(signupButton).toHaveTextContent(/Try for free/i);
  });

  it("renders use cases section with at least 6 cards", () => {
    render(<Home />);

    // Check for use cases section
    const useCasesSection = screen.getByTestId("use-cases-section");
    expect(useCasesSection).toBeInTheDocument();

    // Check for heading
    expect(
      screen.getByText(/Build narratives that resonate/i)
    ).toBeInTheDocument();

    // Check for use case cards (should have at least 6)
    const useCaseCards = screen.getAllByTestId("use-case-card");
    expect(useCaseCards.length).toBeGreaterThanOrEqual(6);

    // Verify some specific use cases (using getAllByText since text may appear in hero too)
    expect(screen.getAllByText(/Analyze conversations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Synthetic audiences/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Market insights/i).length).toBeGreaterThan(0);
  });

  it("renders testimonials section with 3 cards", () => {
    render(<Home />);

    // Check for testimonials
    const testimonialCards = screen.getAllByTestId("testimonial-card");
    expect(testimonialCards.length).toBe(3);

    // Verify testimonial content
    expect(
      screen.getByText(/helped us understand community sentiment/i)
    ).toBeInTheDocument();
  });

  it("renders mid-page CTA section", () => {
    render(<Home />);

    // Check for mid-page CTA heading
    expect(
      screen.getByText(/Start understanding your community today/i)
    ).toBeInTheDocument();

    // Check for CTA buttons
    const ctaButtons = screen.getAllByText(/Try for free/i);
    expect(ctaButtons.length).toBeGreaterThan(0);
  });
});
