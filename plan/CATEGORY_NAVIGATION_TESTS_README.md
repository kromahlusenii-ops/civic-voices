# Category Navigation Tests

## Overview

Comprehensive test suite for verifying category navigation functionality in Civic Voices. Tests user's ability to browse and explore the 9-category taxonomy (Housing, Health, Safety, Education, Infrastructure, Environment, Democracy, Economic Development, Online Behavior) and drill down into subcategories and issue details.

---

## Test Artifacts

### 1. User Journey Specification
**File**: `plan/story-map/category-navigation.yaml`

Defines the canonical user journey for category navigation:
- **10 steps** covering category overview → subcategory exploration → issue detail
- **Persona**: Maya Rodriguez (Civic Researcher, intermediate tech level, patience 7/10)
- **Validation criteria**: All 9 categories accessible, no rate limit errors, < 3 min browsing time

---

### 2. Human Test Script
**File**: `plan/category-navigation-human-test.md`

Manual test protocol for human testers with think-aloud methodology:
- **Pre-test setup**: Screen recording, cleared browser state
- **10 detailed steps** with action, intent, success criteria, and think-aloud prompts
- **Post-test questions**: Friction points, what worked well, real-world usage assessment
- **Success metrics**: 8 key indicators including navigation smoothness, data loading, and user confidence

**Use case**: Video-recorded user testing sessions, UX feedback collection

---

### 3. AI Agent Test Script
**File**: `plan/category-navigation-agent-test.md`

Executable test protocol for AI agents using browser automation:
- **Persona behavior**: Retry logic, patience threshold, exponential backoff
- **10 test steps** with validation criteria and checkpoint screenshots
- **Output format**: Structured markdown report with duration, difficulty, thoughts, and screenshots
- **Performance observations**: Load time tracking, API rate limit monitoring
- **Recommendations**: Based on discovered UX issues during testing

**Use case**: Automated browser testing with Playwright, regression testing, performance monitoring

---

### 4. Playwright E2E Test Suite
**File**: `e2e/category-navigation.spec.ts`

Automated end-to-end tests using Playwright:

**Test Coverage**:
- ✅ Step 1: Category overview loads with all 9 categories
- ✅ Step 2: Navigate to Housing & Development category
- ✅ Step 3-4: Click Affordable Housing subcategory
- ✅ Step 5: Navigate back preserves state
- ✅ Step 6: Explore Health & Human Services
- ✅ Step 7: Navigate to Public Safety & Justice
- ✅ Step 8: Click Gun Violence subcategory
- ✅ Step 10: Rapid browse all remaining categories
- ✅ Performance: Navigation completes within acceptable time
- ✅ Rate Limiting: No 429 errors during rapid navigation

**Run tests**:
```bash
# All category navigation tests
npm run test:e2e -- e2e/category-navigation.spec.ts

# Specific test
npm run test:e2e -- e2e/category-navigation.spec.ts -g "Step 1"

# With UI
npm run test:e2e:ui -- e2e/category-navigation.spec.ts

# Debug mode
npm run test:e2e -- e2e/category-navigation.spec.ts --debug
```

**Screenshots saved to**: `test-results/category-navigation/`

---

## Test Scenarios Covered

### Primary Navigation Flow
1. **Category Discovery**: User identifies all 9 policy categories on dashboard
2. **Category Selection**: Click Housing & Development to view subcategories
3. **Subcategory Exploration**: Review 6 housing subcategories with post counts
4. **Issue Deep Dive**: Click Affordable Housing to see detailed analysis
5. **Backward Navigation**: Return to category overview using back button
6. **Multi-Category Browse**: Navigate through Health, Safety categories
7. **Rapid Exploration**: Quickly browse remaining 6 categories

### Data Loading & Performance
- Post counts display (lazy loading optimization expected)
- API rate limiting (should not trigger 429 after optimizations)
- Category → Subcategory navigation speed (< 2s expected)
- Subcategory → Issue Detail navigation speed (< 3s expected)

### Edge Cases
- Empty subcategories (0 posts)
- Geographic filtering (if implemented)
- Back button state preservation
- Rapid navigation without rate limit errors

---

## Integration with Request Optimizations

These tests validate the improvements from `docs/REQUEST_OPTIMIZATION_IMPLEMENTED.md`:

**Lazy Loading (Step 3)**:
- ✅ Subcategories show 0 post counts initially (no API calls on category open)
- ✅ Post counts load when subcategory is clicked (on-demand fetching)
- ⚠️ User may see "0 posts" before clicking - expected behavior

