# Patterns & Conventions

Each `###` heading is a dedup key — deeper scopes override shallower ones.

---

<!-- Add patterns below -->


### Client-side PDF generation with dynamic import
- **Where:** lib/utils/briefingPdf.ts, IssueDetailView.tsx
- **Pattern:** Heavy library (jsPDF ~280KB) loaded via await import("jspdf") inside async function. Caller builds flat BriefingPdfData from component state. ensureSpace() for auto page breaks, drawSectionHeader() for gold section headers.
- **Key detail:** Both buttons share same handler. exportingPdf state gates disabled + opacity.
