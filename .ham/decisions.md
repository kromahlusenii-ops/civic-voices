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

### ADR-008: HAM Pro session sync pipeline — API key auth via HAM MCP verification
- **Date:** 2026-03-05
- **Status:** Active
- **Context:** Dashboard infrastructure existed but no real session data flowed in. Needed a sync endpoint + hook script to push Claude Code session telemetry (tokens, cost, duration, model) to the HAM Pro dashboard, with energy/emissions enrichment.
- **Decision:** Created a POST endpoint at `/api/repos/[repoId]/sync` that authenticates via HAM API key (Bearer ham_... tokens verified against goham.dev MCP endpoint). The endpoint optionally looks up engineer by email via Prisma, enriches with energy (0.0006 Wh/token) and emissions (0.39 gCO2/Wh), and upserts to `session_summaries`. No team/org membership required. A zero-dependency `scripts/sync-session.mjs` reads `.mcp.json` for credentials, parses Claude Code JSONL transcripts, and POSTs to the sync endpoint. Designed as a `SessionEnd` hook. Backfill script batch-processes all past transcripts.
- **Alternatives considered:** (1) Supabase service client instead of Prisma — rejected for consistency with codebase. (2) Storing API key hashes in DB — deferred, HAM MCP verification sufficient for v1. (3) Required engineer_email — made optional so data flows even without user identification.
- **Files:** `prisma/schema.prisma` (SessionSummary, BenchmarkTask models), `lib/team-types.ts`, `lib/auth/extractApiKey.ts`, `lib/auth/resolveApiKey.ts`, `app/api/repos/[repoId]/sync/route.ts`, `scripts/sync-session.mjs`, `scripts/backfill-sessions.mjs`
