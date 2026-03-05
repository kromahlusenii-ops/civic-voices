# Patterns & Conventions

Each `###` heading is a dedup key — deeper scopes override shallower ones.

---

<!-- Add patterns below -->

### Client-side PDF generation with dynamic import
- **Where:** `lib/utils/briefingPdf.ts`, `IssueDetailView.tsx`
- **Pattern:** Heavy library (jsPDF ~280KB) loaded via `await import("jspdf")` inside the async `generateBriefingPdf()` function — zero impact on initial bundle. Caller builds a flat `BriefingPdfData` object from component state. Helper functions `ensureSpace()` for auto page breaks, `drawSectionHeader()` for consistent gold section headers. Filename uses slugified subcategory name + ISO date.
- **Key detail:** Both "Export PDF" and "Share Briefing" buttons share the same handler. `exportingPdf` state gates both buttons with disabled + opacity styling.
