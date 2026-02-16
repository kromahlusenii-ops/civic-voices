# Civic Voices — Product Vision

## Overview

Civic Voices is a social listening platform that aggregates public conversations from Reddit, X, TikTok, YouTube, Nextdoor, Bluesky, and Threads into a single searchable interface — giving local government communications teams, civic organizations, and public affairs professionals real-time visibility into what residents are saying about their city, policies, and services.

The enterprise social listening market is dominated by Brandwatch, Sprinklr, and Meltwater at $30K+ annual contracts, built for brand marketing with no civic context. Civic Voices is purpose-built for public sector use cases at accessible pricing, with AI tuned for colloquial language and informal civic discourse.

**Working MVP:** civic-voices-six.vercel.app

## Goals

- Give civic communicators a single dashboard to monitor constituent sentiment across all major social platforms, replacing the manual cross-platform checking that every customer discovery interview identified as the #1 pain point
- Deliver AI-powered sentiment analysis that actually understands how people talk — slang, sarcasm, coded language, colloquial expressions ("this is fire" ≠ negative) — solving the problem that made Brandwatch users manually re-classify sentiment in Excel
- Enable proactive governance: help comms teams spot emerging complaints, trending issues, and sentiment shifts before they hit local news or escalate at council meetings
- Build a civic-specific data moat through accumulated historical discourse data, civic taxonomy, and local issue classification that generic tools cannot replicate
- Reach $5K MRR within 12 months of launch

## Non-Goals (Out of Scope)

- **Not a brand marketing tool.** We do not compete with Sprout Social or Hootsuite for social media management, scheduling, or brand monitoring. The "brand" here is your city, and the "customers" are residents.
- **Not a consumer product.** Civic Voices serves professional communicators, not individual citizens.
- **Not a chatbot or engagement tool.** We are the listening and intelligence layer, not the response layer. We don't post, reply, or engage on behalf of users.
- **Not an enterprise sales play (yet).** Initial go-to-market is self-serve SaaS at accessible price points. Enterprise sales motions come after PMF.
- **Not trying to replace 311 systems.** We complement existing constituent feedback channels by surfacing the conversations that never make it to official channels.

## Key Constraints

### Technical
- **Stack:** Next.js + TypeScript + Tailwind CSS, Supabase (PostgreSQL with RLS), Vercel hosting
- **Data ingestion:** Social platform APIs and scraping services (ScrapeCreators, SociaVault) for Reddit, X, TikTok, YouTube, Nextdoor, Bluesky, Threads
- **AI:** Claude API for sentiment analysis, thread summarization, and insight generation
- **Payments:** Stripe (monthly subscriptions, no annual contracts)
- **Authentication:** Supabase Auth (email + Google OAuth)
- **Email:** Resend/Loops for alerts and digests

### Business
- **Pricing (no credit system):**
  - Pro: $99/month — individual comms professionals, 500 searches/month
  - Agency: $249/month — PR firms serving multiple municipalities, 2,000 searches/month
  - Business: $499/month — large cities and regional teams, unlimited searches + API access
- **Competitive positioning:** 10-60x cheaper than enterprise alternatives (Brandwatch $30K+/year). No annual contracts. Month-to-month.
- **Data sourcing risk:** Social platform API access is fragile and subject to policy changes. Diversifying across multiple data providers reduces single-point-of-failure risk.
- **Go-to-market:** Charlotte-first, then expand to other mid-size cities with active civic ecosystems.

### Performance
- Search results must return in under 3 seconds
- Sentiment analysis must handle colloquial language, AAVE, Gen-Z slang, and political shorthand with >80% accuracy
- Alert notifications must fire within 15 minutes of spike detection

## Architectural Decisions

- **Civic taxonomy as a first-class data model:** Issues are classified into structured categories (housing, utilities, public safety, schools, transportation, zoning, policing) rather than generic topic modeling. This classification improves over time with user feedback and becomes a defensible data asset.
- **Platform-agnostic ingestion pipeline:** Each social platform has its own adapter/connector so we can swap data providers without rebuilding the core system. Reddit, X, and TikTok each have different data shapes, rate limits, and content norms.
- **Supabase Row Level Security:** Multi-tenant data isolation enforced at the database level. Each organization can only access their own saved searches, reports, and alert configurations.
- **Batch + real-time hybrid:** Weekly/monthly batch jobs for historical analysis and trend computation. Near-real-time processing for alert-worthy spikes and breaking civic events (boil water notices, police incidents, policy announcements).
- **AI as an analysis layer, not a chatbot:** Claude API runs as a backend service for sentiment scoring, thread summarization, and insight extraction. Users interact with structured dashboards and reports, not a conversational interface.
- **No credit system:** Previous credit-based pricing model has been removed. Subscriptions are flat-rate with search limits per tier. Simpler for users, simpler to build.

