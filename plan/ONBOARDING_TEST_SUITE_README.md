# Topic Selection Onboarding - Test Suite

**Feature:** Topic Selection Onboarding Flow (Phase 1)  
**Created:** February 15, 2026  
**Status:** Test-Ready (UI not yet built)

---

## Overview

This test suite validates the **Topic Selection Onboarding** user journey - a 3-screen flow that allows new users to personalize their Civic Voices experience by selecting civic topics to track and choosing a geographic focus.

**Purpose:**
- Ensure smooth onboarding UX for first-time users
- Validate topic selection and state management
- Verify geographic filtering integration
- Confirm personalized dashboard loads correctly
- Test edit flows and data persistence

---

## Test Artifacts

### 1. User Journey Specification (YAML)
**File:** `plan/story-map/topic-selection-onboarding.yaml`

Defines the complete user journey with:
- **Persona:** Dr. Sarah Chen (Policy Research Director, Expert user, Patience: 8/10)
- **15 steps** covering onboarding flow from welcome screen to personalized dashboard
- **Validation criteria** for each step
- **Expected duration:** 2-3 minutes

### 2. Human Test Script
**File:** `plan/topic-selection-onboarding-human-test.md`

Manual testing script for human testers using **think-aloud protocol**:
- Screen recording instructions
- Step-by-step actions with "think aloud" prompts
- Success criteria checkpoints
- Post-test questionnaire (satisfaction, clarity, usability ratings)
- Difficulty assessment for each step

**Target Audience:** QA testers, UX researchers, product team

### 3. AI Agent Test Script
**File:** `plan/topic-selection-onboarding-agent-test.md`

Automated browser testing script for AI agents:
- Executable browser automation instructions
- Human-like narration for each step
- Visual validation using real UI discovery
- Performance metrics tracking
- Automatic screenshot capture on checkpoints
- Retry logic with exponential backoff

**Target Audience:** Automation engineers, AI test agents, CI/CD pipelines

### 4. Playwright E2E Tests ✅
**File:** `e2e/topic-selection-onboarding.spec.ts`

Executable Playwright test suite (ready for Phase 1):
- 15 automated test cases covering full onboarding flow
- Matches user journey specification exactly
- Screenshot capture at all checkpoints
- Ready to run (will fail until UI is built)
- TDD reference for Phase 1 development

**Target Audience:** QA engineers, CI/CD pipelines, developers

---

## User Journey Flow

```
1. Welcome Screen
   "What civic issues matter most to you?"
   [Get Started] → 

2. Topic Selection (Step 1 of 3)
   9 expandable categories × 46 total subcategories
   Select 3-10 topics to track
   [Continue] → 

3. Geographic Focus (Step 2 of 3)
   Choose: National | State | City
   Cascading dropdowns for state/city
   [Continue] → 

4. Review (Step 3 of 3)
   Display selected topics + location
   Edit links to go back
   [Finish Setup] → 

5. Personalized Dashboard
   Shows ONLY selected topics (not all 46)
   Location filter active
   Data pre-cached via Phase 0
```

---

## Key Features Tested

### Core Functionality
- [x] Topic selection with checkboxes across 9 categories
- [x] Real-time selection counter
- [x] Category expand/collapse (accordion)
- [x] Geographic scope selection (National, State, City)
- [x] Cascading dropdowns (state enables city)
- [x] Review screen with edit flows
- [x] State persistence when navigating back
- [x] Data submission to PostgreSQL (user_topics table)
- [x] Redirect to personalized dashboard
- [x] Dashboard displays only selected topics

### State Management
- [x] Topic selections persist across category expand/collapse
- [x] Selections preserved when using "Edit Topics" from review
- [x] Geographic selection preserved when returning to review
- [x] Onboarding state saved to database (onboarding_completed flag)

### Performance & Reliability
- [x] Fast dashboard load (< 2s) using Phase 0 Redis cache
- [x] No rate limit errors (429) during onboarding
- [x] Smooth animations and transitions
- [x] Responsive UI with no lag or freezing

### Edge Cases
- [x] Deselect/re-select topics (toggle behavior)
- [x] Change geographic scope (National → State → City)
- [x] Edit flow: add/remove topics from review screen
- [x] Skip onboarding (optional, if implemented)

---

## Test Data Points

### Topics (Total: 46 subcategories across 9 categories)

Test script selects **9 topics**:
1. **Housing:** Affordable Housing, Homelessness
2. **Health:** Healthcare Access, Mental Health
3. **Safety:** Gun Violence
4. **Education:** Education Funding
5. **Environment:** Climate Change
6. **Infrastructure:** Public Transit
7. *(1 additional topic selected during edit flow)*

### Geographic Selections

Test scenarios:
- **State-level:** North Carolina
- **City-level:** Charlotte, North Carolina (final selection)

### Expected Dashboard

After onboarding, dashboard should show:
- **9 topic cards** (not 46 subcategories)
- **Charlotte, NC** location filter active
- **Post counts and AI briefings** loaded within 1-2 seconds
- **No errors** in console or UI

---

## Running the Tests

### Human Test (Manual QA)

**Prerequisites:**
- Test account (first-time user, onboarding not completed)
- Screen recording software (QuickTime, OBS, Loom)
- Browser: Chrome/Firefox (desktop: 1440x900, mobile: 375x667)

**Steps:**
1. Read `plan/topic-selection-onboarding-human-test.md`
2. Start screen recording
3. Follow step-by-step instructions using think-aloud protocol
4. Capture screenshots at checkpoints
5. Complete post-test questionnaire
6. Submit test report to product team

