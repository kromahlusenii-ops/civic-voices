import { test, expect } from "@playwright/test";

test.describe("Search Page", () => {
  test("unauthenticated users can view search page", async ({
    page,
  }) => {
    // Verify that /search is accessible without authentication
    await page.goto("/search");

    // Should stay on /search page (not redirect)
    await expect(page).toHaveURL("/search");

    // Verify search interface is visible
    await expect(page.getByTestId("search-input")).toBeVisible();
    await expect(page.getByTestId("start-research-btn")).toBeVisible();
  });

  test("search page greeting is visible to unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/search");

    // Verify greeting
    const greeting = page.getByTestId("dashboard-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).toHaveText("Discover what people buzz about");
  });

  test("filter chips are visible on search page", async ({ page }) => {
    await page.goto("/search");

    // Verify filter chips are visible
    await expect(page.getByTestId("source-filter-chip")).toBeVisible();
    await expect(page.getByTestId("time-filter-chip")).toBeVisible();
    await expect(page.getByTestId("location-filter-chip")).toBeVisible();
  });

  test("X and TikTok sources are enabled by default", async ({ page }) => {
    await page.goto("/search");

    // Open source dropdown
    const sourceChip = page.getByTestId("source-filter-chip");
    await sourceChip.click();

    // Verify X is enabled (not disabled, no "Coming soon")
    const xOption = page.getByTestId("source-option-x");
    await expect(xOption).toBeVisible();
    await expect(xOption).not.toBeDisabled();

    // Verify TikTok is enabled
    const tiktokOption = page.getByTestId("source-option-tiktok");
    await expect(tiktokOption).toBeVisible();
    await expect(tiktokOption).not.toBeDisabled();

    // Verify Reddit is disabled with "Coming soon"
    const redditOption = page.getByTestId("source-option-reddit");
    await expect(redditOption).toBeVisible();
    await expect(redditOption).toBeDisabled();
    await expect(redditOption).toContainText("Coming soon");
  });
});
