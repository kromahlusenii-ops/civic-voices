# Subcategory Detail View & Social Analysis Tests

## Overview

Comprehensive test suite for the issue detail view where users drill down into specific civic issues (e.g., Affordable Housing, Gun Violence, Mental Health) to view real-time social media conversations, AI-generated analysis, sentiment breakdowns, and actionable insights.

---

## Test Artifacts

### 1. User Journey Specification
**File**: `plan/story-map/subcategory-detail-analysis.yaml`

Defines the canonical user journey for issue detail exploration:
- **10 steps** from category navigation → subcategory detail → filtering → back navigation
- **Persona**: Dr. Sarah Chen (Policy Research Director, intermediate tech, patience 8/10)
- **Validation criteria**: AI analysis quality, filter functionality, post relevance, navigation flow

---

### 2. Human Test Script
**File**: `plan/subcategory-detail-analysis-human-test.md`

Manual test protocol for human testers with detailed observation prompts:
- **Pre-test setup**: Screen recording, cleared state, notepad for observations
- **10 detailed steps** with action, intent, "think aloud" prompts, and success criteria
- **Post-test questions**: Friction points, data quality, AI analysis helpfulness, real-world usage assessment
- **Success metrics**: 10 key indicators including load time, filter accuracy, post relevance

**Use case**: Video-recorded UX testing, qualitative feedback collection, policy researcher validation

---

### 3. AI Agent Test Script
**File**: `plan/subcategory-detail-analysis-agent-test.md`

Executable test protocol for AI agents using browser automation:
- **Persona behavior**: Retry logic, patience threshold (8/10), moderate exponential backoff
- **10 test steps** with validation criteria, checkpoint screenshots, and data collection
- **Output format**: Structured markdown report with duration, difficulty, observations, performance metrics
- **Data quality assessment**: AI relevance, post relevance, sentiment accuracy, platform distribution
- **Recommendations**: Based on discovered issues, UX improvements, feature suggestions

**Use case**: Automated browser testing with Playwright, data quality monitoring, regression testing

---

### 4. Playwright E2E Test Suite
**File**: `e2e/subcategory-detail-analysis.spec.ts`

Automated end-to-end tests using Playwright:

**Test Coverage**:
- ✅ Step 1: Navigate to Housing category
- ✅ Step 2: Click Affordable Housing subcategory
- ✅ Step 3-4: Review AI briefing and synthesize sections
- ✅ Step 5: Browse social posts feed
- ✅ Step 6: Filter by platform (Reddit)
- ✅ Step 7: Filter by sentiment (Negative)
- ✅ Step 8: Toggle verified only filter
- ✅ Step 10: Navigate back to category
- ✅ Performance: Issue detail loads within acceptable time
- ✅ Performance: Filters update post count correctly
- ✅ Performance: No 429 rate limit errors

**Run tests**:
```bash
# All subcategory detail tests
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts

# Specific test
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts -g "Step 2"

# With UI
npm run test:e2e:ui -- e2e/subcategory-detail-analysis.spec.ts

# Debug mode
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts --debug --headed
```

**Screenshots saved to**: `test-results/subcategory-detail-analysis/`

---

## Test Scenarios Covered

### Data Display & Analysis
1. **AI Briefing**: Post count, sentiment breakdown, AI interpretation, key themes
2. **Synthesize Section**: Key insights, pain points, what people want (2-3 bullets each)
3. **Post Feed**: Platform badges, author info, text preview, engagement metrics, timestamps, sentiment badges, verification badges

### Filtering & Interaction
4. **Platform Filter**: Reddit, X, TikTok, YouTube, All
5. **Sentiment Filter**: Negative, Neutral, Positive, All
6. **Verified Only**: Filter for Journalist, Official, Expert, News badges
7. **Post Interaction**: Click posts to view details or open source links

### Navigation & Performance
8. **Back Navigation**: Return to subcategory list with cached data
9. **Load Time**: Issue detail loads within 10-15 seconds
10. **No Rate Limits**: No 429 errors after lazy loading optimization

---

## Key Test Data Points

### What Gets Validated

