import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Landing Page", () => {
  it("renders hero headline and primary CTA", () => {
    render(<Home />);

    // Check for hero headline (using getAllByText since it appears in footer too)
    const headlines = screen.getAllByText(/Turn community insight chaos/i);
    expect(headlines.length).toBeGreaterThan(0);
    expect(headlines[0]).toBeInTheDocument();

    const clarityText = screen.getAllByText(/into clarity/i);
    expect(clarityText.length).toBeGreaterThan(0);

    // Check for primary CTA
    const ctaButtons = screen.getAllByText(/Try for free/i);
    expect(ctaButtons.length).toBeGreaterThan(0);
    expect(ctaButtons[0]).toBeInTheDocument();
  });

  it("renders use cases section with 3+ cards", () => {
    render(<Home />);

    // Check for use cases section
    expect(screen.getByText(/Build insights that resonate with your community/i)).toBeInTheDocument();

    // Check for use case cards (should have at least 3)
    const useCaseCards = screen.getAllByTestId("use-case-card");
    expect(useCaseCards.length).toBeGreaterThanOrEqual(3);

    // Verify specific use cases (using getAllByText since terms may appear elsewhere)
    expect(screen.getAllByText(/Startup Founders/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Marketers/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Civic Leaders/i).length).toBeGreaterThan(0);
  });

  it("renders final CTA section", () => {
    render(<Home />);

    // Check for final CTA section
    expect(screen.getByText(/Ready to understand your community better\?/i)).toBeInTheDocument();

    // Check for CTA button in final section
    const finalCTA = screen.getByTestId("final-cta-signup");
    expect(finalCTA).toBeInTheDocument();
    expect(finalCTA).toHaveTextContent(/Try for free/i);

    // Check for supporting text
    expect(screen.getByText(/No credit card required\. See results in minutes\./i)).toBeInTheDocument();
  });

  it("renders all major sections", () => {
    render(<Home />);

    // Hero (using getAllByText since it appears in footer too)
    const headlines = screen.getAllByText(/Turn community insight chaos/i);
    expect(headlines.length).toBeGreaterThan(0);

    // Trust & Credibility
    expect(screen.getByText(/Used by founders, marketers, and civic leaders from/i)).toBeInTheDocument();

    // Use Cases
    expect(screen.getByText(/Build insights that resonate with your community/i)).toBeInTheDocument();

    // Features
    expect(screen.getByText(/Market Insights & Needs Detection/i)).toBeInTheDocument();

    // How It Works
    expect(screen.getByText(/How It Works/i)).toBeInTheDocument();

    // Testimonials
    expect(screen.getByText(/People say/i)).toBeInTheDocument();

    // Pricing
    expect(screen.getByText(/Simple, transparent pricing/i)).toBeInTheDocument();

    // Footer
    expect(screen.getByText(/© 2025 Civic Voices. All rights reserved./i)).toBeInTheDocument();
  });
});