**No 429 Errors (Step 10 + Performance test)**:
- ✅ Rapid browsing 6+ categories doesn't hit rate limit
- ✅ Category open = 0 API calls (was 6-10 before optimization)
- ✅ Total navigation time < 3 minutes (smooth browsing experience)

**Cache TTL (Background)**:
- ✅ Same subcategory not refetched within 4 hours
- ✅ Cache hit rate should be high for repeated visits

---

## Expected Results

### ✅ Pass Criteria
- All 9 categories visible and clickable
- Subcategory views load consistently for all categories
- Issue detail views show AI analysis, posts, sentiment
- Back navigation works without errors
- No 429 rate limit errors during rapid navigation
- Total test execution < 10 minutes (human) or < 5 minutes (agent)

### ⚠️ Known Issues (Expected)
- Lazy loading shows 0 posts until clicked (optimization, not a bug)
- Geographic filtering may not be visible (feature may be WIP)
- Some subcategories may have no data (0 posts legitimately)

### ❌ Fail Criteria (Critical)
- Any category unclickable or broken
- 429 rate limit errors during navigation
- Back button navigation loses state or breaks UI
- Console errors blocking user actions
- Navigation takes > 5 seconds per category (performance regression)

---

## Running Tests

### Manual Human Testing
```bash
# Open human test script
open plan/category-navigation-human-test.md

# Follow instructions:
# 1. Start screen recording
# 2. Clear browser state
# 3. Navigate to http://localhost:3000/search
# 4. Execute each step, thinking aloud
# 5. Answer post-test questions
```

### Automated E2E Testing
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all e2e tests
npm run test:e2e

# Run only category navigation tests
npm run test:e2e -- e2e/category-navigation.spec.ts

# Run with visible browser (debug)
npm run test:e2e -- e2e/category-navigation.spec.ts --headed

# Run specific test
npm run test:e2e -- e2e/category-navigation.spec.ts -g "View category overview"

# Generate HTML report
npx playwright show-report
```

### AI Agent Testing (Manual Execution)
```bash
# Use browser automation tool (Playwright, Selenium, etc.) to execute:
open plan/category-navigation-agent-test.md

# Agent should:
# 1. Launch browser to http://localhost:3000/search
# 2. Execute each step programmatically
# 3. Take screenshots at checkpoints
# 4. Generate markdown report with findings
```

---

## Test Data Dependencies

These tests rely on:
- **Taxonomy**: 9 categories defined in `lib/data/taxonomy.ts`
- **Subcategories**: 56 total subcategories across all categories
- **Mock Signals**: `lib/data/subcategorySignals.ts` (for post counts)
- **API Endpoints**:
  - `/api/legislative/signals?subcategoryId=X` (fetches subcategory data)
  - `/api/search` (runs searches when user drills into issue detail)

**To update test data**:
1. Add/remove categories → Update taxonomy.ts
2. Add subcategories → Update taxonomy.ts and subcategorySignals.ts
3. Change post counts → Update subcategorySignals.ts (mock data)

---

## Maintenance

### When to Update Tests
- **New category added**: Update test to expect 10 categories instead of 9
- **Subcategory count changes**: Update validation expectations
- **UI changes**: Update selectors (e.g., back button icon changes from ← to X)
- **Performance optimizations**: Adjust timeout expectations

### Test Reporting
- Screenshots saved to `test-results/category-navigation/`
- Playwright HTML report: `npx playwright show-report`
- Console logs include navigation timing for performance analysis

---

## Related Documentation

- **User Journey**: `plan/story-map/category-navigation.yaml`
- **Request Optimizations**: `docs/REQUEST_OPTIMIZATION_IMPLEMENTED.md`
- **Taxonomy Data**: `lib/data/taxonomy.ts`
- **Search E2E Tests**: `e2e/search-to-report.spec.ts`
- **Playwright Config**: `playwright.config.ts`

---

## Next Steps

1. **Run baseline tests** to establish performance benchmarks
2. **Video record human test** for qualitative UX feedback
3. **Set up CI pipeline** to run e2e tests on every PR
4. **Monitor rate limiting** in production using test patterns
5. **Extend tests** for geographic filtering when feature ships

---

**Created**: 2026-02-17  
**Status**: ✅ Ready to run  
**Coverage**: 9 categories, 10 test steps, 12 automated e2e tests
