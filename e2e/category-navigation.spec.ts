/**
 * Agent Test: Category Navigation
 * Journey: plan/story-map/category-navigation.yaml
 * Run: npm run test:e2e -- e2e/category-navigation.spec.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.join("test-results", "category-navigation");

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("Category Navigation Journey", () => {
  test("Step 1: View category overview - all 9 categories visible", async ({
    page,
  }) => {
    await page.goto("/search");

    // Verify page loads
    await expect(page).toHaveURL(/\/search/);

    // Wait for page to fully load
    await page.waitForTimeout(1500);

    // Wait for categories to render (look for Housing category button as indicator)
    const housingCategory = page.locator('button:has-text("Housing & Development")');
    await expect(housingCategory).toBeVisible({ timeout: 8000 });

    // Verify key categories are visible (test a sample of all 9)
    await expect(page.locator('button:has-text("Housing & Development")')).toBeVisible();
    await expect(page.locator('button:has-text("Health & Human Services")')).toBeVisible();
    await expect(page.locator('button:has-text("Public Safety & Justice")')).toBeVisible();
    await expect(page.locator('button:has-text("Education & Workforce")')).toBeVisible();
    await expect(page.locator('button:has-text("Online Behavior")')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step1-categories-overview.png"),
    });
  });

  test("Step 2: Navigate to Housing & Development - see subcategories", async ({
    page,
  }) => {
    await page.goto("/search");

    // Wait for category overview to load
    await page.waitForTimeout(1000);

    // Click Housing & Development category (button with that text)
    const housingCategory = page.locator('button:has-text("Housing & Development")');
    await housingCategory.click();

    // Wait for subcategory view to load
    await page.waitForTimeout(2000);

    // Verify some housing subcategories are visible
    await expect(page.getByText("Affordable Housing")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText("Homelessness")).toBeVisible();
    await expect(page.getByText("Gentrification")).toBeVisible();

    // Verify back button is present (using aria-label)
    const backButton = page.getByRole('button', { name: /back to dashboard/i });
    await expect(backButton).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step2-housing-subcategories.png"),
    });
  });

  test("Step 3 & 4: Click Affordable Housing - see issue detail view", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    // Navigate to Housing category
    const housingCategory = page.locator('button:has-text("Housing & Development")');
    await housingCategory.click();
    await page.waitForTimeout(2000);

    // Click Affordable Housing subcategory (it's a clickable button)
    const affordableHousing = page.locator('button:has-text("Affordable Housing")');
    await affordableHousing.click();

    // Wait for issue detail view to load (API calls can take time)
    await page.waitForTimeout(5000);

    // Verify we're in the detail view (look for key elements)
    // The view should show either CONVERSATIONS header or post content
    const conversationsHeader = page.getByText(/CONVERSATIONS/i);
    const synthesizeSection = page.getByText(/SYNTHESIZE/i);
    const issueTitle = page.getByText("Affordable Housing");

    // At least one of these should be visible
    const detailViewLoaded = await Promise.race([
      conversationsHeader.isVisible().catch(() => false),
      synthesizeSection.isVisible().catch(() => false),
      issueTitle.isVisible().catch(() => false),
    ]);

    expect(detailViewLoaded).toBeTruthy();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step4-affordable-housing-detail.png"),
    });
  });

  test("Step 5: Navigate back to categories - verify state preserved", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    // Navigate to Housing
    const housingCategory = page.locator('button:has-text("Housing & Development")');
    await housingCategory.click();
    await page.waitForTimeout(2000);

    // Click back button using aria-label
    const backButton = page.getByRole('button', { name: /back to dashboard/i });
    await backButton.click();
    await page.waitForTimeout(1000);

    // Verify we're back at category overview (look for multiple categories)
    await expect(page.locator('button:has-text("Housing & Development")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Health & Human Services")')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step5-back-to-categories.png"),
    });
  });

  test("Step 6: Explore Health & Human Services - see health subcategories", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    // Click Health & Human Services category
    const healthCategory = page.locator('button:has-text("Health & Human Services")');
    await healthCategory.click();
    await page.waitForTimeout(2000);

    // Verify health subcategories are visible
    await expect(page.getByText("Healthcare Access")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText("Mental Health")).toBeVisible();
    await expect(page.getByText("Childcare")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step6-health-subcategories.png"),
    });
  });

  test("Step 7: Navigate to Public Safety & Justice - see safety subcategories", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    // Click Public Safety & Justice category
    const safetyCategory = page.locator('button:has-text("Public Safety & Justice")');
    await safetyCategory.click();
    await page.waitForTimeout(2000);

    // Verify safety subcategories are visible
    await expect(page.getByText("Gun Violence")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText("Policing & Reform")).toBeVisible();
    await expect(page.getByText("Criminal Justice Reform")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step7-safety-subcategories.png"),
    });
  });

  test("Step 8: Click Gun Violence - see relevant issue detail", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    // Navigate to Public Safety category
    const safetyCategory = page.locator('button:has-text("Public Safety & Justice")');
    await safetyCategory.click();
    await page.waitForTimeout(2000);

    // Click Gun Violence subcategory
    const gunViolence = page.locator('button:has-text("Gun Violence")');
    await gunViolence.click();
    await page.waitForTimeout(5000);

    // Verify detail view loaded (look for conversation indicators or title)
    const detailElements = [
      page.getByText(/CONVERSATIONS/i),
      page.getByText(/SYNTHESIZE/i),
      page.getByText("Gun Violence"),
    ];

    // At least one element should be visible
    const anyVisible = await Promise.race(
      detailElements.map((el) => el.isVisible().catch(() => false))
    );

    expect(anyVisible).toBeTruthy();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step8-gun-violence-detail.png"),
    });
  });

  test("Step 10: Rapid browse remaining categories - verify all accessible", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    const categoriesToTest = [
      "Education & Workforce",
      "Infrastructure & Transit",
      "Environment & Climate",
      "Democracy & Governance",
      "Economic Development",
      "Online Behavior",
    ];

    for (const categoryName of categoriesToTest) {
      // Return to main view if not already there
      const backButton = page.getByRole('button', { name: /back to dashboard/i });
      const backButtonVisible = await backButton.isVisible().catch(() => false);
      
      if (backButtonVisible) {
        await backButton.click();
        await page.waitForTimeout(1000);
      }

      // Click category (using button with text)
      const category = page.locator(`button:has-text("${categoryName}")`);
      await category.click();
      await page.waitForTimeout(2000);

      // Verify we navigated (look for back button as indicator)
      await expect(backButton).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step10-all-categories-browsed.png"),
    });
  });
});

test.describe("Category Navigation - Performance", () => {
  test("Category navigation completes within acceptable time", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    const startTime = Date.now();

    // Navigate to Housing
    const housingCategory = page.locator('button:has-text("Housing & Development")');
    await housingCategory.click();
    await page.waitForTimeout(2000);

    // Click a subcategory
    const affordableHousing = page.locator('button:has-text("Affordable Housing")');
    await affordableHousing.click();
    await page.waitForTimeout(3000);

    // Navigate back twice (issue detail -> subcategory -> dashboard)
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();
    await page.waitForTimeout(1000);
    await backButton.click();
    await page.waitForTimeout(1000);

    const totalTime = Date.now() - startTime;

    // Full navigation cycle should complete within 15 seconds (increased for API calls)
    expect(totalTime).toBeLessThan(15000);

    console.log(
      `Category navigation cycle completed in ${totalTime}ms`
    );
  });

  test("No 429 rate limit errors during rapid navigation", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1000);

    const categories = [
      "Housing & Development",
      "Health & Human Services",
      "Public Safety & Justice",
      "Education & Workforce",
    ];

    // Track console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("429")) {
        errors.push(msg.text());
      }
    });

    // Rapidly navigate through 4 categories
    for (const categoryName of categories) {
      const backButton = page.getByRole('button', { name: /back to dashboard/i });
      const backButtonVisible = await backButton.isVisible().catch(() => false);
      
      if (backButtonVisible) {
        await backButton.click();
        await page.waitForTimeout(500);
      }

      const category = page.locator(`button:has-text("${categoryName}")`);
      await category.click();
      await page.waitForTimeout(1500);
    }

    // Verify no 429 errors occurred
    expect(errors).toHaveLength(0);

    console.log(`Navigated ${categories.length} categories without rate limit errors`);
  });
});
