# Civic Voices — Master AI Prompt

This document is the single source of truth for product context, architecture, and design decisions. Read it fully before executing any task.

**Overrides:** For pricing, 311 data, and tracked-issue emails, see `docs/PRODUCT_DECISIONS.md`. That document wins when there is conflict.

---

## Product Vision

**One-liner:** Social listening built for cities, not brands.

**Core value prop:** "Know what residents are saying — before the reporter calls."

Civic Voices bridges three layers of civic language:

| Layer | Source | Example |
|-------|--------|---------|
| Citizen voice | Social media, 311 calls | "my daycare just closed, $1800/mo is insane" |
| Civic operations | 311 data, municipal reports | "Childcare facility closure, code enforcement" |
| Legislative action | Bill text, committee hearings | "Childcare subsidy expansion, provider licensing reform" |

The platform ingests Layer 1 (citizen voice), classifies it using a civic taxonomy informed by Layers 2 and 3, and presents results in language that legislative staffers and comms teams recognize.

**What Civic Voices is NOT:**
- Not a general-purpose social media monitoring tool (Brandwatch, Meltwater)
- Not a consumer-facing app
- Not training AI models on platform data — it uses third-party AI (Claude API) for real-time analysis and summarization only
- Not redistributing raw social media posts — only synthesized summaries and trend metrics

---

## Target Users & Pricing

**Primary audience:** City/county communications teams, legislative offices, civic organizations.

**Secondary audience:** Political content creators, policy researchers, marketing professionals monitoring civic sentiment.

**All users get 1 free search + 1 free report on signup before paywall.**

### Pricing Tiers (Uniform across customer segments)

See `docs/PRODUCT_DECISIONS.md` for current pricing decisions. Summary: **flat-rate, no credits. Price may increase over time.**

| Tier | Price | Users | Notes |
|------|-------|-------|-------|
| Pro | $99/mo | 1 | Individual comms professionals |
| Agency | $249/mo | 3 | PR firms, multi-municipality teams |
| Business | $499/mo | 5 | Large cities, regional teams |

- Additional seats: $49/seat/month (Agency & Business)
- All tiers have access to city, state, and national searches
- No credit system — flat-rate subscription

**Stripe product names:** "Pro", "Agency", "Business"

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Visualizations | D3.js |
| Database | PostgreSQL with Prisma ORM (Supabase hosted) |
| Vector search | pgvector (embeddings for semantic search) |
| Auth | Supabase Auth |
| AI/LLM | Claude API (sentiment analysis, classification, briefing generation) |
| Payments | Stripe |
| Email | Loops / Resend / SendGrid |
| Social data | SociaVault API (Reddit, X, TikTok, YouTube) + official Reddit Data API (pending commercial approval) |
| 311 data | Charlotte open data portal (data.charlottenc.gov), expandable to NYC, Boston, LA, DC, Atlanta, Houston, Dallas. **Planned for later — no ingestion until data available.** |
| Deployment | Vercel |
| Testing | Vitest + React Testing Library + Playwright |

---

## Civic Topic Taxonomy

The taxonomy is derived from three established classification systems:
1. Congress.gov Policy Areas (32 categories, Congressional Research Service)
2. State Legislature Bill Topics (28 policy areas, Comparative Agendas Project, 1.36M state bills)
3. 311 Service Request Categories (municipal open data portals)

### Categories (8 total, sorted by default signal score)

