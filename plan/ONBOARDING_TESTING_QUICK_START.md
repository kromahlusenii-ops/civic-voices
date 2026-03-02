# Quick Start: Testing Topic Selection Onboarding

**Status:** ✅ Test Suite Complete | ⚠️ UI Not Yet Built (Phase 1)

---

## Test Files Created

```
plan/
├── story-map/
│   └── topic-selection-onboarding.yaml        # User journey spec
├── topic-selection-onboarding-human-test.md   # Manual test script
├── topic-selection-onboarding-agent-test.md   # AI agent instructions
└── ONBOARDING_TEST_SUITE_README.md            # Full documentation

e2e/
└── topic-selection-onboarding.spec.ts         # Playwright e2e tests ✅
```

---

## Running Tests

### Option 1: Playwright E2E Tests (Automated)

**Run all onboarding tests:**
```bash
npx playwright test e2e/topic-selection-onboarding.spec.ts
```

**Run specific test:**
```bash
npx playwright test e2e/topic-selection-onboarding.spec.ts -g "Step 1"
npx playwright test e2e/topic-selection-onboarding.spec.ts -g "welcome"
```

**Watch tests execute (UI mode):**
```bash
npx playwright test e2e/topic-selection-onboarding.spec.ts --ui
```

**Debug a failing test:**
```bash
npx playwright test e2e/topic-selection-onboarding.spec.ts --debug
```

**Generate HTML report:**
```bash
npx playwright test e2e/topic-selection-onboarding.spec.ts --reporter=html
npx playwright show-report
```

**Run in headed mode (see browser):**
```bash
npx playwright test e2e/topic-selection-onboarding.spec.ts --headed
```

---

### Option 2: Manual Testing (Human Test Script)

1. Open `plan/topic-selection-onboarding-human-test.md`
2. Start screen recording
3. Follow step-by-step instructions
4. Think aloud as you test
5. Complete post-test questionnaire
6. Share video + feedback with team

**Duration:** 20-30 minutes

---

## Current Status

### ⚠️ Tests Will Fail Until UI Is Built

The Playwright tests are written and ready, but will fail with errors like:
```
Error: Locator not found: button with text "Get Started"
Timeout: 5000ms
```

**This is expected!** The tests are written ahead of implementation to serve as:
- ✅ **TDD reference** for Phase 1 development
- ✅ **Acceptance criteria** for UI implementation
- ✅ **Regression tests** once UI is built

---

## Test Coverage

### 15 Test Cases

| # | Test Name | Status |
|---|-----------|--------|
| 1 | Arrive at welcome screen | ⚠️ Pending UI |
| 2 | View topic selection (Step 1/3) | ⚠️ Pending UI |
| 3 | Expand Housing category | ⚠️ Pending UI |
| 4 | Select 3 housing topics | ⚠️ Pending UI |
| 5-6 | Select 8 topics total | ⚠️ Pending UI |
| 7 | Test deselect/toggle | ⚠️ Pending UI |
| 8 | Navigate to geo screen (Step 2/3) | ⚠️ Pending UI |
| 9-10 | Select State → City focus | ⚠️ Pending UI |
| 11 | View review screen (Step 3/3) | ⚠️ Pending UI |
| 12 | Edit topics from review | ⚠️ Pending UI |
| 13 | Finalize & redirect to dashboard | ⚠️ Pending UI |
| 14 | Verify personalized dashboard | ⚠️ Pending UI |
| 15 | Skip onboarding (optional) | ⚠️ Skipped |

---

## Using Tests for TDD

### Recommended Workflow

1. **Read the test** for the feature you're building:
   ```bash
   code e2e/topic-selection-onboarding.spec.ts
   ```

2. **Understand the assertions** - these are your acceptance criteria:
   ```typescript
   // Example: What the test expects to see
   const headline = page.locator('h1, h2').filter({ hasText: /civic issues|topics/i });
   await expect(headline).toBeVisible({ timeout: 5000 });
   ```

3. **Build the UI** to make the test pass

4. **Run the test** to verify:
   ```bash
   npx playwright test e2e/topic-selection-onboarding.spec.ts -g "Step 1"
   ```

5. **Iterate** until green ✅

---

## Screenshots

Tests automatically capture screenshots at checkpoints:
```
test-results/
└── topic-selection-onboarding/
    ├── step1-welcome-screen.png
    ├── step2-topic-selection-initial.png
    ├── step3-housing-expanded.png
    ├── step4-3-topics-selected.png
    ├── step8-geographic-focus-screen.png
    ├── step11-review-screen.png
    └── step13-personalized-dashboard.png
```

These screenshots will be generated when tests pass (after UI is built).

---

## Integration with CI/CD

### Add to GitHub Actions

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test e2e/topic-selection-onboarding.spec.ts
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Questions?

**Tests failing?** 
- ✅ Expected until Phase 1 UI is built
- Use tests as implementation guide

**Need help running tests?**
- Check `plan/ONBOARDING_TEST_SUITE_README.md` for full docs
- Review human test script for manual testing

**Want to modify tests?**
- Edit `e2e/topic-selection-onboarding.spec.ts`
- Reference user journey: `plan/story-map/topic-selection-onboarding.yaml`

---

## Next Steps

1. **Start Phase 1 Development:**
   - Build onboarding UI components
   - Use tests as acceptance criteria
   - Run tests to verify implementation

2. **Run Manual Tests:**
   - Execute human test script
   - Get UX feedback early
   - Iterate on design

3. **Monitor Test Results:**
   - Tests will turn green as UI is built
   - Use screenshots to debug issues
   - Update tests if requirements change

---

**Ready to build Phase 1?** 🚀  
The tests are waiting for you!
