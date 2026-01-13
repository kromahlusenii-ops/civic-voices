# Civic Voices - Project Documentation

## Overview

Civic Voices is a real-time social intelligence platform that aggregates and analyzes public sentiment across multiple social media platforms (X/Twitter, TikTok, YouTube, Reddit, Bluesky, Truth Social). It helps researchers, journalists, marketers, and policy teams understand what Americans are actually saying online.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** Supabase Auth
- **Testing:** Vitest (unit), Playwright (e2e)

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production (runs prisma generate first)
npm run start            # Start production server

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run e2e tests (Playwright)
npm run test:e2e:ui      # Run e2e tests with UI

# Linting
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes to database
npx prisma studio        # Open Prisma Studio GUI
```

## Node.js Version

**Required: Node.js 20+** (specified in `.nvmrc` and `package.json`)

```bash
nvm use 20               # Switch to Node 20
```

The codebase uses modern JavaScript features like `??=` that require Node 20+. Builds will fail on older versions with `SyntaxError: Unexpected token '??='`.

## Directory Structure

```
civic-voices/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── search/        # Search API endpoints
│   │   ├── report/        # Report generation
│   │   └── onboarding/    # Onboarding flow
│   ├── components/        # Page-specific components
│   ├── contexts/          # React contexts (AuthContext)
│   ├── search/            # Search page
│   ├── report/            # Report view page
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── page.tsx           # Landing page
├── components/            # Shared components
│   ├── SettingsModal.tsx  # Settings/account modal
│   └── header.tsx         # Navigation header
├── lib/                   # Core business logic
│   ├── providers/         # Social media API providers
│   │   ├── XProvider.ts          # X/Twitter API
│   │   ├── XRapidApiProvider.ts  # X via RapidAPI (cheaper)
│   │   ├── TikTokProvider.ts     # TikTok API (TikAPI.io)
│   │   ├── YouTubeProvider.ts    # YouTube Data API
│   │   ├── BlueskyProvider.ts    # Bluesky/AT Protocol
│   │   └── TruthSocialProvider.ts # Truth Social API
│   ├── services/          # Business logic services
│   │   └── reportService.ts # Report generation
│   ├── credibility/       # Source credibility scoring
│   ├── utils/             # Utility functions
│   ├── config.ts          # API configuration
│   ├── supabase.ts        # Supabase client (browser)
│   └── supabase-server.ts # Supabase client (server)
├── prisma/
│   └── schema.prisma      # Database schema
├── e2e/                   # Playwright e2e tests
└── public/                # Static assets
    └── logos/             # Company logos