| Category | Icon | Subcategories |
|----------|------|---------------|
| Public Safety & Justice | ◈ | Policing & Reform, Gun Violence, Immigration Enforcement, Criminal Justice Reform, Domestic & Sexual Violence, Traffic & Pedestrian Safety, Juvenile Justice |
| Health & Human Services | ✚ | Healthcare Access, Childcare, Mental Health, Elder Care, Food Security, Substance Abuse, Maternal Health |
| Housing & Development | ⌂ | Affordable Housing, Homelessness, Zoning & Land Use, Gentrification & Displacement, Rental Protections, Public Housing |
| Democracy & Governance | ⬢ | Voting Rights, Redistricting, Government Transparency, Campaign Finance, Civil Rights |
| Education & Workforce | ▦ | K-12 Education, Teacher Compensation, Higher Education, Workforce Development, Youth Programs, School Safety |
| Economic Development | ◆ | Cost of Living, Small Business, Tax Policy, Minimum Wage & Labor, Rural Development |
| Infrastructure & Transit | ⬡ | Road & Bridge Conditions, Public Transit, Water & Sewer, Broadband Access, Energy & Utilities, Sidewalks & Pedestrian |
| Environment & Climate | ◉ | Air Quality, Water Quality, Waste & Recycling, Climate Resilience, Green Space & Parks, Environmental Justice |

Each subcategory has associated:
- **311 Signal Topics** — related municipal service request types
- **Social Listening Keywords** — colloquial language patterns from social media
- **Sample Bill Language** — phrases from actual legislation (for classifier training)

The taxonomy is not static. New issues emerge and the system should track unclassified-but-civic posts, cluster them monthly, and surface candidates for taxonomy additions.

---

## Legislative Signal Score

A composite score (0-100) indicating how much legislative attention an issue warrants.

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Volume | 20% | Post count in last 30 days vs. baseline |
| Velocity | 20% | Rate of increase |
| Sentiment intensity | 15% | % negative + strength of language |
| Cross-platform consistency | 15% | Same issue across Reddit AND X AND TikTok? |
| 311 correlation | 15% | Are 311 reports also increasing? |
| Engagement | 10% | Are posts getting high engagement? |
| Geographic concentration | 5% | Focused in specific districts? |

**Score interpretation:**
- 0-25: BASELINE — background noise
- 26-50: EMERGING — worth monitoring
- 51-75: ACTIVE — constituents are paying attention
- 76-100: URGENT — high volume, negative sentiment, growing fast, validated by 311

**IMPORTANT:** When the polling tier (tracked issues) recalculates signal scores, it must reference the nightly batch baseline. Signal scoring is relative — "immigration is trending because it's 3x more active than education." Without the baseline, tracked issues will always appear hot because they're measured in isolation.

---

## Data Pipeline Architecture (Hybrid Model)

Three tiers of data freshness, designed to balance speed, API cost, and user experience.

### Tier 1: Nightly Batch (The Workhorse)

**Schedule:** Cron job at 2-3am daily.

**What it does:**
1. Scans all 8 taxonomy categories across all 4 platforms (Reddit, X, TikTok, YouTube)
2. Runs the 5-step classification pipeline on every ingested post:
   - Step 1: Civic Relevance Filter (binary: civic or not — use Haiku for speed)
   - Step 2: Taxonomy Classifier (category + subcategory — LLM multi-label, batch 10-20 posts per call)
   - Step 3: Sentiment Analysis (positive/negative/mixed with civic context awareness)
   - Step 4: Bot & Verification Filter (account age, frequency, duplicates, engagement anomalies)
   - Step 5: Geo-Inference (subreddit → city/state, user profile location, hashtags, 311 address data)
3. Computes signal scores and trend deltas for every subcategory
4. Writes results to `daily_snapshots` table in Supabase

**Storage format:** Each row = date + subcategory + geo_scope + pre-computed JSON blob containing posts, sentiment breakdown, signal score, volume, and trend data.

**Dashboard reads** against today's snapshot are a single indexed query. Fast.

**Cost optimization:**
- Use Haiku for the binary relevance filter (runs on every post)
- Batch classify 10-20 posts per API call for taxonomy classification
- Route ambiguous posts to Sonnet, straightforward posts to Haiku
- Cache subreddit/account civic relevance decisions (if r/CharlottePolitics is 95% civic, auto-pass)

### Tier 2: Tracked Issue Polling (The Alert Layer)

**Schedule:** Every 2-4 hours.

**What it does:**
1. Queries the `tracked_issues` table to see which subcategories at least one user is actively tracking
2. Runs targeted API pulls ONLY for those specific subcategories (small query surface)
3. Appends new posts to a `live_updates` table
4. Recalculates signal scores for just those subcategories (using nightly batch as baseline)
5. Triggers alerts (email/SMS via Loops) if signal score crosses a threshold

