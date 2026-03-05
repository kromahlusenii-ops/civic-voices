# Architecture Decision Records

Each `###` heading is a dedup key — deeper scopes override shallower ones with the same heading.

---

<!-- Add decisions below -->

### ADR-007: Client-side PDF export for issue briefings
- **Date:** 2026-03-05
- **Status:** Active
- **Context:** IssueDetailView had placeholder "Export PDF" and "Share Briefing" buttons with no handlers. Users need a professional PDF summarizing the AI briefing, sentiment, topics, and platform breakdown for a given civic issue.
- **Decision:** Added client-side PDF generation using jsPDF (dynamic import to keep out of initial bundle). Single `generateBriefingPdf()` function in `lib/utils/briefingPdf.ts` produces a branded US Letter PDF with: dark header band, metrics row, sentiment bar, AI briefing text, What People Want, Key Topics, Post Intentions with percentage bars, Platform Summary table, and gold-ruled footer. Both buttons in IssueDetailView wired to the same handler with loading/disabled states. Reuses `PLATFORM_LABELS` and `TIME_FILTER_LABELS` from existing utilities.
- **Files:** `lib/utils/briefingPdf.ts` (new), `app/search/components/IssueDetailView.tsx`
