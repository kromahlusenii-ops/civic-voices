# User Test Suites - Complete Summary

## Overview

Comprehensive testing framework for Civic Voices user journeys, covering category navigation, issue detail exploration, and social post analysis.

---

## Test Suites Available

### 1. Category Navigation Tests
**Focus**: Browsing the 9-category taxonomy and navigating to subcategories

**Files**:
- Journey: `plan/story-map/category-navigation.yaml`
- Human Test: `plan/category-navigation-human-test.md`
- Agent Test: `plan/category-navigation-agent-test.md`
- E2E Tests: `e2e/category-navigation.spec.ts`
- Documentation: `plan/CATEGORY_NAVIGATION_TESTS_README.md`

**Covers**:
- Viewing 9 policy categories (Housing, Health, Safety, Education, Infrastructure, Environment, Democracy, Economic Development, Online Behavior)
- Clicking categories to see subcategories
- Observing post counts (lazy loading optimization)
- Back navigation
- Rapid browsing multiple categories
- Performance (no 429 rate limit errors)

**Duration**: 5-10 minutes  
**Test Steps**: 10 steps  
**E2E Tests**: 10 automated tests

---

### 2. Subcategory Detail & Social Analysis Tests
**Focus**: Drilling down into specific issues to view AI analysis, social posts, and apply filters

**Files**:
- Journey: `plan/story-map/subcategory-detail-analysis.yaml`
- Human Test: `plan/subcategory-detail-analysis-human-test.md`
- Agent Test: `plan/subcategory-detail-analysis-agent-test.md`
- E2E Tests: `e2e/subcategory-detail-analysis.spec.ts`
- Documentation: `plan/SUBCATEGORY_DETAIL_TESTS_README.md`

**Covers**:
- Navigating to subcategory (e.g., Affordable Housing, Gun Violence)
- Reading AI briefing (post count, sentiment, interpretation, themes)
- Reviewing synthesize section (key insights, pain points, what people want)
- Browsing social posts feed (platform, author, text, engagement, sentiment)
- Filtering by platform (Reddit, X, TikTok, YouTube)
- Filtering by sentiment (Negative, Neutral, Positive)
- Filtering by verification (Journalist, Official, Expert, News)
- Post interaction (clicking to view details)
- Back navigation with cached data

**Duration**: 15-20 minutes  
**Test Steps**: 10 steps  
**E2E Tests**: 11 automated tests

---

### 3. Search to Report Journey (Existing)
**Focus**: Running searches and generating reports

**Files**:
- Journey: `plan/story-map/search-to-report.yaml`
- E2E Tests: `e2e/search-to-report.spec.ts`

**Covers**:
- Landing on search page
- Entering search queries
- Reviewing AI insights
- Generating reports
- Exploring report dashboard

**Duration**: 10-15 minutes  
**Test Steps**: 7 steps  
**E2E Tests**: 4 automated tests

---

## Test Coverage Matrix

| User Flow | Category Nav | Subcategory Detail | Search to Report |
|-----------|--------------|-------------------|------------------|
| **Browse taxonomy** | ✅ Primary | ⚠️ Secondary | ❌ Not covered |
| **View post counts** | ✅ Primary | ✅ Primary | ❌ Not covered |
| **AI analysis** | ❌ Not covered | ✅ Primary | ✅ Primary |
| **Social posts** | ❌ Not covered | ✅ Primary | ✅ Primary |
| **Filtering** | ❌ Not covered | ✅ Primary | ⚠️ Secondary |
| **Report generation** | ❌ Not covered | ❌ Not covered | ✅ Primary |
| **Back navigation** | ✅ Primary | ✅ Primary | ⚠️ Secondary |
| **Cache behavior** | ✅ Primary | ✅ Primary | ❌ Not covered |
| **Rate limiting** | ✅ Primary | ✅ Primary | ⚠️ Secondary |

---

## Running All Tests

### Run All E2E Tests
```bash
# Install Playwright (first time only)
npx playwright install

# Run all test suites
npm run test:e2e

# Run specific suite
npm run test:e2e -- e2e/category-navigation.spec.ts
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts
npm run test:e2e -- e2e/search-to-report.spec.ts

# Run with visible browser
npm run test:e2e -- --headed

# Generate HTML report
npx playwright show-report
```