**Daily emails for tracked issues:** Users who track topics receive daily digest emails. See `docs/PRODUCT_DECISIONS.md` for implementation options (link TrackedTopic to Alert vs. dedicated cron).

**Dashboard merges** the daily snapshot with any live updates on read. Still fast — joining a small table.

**Key constraint:** Signal score recalculation MUST reference the batch baseline to avoid score drift.

### Tier 3: On-Demand Search (User-Initiated)

**Trigger:** User types a custom query in the search bar.

**What it does:**
1. Hits platform APIs in real time
2. Runs classification + sentiment pipeline
3. Returns results with a loading state (this is the only path with a spinner)
4. Caches results for 1 hour (same query by another user = instant)

**Three search modes:**
1. **Taxonomy Browse** — User clicks category/subcategory tile → direct DB query on classified data. Fastest.
2. **Constrained Search** — User types in search bar → autocomplete suggests matching subcategories. Once selected, queries the classified index.
3. **Semantic Search (fallback)** — Query doesn't match taxonomy → pgvector similarity search on embeddings. Handles emerging topics. If enough posts cluster around a new topic, flag as potential taxonomy addition.

---

## Database Schema (Supabase)

```sql
-- Core taxonomy
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  congress_gov_mapping TEXT,
  icon TEXT,
  color TEXT,
  sort_order INT
);

CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  bill_language TEXT[],
  three_eleven_signals TEXT[],
  sort_order INT
);

-- Classified posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  platform_id TEXT,
  author TEXT,
  author_verified BOOLEAN,
  content TEXT NOT NULL,
  url TEXT,
  primary_category_id UUID REFERENCES categories(id),
  primary_subcategory_id UUID REFERENCES subcategories(id),
  secondary_category_id UUID REFERENCES subcategories(id),
  secondary_subcategory_id UUID REFERENCES subcategories(id),
  classification_confidence FLOAT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'mixed')),
  inferred_city TEXT,
  inferred_state TEXT,
  inferred_district TEXT,
  geo_confidence FLOAT,
  latitude FLOAT,
  longitude FLOAT,
  engagement_count INT,
  posted_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  embedding VECTOR(1536)
);

-- Nightly batch snapshots
CREATE TABLE daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  subcategory_id UUID REFERENCES subcategories(id),
  geo_scope TEXT CHECK (geo_scope IN ('city', 'state', 'national')),
  geo_value TEXT,
  signal_score INT,
  volume INT,
  trend_delta FLOAT,
  sentiment_breakdown JSONB,
  top_posts JSONB,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, subcategory_id, geo_scope, geo_value)
);

-- Live updates from tracked issue polling
CREATE TABLE live_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  subcategory_id UUID REFERENCES subcategories(id),
  signal_score_delta INT,
  ingested_at TIMESTAMPTZ DEFAULT now()
);

-- User tracked issues
CREATE TABLE tracked_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subcategory_id UUID REFERENCES subcategories(id),
  alert_threshold INT DEFAULT 75,
  alert_channel TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 311 municipal data (planned; no ingestion until data available)
CREATE TABLE three_eleven_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  request_type TEXT,
  description TEXT,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  status TEXT,
  department TEXT,
  primary_category_id UUID REFERENCES categories(id),
  primary_subcategory_id UUID REFERENCES subcategories(id),
  source_url TEXT
);

-- Search cache (1-hour TTL)
CREATE TABLE search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_posts_category ON posts(primary_category_id);
CREATE INDEX idx_posts_subcategory ON posts(primary_subcategory_id);
CREATE INDEX idx_posts_sentiment ON posts(sentiment);
CREATE INDEX idx_posts_platform ON posts(platform);
CREATE INDEX idx_posts_posted_at ON posts(posted_at);
CREATE INDEX idx_posts_district ON posts(inferred_district);
CREATE INDEX idx_posts_embedding ON posts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_snapshots_date ON daily_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_subcategory ON daily_snapshots(subcategory_id);
CREATE INDEX idx_live_updates_subcategory ON live_updates(subcategory_id);
CREATE INDEX idx_tracked_issues_subcategory ON tracked_issues(subcategory_id);
```