```

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page (editorial design) |
| `app/search/page.tsx` | Main search interface |
| `app/report/[id]/page.tsx` | Report detail view |
| `lib/config.ts` | API key configuration |
| `lib/providers/*.ts` | Social media API integrations |
| `middleware.ts` | Auth protection for routes |
| `prisma/schema.prisma` | Database models |

## Authentication

Uses Supabase Auth with email/password. Key files:
- `app/contexts/AuthContext.tsx` - Auth state provider
- `lib/supabase.ts` - Browser Supabase client
- `lib/supabase-server.ts` - Server Supabase client
- `middleware.ts` - Protects `/dashboard/*`, `/report/*`, `/research/*`, `/onboarding/*`

## Environment Setup

Copy `.env.example` to `.env` and configure:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Social Media APIs (at least one required for search):**
- `X_RAPIDAPI_KEY` - X/Twitter via RapidAPI (recommended, cheaper)
- `X_BEARER_TOKEN` - Official X/Twitter API (expensive)
- `TIKTOK_API_KEY` - TikTok via TikAPI.io
- `YOUTUBE_API_KEY` - YouTube Data API v3
- `BLUESKY_IDENTIFIER` / `BLUESKY_APP_PASSWORD` - Bluesky
- `TRUTHSOCIAL_USERNAME` / `TRUTHSOCIAL_PASSWORD` - Truth Social

## Testing

**Unit Tests (Vitest)**
```bash
npm run test                    # Run all tests
npm run test:watch             # Watch mode
```

Test files: `*.test.ts` or `*.test.tsx` next to source files.

**E2E Tests (Playwright)**
```bash
npx playwright install         # Install browsers (first time)
npm run test:e2e               # Run e2e tests
npm run test:e2e:ui            # Run with UI
```

Test files: `e2e/*.spec.ts`

## Git Workflow

- **Main branch:** `master`
- **Commit format:** Conventional commits (`feat:`, `fix:`, `chore:`)
- **Commit footer:** Include Claude Code attribution
- **Deploy:** Auto-deploys to Vercel on push to master

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling
- No semicolons (project convention)
- React functional components with hooks
- API routes in `app/api/` using Next.js Route Handlers

## Known Issues / Warnings

1. **Node version:** Must use Node 20+. Use `nvm use 20` before running commands.
2. **Grain overlay:** CSS `::before` pseudo-elements used for grain texture can block clicks. Content containers need `relative z-10`.
3. **X API rate limits:** RapidAPI has different rate limits than official API.
4. **TikTok API:** Response structure may change; check `TikTokProvider.ts` for parsing logic.

---

# OpenMemory Integration

Memory = accumulated understanding of codebase + user preferences. Like a colleague who's worked here months.

**project_id:** kromahlusenii-ops/civic-voices

## NON-NEGOTIABLE: Memory-First Development

Every **code implementation/modification task** = 3 phases. Other tasks (storage, recall, discussion) = skip phases.

### Phase 1: Initial Search (BEFORE code)
**BLOCKED until:** 2+ searches executed (3-4 for complex), show results, state application
**Strategy:** New feature -> user prefs + project facts + patterns | Bug -> facts + debug memories + user debug prefs | Refactor -> user org prefs + patterns | Architecture -> user decision prefs + project arch
**Failures:** Code without search = FAIL | "Should search" without doing = FAIL | "Best practices" without search = FAIL

### Phase 2: Continuous Search (DURING implementation)
**BLOCKED FROM:**
- **Creating files** -> Search "file structure patterns", similar files, naming conventions
- **Writing functions** -> Search "similar implementations", function patterns, code style prefs
- **Making decisions** -> Search user decision prefs + project patterns
- **Errors** -> Search debug memories + error patterns + user debug prefs
- **Stuck/uncertain** -> Search facts + user problem-solving prefs before guessing
- **Tests** -> Search testing patterns + user testing prefs

**Minimum:** 2-3 additional searches at checkpoints. Show inline with implementation.
**Critical:** NEVER "I'll use standard..." or "best practices" -> STOP. Search first.

### Phase 3: Completion (BEFORE finishing)
**BLOCKED until:**
- Store 1+ memory (component/implementation/debug/user_preference/project_info)
- Update openmemory.md if new patterns/components
- Verify: "Did I miss search checkpoints?" If yes, search now
- Review: Did any searches return empty? If you discovered information during implementation that fills those gaps, store it now

### Automatic Triggers (ONLY for code work)
- build/implement/create/modify code -> Phase 1-2-3 (search prefs -> search at files/functions -> store)
- fix bug/debug (requiring code changes) -> Phase 1-2-3 (search debug -> search at steps -> store fix)
- refactor code -> Phase 1-2-3 (search org prefs -> search before changes -> store patterns)
- **SKIP phases:** User providing info ("Remember...", "Store...") -> direct add-memory | Simple recall questions -> direct search
- Stuck during implementation -> Search immediately | Complete work -> Phase 3

## 3 Search Patterns
1. `user_preference=true` only -> Global user preferences
2. `user_preference=true` + `project_id` -> Project-specific user preferences
3. `project_id` only -> Project facts

**Quick Ref:** Not about you? -> project_id | Your prefs THIS project? -> both | Your prefs ALL projects? -> user_preference=true

## Memory Types
**SECURITY:** Scan for secrets before storing. If found, DO NOT STORE.
- **Component:** Title "[Component] - [Function]"; Content: Location, Purpose, Services, I/O
- **Implementation:** Title "[Action] [Feature]"; Content: Purpose, Steps, Key decisions
- **Debug:** Title "Fix: [Issue]"; Content: Issue, Diagnosis, Solution
- **User Preference:** Title "[Scope] [Type]"; Content: Actionable preference
- **Project Info:** Title "[Area] [Config]"; Content: General knowledge

## Storage Intelligence

| Pattern | user_preference | project_id | When to Use | Memory Types |
|---------|-----------------|------------|-------------|--------------|
| **Project Facts** | OMIT (false) | INCLUDE | Objective info about THIS project | component, implementation, project_info, debug |
| **Project Prefs** | true | INCLUDE | YOUR preferences in THIS project | user_preference (project-specific) |
| **Global Prefs** | true | OMIT | YOUR preferences across ALL projects | user_preference (global) |

## Security Guardrails
**NEVER store:** API keys/tokens, passwords, hashes, private keys, certs, env secrets, OAuth/session tokens, connection strings with creds
**Instead store:** Redacted versions ("<YOUR_TOKEN>"), patterns ("uses bearer token"), instructions ("Set TOKEN env")
