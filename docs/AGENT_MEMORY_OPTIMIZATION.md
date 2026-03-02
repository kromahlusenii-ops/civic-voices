# How We Cut AI Agent Token Spend by ~90% with Hierarchical Memory

> A practical guide to scoped CLAUDE.md files — from the general concept to a real-world implementation in a Next.js social intelligence platform.

---

## The Problem Nobody Talks About

When you build a product with AI coding agents — Cursor, Claude Code, GitHub Copilot — you quickly discover a painful pattern: **every session, the agent re-discovers your codebase from scratch.**

It reads files to understand your stack. It reads more files to understand your conventions. It suggests using the expensive API when you switched to the cheaper one months ago. You correct it. Three weeks later, working on a different feature, it suggests the expensive one again. You correct it again. A month after that, it proposes adding code you deliberately removed. You explain why. It forgets by the next session. The cycle continues.

This isn't a bug in the AI. It's an architectural gap in how most codebases are set up for AI-assisted development. The agent has no persistent memory of what it's already learned — and the mechanism most teams use to fill that gap (a single `CLAUDE.md` or `AGENTS.md` at the root) creates a different problem: **everything loads on every request, whether it's relevant or not.**

A single 800-token context file loaded across 50 prompts in a session adds up to 40,000 tokens just for the file itself — before the agent has written a single line of code. Multiply that across a team, multiply it across months, and you're looking at millions of tokens spent re-reading things the agent already knows.

---

## The Concept: Hierarchical Memory

The solution is simple in principle: **stop treating agent context as a single global document, and start treating it as a scoped index.**

Instead of one massive file that always loads, you create a tree of lightweight context files — one at the root, one per major directory. Each file contains only what an agent needs to work competently in that specific area of the codebase. The root file is a pointer: here's the stack, here are the hard rules, here's where to look next.

```
your-project/
├── CLAUDE.md                     # ~150 tokens: stack, rules, pointers
├── .memory/
│   ├── decisions.md              # Architecture Decision Records (ADRs)
│   └── patterns.md               # Reusable code patterns
├── src/api/
│   └── CLAUDE.md                 # API-specific context only
├── src/components/
│   └── CLAUDE.md                 # UI component conventions only
└── src/db/
    └── CLAUDE.md                 # Schema and query patterns only
```

The agent reads the root file, then reads the file for the directory it's about to work in. That's 300–600 tokens of laser-focused context instead of 5,000–15,000 tokens of discovery overhead.

The `.memory/` directory handles the second biggest source of waste: re-litigating decisions. Without a record of past architectural choices, agents will periodically re-propose solutions you already evaluated and rejected. `decisions.md` short-circuits that. `patterns.md` captures the non-obvious implementations you've already solved — the ones that aren't obvious from reading the code alone.

---

## The Real Savings Come From What Doesn't Happen

The token count on individual files is almost secondary. The compounding savings come from **conversations that don't need to happen**:

- The agent doesn't ask "should I use the official X API or a third-party wrapper?" — that ADR is in `.memory/decisions.md`
- The agent doesn't read 400 lines of `search/route.ts` to understand the response format — it's in `app/api/CLAUDE.md`
- The agent doesn't propose inline `process.env` access — the rule is the first thing it reads
- The agent doesn't build a new Prisma client — it already knows there's a singleton at `lib/prisma.ts`

Each of those "doesn't happen" moments is worth 1,000–5,000 tokens of back-and-forth correction.

---

## How We Implemented It in Civic Voices

Civic Voices is a real-time social intelligence platform that aggregates public sentiment from X/Twitter, TikTok, YouTube, Reddit, Bluesky, and Truth Social. It's a Next.js 14 app with a TypeScript backend, Prisma + PostgreSQL, Supabase Auth, Stripe billing, Upstash Redis caching, and Anthropic Claude for AI analysis.

That's a lot of surface area. Before this change, our root `CLAUDE.md` had grown to ~850 tokens: full directory trees, every environment variable listed, testing documentation, git workflow, known CSS gotchas. All of it loaded on every single agent request — whether we were fixing a billing webhook or tweaking a search filter.

### What We Built

**Root `CLAUDE.md` → slimmed to ~180 tokens**

The new root file contains only four things: the stack (one line per technology), critical rules that apply everywhere (the three singletons, the env var rule, no semicolons), protected routes for middleware awareness, and agent operating instructions. No implementation details. No directory trees. Just the information that's always relevant.

**`.memory/decisions.md` → 9 pre-populated ADRs**

We documented every significant architectural decision with its reasoning and what alternatives were rejected:

- Why Supabase Auth over Firebase/NextAuth
- Why `lib/config.ts` is the single env var gateway
- Why we use SSE (Server-Sent Events) instead of WebSockets for streaming search
- Why `XRapidApiProvider` is preferred over the official X API (cost)
- Why the taxonomy is a TypeScript file instead of a database table
- Why Upstash Redis with circuit breakers for caching

An agent that reads this file before proposing a change will never suggest migrating back to Firebase, adding a raw `process.env` call, or introducing a new Prisma client instance. These aren't assumptions anymore — they're documented decisions.

