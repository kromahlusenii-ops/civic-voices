# Agent Test: Search to Report

**Environment**: Drive real browser, discover UI by looking (no source code access)

**Journey reference**: plan/story-map/search-to-report.yaml

---

## Persona behavior

- **Role**: Research Analyst
- **Patience**: 7/10 — retry with exponential backoff on failure
- **Tech level**: Intermediate
- **On failure**: Retry before aborting

---

## Execution

For each step, narrate your thoughts like a human tester:

1. **Interact** with the real UI using the action described
2. **Express** confusion, expectations, and what you see
3. **Validate** the rendered result against the success criteria
4. **Screenshot** the browser viewport if it's a checkpoint step or on failure
5. **Record**: difficulty (easy/moderate/difficult), duration, and what was unclear
6. **Retry** with backoff if failed and within patience limit

---

## Steps

### Step 1: Land on search

- **Action**: Navigate to the app. Click "Try for free" or "Log in" to reach the search interface.
- **Intent**: Reach the main search interface to start researching.
- **Success**: Search page is visible with a query input, source filters (X, TikTok, etc.), and time/language filters.
- **Checkpoint**: ✓ Screenshot on completion

---

### Step 2: Enter search query

- **Action**: Type a topic in the search box (e.g., "climate policy 2024"). Optionally select platforms and time range. Click the search/arrow button.
- **Intent**: Run a cross-platform search to aggregate posts.
- **Success**: Search executes; loading state appears, then results show. Left panel shows AI interpretation and key themes. Right panel shows post cards.
- **Checkpoint**: ✓ Screenshot on completion

---

### Step 3: Review AI insights

- **Action**: Read the AI interpretation, key themes, and sentiment breakdown. Note suggested follow-up queries. Click one if present.
- **Intent**: Understand the AI-generated summary.
- **Success**: Interpretation readable. Themes displayed. Sentiment visible. Suggested queries clickable.
- **Checkpoint**: No

---

### Step 4: Sign in to save (if not authenticated)

- **Action**: If prompted to sign in, complete signup or login (email/password or Google).
- **Intent**: Authenticate to save search and generate reports.
- **Success**: Auth modal completable. User returns to results. Search saved.
- **Checkpoint**: ✓ Screenshot on completion

---

### Step 5: Generate report

- **Action**: Click "Start research" or "Generate report". Wait for completion.
- **Intent**: Create a professional report with charts.
- **Success**: Progress indicator visible. Report loads with metrics, activity chart, sentiment, top posts, topics.
- **Checkpoint**: ✓ Screenshot on completion

---

### Step 6: Explore report dashboard

- **Action**: Scroll sections. Click tabs. Sort tables. Click a post to open source.
- **Intent**: Explore data and verify credibility badges.
- **Success**: Sections render. Tabs switch. Sorting works. Links open. Badges visible.
- **Checkpoint**: ✓ Screenshot on completion

---

### Step 7: Access search history

- **Action**: Open search history sidebar (clock/history icon). Click a previous search.
- **Intent**: Return to a previous search.
- **Success**: Sidebar shows saved searches. Clicking loads that query.
- **Checkpoint**: No

---

## Output format

After execution, produce a report in this format:

```markdown
# Test Report: Search to Report

**Completed**: X of 7 steps

## Step 1: Land on search
- **Status**: ✓ Success / ✗ Failed
- **Duration**: Xs
- **Difficulty**: easy / moderate / difficult
- **Thoughts**: [What I saw, expected, any confusion]
- **Screenshot**: [path if captured]

## Step 2: Enter search query
...

## Blockers
- [Any steps that couldn't be completed and why]
```

---

*Run with: /run-test plan/search-to-report-agent-test.md*

**Automated Playwright spec**: `e2e/search-to-report.spec.ts`  
**Run locally**: `npx playwright install chromium` then `npm run test:search-to-report`  
**Report**: `plan/TEST_REPORT_SEARCH_TO_REPORT.md`
