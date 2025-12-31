import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("visiting / loads page without error", async ({ page }) => {
    // Visit the homepage
    const response = await page.goto("/");

    // Check that page loaded successfully
    expect(response?.status()).toBe(200);

    // Verify page title
    await expect(page).toHaveTitle(/Civic Voices/);

    // Verify hero section is visible
    await expect(
      page.getByText(/Research Social Media Conversations for/i)
    ).toBeVisible();
  });

  test("typewriter text appears and animates", async ({ page }) => {
    await page.goto("/");

    // Find the typewriter text element
    const typewriterText = page.getByTestId("typewriter-text");

    // Verify it's visible
    await expect(typewriterText).toBeVisible();

    // Verify it shows the first word (Pains)
    await expect(typewriterText).toHaveText("Pains");

    // Wait for animation to change word (2.5s interval)
    // After 3 seconds, it should show the second word
    await page.waitForTimeout(3000);

    // Verify the text has changed (should be "Needs" now)
    await expect(typewriterText).toHaveText("Needs");
  });

  test("Try for free button is visible and clickable", async ({ page }) => {
    await page.goto("/");

    // Find the "Try for free" button in the hero section
    const heroCtaButton = page.getByTestId("hero-cta");

    // Verify button is visible
    await expect(heroCtaButton).toBeVisible();

    // Verify button has correct text
    await expect(heroCtaButton).toHaveText(/Try for free/i);

    // Verify button has href
    await expect(heroCtaButton).toHaveAttribute("href", "/signup");

    // Click the button and verify navigation
    await heroCtaButton.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("nav renders Log in and Try for free buttons", async ({ page }) => {
    await page.goto("/");

    // Check for nav login button
    const loginButton = page.getByTestId("nav-login");
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText(/Log in/i);

    // Check for nav signup button
    const signupButton = page.getByTestId("nav-signup");
    await expect(signupButton).toBeVisible();
    await expect(signupButton).toHaveText(/Try for free/i);
  });

  test("use cases section renders at least 6 cards", async ({ page }) => {
    await page.goto("/");

    // Verify use cases section exists
    const useCasesSection = page.getByTestId("use-cases-section");
    await expect(useCasesSection).toBeVisible();

    // Verify heading
    await expect(
      page.getByText(/Build narratives that resonate/i)
    ).toBeVisible();

    // Verify at least 6 use case cards exist
    const useCaseCards = page.getByTestId("use-case-card");
    await expect(useCaseCards).toHaveCount(8); // We have 8 cards

    // Verify specific use cases (using getByRole for headings to avoid matching hero text)
    await expect(page.getByRole('heading', { name: /Analyze conversations/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Synthetic audiences/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Market insights/i })).toBeVisible();
  });

  test("testimonials section renders 3 cards", async ({ page }) => {
    await page.goto("/");

    // Verify testimonials exist
    const testimonialCards = page.getByTestId("testimonial-card");
    await expect(testimonialCards).toHaveCount(3);

    // Verify testimonial content
    await expect(
      page.getByText(/helped us understand community sentiment/i)
    ).toBeVisible();
  });

  test("final CTA section is interactive", async ({ page }) => {
    await page.goto("/");

    // Check for final CTA button
    const finalCtaButton = page.getByTestId("final-cta");

    await expect(finalCtaButton).toBeVisible();
    await expect(finalCtaButton).toHaveText(/Try for free/i);

    // Click and verify navigation
    await finalCtaButton.click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