**`.memory/patterns.md` → 11 seeded code patterns**

We extracted the non-obvious patterns from the codebase and wrote them out explicitly:

- The Supabase server auth pattern (bearer token verification in API routes)
- The normalized `Post` type all social platforms collapse into
- The circuit breaker wrapper for external API calls
- The SSE event emission pattern for streaming search
- The credit check sequence (always before an expensive operation, deduct after success)
- The Redis cache check + write pattern with the `isCacheAvailable()` guard

These patterns exist in the code, but discovering them requires reading multiple files. Writing them out in `.memory/patterns.md` turns them into first-class retrievable context.

**8 subdirectory `CLAUDE.md` files**

| Directory | Key Content |
|-----------|-------------|
| `app/api/` | Auth modes, response format, rate limiting, Redis caching, circuit breakers, SSE, full route inventory, platform integrations table |
| `app/components/` | Scoping rules, component inventory, `useStreamingSearch` hook, UI design system values |
| `components/` | Shared component rules, credibility tier system, testing conventions |
| `lib/` | The three singletons, Supabase client split (browser vs. server), full file map |
| `lib/providers/` | Provider preference order, platform union type, credibility post-processing rule |
| `lib/services/` | Per-service purpose, AI client singletons, credit check pattern, report generation flow |
| `lib/utils/` | Every utility mapped with its function signatures and when to use it |
| `prisma/` | All 16 models, relationship diagram, RLS note, migration commands |

### The Hybrid Strategy

We already use the [OpenMemory MCP](https://github.com/mem0ai/mem0) server for dynamic memory — session context, user preferences, evolving project facts. The hierarchical CLAUDE.md system doesn't replace that. It complements it:

```
Static context (free)          Dynamic context (per-call cost)
─────────────────────          ────────────────────────────────
CLAUDE.md files                OpenMemory MCP
└─ Stack conventions           └─ Evolving decisions
└─ Auth/API patterns           └─ User preferences
└─ Type shapes                 └─ Session-specific context
└─ Directory rules             └─ Searchable project facts
```

File-based memory is zero marginal cost — the agent reads it as part of context window loading, not as a tool call. MCP memory is better for things you need to search: "what did I decide about the billing flow last week?" File memory is better for things that are always true: "how do I authenticate a request in this codebase?"

### The Numbers

| Scenario | Tokens per prompt | 50-prompt session |
|----------|------------------|------------------|
| Before: single root CLAUDE.md + discovery | ~4,000–12,000 | ~200K–600K |
| After: scoped subdirectory context | ~400–800 | ~20K–40K |
| **Reduction** | **~90%** | **~180K–560K fewer tokens** |

These are estimates based on observed agent behavior patterns. The variance is high — a simple one-file change costs far less than a cross-cutting refactor — but the direction is consistent.

---

## What Makes This Work (and What Doesn't)

**What makes it work:**

The root `CLAUDE.md` contains explicit operating instructions: "Read THIS file first, then the target directory's CLAUDE.md. Check `.memory/decisions.md` for architecture tasks. Check `.memory/patterns.md` for implementation tasks." This behavioral anchor is what makes the system self-reinforcing — the agent is told exactly what to load and when.

The `.memory/` files also contain a feedback loop: "After completing work, log decisions → `.memory/decisions.md`, patterns → `.memory/patterns.md`." Over time, the system builds itself out as you work.

**What doesn't work:**

If the root file itself is too long, agents may skip the subdirectory files entirely (they've already burned too much of their context budget). Keep the root under 250 tokens. Every sentence that doesn't apply globally should live in a subdirectory file instead.

If the subdirectory files are stale, they're worse than nothing — they'll confidently give the agent wrong information. Treat them like code: if you change an architecture pattern, update the relevant CLAUDE.md in the same commit.

---

## Setup Checklist

1. Audit your current `CLAUDE.md` — anything directory-specific moves to a subdirectory file
2. Create `.memory/decisions.md` and document every architectural decision you've made (especially the ones you've had to explain twice)
3. Create `.memory/patterns.md` with the non-obvious patterns in your codebase
4. Add subdirectory `CLAUDE.md` files for your highest-traffic areas first (API layer, component layer, DB layer)
5. Add the agent operating instructions to your root file — the explicit "read this directory's CLAUDE.md before working" instruction
6. After each major feature or refactor, spend 5 minutes updating the relevant files

The initial setup takes a few hours. After that, it's lightweight maintenance — and the return on that maintenance compounds with every session.

---

## Closing Thought

This isn't really about tokens. It's about what tokens represent: repeated friction, repeated correction, repeated context-building that shouldn't need to happen.

The teams that will build best with AI agents aren't the ones with the best prompts. They're the ones who treat their codebase as a system that's designed to be understood by an agent — where the context is scoped, the decisions are documented, and the patterns are explicit. The agent should feel like a competent new team member on day one, not a blank slate that needs to re-learn everything every session.

Hierarchical memory is one piece of that. It's also a surprisingly cheap piece — a few markdown files that pay for themselves in the first session.