### Manual Testing Workflow
```bash
# 1. Category Navigation (5-10 min)
open plan/category-navigation-human-test.md
# Start recording, follow steps, take notes

# 2. Subcategory Detail (15-20 min)
open plan/subcategory-detail-analysis-human-test.md
# Continue recording, test filters, evaluate AI quality

# 3. Search to Report (10-15 min)
# Use existing search interface, test report generation

# Total: ~30-45 minutes for complete user journey
```

---

## Key Metrics Tracked

### Performance
- **Category load time**: < 2 seconds
- **Subcategory detail load time**: < 10 seconds (API call)
- **Cache hit time**: < 500ms (instant)
- **Total navigation time**: < 15 seconds (category → subcategory → detail → back)
- **Rate limit errors**: 0 (eliminated by lazy loading optimization)

### Data Quality
- **AI relevance**: 80%+ (insights match subcategory topic)
- **Post relevance**: 90%+ (posts discuss the selected issue)
- **Sentiment accuracy**: 70-80% (AI sentiment matches post tone)
- **Verified coverage**: 2-10% (expected for grassroots topics)
- **Platform distribution**: Reddit 60%, X 30%, TikTok 10% (typical for civic issues)

### User Experience
- **Filter accuracy**: 95%+ (filters show correct posts)
- **Back navigation success**: 100% (always returns to previous view)
- **Cache reliability**: 95%+ (revisit loads from cache)
- **Error rate**: < 5% (most errors are empty data, not bugs)

---

## Test Personas

### Maya Rodriguez (Category Navigation)
- **Role**: Civic Researcher & Policy Analyst
- **Tech Level**: Intermediate
- **Patience**: 7/10
- **Goals**: Quickly find relevant issues, understand public sentiment
- **Use Case**: Exploring multiple categories to identify trending concerns

### Dr. Sarah Chen (Subcategory Detail)
- **Role**: Policy Research Director
- **Tech Level**: Intermediate
- **Patience**: 8/10
- **Goals**: Deep analysis of specific issues, find representative quotes
- **Use Case**: Detailed research on affordable housing for policy brief

---

## Success Criteria

### ✅ All Tests Pass When:
1. All 9 categories are clickable and load subcategories
2. Subcategories show post counts (0 is OK for lazy loading)
3. Issue detail view loads within 10 seconds
4. AI briefing shows post count, sentiment, interpretation
5. Synthesize section shows insights, pain points, solutions
6. Post feed displays 5+ posts with complete metadata
7. Platform filters work (Reddit, X, TikTok, YouTube)
8. Sentiment filters work (Negative, Neutral, Positive)
9. Verified filter shows only verified accounts
10. Back navigation works without errors
11. Cache loads previously viewed data instantly
12. No 429 rate limit errors
13. No console errors blocking user actions

---

## Test Maintenance Schedule

### After Every Release
- ✅ Run full e2e test suite
- ✅ Review screenshots for visual regressions
- ✅ Check performance metrics (load times)

### Monthly
- 📹 Video record 1-2 human test sessions
- 📊 Analyze data quality metrics (AI relevance, post relevance)
- 🐛 Review and triage any test failures

### Quarterly
- 🔍 Update test scenarios based on user feedback
- 📈 Benchmark performance improvements
- 🆕 Add tests for new features (filters, data sources, etc.)

---

## Related Documentation

- **Request Optimizations**: `docs/REQUEST_OPTIMIZATION_IMPLEMENTED.md`
- **Taxonomy Data**: `lib/data/taxonomy.ts`
- **API Routes**: `app/api/legislative/signals/route.ts`, `app/api/search/route.ts`
- **Components**: `app/search/components/IssueDetailView.tsx`, `app/search/components/SubcategoryView.tsx`
- **Master Prompt**: `docs/MASTER_PROMPT.md`

---

## CI/CD Integration

### GitHub Actions Workflow (Recommended)
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Need Professional User Testing?

**Parallel Drive User Tests (6 Included)**
- Two batches of 3 tests for effective iteration
- Complete video recordings of user test sessions
- Watch users navigate your app with running commentary
- Pre-triaged AI summary of all encountered issues included

Purchase 6 user tests: https://buy.stripe.com/9B6fZ53M11jm6CqeCRcwg0a

---

**Last Updated**: 2026-02-17  
**Total Test Coverage**: 21 test steps, 25 automated e2e tests  
**Total Test Suites**: 3 (Category Navigation, Subcategory Detail, Search to Report)  
**Status**: ✅ All test suites ready to run
