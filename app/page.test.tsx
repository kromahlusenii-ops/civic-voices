import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Landing Page", () => {
  it("renders hero headline and typewriter text and primary CTA", () => {
    render(<Home />);

    // Check for hero headline
    expect(
      screen.getByText(/Track What Americans Think About/i)
    ).toBeInTheDocument();

    // Check for typewriter text (should show initial word "Opinions")
    const typewriterText = screen.getByTestId("typewriter-text");
    expect(typewriterText).toBeInTheDocument();
    expect(typewriterText).toHaveTextContent("Opinions");

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
      screen.getByText(/Cross-platform coverage shows the full picture/i)
    ).toBeInTheDocument();

    // Check for use case cards (should have at least 6)
    const useCaseCards = screen.getAllByTestId("use-case-card");
    expect(useCaseCards.length).toBeGreaterThanOrEqual(6);

    // Verify some specific use cases (text appears in multiple places, so check within use cases section)
    expect(screen.getByText(/See what they're saying/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Spot emerging narratives/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Understand the why/i)).toBeInTheDocument();
  });

  it("renders testimonials section with 3 cards", () => {
    render(<Home />);

    // Check for testimonials
    const testimonialCards = screen.getAllByTestId("testimonial-card");
    expect(testimonialCards.length).toBe(3);

    // Verify testimonial content
    expect(
      screen.getByText(/pattern recognition across platforms changed how we report/i)
    ).toBeInTheDocument();
  });

  it("renders mid-page CTA section", () => {
    render(<Home />);

    // Check for mid-page CTA heading
    expect(
      screen.getByText(/See what Americans are saying right now/i)
    ).toBeInTheDocument();

    // Check for CTA buttons
    const ctaButtons = screen.getAllByText(/Try for free/i);
    expect(ctaButtons.length).toBeGreaterThan(0);
  });
});
