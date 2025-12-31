import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("visiting / loads page without error", async ({ page }) => {
    // Visit the homepage
    const response = await page.goto("/");

    // Check that page loaded successfully
    expect(response?.status()).toBe(200);

    // Verify page title
    await expect(page).toHaveTitle(/Civic Voices/);

    // Verify hero section is visible (using first() since text appears in footer too)
    await expect(page.getByText(/Turn community insight chaos/i).first()).toBeVisible();
  });

  test("Try for free button is visible and clickable", async ({ page }) => {
    await page.goto("/");

    // Find the "Try for free" button in the hero section
    const heroCtaButton = page.getByTestId("hero-cta-signup");

    // Verify button is visible
    await expect(heroCtaButton).toBeVisible();

    // Verify button has correct text
    await expect(heroCtaButton).toHaveText(/Try for free/i);

    // Verify button is clickable (has href)
    await expect(heroCtaButton).toHaveAttribute("href", "/signup");

    // Click the button and verify navigation
    await heroCtaButton.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("all major sections are rendered", async ({ page }) => {
    await page.goto("/");

    // Hero Section (using first() since text appears in footer too)
    await expect(page.getByText(/Turn community insight chaos/i).first()).toBeVisible();

    // Trust & Credibility
    await expect(
      page.getByText(/Used by founders, marketers, and civic leaders from/i)
    ).toBeVisible();

    // Use Cases
    await expect(
      page.getByText(/Build insights that resonate with your community/i)
    ).toBeVisible();

    // Features
    await expect(
      page.getByText(/Market Insights & Needs Detection/i)
    ).toBeVisible();

    // How It Works
    await expect(page.getByText(/How It Works/i)).toBeVisible();

    // Testimonials
    await expect(page.getByText(/People say/i)).toBeVisible();

    // Pricing
    await expect(page.getByText(/Simple, transparent pricing/i)).toBeVisible();

    // Final CTA
    await expect(
      page.getByText(/Ready to understand your community better\?/i)
    ).toBeVisible();

    // Footer
    await expect(
      page.getByText(/© 2025 Civic Voices. All rights reserved./i)
    ).toBeVisible();
  });

  test("use case cards are rendered", async ({ page }) => {
    await page.goto("/");

    // Verify at least 3 use case cards exist
    const useCaseCards = page.getByTestId("use-case-card");
    await expect(useCaseCards).toHaveCount(3);

    // Verify specific use cases (using first() since text may appear elsewhere)
    await expect(page.getByText(/Startup Founders/i).first()).toBeVisible();
    await expect(page.getByText(/Marketers/i).first()).toBeVisible();
    await expect(page.getByText(/Civic Leaders/i).first()).toBeVisible();
  });

  test("final CTA section is interactive", async ({ page }) => {
    await page.goto("/");

    const finalCtaButton = page.getByTestId("final-cta-signup");

    await expect(finalCtaButton).toBeVisible();
    await expect(finalCtaButton).toHaveText(/Try for free/i);

    await finalCtaButton.click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