**AI Analysis Quality**:
- Post count accuracy (matches actual number of posts)
- Sentiment percentages add up to ~100%
- AI interpretation is relevant to subcategory topic
- Key themes are substantive (not generic)

**Synthesize Section**:
- Key Insights: 2-3 bullet points, specific and actionable
- Pain Points: 2-3 bullet points, reflect negative sentiment
- What People Want: 2-3 bullet points, policy-relevant solutions

**Post Cards**:
- Platform badge: Reddit (orange), X (gray), TikTok (teal), YouTube (red)
- Author: Username/handle, avatar (if available)
- Text: 50-200 characters visible (may be truncated)
- Engagement: Likes, comments, views, shares
- Timestamp: Relative ("2 hours ago") or absolute date
- Sentiment: Negative (red), Neutral (orange), Positive (green)
- Verification: Journalist, Official, Expert, News (if applicable)

**Filter Accuracy**:
- Platform filter shows only selected platform's posts
- Sentiment filter shows only posts with selected sentiment
- Verified Only shows only posts with verification badges
- Post count updates to reflect filtered state

---

## Expected Results

### ✅ Pass Criteria
- Issue detail view loads within 10-15 seconds
- AI briefing displays post count, sentiment, interpretation
- Synthesize section shows insights, pain points, solutions
- Post feed displays 5+ posts with complete metadata
- Platform filter successfully isolates platform posts
- Sentiment filter successfully isolates sentiment
- Verified filter shows only verified accounts (may be 0)
- Back navigation returns to subcategory list
- Data loads instantly on revisit (cache working)
- No console errors or 429 rate limits

### ⚠️ Known Behaviors (Expected)
- **Lazy Loading**: Subcategory shows "0 posts" until clicked (optimization)
- **Empty Data**: Some subcategories may have 0 posts in time range (legitimate)
- **API Timing**: Initial load takes 5-10 seconds (fetching from multiple platforms)
- **Low Verified Coverage**: Most civic discussions are grassroots (2-10% verified is normal)
- **Sentiment Accuracy**: AI sentiment may not be perfect (70-80% accuracy is acceptable)

### ❌ Fail Criteria (Critical)
- Issue detail fails to load or times out (>15s)
- AI analysis missing or shows error message
- Post feed is empty when data should exist
- Filters don't work or throw errors
- Back navigation loses state or breaks UI
- Console errors blocking user actions
- 429 rate limit errors (should be eliminated by optimization)

---

## Running Tests

### Manual Human Testing
```bash
# Open human test script
open plan/subcategory-detail-analysis-human-test.md

# Follow instructions:
# 1. Start screen recording
# 2. Clear browser state
# 3. Navigate to http://localhost:3000/search
# 4. Execute each step, thinking aloud
# 5. Take notes on observations
# 6. Answer post-test questions
```

**Recommended Test Subcategories**:
- **Affordable Housing** (Housing) - High volume, emotional, diverse platforms
- **Gun Violence** (Safety) - Controversial, strong sentiment, news coverage
- **Mental Health** (Health) - Personal stories, varied platforms, supportive tone
- **Air Quality** (Environment) - Local relevance, data-driven, current events

### Automated E2E Testing
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all e2e tests
npm run test:e2e

# Run only subcategory detail tests
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts

# Run with visible browser (debug)
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts --headed

# Run specific test
npm run test:e2e -- e2e/subcategory-detail-analysis.spec.ts -g "Filter by platform"

# Generate HTML report
npx playwright show-report
```

### AI Agent Testing (Manual Execution)
```bash
# Use browser automation tool to execute:
open plan/subcategory-detail-analysis-agent-test.md

