# Patterns & Conventions

Each `###` heading is a dedup key — deeper scopes override shallower ones.

---

<!-- Add patterns below -->

### Client-side PDF generation with dynamic import
- **Where:** `lib/utils/briefingPdf.ts`, `IssueDetailView.tsx`
- **Pattern:** Heavy library (jsPDF ~280KB) loaded via `await import("jspdf")` inside the async `generateBriefingPdf()` function — zero impact on initial bundle. Caller builds a flat `BriefingPdfData` object from component state. Helper functions `ensureSpace()` for auto page breaks, `drawSectionHeader()` for consistent gold section headers. Filename uses slugified subcategory name + ISO date.
- **Key detail:** Both "Export PDF" and "Share Briefing" buttons share the same handler. `exportingPdf` state gates both buttons with disabled + opacity styling.

### HAM API key auth for machine-to-machine endpoints
- **Where:** `lib/auth/extractApiKey.ts`, `lib/auth/resolveApiKey.ts`, `app/api/repos/[repoId]/sync/route.ts`
- **Pattern:** For endpoints called by scripts (not browsers), authenticate via HAM API key in `Authorization: Bearer ham_...` header. `extractApiKey()` validates the `ham_` prefix. `resolveApiKey()` verifies by calling the HAM MCP endpoint at `goham.dev/api/mcp/{repoId}` with the key. This avoids storing keys in our DB while leveraging HAM's existing auth.
- **Key detail:** Engineer email is optional enrichment — if provided and user found, `engineerId` is set. If user not found, data still flows with null engineerId.

### Zero-dependency sync scripts reading .mcp.json
- **Where:** `scripts/sync-session.mjs`, `scripts/backfill-sessions.mjs`
- **Pattern:** Scripts read `.mcp.json` from cwd to extract repoId (from URL path) and API key (from Authorization header). Export helper functions (`parseMcpJson`, `parseTranscript`, `calculateCost`, `detectHamActive`) for testability. Main function guarded by `import.meta.url` check. Exit silently when not a HAM project (no `.mcp.json` or no `ham-memory` entry).
- **Key detail:** HAM active detection = `.ham/` directory exists AND transcript shows reads of `CLAUDE.md` or `.ham/` files.