---

## AI Classification Pipeline

### Civic Relevance Filter (Step 1)
```
Model: Haiku (fast, cheap — runs on every ingested post)

Prompt: Is this social media post about a civic issue? Respond YES or NO.

Civic issues include: government services, legislation, public policy,
community problems, infrastructure, public safety, education, healthcare,
housing, environment, civil rights, economic conditions, and related topics.

NOT civic: personal life updates, entertainment, sports, product reviews,
memes without civic content, commercial advertising.
```
Cache decisions by subreddit/account. Expected filter rate: ~60-70%.

### Taxonomy Classifier (Step 2)
```
Model: Haiku (straightforward) / Sonnet (ambiguous, routed by confidence)

Prompt: You are a civic topic classifier. Given a social media post about a
civic issue, classify it into ONE primary category and ONE primary subcategory
from the taxonomy below. If the post spans multiple subcategories, return up
to 2 secondary classifications.

Return JSON:
{
  "primary": { "category": "...", "subcategory": "..." },
  "secondary": [{ "category": "...", "subcategory": "..." }],
  "confidence": 0.0-1.0
}

[TAXONOMY INSERTED HERE]
```
Batch classify 10-20 posts per API call.

### Sentiment Analysis (Step 3)
```
Model: Haiku

Prompt: Classify the sentiment of this post about {subcategory} as:
- POSITIVE: supportive of current policy/situation, praising officials,
  expressing satisfaction with services
- NEGATIVE: critical of current policy/situation, expressing frustration,
  calling for change, reporting problems
- MIXED: contains both positive and negative elements, nuanced take

Context matters: "Finally, someone is doing something about childcare"
is POSITIVE (praising action), not negative (despite the issue being bad).
```
Important: Standard sentiment analysis struggles with colloquial language. "That's wild" could be positive or negative. The classifier needs civic context.

### AI Briefing Generation
```
Model: Sonnet

Prompt: You are a legislative intelligence analyst. Given these {n} social
media posts and 311 reports about {identified_subcategory} in {location} from the past
{timeframe}, generate a briefing for a state legislator's office.

Include:
- 2-3 sentence summary of the dominant narrative
- Key data points (costs mentioned, statistics cited, frequency)
- Demographic signals (who is talking about this)
- Legislative signal strength: LOW / MODERATE / HIGH / URGENT
- Potential bill angles (1-2 concrete legislative actions)

Keep it under 150 words. No jargon. Write like a staffer briefing a senator.
```

---

## UI Design System

**Theme:** Warm beige/off-white. NOT dark mode.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#F5F0E8` | Page background |
| Surface | `rgba(0,0,0,0.025)` | Cards, panels |
| Border | `rgba(0,0,0,0.06)` - `rgba(0,0,0,0.08)` | Borders, dividers |
| Text primary | `#2C2519` | Headings, body text |
| Text secondary | `rgba(0,0,0,0.5)` - `rgba(0,0,0,0.65)` | Labels, metadata |
| Text muted | `rgba(0,0,0,0.3)` - `rgba(0,0,0,0.35)` | Hints, timestamps |
| Accent gradient | `linear-gradient(135deg, #D4654A, #D4A24A)` | CTAs, logo, progress bars |
| Header bg | `rgba(245,240,232,0.95)` with `backdrop-filter: blur(24px)` | Sticky header |

**Typography:**
- Display / headings: `'Anybody', 'DM Sans', system-ui, sans-serif`
- Body: `'DM Sans', system-ui, sans-serif`
- Mono / labels: `'DM Mono', monospace`

**Category colors (optimized for light background):**
- Housing: `#D4654A`
- Health: `#4A90D9`
- Safety: `#2E7D32`
- Education: `#D4A24A`
- Infrastructure: `#8B6DB0`
- Environment: `#3D8B6E`
- Democracy: `#B06080`
- Economy: `#C07A3E`