# Agent should:
# 1. Launch browser to http://localhost:3000/search
# 2. Execute each step programmatically
# 3. Take screenshots at checkpoints
# 4. Collect data points (post counts, sentiment %, filter results)
# 5. Generate markdown report with findings and recommendations
```

---

## Test Data Dependencies

These tests rely on:
- **API Endpoint**: `/api/legislative/signals?subcategoryId=X&state=Y&city=Z&timeFilter=7d`
- **Response Shape**: `LegislativeSignalsResponse` with `posts`, `aiAnalysis`, `summary`
- **Taxonomy**: `lib/data/taxonomy.ts` (56 subcategories across 9 categories)
- **Mock Signals**: `lib/data/subcategorySignals.ts` (if no real data available)

**To update test data**:
1. Add subcategories → Update `taxonomy.ts`
2. Change AI analysis → Update `/api/legislative/signals` response shape
3. Modify filters → Update `IssueDetailView.tsx` component
4. New verification badges → Update `VerificationBadge.tsx` component

---

## Maintenance

### When to Update Tests
- **New subcategory added**: Test with that subcategory
- **AI analysis format changes**: Update validation for briefing/synthesize sections
- **New filter types**: Add test steps for new filters
- **UI redesign**: Update selectors and visual validations
- **Performance improvements**: Adjust timeout expectations

### Test Reporting
- Screenshots: `test-results/subcategory-detail-analysis/`
- Playwright HTML report: `npx playwright show-report`
- Console logs include timing, counts, and quality assessments

---

## Integration with Request Optimizations

These tests validate the improvements from `docs/REQUEST_OPTIMIZATION_IMPLEMENTED.md`:

**Lazy Loading (Step 2)**:
- ✅ Subcategory shows 0 posts initially
- ✅ API call triggered on click (not on category open)
- ✅ Data loads in 5-10 seconds after click

**No 429 Errors (Performance test)**:
- ✅ Issue detail load doesn't trigger rate limit
- ✅ Single API call per subcategory (was 6-10 before)
- ✅ Cache prevents repeat API calls on revisit

**Cache TTL (Step 10)**:
- ✅ Revisiting subcategory loads from cache (<500ms)
- ✅ Cache expires after 4 hours (can't test in e2e, but configured)

---

## Comparison to Other Tests

| Test Suite | Focus | Duration | Automation |
|------------|-------|----------|------------|
| **Category Navigation** | Browsing taxonomy, clicking categories | 2-3 min | ✅ Automated |
| **Subcategory Detail** (this) | Viewing posts, AI analysis, filtering | 5-10 min | ✅ Automated |
| **Search to Report** | Running searches, generating reports | 10-15 min | ✅ Automated |

**Combined Coverage**: End-to-end user flows for taxonomy exploration, issue research, and report generation

---

## Related Documentation

- **User Journey**: `plan/story-map/subcategory-detail-analysis.yaml`
- **Category Navigation Tests**: `plan/CATEGORY_NAVIGATION_TESTS_README.md`
- **IssueDetailView Component**: `app/search/components/IssueDetailView.tsx`
- **API Route**: `app/api/legislative/signals/route.ts`
- **Taxonomy Data**: `lib/data/taxonomy.ts`
- **Request Optimizations**: `docs/REQUEST_OPTIMIZATION_IMPLEMENTED.md`

---

## Next Steps

1. **Run baseline tests** to establish data quality benchmarks
2. **Video record human test** for UX feedback on AI analysis
3. **Set up CI pipeline** to run tests on every PR
4. **Monitor filter usage** in production to understand user behavior
5. **Extend tests** for additional subcategories and edge cases
6. **Add accessibility tests** for screen readers and keyboard navigation

---

## Troubleshooting

### "No posts found" or empty data
- **Cause**: Subcategory may have no posts in selected time range, or API returned empty result
- **Fix**: Try different subcategories (Affordable Housing, Gun Violence usually have data)
- **Check**: API logs in terminal for search results

### Filters not visible
- **Cause**: Filters may not be implemented yet, or UI may have changed
- **Fix**: Check `IssueDetailView.tsx` for filter button implementation
- **Workaround**: Skip filter steps and focus on data display tests

### Slow load times (>15s)
- **Cause**: API may be under load, or network is slow
- **Fix**: Increase timeout in test to 20-30 seconds
- **Check**: Network tab in browser devtools for API response times

### Verification badges not showing
- **Cause**: Very few verified accounts discuss local civic issues (expected)
- **Fix**: This is normal - most discussions are grassroots
- **Test with**: National-level issues or news topics for more verified accounts

---

**Created**: 2026-02-17  
**Status**: ✅ Ready to run  
**Coverage**: 10 test steps, 11 automated e2e tests, AI analysis validation
