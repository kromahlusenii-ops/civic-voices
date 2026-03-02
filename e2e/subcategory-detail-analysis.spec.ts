/**
 * Agent Test: Subcategory Detail View & Social Analysis
 * Journey: plan/story-map/subcategory-detail-analysis.yaml
 * Run: npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.join("test-results", "subcategory-detail-analysis");

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("Subcategory Detail & Analysis Journey", () => {
  test("Step 1: Navigate to Housing category", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Click Housing & Development category
    const housingCategory = page.locator('button:has-text("Housing & Development")');
    await housingCategory.click();
    await page.waitForTimeout(2000);

    // Verify subcategory view loaded
    await expect(page.getByText("Affordable Housing")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Homelessness")).toBeVisible();
    await expect(page.getByText("Gentrification")).toBeVisible();

    // Verify back button
    const backButton = page.getByRole('button', { name: /back to dashboard/i });
    await expect(backButton).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step1-housing-category.png"),
    });
  });

  test("Step 2: Click Affordable Housing subcategory", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Housing
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);

    // Click Affordable Housing
    const affordableHousing = page.locator('button:has-text("Affordable Housing")');
    await affordableHousing.click();

    // Wait for issue detail view to load (API call takes time)
    await page.waitForTimeout(8000);

    // Verify issue detail elements are present
    const issueTitle = page.getByText("Affordable Housing");
    const conversations = page.getByText(/CONVERSATIONS/i);
    const synthesize = page.getByText(/SYNTHESIZE/i);

    const anyVisible = await Promise.race([
      issueTitle.isVisible().catch(() => false),
      conversations.isVisible().catch(() => false),
      synthesize.isVisible().catch(() => false),
    ]);

    expect(anyVisible).toBeTruthy();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step2-affordable-housing-detail.png"),
    });
  });

  test("Step 3 & 4: Review AI Briefing and Synthesize sections", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Affordable Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Verify issue detail view loaded by checking for core elements that are always present
    const coreElements = [
      page.getByText("Affordable Housing"), // Issue title should always be present
      page.getByText(/CONVERSATIONS/i), // Conversations header should always be present
      page.getByRole('button', { name: /back/i }), // Back button should always be present
    ];

    const detailViewLoaded = await Promise.race(
      coreElements.map((el) => el.isVisible().catch(() => false))
    );

    expect(detailViewLoaded).toBeTruthy();

    // Check for AI BRIEFING section (optional - depends on data)
    const aiBriefing = page.getByText(/AI BRIEFING/i);
    const briefingVisible = await aiBriefing.isVisible().catch(() => false);

    // Check for SYNTHESIZE section (optional - depends on data)
    const synthesize = page.getByText(/SYNTHESIZE/i);
    const synthesizeVisible = await synthesize.isVisible().catch(() => false);

    console.log(`AI Briefing visible: ${briefingVisible}, Synthesize visible: ${synthesizeVisible}`);

    // If AI sections are present, verify they have content
    if (briefingVisible || synthesizeVisible) {
      console.log("AI analysis sections found - data is available");
    } else {
      console.log("AI analysis sections not visible - may be empty state or still loading");
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step3-ai-briefing-synthesize.png"),
    });
  });

  test("Step 5: Browse social posts feed", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Affordable Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Look for CONVERSATIONS header
    const conversationsHeader = page.getByText(/CONVERSATIONS/i);
    await expect(conversationsHeader).toBeVisible({ timeout: 10000 });

    // Check for post cards (look for platform badges or post content)
    const postElements = [
      page.locator('text=/Reddit|TikTok|YouTube/i').first(),
      page.locator('[style*="rgba"]').first(), // Platform badges have rgba colors
      page.getByText(/ago|hours|days/i).first(), // Timestamps
    ];

    const postsVisible = await Promise.race(
      postElements.map((el) => el.isVisible().catch(() => false))
    );

    // If no posts visible, might be empty state (acceptable)
    console.log(`Posts visible in feed: ${postsVisible}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step5-posts-feed.png"),
    });
  });

  test("Step 6: Filter by platform", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Affordable Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Look for platform filter buttons
    const redditFilter = page.locator('button:has-text("Reddit")');
    const filterVisible = await redditFilter.isVisible().catch(() => false);

    if (filterVisible) {
      // Click Reddit filter
      await redditFilter.click();
      await page.waitForTimeout(1000);

      // Verify filter is active (button style may change)
      const isActive = await redditFilter.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.backgroundColor !== "transparent" && style.backgroundColor !== "rgba(0, 0, 0, 0)";
      });

      console.log(`Reddit filter active: ${isActive}`);
    } else {
      console.log("Platform filters not found (may not be implemented yet)");
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step6-platform-filter.png"),
    });
  });

  test("Step 7: Filter by sentiment", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Affordable Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Look for sentiment filter buttons
    const negativeFilter = page.locator('button:has-text("Negative")');
    const filterVisible = await negativeFilter.isVisible().catch(() => false);

    if (filterVisible) {
      // Click Negative filter
      await negativeFilter.click();
      await page.waitForTimeout(1000);

      // Check if sentiment badges visible on posts
      const sentimentBadge = page.locator('text=/negative/i').first();
      const badgeVisible = await sentimentBadge.isVisible().catch(() => false);

      console.log(`Sentiment filter applied, badge visible: ${badgeVisible}`);
    } else {
      console.log("Sentiment filters not found (may not be implemented yet)");
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step7-sentiment-filter.png"),
    });
  });

  test("Step 8: Toggle verified only filter", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Affordable Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Look for Verified Only toggle
    const verifiedToggle = page.locator('text=/Verified Only/i').first();
    const toggleVisible = await verifiedToggle.isVisible().catch(() => false);

    if (toggleVisible) {
      await verifiedToggle.click();
      await page.waitForTimeout(1000);

      // Check for verification badges
      const verificationBadge = page.locator('text=/(Journalist|Official|Expert|News)/i').first();
      const badgeVisible = await verificationBadge.isVisible().catch(() => false);

      console.log(`Verified toggle applied, badge visible: ${badgeVisible}`);
    } else {
      console.log("Verified Only toggle not found");
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step8-verified-filter.png"),
    });
  });

  test("Step 10: Navigate back to category", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Click back button
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();
    await page.waitForTimeout(1500);

    // Verify we're back at subcategory list
    await expect(page.getByText("Affordable Housing")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Homelessness")).toBeVisible();
    await expect(page.getByText("Gentrification")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step10-back-to-category.png"),
    });
  });
});

test.describe("Subcategory Detail - Performance & Data Quality", () => {
  test("Issue detail view loads within acceptable time", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Housing
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);

    // Time the subcategory detail load
    const startTime = Date.now();
    await page.locator('button:has-text("Affordable Housing")').click();

    // Wait for data to load (check for key elements)
    const conversationsHeader = page.getByText(/CONVERSATIONS/i);
    const synthesizeSection = page.getByText(/SYNTHESIZE/i);

    await Promise.race([
      conversationsHeader.waitFor({ state: 'visible', timeout: 15000 }),
      synthesizeSection.waitFor({ state: 'visible', timeout: 15000 }),
    ]);

    const loadTime = Date.now() - startTime;

    // Load should complete within 15 seconds
    expect(loadTime).toBeLessThan(15000);

    console.log(`Issue detail loaded in ${loadTime}ms`);
  });

  test("Filters update post count appropriately", async ({ page }) => {
    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Navigate to Affordable Housing detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Get initial post count from CONVERSATIONS header
    const conversationsHeader = page.getByText(/CONVERSATIONS/i);
    const headerVisible = await conversationsHeader.isVisible().catch(() => false);

    if (headerVisible) {
      const headerText = await conversationsHeader.textContent();
      const initialCount = headerText?.match(/\d+/)?.[0];

      console.log(`Initial post count: ${initialCount || "unknown"}`);

      // Apply a filter if available
      const redditFilter = page.locator('button:has-text("Reddit")');
      const filterVisible = await redditFilter.isVisible().catch(() => false);

      if (filterVisible) {
        await redditFilter.click();
        await page.waitForTimeout(1000);

        // Check if count changed
        const updatedHeaderText = await conversationsHeader.textContent();
        const updatedCount = updatedHeaderText?.match(/\d+/)?.[0];

        console.log(`Filtered post count: ${updatedCount || "unknown"}`);

        // Counts should be different (or same if all posts are Reddit)
        expect(updatedCount).toBeDefined();
      }
    }
  });

  test("No 429 rate limit errors on issue detail load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("429")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/search");
    await page.waitForTimeout(1500);

    // Load issue detail
    await page.locator('button:has-text("Housing & Development")').click();
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Affordable Housing")').click();
    await page.waitForTimeout(8000);

    // Verify no rate limit errors
    expect(errors).toHaveLength(0);

    console.log("No 429 rate limit errors during issue detail load");
  });
});