**Platform badge colors (for light background):**
- Reddit: `#D4450A` on `rgba(255,87,34,0.12)`
- X: `#505050` on `rgba(80,80,80,0.08)`
- TikTok: `#00897B` on `rgba(0,137,123,0.1)`
- YouTube: `#CC0000` on `rgba(204,0,0,0.08)`

**Sentiment colors (for light background):**
- Positive: `#2E7D32`
- Negative: `#C62828`
- Mixed: `#E65100`

**Signal score colors:**
- Urgent (76-100): `#C62828`
- Active (51-75): `#E65100`
- Emerging (26-50): `#1565C0`
- Baseline (0-25): `#2E7D32`

**Key UI patterns:**
- Cards use `rgba(0,0,0,0.025)` background with `rgba(0,0,0,0.06)` border
- Hover states increase border opacity slightly
- Category cards have a left border accent in their category color
- Animations: `fadeUp 0.4s ease` with staggered delays per card
- Signal meters are circular SVG progress indicators
- Sentiment bars are horizontal stacked bars (negative | mixed | positive)

---

## Geo Scoping

Users set their state and city during onboarding. The dashboard defaults to their city.

**Three geo scopes:**
- **City** — shows only posts geo-tagged to the user's city
- **State** — shows city + state-level posts
- **National** — shows all posts

**Platform geo-filtering availability:**
- Reddit: full (subreddit-based)
- X: limited at city/state (user profile location field)
- TikTok: full (hashtag and creator-based)
- YouTube: limited at city/state

**District mapping:** Once city/state is inferred, map to legislative districts using GIS boundary data from state redistricting commissions.

---

## Social Keyword Search & Geo Indexing

### Social Keyword Query Construction

**Goal:** Maximize relevant post recall from platform APIs while avoiding query bloat.

**Current:** Each subcategory has `socialKeywords[]` and `searchQuery` (name + top 4 keywords). Single combined query per search yields sparse results for some subcategories.

**Target behavior:**
- Use 3–5 top social keywords per subcategory for broader recall
- Prefer high-volume, low-noise keywords (e.g., "childcare" over rare phrases)
- Support OR-style broadening where platform APIs allow (e.g., Reddit, X)
- Preserve subcategory name in query for context
- Cache key must include `timeFilter` when time range is configurable

**Query format:** `{subcategoryName} {keyword1} {keyword2} {keyword3}` — space-separated, platform-dependent handling for boolean/OR if supported.

### Parallel Multi-Query Search (Sparse Results Fix)

**Goal:** Increase post recall by running 2–4 focused queries per subcategory and merging results.

**Strategy:**
- Primary query: subcategory name + top 2 keywords (current baseline)
- Variant queries: keyword pairs or single high-volume terms from `socialKeywords`
- Run variants in parallel when primary returns fewer than N posts (e.g., 15), or always for IssueDetailView
- Merge and deduplicate by `post.id`; prefer primary-query relevance when sorting
- Respect platform rate limits; cap concurrent queries per platform

**Progressive display:** Posts show as each platform completes via streaming (`/api/search/stream`); default on. Set `NEXT_PUBLIC_FEATURE_STREAMING_SEARCH=false` to disable.

**Implementation:** See `docs/PARALLEL_SEARCH_INSIGHTS_PLAN.md` (P6.1–P6.5).

### AI Coverage Insights (Deferred)

**Goal (future):** Surface explicit insights about what data was returned and its limitations (platform breakdown, data quality note, recommendation). On hold.

### Geo Indexing (City, State, National)

**Search params:** `state` (code, e.g., "NC") and `city` (name or id — must be consistent).

**Indexing behavior by scope:**

| Scope   | API params                | Reddit                          | X / TikTok                            |
|---------|---------------------------|---------------------------------|----------------------------------------|
| National| No state, no city         | Broad search, no subreddit filter | Broad search                          |
| State   | `state` only              | State subreddits + all city subreddits in state | Query suffix: `in {state}` |
| City    | `state` + `city`          | City-specific subreddits only   | Query suffix: `in {city}, {state}`     |

