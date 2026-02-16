# Test Report: Search to Report

**Completed**: Automated spec created; execution blocked by Playwright browser setup

**Date**: 2026-02-15

**Script**: `plan/search-to-report-agent-test.md`

---

## Summary

A Playwright e2e spec was created at `e2e/search-to-report.spec.ts` to automate the Search to Report journey. Automated execution within Cursor failed because Playwright needs browser binaries installed for the host architecture (mac-arm64 vs mac-x64 in sandbox).

---

## What Was Done

1. **Created `e2e/search-to-report.spec.ts`** – Playwright tests covering:
   - **Step 1**: Land on search – Navigate from landing, click "Try for free", reach `/search`
   - **Step 2**: Enter search query – Fill query, click Start research, expect auth modal or results
   - **Step 3 & 4**: Search page filters – Verify `time-range-filter`, `source-filter-button`, search input, CTA
   - **Step 7**: Search history – Verify `search-history-btn` visible

2. **Checkpoint screenshots** saved to `test-results/search-to-report/`:
   - `step1-land-on-search.png`
   - `step2-search-results.png` or `step2-auth-prompt.png` (depending on auth state)

3. **Added npm script**: `test:search-to-report` in `package.json`

---

## How to Run Locally

```bash
# 1. Install Playwright browsers (one-time)
npx playwright install chromium

# 2. Start dev server (in another terminal, or Playwright will start it)
npm run dev

# 3. Run the search-to-report e2e tests
npm run test:search-to-report
```

Screenshots will be in `test-results/search-to-report/`.

---

## Blockers

- **Playwright browser binaries**: When running inside Cursor’s sandbox, Playwright downloaded mac-x64 Chromium. With `all` permissions, it looks for mac-arm64. The mismatch causes "Executable doesn't exist" errors. **Fix**: Run `npx playwright install chromium` and the tests from a normal terminal on your machine.

---

## Steps Not Yet Automated

- **Step 3**: Review AI insights (read-only; no checkpoint)
- **Step 4**: Sign in – would require real credentials or a test auth flow
- **Step 5**: Generate report – depends on completed search + auth
- **Step 6**: Explore report dashboard – depends on Step 5

These rely on authenticated search and report generation, so they’re better suited to manual testing or a seeded test account.
