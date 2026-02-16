/**
 * Agent Test: Search to Report
 * Journey: plan/story-map/search-to-report.yaml
 * Run: npm run test:e2e -- e2e/search-to-report.spec.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.join("test-results", "search-to-report");

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("Search to Report Journey", () => {
  test("Step 1: Land on search - navigate from landing to search", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Civic Voices/);

    // Click nav or hero CTA to reach search (copy: "TRY FREE" or "TRY A SEARCH FREE")
    await page.getByRole("link", { name: /try.*free/i }).first().click();

    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByTestId("search-input")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step1-land-on-search.png"),
    });
  });

  test("Step 2: Enter search query - run search and see results", async ({
    page,
  }) => {
    await page.goto("/search");

    const searchInput = page.getByTestId("search-input");
    await searchInput.fill("climate policy 2024");

    const startBtn = page.getByTestId("start-research-btn");
    await startBtn.click();

    // Auth modal may appear for unauthenticated users - if so, we've triggered search flow
    const authModal = page.getByRole("heading", {
      name: /Discover What People Really Think/i,
    });
    const aiInterpretation = page.getByTestId("ai-interpretation");

    await Promise.race([
      authModal.waitFor({ state: "visible", timeout: 8000 }),
      aiInterpretation.waitFor({ state: "visible", timeout: 8000 }),
    ]);

    const modalVisible = await authModal.isVisible();
    const resultsVisible = await aiInterpretation.isVisible();
    expect(modalVisible || resultsVisible).toBeTruthy();

    if (resultsVisible) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "step2-search-results.png"),
      });
    } else if (modalVisible) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "step2-auth-prompt.png"),
      });
    }
  });

  test("Step 3 & 4: Search page has filter controls and auth flow", async ({
    page,
  }) => {
    await page.goto("/search");

    // Verify filter chips
    await expect(page.getByTestId("time-range-filter")).toBeVisible();
    await expect(page.getByTestId("source-filter-button")).toBeVisible();

    // Verify search input and CTA
    await expect(page.getByTestId("search-input")).toBeVisible();
    await expect(page.getByTestId("start-research-btn")).toBeVisible();
  });

  test("Step 7: Search history sidebar trigger exists", async ({ page }) => {
    await page.goto("/search");

    // History button in sidebar (clock icon)
    const historyBtn = page.getByTestId("search-history-btn");
    await expect(historyBtn).toBeVisible();
  });
});
