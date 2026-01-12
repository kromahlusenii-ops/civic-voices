import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Home from "./page";

describe("Landing Page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders hero section with headline and rotating signal words", async () => {
    render(<Home />);

    // Check for hero headline parts
    expect(screen.getByText(/Track the/i)).toBeInTheDocument();
    expect(screen.getByText(/that shape America/i)).toBeInTheDocument();

    // Check for initial rotating signal word "Opinions"
    expect(screen.getByText("Opinions")).toBeInTheDocument();

    // Check for primary CTA
    expect(screen.getByRole("link", { name: /Try it free/i })).toBeInTheDocument();
  });

  it("renders navigation with logo, login, and sign up", () => {
    render(<Home />);

    // Check for logo text (appears in nav and footer, so check for multiple)
    expect(screen.getAllByText("Civic Voices").length).toBeGreaterThanOrEqual(1);

    // Check for nav buttons
    expect(screen.getByRole("link", { name: /Log in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start Free/i })).toBeInTheDocument();
  });

  it("renders trust indicator", async () => {
    render(<Home />);

    // Advance timers to let IntersectionObserver callback fire
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Check for trust indicator
    expect(screen.getByText(/researchers trust us/i)).toBeInTheDocument();
  });

  it("renders How It Works section with 3 steps", () => {
    render(<Home />);

    // Check for section heading
    expect(screen.getByText(/From question to insight in/i)).toBeInTheDocument();

    // Check for the 3 steps
    expect(screen.getByText("Ask anything")).toBeInTheDocument();
    expect(screen.getByText("We scan everything")).toBeInTheDocument();
    expect(screen.getByText("Get actionable insights")).toBeInTheDocument();
  });

  it("renders use cases section with personas", () => {
    render(<Home />);

    // Check for section heading
    expect(screen.getByText(/Built for those who need to/i)).toBeInTheDocument();

    // Check for persona roles
    expect(screen.getByText("Journalists")).toBeInTheDocument();
    expect(screen.getByText("Researchers")).toBeInTheDocument();
    expect(screen.getByText("Marketing Teams")).toBeInTheDocument();
    expect(screen.getByText("Policy Teams")).toBeInTheDocument();
  });

  it("renders testimonial with quote and author", () => {
    render(<Home />);

    // Check for testimonial content
    expect(
      screen.getByText(/changed how we report/i)
    ).toBeInTheDocument();

    // Check for author
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText(/Investigative Reporter/i)).toBeInTheDocument();
  });

  it("renders sample insights section", () => {
    render(<Home />);

    // Check for section heading
    expect(screen.getByText(/Insights you can't get anywhere else/i)).toBeInTheDocument();

    // Check for some insight cards (partial text match)
    expect(screen.getByText(/Housing affordability concerns/i)).toBeInTheDocument();
    expect(screen.getByText(/EV skepticism grew/i)).toBeInTheDocument();
    expect(screen.getByText(/Gen Z shifted/i)).toBeInTheDocument();
  });

  it("renders final CTA section", () => {
    render(<Home />);

    // Check for final CTA heading
    expect(
      screen.getByText(/Start understanding what America/i)
    ).toBeInTheDocument();

    // Check for CTA buttons
    expect(screen.getByRole("link", { name: /Try Civic Voices free/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Schedule a demo/i })).toBeInTheDocument();
  });

  it("renders footer with logo and links", () => {
    render(<Home />);

    // Check for footer links sections
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Legal")).toBeInTheDocument();

    // Check for copyright
    expect(screen.getByText(/© 2025 Civic Voices/i)).toBeInTheDocument();
  });
});
