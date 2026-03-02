# Civic Voices

## Stack
- Framework: Next.js 14 (App Router), TypeScript strict, no semicolons
- DB: PostgreSQL via Prisma ORM + Supabase Auth
- Styling: Tailwind CSS
- AI: Anthropic Claude (Haiku/Sonnet), Google Gemini
- Billing: Stripe (credits per search: National 1cr, State 3cr, City 5cr, Report 10cr)
- Cache: Upstash Redis
- Testing: Vitest (unit, colocated), Playwright (e2e in e2e/)
- Deploy: Vercel. **Node 20+ required** (`nvm use 20`).

## Critical Rules
- ALL env vars go through `lib/config.ts` — never access `process.env` directly elsewhere
- DB changes: `npx prisma db push` (dev) / migrations (prod)
- Types live in `lib/types/api.ts` — never inline complex types in route files
- Import Prisma singleton from `lib/prisma.ts` — never `new PrismaClient()`
- Import AI clients from `lib/services/anthropicClient.ts` / `lib/services/geminiClient.ts` — never instantiate directly
- Grain overlay: CSS `::before` pseudo-elements block clicks — content needs `relative z-10`

## Protected Routes
Middleware guards: `/dashboard/*`, `/search`, `/research/*`, `/onboarding`
Public: `/`, `/login`, `/signup`, `/api/*`, `/report/*` (public share links)

## Common Commands
```bash
npm run dev          # http://localhost:3000
npm run build        # production build (runs prisma generate first)
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright e2e tests
npm run lint         # ESLint
npx prisma studio    # DB GUI
```

## Git Workflow
- Branch: `master` | Commits: conventional (`feat:`, `fix:`, `chore:`)
- Auto-deploys to Vercel on push to master

## OpenMemory
- MCP project_id: `kromahlusenii-ops/civic-voices`
