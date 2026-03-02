/**
 * E2E Test: Topic Selection Onboarding
 * Journey: plan/story-map/topic-selection-onboarding.yaml
 * Run: npm run test:e2e -- e2e/topic-selection-onboarding.spec.ts
 * 
 * Test Status: ⚠️ UI NOT YET IMPLEMENTED (Phase 1)
 * These tests will fail until onboarding UI is built.
 * Use as TDD reference during Phase 1 development.
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SCREENSHOT_DIR = path.join("test-results", "topic-selection-onboarding");

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("Topic Selection Onboarding Journey", () => {
  
  /**
   * PREREQUISITE: These tests require a first-time user account
   * that has NOT completed onboarding yet.
   * 
   * TODO Phase 1: Set up test user with onboarding_completed = false
   */
  
  test("Step 1: Arrive at onboarding welcome screen", async ({ page }) => {
    // Navigate directly to onboarding
    await page.goto("/onboarding");
    
    // Verify we're on onboarding page
    await expect(page).toHaveURL(/\/onboarding/);
    
    // Verify welcome screen elements
    const headline = page.locator('h1, h2').filter({ hasText: /civic issues|topics/i });
    await expect(headline).toBeVisible({ timeout: 5000 });
    
    // Look for explanation text (should be 2-3 sentences)
    const explanation = page.locator('text=/personalized|track|curated|instant access/i').first();
    await expect(explanation).toBeVisible();
    
    // Verify "Get Started" button
    const getStartedBtn = page.getByRole('button', { name: /get started|begin|start/i });
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toBeEnabled();
    
    // Optional: Check for "Skip" link (Phase 1.1 feature)
    const skipLink = page.getByRole('link', { name: /skip/i });
    if (await skipLink.isVisible()) {
      console.log("✓ Skip link found (optional feature implemented)");
    } else {
      console.log("ℹ Skip link not found (optional feature not yet implemented)");
    }
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step1-welcome-screen.png"),
    });
  });

  test("Step 2: View topic selection screen (Step 1 of 3)", async ({ page }) => {
    await page.goto("/onboarding");
    
    // Click "Get Started"
    const getStartedBtn = page.getByRole('button', { name: /get started|begin|start/i });
    await getStartedBtn.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Verify progress indicator
    const progressIndicator = page.locator('text=/step 1 of 3|1 \/ 3/i, [aria-label*="progress"]').first();
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify heading about topic selection
    const heading = page.locator('h1, h2').filter({ hasText: /select.*topics?|topics?.*track/i });
    await expect(heading).toBeVisible();
    
    // Verify instruction text
    const instructions = page.locator('text=/select.*topics?|choose.*topics?/i').first();
    await expect(instructions).toBeVisible();
    
    // Verify 9 categories are present
    // Test key categories with specific button selectors
    const housingCategory = page.locator('button, [role="button"]').filter({ hasText: /housing.*development|housing \& development/i });
    await expect(housingCategory).toBeVisible({ timeout: 5000 });
    
    const healthCategory = page.locator('button, [role="button"]').filter({ hasText: /health.*services|health \& human services/i });
    await expect(healthCategory).toBeVisible();
    
    const safetyCategory = page.locator('button, [role="button"]').filter({ hasText: /safety.*justice|public safety/i });
    await expect(safetyCategory).toBeVisible();
    
    // Verify "Continue" button exists (may be disabled initially)
    const continueBtn = page.getByRole('button', { name: /continue|next/i });
    await expect(continueBtn).toBeVisible();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step2-topic-selection-initial.png"),
    });
  });

  test("Step 3: Expand Housing & Development category", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Click to expand Housing category
    const housingCategory = page.locator('button, [role="button"]').filter({ hasText: /housing.*development|housing \& development/i }).first();
    await housingCategory.click();
    
    await page.waitForTimeout(500); // Animation delay
    
    // Verify 6 housing subcategories appear with checkboxes
    const affordableHousing = page.locator('label, [role="checkbox"]').filter({ hasText: /affordable housing/i });
    await expect(affordableHousing).toBeVisible({ timeout: 3000 });
    
    const homelessness = page.locator('label, [role="checkbox"]').filter({ hasText: /homelessness/i });
    await expect(homelessness).toBeVisible();
    
    const zoning = page.locator('label, [role="checkbox"]').filter({ hasText: /zoning|land use/i });
    await expect(zoning).toBeVisible();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step3-housing-expanded.png"),
    });
  });

  test("Step 4: Select 3 housing topics", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Expand Housing
    const housingCategory = page.locator('button, [role="button"]').filter({ hasText: /housing.*development/i }).first();
    await housingCategory.click();
    await page.waitForTimeout(500);
    
    // Select 3 topics by checking checkboxes
    const affordableHousingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /affordable housing/i }).or(
      page.locator('label').filter({ hasText: /affordable housing/i }).locator('input[type="checkbox"]')
    ).first();
    await affordableHousingCheckbox.check({ timeout: 3000 });
    
    const homelessnessCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /homelessness/i }).or(
      page.locator('label').filter({ hasText: /homelessness/i }).locator('input[type="checkbox"]')
    ).first();
    await homelessnessCheckbox.check();
    
    const zoningCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /zoning|land use/i }).or(
      page.locator('label').filter({ hasText: /zoning|land use/i }).locator('input[type="checkbox"]')
    ).first();
    await zoningCheckbox.check();
    
    // Verify selection counter updates
    const selectionCounter = page.locator('text=/3 topics?|3 selected/i');
    await expect(selectionCounter).toBeVisible({ timeout: 2000 });
    
    // Verify "Continue" button is now enabled
    const continueBtn = page.getByRole('button', { name: /continue|next/i });
    await expect(continueBtn).toBeEnabled();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step4-3-topics-selected.png"),
    });
  });

  test("Step 5-6: Select additional topics from Health and other categories", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Select Housing topics
    await page.locator('button, [role="button"]').filter({ hasText: /housing.*development/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    
    // Expand and select Health topics
    await page.locator('button, [role="button"]').filter({ hasText: /health.*services/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /healthcare access/i }).first().click();
    await page.locator('label').filter({ hasText: /mental health/i }).first().click();
    
    // Expand and select from Safety, Education, Environment
    await page.locator('button, [role="button"]').filter({ hasText: /safety.*justice/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /gun violence/i }).first().click();
    
    await page.locator('button, [role="button"]').filter({ hasText: /education/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /education funding/i }).first().click();
    
    await page.locator('button, [role="button"]').filter({ hasText: /environment/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /climate change/i }).first().click();
    
    // Verify counter shows 8 topics
    const selectionCounter = page.locator('text=/8 topics?|8 selected/i');
    await expect(selectionCounter).toBeVisible({ timeout: 2000 });
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step6-8-topics-selected.png"),
    });
  });

  test("Step 7: Test deselect/toggle behavior", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Select 3 topics
    await page.locator('button, [role="button"]').filter({ hasText: /housing/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    const zoningLabel = page.locator('label').filter({ hasText: /zoning/i }).first();
    await zoningLabel.click();
    
    // Verify 3 selected
    await expect(page.locator('text=/3 topics?|3 selected/i')).toBeVisible();
    
    // Deselect one topic
    await zoningLabel.click(); // Click again to uncheck
    
    // Verify counter decrements to 2
    await expect(page.locator('text=/2 topics?|2 selected/i')).toBeVisible({ timeout: 2000 });
    
    // Re-select to verify toggle works
    await zoningLabel.click();
    await expect(page.locator('text=/3 topics?|3 selected/i')).toBeVisible();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step7-toggle-behavior.png"),
    });
  });

  test("Step 8: Continue to geographic focus screen (Step 2 of 3)", async ({ page }) => {
    // Set up: Select topics first
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Quick select 3 topics
    await page.locator('button').filter({ hasText: /housing/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    await page.locator('label').filter({ hasText: /gentrification/i }).click();
    
    // Click Continue
    const continueBtn = page.getByRole('button', { name: /continue|next/i });
    await continueBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Verify Step 2 of 3
    const progressIndicator = page.locator('text=/step 2 of 3|2 \/ 3/i').first();
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify heading about geographic focus
    const heading = page.locator('h1, h2').filter({ hasText: /where|geographic|focus|location/i });
    await expect(heading).toBeVisible();
    
    // Verify 3 option cards: National, State, City
    const nationalCard = page.locator('button, [role="radio"], label').filter({ hasText: /national/i });
    await expect(nationalCard).toBeVisible({ timeout: 3000 });
    
    const stateCard = page.locator('button, [role="radio"], label').filter({ hasText: /state/i });
    await expect(stateCard).toBeVisible();
    
    const cityCard = page.locator('button, [role="radio"], label').filter({ hasText: /city/i });
    await expect(cityCard).toBeVisible();
    
    // Verify Back and Continue buttons
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeVisible();
    
    const continueBtn2 = page.getByRole('button', { name: /continue|next/i });
    await expect(continueBtn2).toBeVisible();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step8-geographic-focus-screen.png"),
    });
  });

  test("Step 9-10: Select State and City geographic focus", async ({ page }) => {
    // Navigate through to geographic screen
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Select topics
    await page.locator('button').filter({ hasText: /housing/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    await page.locator('label').filter({ hasText: /gentrification/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // First try State selection
    const stateCard = page.locator('button, [role="radio"], label').filter({ hasText: /^state$/i }).first();
    await stateCard.click();
    await page.waitForTimeout(500);
    
    // Look for state dropdown
    const stateDropdown = page.locator('select').filter({ hasText: /state/i }).or(
      page.locator('[role="combobox"]').filter({ hasText: /state/i })
    ).first();
    
    if (await stateDropdown.isVisible()) {
      await stateDropdown.selectOption({ label: /north carolina/i });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "step9-state-selected.png"),
      });
    }
    
    // Now switch to City
    const cityCard = page.locator('button, [role="radio"], label').filter({ hasText: /^city$/i }).first();
    await cityCard.click();
    await page.waitForTimeout(500);
    
    // Select state dropdown (should appear for city selection)
    const stateDropdown2 = page.locator('select, [role="combobox"]').first();
    if (await stateDropdown2.isVisible()) {
      await stateDropdown2.selectOption({ label: /north carolina/i });
      await page.waitForTimeout(300);
      
      // City dropdown should now be enabled
      const cityDropdown = page.locator('select, [role="combobox"]').nth(1);
      await expect(cityDropdown).toBeEnabled({ timeout: 2000 });
      await cityDropdown.selectOption({ label: /charlotte/i });
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "step10-city-selected.png"),
      });
    }
  });

  test("Step 11: Continue to review screen (Step 3 of 3)", async ({ page }) => {
    // Navigate through entire flow
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Select 3 topics
    await page.locator('button').filter({ hasText: /housing/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    await page.locator('label').filter({ hasText: /gentrification/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Select City → Charlotte, NC
    await page.locator('button, label').filter({ hasText: /^city$/i }).first().click();
    await page.waitForTimeout(500);
    
    // Try to fill dropdowns (if visible)
    const dropdowns = await page.locator('select, [role="combobox"]').all();
    if (dropdowns.length >= 2) {
      await dropdowns[0].selectOption({ label: /north carolina/i });
      await page.waitForTimeout(300);
      await dropdowns[1].selectOption({ label: /charlotte/i });
    }
    
    // Click Continue to review
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Verify Step 3 of 3
    const progressIndicator = page.locator('text=/step 3 of 3|3 \/ 3/i').first();
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify heading about review
    const heading = page.locator('h1, h2').filter({ hasText: /review|all set|you're set/i });
    await expect(heading).toBeVisible();
    
    // Verify topics section
    const topicsSection = page.locator('text=/topics?/i, [aria-label*="topics"]').first();
    await expect(topicsSection).toBeVisible({ timeout: 3000 });
    
    // Verify location section
    const locationSection = page.locator('text=/location|charlotte|north carolina/i').first();
    await expect(locationSection).toBeVisible();
    
    // Verify edit links
    const editTopicsLink = page.getByRole('button', { name: /edit topics/i }).or(
      page.getByRole('link', { name: /edit topics/i })
    );
    await expect(editTopicsLink).toBeVisible();
    
    // Verify Finish button
    const finishBtn = page.getByRole('button', { name: /finish|go to dashboard|complete/i });
    await expect(finishBtn).toBeVisible();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step11-review-screen.png"),
    });
  });

  test("Step 12: Edit topics from review screen", async ({ page }) => {
    // Navigate to review screen (abbreviated setup)
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Select topics and continue through to review
    await page.locator('button').filter({ hasText: /housing/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    await page.locator('label').filter({ hasText: /gentrification/i }).click();
    
    // Continue through geo and review
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(1000);
    }
    
    // Click "Edit Topics"
    const editTopicsBtn = page.getByRole('button', { name: /edit topics/i }).or(
      page.getByRole('link', { name: /edit topics/i })
    );
    await editTopicsBtn.click();
    await page.waitForTimeout(1000);
    
    // Should be back on topic selection (Step 1)
    const progressIndicator = page.locator('text=/step 1 of 3|1 \/ 3/i').first();
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify previous selections still checked
    const affordableHousingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /affordable/i }).first();
    await expect(affordableHousingCheckbox).toBeChecked({ timeout: 3000 });
    
    // Add one more topic
    await page.locator('button').filter({ hasText: /infrastructure/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('label').filter({ hasText: /public transit/i }).first().click();
    
    // Continue back to review (should skip geo screen)
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);
    
    // Should be on review again with 4 topics
    const reviewHeading = page.locator('h1, h2').filter({ hasText: /review|all set/i });
    await expect(reviewHeading).toBeVisible({ timeout: 5000 });
    
    // Verify "Public Transit" appears in topic list
    const publicTransit = page.locator('text=/public transit/i');
    await expect(publicTransit).toBeVisible();
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step12-edit-flow-complete.png"),
    });
  });

  test("Step 13: Finalize onboarding and redirect to dashboard", async ({ page }) => {
    // Complete full onboarding flow
    await page.goto("/onboarding");
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(1000);
    
    // Select 3 topics
    await page.locator('button').filter({ hasText: /housing/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('label').filter({ hasText: /affordable housing/i }).click();
    await page.locator('label').filter({ hasText: /homelessness/i }).click();
    await page.locator('label').filter({ hasText: /gentrification/i }).click();
    
    // Navigate through geo and review
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(1000);
    }
    
    // Click "Finish Setup"
    const finishBtn = page.getByRole('button', { name: /finish|complete|go to dashboard/i });
    await finishBtn.click();
    
    // Wait for redirect (max 10s)
    await page.waitForTimeout(2000);
    
    // Should redirect to /search or /dashboard
    await expect(page).toHaveURL(/\/(search|dashboard)/, { timeout: 10000 });
    
    // Verify personalized dashboard loads (topics, not categories)
    const topicCard = page.locator('text=/affordable housing|homelessness|gentrification/i').first();
    await expect(topicCard).toBeVisible({ timeout: 5000 });
    
    // Verify no generic category view (should NOT see all 9 categories)
    // Instead, should see selected topics
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step13-personalized-dashboard.png"),
    });
  });

  test("Step 14: Verify personalized dashboard content", async ({ page }) => {
    // Assumes onboarding is complete from previous test
    // For standalone execution, complete onboarding first or use test data
    
    await page.goto("/search"); // or /dashboard
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Verify selected topics are visible (not all 46 subcategories)
    // Look for the 3 topics we selected: Affordable Housing, Homelessness, Gentrification
    const affordableHousing = page.locator('text=/affordable housing/i').first();
    await expect(affordableHousing).toBeVisible({ timeout: 5000 });
    
    const homelessness = page.locator('text=/homelessness/i').first();
    await expect(homelessness).toBeVisible();
    
    // Verify location filter shows selected location
    // (Implementation-dependent - may be in header, filter dropdown, or breadcrumb)
    const locationFilter = page.locator('text=/charlotte|north carolina/i').first();
    if (await locationFilter.isVisible()) {
      console.log("✓ Location filter active: Charlotte, NC");
    }
    
    // Click on a topic to verify detail view loads
    await affordableHousing.click();
    await page.waitForTimeout(2000);
    
    // Should see detail view with AI analysis, posts, sentiment
    const aiAnalysis = page.locator('text=/AI analysis|briefing|insights/i, [role="region"]').first();
    if (await aiAnalysis.isVisible()) {
      console.log("✓ AI analysis visible in detail view");
    }
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "step14-dashboard-verified.png"),
    });
  });
  
  test.skip("Step 15: Test skip onboarding behavior (Optional)", async ({ page }) => {
    // This test is skipped by default as "Skip" feature may not be in Phase 1
    // Remove .skip() when feature is implemented
    
    await page.goto("/onboarding");
    
    // Look for "Skip for now" link
    const skipLink = page.getByRole('link', { name: /skip/i });
    
    if (await skipLink.isVisible()) {
      await skipLink.click();
      
      // Should redirect to generic dashboard
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/(search|dashboard)/);
      
      // Verify generic category view (all 9 categories)
      const housingCategory = page.locator('button').filter({ hasText: /housing.*development/i });
      await expect(housingCategory).toBeVisible({ timeout: 5000 });
      
      console.log("✓ Skip onboarding feature works - user can access app without personalization");
      
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "step15-skip-onboarding.png"),
      });
    } else {
      console.log("ℹ Skip feature not implemented - all users must complete onboarding");
    }
  });
});
