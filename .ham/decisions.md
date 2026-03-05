# Architecture Decision Records

Each `###` heading is a dedup key — deeper scopes override shallower ones with the same heading.

---

<!-- Add decisions below -->


### ADR-007: Client-side PDF export for issue briefings
- **Date:** 2026-03-05
- **Status:** Active
- **Context:** IssueDetailView had placeholder Export PDF and Share Briefing buttons with no handlers.
- **Decision:** Added client-side PDF generation using jsPDF (dynamic import). Single generateBriefingPdf() function produces branded US Letter PDF. Both buttons wired to same handler with loading/disabled states.
- **Files:** lib/utils/briefingPdf.ts (new), app/search/components/IssueDetailView.tsx