**Duration:** 20-30 minutes (including questionnaire)

---

### AI Agent Test (Automated)

**Prerequisites:**
- Browser automation framework (Playwright, Puppeteer, Selenium)
- Phase 0 infrastructure deployed (Redis cache, circuit breakers)
- Staging environment with seeded taxonomy data
- Test account API or signup flow automation

**Steps:**
1. Configure agent with persona parameters (patience: 8/10, tech level: expert)
2. Execute `plan/topic-selection-onboarding-agent-test.md` script
3. Agent navigates real UI, captures screenshots, logs narration
4. Generate test report with pass/fail status for each step
5. Review screenshots and logs for any issues

**Duration:** 3-5 minutes (automated execution)

**Run Playwright E2E Tests:**
```bash
# Run all onboarding tests
npx playwright test e2e/topic-selection-onboarding.spec.ts

# Run specific test by name
npx playwright test e2e/topic-selection-onboarding.spec.ts -g "Step 1"

# Run with UI mode (watch tests execute)
npx playwright test e2e/topic-selection-onboarding.spec.ts --ui

# Generate HTML report
npx playwright test e2e/topic-selection-onboarding.spec.ts --reporter=html
npx playwright show-report
```

**Note:** Tests will fail until Phase 1 UI is implemented. Use as TDD reference.

---

## Success Criteria

### Pass Conditions

Onboarding test **PASSES** if:
- ✅ All 15 steps complete without critical errors
- ✅ User can select 3-10 topics from multiple categories
- ✅ Geographic selection works (all 3 modes: National, State, City)
- ✅ Review screen accurately displays all selections
- ✅ Edit flows preserve state correctly
- ✅ Data saves to database (user_topics JSONB)
- ✅ Dashboard shows personalized view (9 topics, not 46)
- ✅ Dashboard loads quickly (< 2s with Phase 0 cache)
- ✅ No console errors or rate limit warnings
- ✅ Total duration < 3 minutes (human test < 5 minutes)

### Fail Conditions

Onboarding test **FAILS** if:
- ❌ Cannot navigate between screens (Step 1 → 2 → 3 → Dashboard)
- ❌ Topic selections don't persist or get lost
- ❌ Geographic dropdowns don't populate or are broken
- ❌ Data doesn't save to database (onboarding reappears on refresh)
- ❌ Dashboard shows generic view instead of personalized topics
- ❌ Critical UI errors (white screen, infinite loading)
- ❌ Rate limit errors (429) occur during onboarding

---

## Known Limitations (Pre-Implementation)

**Current Status:** UI not yet built (Phase 1 feature)

When implementing Phase 1, ensure:
- [ ] **Database schema:** `user_topics` table with JSONB field for topic preferences
- [ ] **Onboarding flag:** `onboarding_completed` boolean in `users` table
- [ ] **Routing:** `/onboarding` route redirects first-time users automatically
- [ ] **UI components:** Category accordions, checkboxes, dropdowns, progress indicator
- [ ] **API integration:** Save preferences to PostgreSQL, fetch on dashboard load
- [ ] **Cache integration:** Use Phase 0 Redis cache to pre-load topic data
- [ ] **Skip option:** Optional "Skip for now" link (Phase 1.1 enhancement)

---

## Related Documentation

- **Feature Spec:** See previous `/plan` output for Topic Selection Onboarding (Phase 1)
- **Phase 0 Infrastructure:** `docs/PHASE_0_INFRASTRUCTURE.md` (Redis cache + circuit breakers)
- **Master Prompt:** `docs/MASTER_PROMPT.md` (product context, civic taxonomy)
- **Taxonomy Data:** `lib/data/taxonomy.ts` (9 categories, 46 subcategories)
- **Database Schema:** `prisma/schema.prisma` (user_topics table - to be added in Phase 1)

---

## Other Test Suites

This test suite complements existing test coverage:

1. **Category Navigation** (`plan/story-map/category-navigation.yaml`)
   - Tests browsing 9 policy categories and drilling into subcategories
   - Validates post counts, AI analysis, and back navigation

2. **Subcategory Detail Analysis** (`plan/story-map/subcategory-detail-analysis.yaml`)
   - Tests viewing social posts and AI briefings for a specific subcategory
   - Validates sentiment, conversation feed, and synthesize sections

3. **Search to Report** (`plan/story-map/search-to-report.yaml`)
   - Tests search functionality and report generation flow

4. **Topic Selection Onboarding** (this suite)
   - Tests first-time user onboarding and personalization

---

## Test Coverage Summary

| Feature Area | Human Test | AI Agent Test | E2E Playwright |
|--------------|------------|---------------|----------------|
| Welcome Screen | ✓ | ✓ | ✅ Ready |
| Topic Selection | ✓ | ✓ | ✅ Ready |
| Geographic Focus | ✓ | ✓ | ✅ Ready |
| Review & Edit | ✓ | ✓ | ✅ Ready |
| Dashboard Integration | ✓ | ✓ | ✅ Ready |
| State Persistence | ✓ | ✓ | ✅ Ready |
| Skip Flow | ✓ (optional) | ✓ (optional) | ✅ Ready (skipped) |

**Playwright E2E Tests:** ✅ **Created and ready!** All 15 tests written in `e2e/topic-selection-onboarding.spec.ts`. Tests will fail until UI is built (use as TDD reference).

---

## Questions?

**Product Team:** Review human test script for UX validation  
**Engineering Team:** Review AI agent test script for automation  
**QA Team:** Coordinate test execution during Phase 1 development

Contact: Development Team