**Critical:** Reddit subreddit lookup uses city **id** (e.g., `charlotte`), not display name. Location storage may use city name; resolve name → id via `data/cities.json` before calling `getSubredditsForLocation(state, cityId)`.

**Cache keys:** Include geo in cache to avoid cross-scope pollution: `{subcategoryId}:{state}:{city}:{timeFilter}`. Use `"n"` for national (no state/city).

### Social Post View Filters

**Legislative dashboard (IssueDetailView) filters:**
- **Platform:** All, Reddit, X, TikTok, YouTube — client-side filter on `post.platform`
- **Sentiment:** All, Negative, Neutral, Positive — client-side filter on `post.sentiment`
- **Geo:** Inherited from search scope (city/state/national); no post-level geo filter in UI (posts are pre-scoped by API)

**Implemented:** Time range selector (7d / 3m / 12m); credibility filter ("Verified only").

**Implementation plans:**
- `docs/SOCIAL_KEYWORD_GEO_PLAN.md` — P1–P5 (geo, keywords, time, filters, cache) — done
- `docs/PARALLEL_SEARCH_INSIGHTS_PLAN.md` — P6 (parallel multi-query, AI coverage insights)

---

## Onboarding Flow

1. **Step 1:** Name + Role (dropdown: State Senator, State Representative, Legislative Staffer, City Council Member, Mayor's Office, County Commissioner, Campaign Manager, Political Consultant, Tech Policy Professional, Civic Organization Leader, Nonprofit Leader, Government Communications, Policy Researcher, Other)
2. **Step 2:** State (dropdown) + City (dynamic dropdown based on state) + District (optional text input)
3. **Launch Dashboard** — defaults to city geo scope

Include a "Skip — use demo profile (Charlotte, NC)" link for quick demo access.

---

## Feature Roadmap Context

**Validated through customer discovery:**
- $100-300/month pricing willingness across segments
- Pain points: manual cross-platform checking, expensive existing tools with annual contracts, poor sentiment analysis for colloquial language
- Key features requested: trend/topic tracking, alerts (email/SMS), verified source indexing, key accounts/creators on dashboard, mobile-first design
- Prediction market integration (Polymarket/Kalshi) as a differentiated signal layer — no competitor does this

**Implementation phases:**
1. Taxonomy + Classification pipeline
2. 311 Data Integration (Charlotte first) — **planned; no ingestion until data available**
3. Search + AI Briefing generation + Signal scoring
4. Multi-city expansion (NYC, Boston, LA, DC, Atlanta, Houston, Dallas)

**Future features (validated but not yet built):**
- Client workspaces (Agency tier)
- Alert system (email/SMS when signal score crosses threshold)
- Daily emails for tracked issues — **see docs/PRODUCT_DECISIONS.md**
- Prediction market odds integration
- White-label / API access for partner resale
- Mobile-first responsive design
- SOC 2 compliance (for government sales)

---

## Reddit API Compliance

Civic Voices is pursuing official Reddit commercial API access. Key positioning:
- We use Reddit data as INPUT for third-party AI analysis, NOT for model training
- We do not redistribute raw Reddit posts — only synthesized summaries and trend metrics
- We link back to source content
- We are transparent about our use case per the Responsible Builder Policy
- SociaVault is used for MVP/validation; official API is the production target

---

## Development Principles

- **No em dashes** in any user-facing copy or communications
- **Direct, authentic messaging** — no corporate jargon
- **Mobile-first** is the target UX direction
- **Claude Code** is the primary development tool
- Keep API costs predictable — batch processing over real-time where possible
- 311 data has documented demographic bias (higher-income neighborhoods generate more calls) — note this in the tool
- Taxonomy maintenance: track unclassified civic posts, cluster monthly, surface candidates for new subcategories
- Quarterly taxonomy review: cross-reference against bills introduced in the current legislative session