## User Experience Principles

- **Clarity over completeness.** Civic comms teams are small (often 1-2 people). They need signal, not noise. Every screen should surface the most important insight first and let users drill deeper on demand.
- **Guided discovery.** Customer discovery revealed that users try to use the tool like ChatGPT — asking questions instead of entering search terms. The UI must guide users toward effective searches with prompt suggestions, example queries, and contextual tooltips.
- **Actionable by default.** Every insight should connect to a potential action: respond to this thread, prepare talking points for this issue, brief leadership on this sentiment shift. Data without context is just noise.
- **Report-ready output.** Comms professionals need to brief leadership, prepare for council meetings, and justify messaging decisions. Every analysis should be exportable as a polished PDF or shareable link.
- **Time-aware context.** Social conversations are time-sensitive. A snowstorm, a police incident, or a viral TikTok can dominate results. Time filters and source toggles must be prominent and intuitive so users can isolate signal from temporal noise.

## Success Criteria

- **10 paying customers within 90 days of launch** — validates PMF across target segments
- **$5K MRR within 12 months** — proves sustainable revenue trajectory
- **Monthly churn below 8%** — indicates the tool is part of regular workflow, not a novelty
- **Sentiment accuracy >80% on colloquial/informal language** — the core technical differentiator vs. Brandwatch and legacy tools
- **Coverage of 6+ social platforms** at launch — cross-platform aggregation is table stakes
- **NPS score above 40** from early adopters
- **At least 1 government comms team as a paying customer** within 6 months — validates the civic use case beyond marketers and creators

## Target Segments (Validated by Customer Discovery)

Pricing is uniform across all segments — Pro ($99/month), Agency ($249/month), Business ($499/month). Customers self-select based on search volume and team size, not industry.

| Segment | Key Need |
|---------|----------|
| Political content creators | Trending topic discovery, audience sentiment, content research |
| Brand marketers / agencies | Cross-platform research, campaign validation, client reporting |
| Local government comms | Constituent sentiment, crisis monitoring, council prep |
| Civic organizations / nonprofits | Community pulse, issue tracking, grant reporting data |
| Trust & safety teams | Real-time discourse monitoring, coded language detection |

## Key User Workflows

1. **Search & Monitor** — User enters a civic topic, neighborhood, or policy issue → gets aggregated results across all platforms with sentiment overlay and source breakdown
2. **Sentiment Analysis** — AI classifies sentiment accurately across colloquial language, slang, and informal civic discourse → users see at-a-glance sentiment distribution without manual re-classification
3. **Alert & Spike Detection** — System detects unusual volume or sentiment shifts on monitored topics → sends email/Slack notification within 15 minutes
4. **Report Generation** — User selects a time range and topic → generates a polished PDF briefing with key themes, sentiment trends, notable quotes, and recommended actions
5. **Trend Discovery** — User explores what residents are discussing most across platforms → surfaces emerging issues before they become crises

## Competitive Positioning

| Alternative | Limitation | Civic Voices Advantage |
|-------------|-----------|----------------------|
| Brandwatch / Sprinklr / Meltwater | $30K+/year, annual contracts, built for brand marketing | 10-60x cheaper, month-to-month, civic-native |
| Manual monitoring | Time-intensive, inconsistent, misses cross-platform patterns | Automated, comprehensive, AI-analyzed |
| Google Alerts | Single-platform, no social coverage, no sentiment | Multi-platform, real-time social, AI sentiment |
| GummySearch / BillyBuzz | Built for Reddit prospecting and lead gen | Built for civic discourse and constituent sentiment |
| PR firms / consultants | Expensive, delayed reporting, not real-time | Self-serve, real-time, fraction of the cost |

## Defensibility (Moat Over Time)

1. **Civic taxonomy** — Structured understanding of local issue categories that improves with every customer and conversation
2. **Colloquial sentiment model** — AI tuned for how real people talk about civic issues, trained on accumulated corrections and edge cases
3. **Historical discourse data** — Longitudinal datasets on civic conversation patterns create switching costs and analytical depth competitors can't replicate overnight
4. **First-mover in civic social listening** — No current solution is purpose-built for local government at accessible price points
5. **User-generated intelligence** — Sentiment corrections, local context annotations, and issue tagging from users create a proprietary training signal
