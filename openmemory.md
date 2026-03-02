# Civic Voices - Project Guide

## Overview

**Civic Voices** is a cross-platform conversation discovery and analysis tool that aggregates and analyzes public discussions across major social media platforms (X/Twitter, TikTok, Instagram, Reddit, YouTube, LinkedIn). The platform provides AI-powered insights, sentiment analysis, and pattern detection without re-hosting content - all results link back to original sources.

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, PostgreSQL (Prisma ORM via Supabase)
- **Authentication:** Supabase Auth (migrated from Firebase)
- **Charts:** D3.js for interactive visualizations
- **External APIs:**
  - X/Twitter: The Old Bird V2 via RapidAPI (primary) or Official X API v2 (fallback)
  - TikTok: TikAPI.io
  - YouTube: YouTube Data API v3
  - Bluesky: AT Protocol API (authenticated)
  - AI: Anthropic Claude (Haiku for analysis)
- **Testing:** Vitest, Playwright, React Testing Library

**Single source of truth:** `docs/MASTER_PROMPT.md` — product vision, taxonomy, data pipeline, schema, AI prompts, UI design.

**Product Decisions:** See `docs/PRODUCT_DECISIONS.md` for pricing (flat-rate, no credits), 311 planning, and tracked-issue daily emails. That doc overrides MASTER_PROMPT when in conflict.

**Key Principles:**
- Read-only system (no posting, commenting, or engagement automation)
- Privacy-focused (no user profiling, no ML model training on platform data)
- Multi-platform aggregation with unified Post interface
- AI-powered analysis with fallback handling

## Architecture

### Application Structure

```
civic-voices/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── [...nextauth]/    # NextAuth handler
│   │   │   └── signup/           # User registration
│   │   ├── search/               # Search endpoints
│   │   │   ├── route.ts          # Main search API
│   │   │   ├── save/             # Save search to database
│   │   │   └── history/          # Get search history
│   │   └── report/               # Report endpoints
│   │       ├── start/            # Start report generation
│   │       └── [id]/             # Get report data
│   ├── components/               # Page-specific components
│   │   ├── AuthModal.tsx         # Authentication modal
│   │   ├── SearchHistoryModal.tsx # Search history modal
│   │   ├── SearchHistorySidebar.tsx # Search history sidebar
│   │   ├── QuerySuggestions.tsx  # AI query suggestions
│   │   ├── SkeletonCard.tsx      # Loading skeleton
│   │   └── report/               # Report dashboard components
│   │       ├── index.ts          # Component exports
│   │       ├── MetricsRow.tsx    # 5-metric cards with info icons
│   │       ├── ActivityChart.tsx # Dual-axis D3 line chart (Views/Mentions)
│   │       ├── EmotionsBreakdown.tsx  # 6-emotion horizontal bars
│   │       ├── ContentBreakdown.tsx   # Category breakdown with tabs
│   │       ├── TopicsTable.tsx   # Sortable expandable topics table
│   │       ├── SentimentBreakdown.tsx # Legacy 3-sentiment view
│   │       ├── PlatformBreakdown.tsx  # Platform distribution chart
│   │       ├── KeyThemes.tsx     # Theme tag chips
│   │       └── TopPosts.tsx      # Top engaging posts list
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx       # Supabase Auth state
│   ├── page.tsx                  # Landing page
│   ├── search/                   # Search interface
│   │   ├── page.tsx              # Main search page (dashboard/subcategory/issue-detail views)
│   │   └── components/
│   │       ├── SubcategoryView.tsx   # Grid of subcategory cards after clicking category
│   │       ├── IssueDetailView.tsx   # Two-column: signal panel + conversation feed
│   │       ├── LegislativeSignalOverview.tsx
│   │       ├── TrendingSubcategories.tsx
│   │       ├── GeoScopeToggle.tsx
│   │       └── PlatformBadges.tsx
│   ├── report/                   # Report dashboard
│   │   └── [id]/                 # Dynamic report view
│   │       ├── page.tsx          # Report dashboard UI
│   │       └── page.test.tsx     # Report page tests
│   ├── research/                 # Legacy research job pages
│   │   └── [jobId]/              # Individual research results
│   ├── auth/                     # Auth callback handlers
│   │   └── callback/             # Supabase auth callback
│   ├── providers.tsx             # App-level providers
│   └── layout.tsx                # Root layout
├── lib/                          # Shared utilities
│   ├── services/                 # Business logic services
│   │   ├── aiAnalysis.ts         # Claude AI analysis
│   │   ├── reportService.ts      # Report generation orchestrator
│   │   ├── sentimentClassification.ts # Sentiment classification
│   │   ├── searchStorage.ts      # Search persistence
│   │   └── tiktokApi.ts          # TikTok API service
│   ├── providers/                # External API providers
│   │   ├── XProvider.ts          # Official X/Twitter API v2
│   │   ├── XRapidApiProvider.ts  # X via RapidAPI (The Old Bird V2)
│   │   ├── YouTubeProvider.ts    # YouTube Data API v3
│   │   ├── BlueskyProvider.ts    # Bluesky AT Protocol
│   │   └── TruthSocialProvider.ts # Truth Social (Mastodon-based)
│   ├── credibility/              # Source credibility system
│   │   ├── tier1Sources.ts       # Curated Tier 1 sources (~200 globally)
│   │   ├── index.ts              # Credibility scoring & badge assignment
│   │   └── (future: crossref/)   # Fact-check & academic integration
│   ├── data/                     # Static/mock data (under lib/)
│   │   ├── taxonomy.ts           # 9 categories, 56 subcategories with expanded keywords
│   │   │                         # Functions: getQueryVariants(), getGeoQueryVariants()
│   │   └── subcategorySignals.ts # Mock signal scores, issue details, 311 signals
│   ├── types/                    # TypeScript types
│   │   └── api.ts                # API request/response types
│   ├── utils/                    # Utility functions
│   │   ├── booleanQuery.ts       # Boolean query parser
│   │   ├── mentions.ts           # Mention detection
│   │   ├── timeFilter.ts         # Time filter conversion utilities (Phase 1)
│   │   └── geoQueryBuilder.ts    # Platform-specific geo query generation (Phase 3)
│   ├── auth.ts                   # NextAuth configuration
│   ├── config.ts                 # Centralized config (env vars)
│   ├── supabase.ts               # Supabase client
│   ├── supabase-server.ts        # Supabase server client
│   ├── firebase.ts               # Firebase client (legacy)
│   ├── firebase-admin.ts         # Firebase Admin (legacy)
│   └── prisma.ts                 # Prisma client singleton
├── prisma/                       # Database schema
│   ├── schema.prisma             # Prisma schema
│   └── migrations/               # Database migrations
├── vitest.config.ts              # Vitest configuration
├── vitest.setup.ts               # Test setup
└── e2e/                          # Playwright E2E tests
```

### Authentication Architecture

**Dual Authentication System:**
1. **NextAuth.js** - Server-side session management
   - Credentials provider (email/password with bcrypt)
   - Google OAuth (optional)
   - Prisma adapter for database sessions
   - JWT strategy

2. **Firebase Auth** - Client-side authentication
   - Used for client-side state management
   - Firebase ID tokens for API authentication
   - Google OAuth via Firebase
   - Sync endpoint to link Firebase UID with Prisma User

**Flow:**
- Client uses Firebase Auth (`AuthContext`)
- API routes verify Firebase ID tokens (`verifyFirebaseToken`)
- NextAuth handles server-side sessions for traditional auth
- User model supports both `firebaseUid` and `password` fields

### Data Storage

**PostgreSQL (Prisma):**
- User accounts, sessions, research jobs, source results, insights
- Primary database for structured data
- Research jobs track status (PENDING, RUNNING, COMPLETED, FAILED)

**Firestore (Firebase):**
- Search history storage (user searches with filters and results)
- In-memory caching (5-minute TTL) for performance
- Subcollections for search posts
- Used for quick access to user's search history

## User Defined Namespaces

- [Leave blank - user populates]

## Components

### Core Components

**SearchPage (`app/search/page.tsx`)**
- Main search interface with split-screen layout
- Left panel: AI analysis and insights
- Right panel: Posts preview with filters
- Features: Source selection, time range, language filters
- Auto-saves searches for authenticated users
- URL state management for shareable searches

**AuthModal (`app/components/AuthModal.tsx`)**
- Firebase Auth-based authentication modal
- Supports email/password and Google OAuth
- Triggers on protected actions or explicit auth requests

**SearchHistorySidebar (`app/components/SearchHistorySidebar.tsx`)**
- Hover-activated sidebar showing search history
- Loads from Firestore with caching
- Click to re-run searches

**SourceFilter (`components/SourceFilter.tsx`)**
- Multi-select platform filter (X, TikTok, Instagram, etc.)
- Visual platform icons
- Updates URL params

**FilterDropdown (`components/FilterDropdown.tsx`)**
- Reusable dropdown for time range and language filters
- Icon-based UI with consistent styling

**VerificationBadge (`components/VerificationBadge.tsx`)**
- Displays credibility badges for verified sources
- Badge types: official, news, journalist, expert, verified, sourced, context
- Props: `badge` (required), `size` ('sm' | 'md'), `showLabel` (boolean)
- Exports: `VerificationBadge` (main), `VerificationBadgeCompact` (icon-only), `CredibilityIndicator` (score bar)
- Used in search results post cards next to author name

### Landing Page (`app/page.tsx`)
- Marketing site with hero section, use cases, testimonials
- Social proof section with company logos
- Typewriter effect for dynamic messaging
- Responsive design with Tailwind CSS

### Report Dashboard (`app/report/[id]/page.tsx`)

**Professional analytics dashboard with the following components:**

**MetricsRow (`app/components/report/MetricsRow.tsx`)**
- 5 metric cards: Est. engagements, Engagement rate, Est. views, Potential reach, Est. mentions
- Info icon tooltips with descriptions
- Smart number formatting (K, M, B notation)
- Hover shadow effects

**ActivityChart (`app/components/report/ActivityChart.tsx`)**
- Dual Y-axis D3.js line chart
- Blue line for Views (left axis), Orange line for Mentions (right axis)
- Volume/Sentiment tab toggle
- Interactive tooltips on data points
- Star marker on peak points
- Responsive with ResizeObserver

**EmotionsBreakdown (`app/components/report/EmotionsBreakdown.tsx`)**
- 6 emotion categories: Neutral, Joy, Surprise, Sadness, Anger, Fear
- Horizontal progress bars with emoji icons
- Sorted by percentage (highest first)
- Converts 3-sentiment to 6-emotion via `convertSentimentToEmotions()`

**ContentBreakdown (`app/components/report/ContentBreakdown.tsx`)**
- Segmented colored bar showing category proportions
- Tab switcher: Intentions | Category | Format
- 2x2 grid of category cards
- Engagement rate indicators per category

**TopicsTable (`app/components/report/TopicsTable.tsx`)**
- Sortable columns (views, likes, date)
- Expandable rows with details
- Emoji icons for topics
- Sentiment bar (red/green gradient)
- Resonance badges (Low/Medium/High)
- Relative timestamps

### Query Optimization & Geographic Intelligence (Feb 2026)

**Phase 1: Expanded Social Keywords**
- All 46 subcategories (excluding Online Behavior) enhanced with 3-5 colloquial phrases
- Captures diverse demographic language patterns and conversational terms
- Examples: "paycheck to paycheck", "barely making rent", "struggling", "can't afford"
- Location: `lib/data/taxonomy.ts` - `socialKeywords` arrays expanded

**Phase 2: Multi-Query Parallel Search**
- Query variant generator creates 3-4 related searches per subcategory
- Strategy: Base query + colloquial keywords + alternative combos + problem-focused terms
- Runs all variants in parallel, merges results, deduplicates by URL
- Significantly increases post volume without sacrificing relevance
- Functions:
  - `getQueryVariants(subcategoryId, maxVariants)` - Generate query variants
  - `getGeoQueryVariants(subcategoryId, state?, city?, maxVariants)` - With geo context
- API Integration:
  - `SearchParams.queryVariants?: string[]` - Triggers multi-query mode
  - `/api/search` - Recursive calls for each variant, merge & dedupe
  - `/api/legislative/signals` - Auto-enabled with `useVariants` param (default true)

**Phase 3: Platform-Specific Geographic Intelligence**
- Each platform has unique geo capabilities:
  - **X (Twitter)**: `near:` operator (e.g., "affordable housing near:Charlotte")
  - **Reddit**: Location-based subreddit filtering (handled by `getSubredditsForLocation`)
  - **TikTok**: Append location to query (e.g., "police reform in North Carolina")
  - **YouTube**: Append location to query for regional content
  - **Bluesky/Truth Social**: Append location to query (no native geo APIs)
- Utility: `lib/utils/geoQueryBuilder.ts`
  - `buildPlatformGeoQuery(platform, baseQuery, geoContext)` - Routes to platform strategy
  - `determineGeoScope(state?, city?)` - Returns 'national' | 'state' | 'city'
- Integration: `app/api/search/route.ts` - Applied before each platform search

**Phase 4: Time Filter Standardization**
- Unified time filter utility for consistent time range handling
- Converts "7d", "3m", "12m", "all" to platform-specific formats:
  - Reddit: "week" | "month" | "year" | "all"
  - X/YouTube/Bluesky: ISO 8601 date strings
  - TikTok: Days count
- Utility: `lib/utils/timeFilter.ts`
  - `timeFilterToDays(filter)` - Convert to day count
  - `timeFilterToISODate(filter)` - Convert to ISO 8601
  - `timeFilterToPlatformParams(filter)` - Platform-specific params object
  - `parseTimeFilter(value)` - Validate and parse with fallback

**Cache Key Bug Fix:**
- Legislative signals cache now includes ALL parameters affecting results:
  - Before: `subcategoryId-state-city-timeFilter`
  - After: `subcategoryId-state-city-timeFilter-sources-language-variantsKey`
- Prevents stale cache hits when parameters change
- Client-side cache key matches server-side for consistency

## Patterns

### API Provider Pattern

**Provider Classes:**
- `XProvider` (`lib/providers/XProvider.ts`) - X/Twitter API with retry logic, rate limiting, language filtering, and 7-day time clamping
- `TikTokApiService` (`lib/services/tiktokApi.ts`) - TikTok API integration

**Common Interface:**
- All providers transform platform-specific responses to unified `Post` type
- Time range filtering standardized (`1d`, `7d`, `3m`, `12m`)
- Error handling with platform-specific error types

**Post Normalization:**
```typescript
interface Post {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  platform: "x" | "tiktok" | "reddit" | "instagram" | "youtube" | "linkedin" | "bluesky" | "truthsocial";
  engagement: { likes, comments, shares, views? };
  url: string;
  createdAt: string;
  thumbnail?: string;

  // Credibility system (Phase 1)
  authorMetadata?: AuthorMetadata;
  credibilityScore?: number;      // 0-1 computed score
  credibilityTier?: 'official' | 'news' | 'journalist' | 'expert' | 'verified' | 'unknown';
  verificationBadge?: VerificationBadge;
}

interface AuthorMetadata {
  followersCount?: number;
  followingCount?: number;
  accountAgeDays?: number;
  isVerified?: boolean;
  bio?: string;
  profileUrl?: string;
  pronouns?: string;
  inferredGender?: string;
}
```

### Credibility System (Phase 1 Complete)

**Three-Tier Source System:**
1. **Tier 1 - Known Sources (Curated):** ~200 editorially verified sources across platforms
   - Categories: Official (governments), News (wire services, major outlets), Journalist, Expert
   - Base scores: 0.80 - 0.95
   - Stored in `lib/credibility/tier1Sources.ts`

2. **Tier 2 - Inferred Credibility (Dynamic):** All non-Tier1 sources
   - Computed from: account age, followers, platform verification
   - Base scores: 0.20 - 0.70

3. **Tier 3 - Cross-Referenced (Future):** Claims checked against fact-checkers/academic sources

**Credibility Scoring Formula:**
```
Final Score = (Credibility × 0.4) + (Engagement × 0.3) + (Recency × 0.3)
```

**Verification Badges:**
- 🏛️ Official (blue) - Government, institutions
- 📰 News (purple) - Major news outlets
- ✍️ Journalist (indigo) - Credentialed reporters
- 🎓 Expert (teal) - Academics, researchers
- ✓ Verified (gray) - Platform verified accounts
- ✓ Sourced (green) - Cross-referenced claims (Phase 3)
- ⚠️ Context (amber) - Disputed claims (Phase 3)

**VerificationBadge Component (`components/VerificationBadge.tsx`):**
```typescript
// Main badge component with configurable size and label visibility
<VerificationBadge badge={post.verificationBadge} size="sm" showLabel={true} />

// Compact version (icon only with tooltip)
<VerificationBadgeCompact badge={post.verificationBadge} />

// Credibility score indicator (progress bar)
<CredibilityIndicator score={post.credibilityScore} />
```

**Badge Styles:**
| Type | Background | Text | Icon |
|------|------------|------|------|
| official | bg-blue-100 | text-blue-700 | 🏛️ |
| news | bg-purple-100 | text-purple-700 | 📰 |
| journalist | bg-indigo-100 | text-indigo-700 | ✍️ |
| expert | bg-teal-100 | text-teal-700 | 🎓 |
| verified | bg-gray-100 | text-gray-700 | ✓ |
| sourced | bg-green-100 | text-green-700 | ✓ |
| context | bg-amber-100 | text-amber-700 | ⚠️ |

**Verified Only Filter:**
- Toggle button in search results filters row
- Filters to show only posts with:
  - `verificationBadge` present, OR
  - `credibilityScore >= 0.7`
- State: `const [verifiedOnly, setVerifiedOnly] = useState(false);`
- Applied client-side: `.filter((post) => !verifiedOnly || post.verificationBadge || (post.credibilityScore >= 0.7))`

**Sort Options:**
- `relevance` (default): Weighted score
- `recent`: By timestamp, credibility tiebreaker
- `engaged`: By raw engagement, credibility tiebreaker
- `verified`: Filter to high-credibility only

### Search Flow Pattern

1. **User Input** → Search query, sources, filters
2. **Query Expansion (Phase 2)** → Generate query variants for broader coverage (optional)
3. **Geographic Contextualization (Phase 3)** → Apply platform-specific geo strategies
4. **API Aggregation** → Parallel fetching from selected platforms (or parallel multi-query)
5. **Normalization** → Transform to unified Post format with author metadata
6. **Deduplication** → Merge and dedupe posts by URL (if using query variants)
7. **Credibility Scoring** → Calculate scores and assign badges
8. **AI Analysis** → Claude API generates insights (with fallback)
9. **Response** → Combined posts + AI analysis + credibility summary
10. **Auto-Save** → If authenticated, save to database

**Multi-Query Parallel Search (Phase 2):**
- Enabled via `queryVariants` parameter in SearchParams
- Runs 3-4 related queries simultaneously to increase post volume
- Merges and deduplicates results by post URL
- Used automatically by `/api/legislative/signals` for taxonomy-based searches
- Configurable with `useVariants` and `maxVariants` query parameters

### Error Handling Pattern

- Platform errors are caught and logged, but don't fail entire search
- `platformCounts` tracks successes/failures per platform
- AI analysis failures fall back to basic summary
- Rate limiting handled with retry logic (XProvider)

### Configuration Pattern

**Centralized Config (`lib/config.ts`):**
- All environment variables accessed through single config object
- Validation on startup (throws if required vars missing)
- Type-safe configuration interface
- No direct `process.env` access elsewhere

### Caching Pattern

**Search History Cache (`lib/services/searchStorage.ts`):**
- In-memory Map with TTL (5 minutes)
- Cache key: `userId:query:limit`
- Automatic cleanup of stale entries
- Cache invalidation on write operations

**Legislative Signals Cache:**
- Server: `unstable_cache` in `/api/legislative/signals` route, 1h TTL, key `subcategoryId+state+city`
- Client: Shared `legislativeSignalsCache` state in search page, passed to SubcategoryView and IssueDetailView
- Avoids duplicate fetches: SubcategoryView stores full response, IssueDetailView reuses when navigating

### Testing Patterns

- **Unit Tests:** Vitest with React Testing Library
- **E2E Tests:** Playwright for critical user flows
- **Test Files:** Co-located with source (`.test.ts`, `.test.tsx`)
- **Test Setup:** `vitest.setup.ts` for global test configuration

## Services

### AIAnalysisService (`lib/services/aiAnalysis.ts`)

**Purpose:** Generate AI-powered insights from search results

**Features:**
- Uses Anthropic Claude API (claude-3-haiku-20240307)
- Generates: interpretation, key themes, sentiment breakdown, suggested queries
- Includes filter context in prompts (time range, language, sources)
- Fallback analysis if API fails
- Limits post context to 15 posts to avoid token limits

**Response Structure:**
```typescript
interface AIAnalysis {
  interpretation: string;
  keyThemes: string[];
  sentimentBreakdown: { overall, summary };
  suggestedQueries: { label, query }[];
  followUpQuestion: string;
}
```

### SearchStorageService (`lib/services/searchStorage.ts`)

**Purpose:** Manage search history in Firestore

**Features:**
- Save searches with posts subcollection
- Get search history with caching
- Delete and rename searches
- Cache invalidation on mutations
- Ownership verification

**Collections:**
- `searches` - Main search documents
- `searchPosts` - Subcollection of posts per search

### X/Twitter Providers

**XRapidApiProvider (`lib/providers/XRapidApiProvider.ts`)** - Primary

**Purpose:** X/Twitter API via RapidAPI (The Old Bird V2)

**Features:**
- Significantly cheaper than official API ($180/mo for 1M tweets vs $5000/mo)
- Search, user lookup, tweet details
- Automatic retry on rate limits and server errors
- Extracts author metadata (followers, account age, verification)
- Client-side time range filtering
- Custom error types (`XRapidApiRateLimitError`, `XRapidApiError`)

**XProvider (`lib/providers/XProvider.ts`)** - Fallback

**Purpose:** Official X/Twitter API v2 integration

**Features:**
- Used when RapidAPI key not configured
- 7-day time clamping (API limitation)
- Rate limit handling with retry logic

### YouTubeProvider (`lib/providers/YouTubeProvider.ts`)

**Purpose:** YouTube Data API v3 integration

**Features:**
- Search with video statistics (views, likes, comments)
- Thumbnail extraction
- Time range filtering via `publishedAfter/publishedBefore`
- Rate limit handling

### BlueskyProvider (`lib/providers/BlueskyProvider.ts`)

**Purpose:** Bluesky AT Protocol API integration

**Features:**
- Authenticated search via app password
- Author metadata extraction
- Time range filtering via `since/until`
- Language filtering

### TikTokApiService (`lib/services/tiktokApi.ts`)

**Purpose:** TikTok API integration via TikAPI

**Features:**
- Handles multiple response formats from TikAPI
- Flexible field mapping (handles variations in API responses)
- Client-side time range filtering (API doesn't support it)
- Transforms to unified Post format

### ReportService (`lib/services/reportService.ts`)

**Purpose:** Orchestrate report generation with sentiment classification and AI analysis

**Features:**
- Start report from saved search (`startReport`)
- Get complete report data (`getReport`)
- Get report status for polling (`getReportStatus`)
- Uses Prisma transactions for batch operations (connection pool safe)
- Integrates SentimentClassificationService for 3-sentiment analysis
- Integrates AIAnalysisService for detailed insights

**Report Data Structure:**
```typescript
interface ReportData {
  report: { id, query, sources, status, createdAt, completedAt };
  metrics: ReportMetrics;
  activityOverTime: ActivityDataPoint[];
  posts: Post[];
  aiAnalysis: AIAnalysis | null;
  topPosts: Post[];
}
```

### SentimentClassificationService (`lib/services/sentimentClassification.ts`)

**Purpose:** Classify post sentiment using Claude API

**Features:**
- Batch classification with batched API calls
- Returns "positive", "negative", or "neutral"
- Graceful fallback to "neutral" on errors
- Rate limit handling

## Database Schema

### Prisma Models

**User:**
- Supports both Firebase UID and password auth
- Relations: researchJobs, searches, accounts, sessions

**ResearchJob:**
- Tracks research queries with status (PENDING, RUNNING, COMPLETED, FAILED)
- Stores query as JSON (flexible query parameters)
- Tracks timing (createdAt, startedAt, completedAt)
- Relations: sourceResults, insights, searches

**Search:**
- User's saved searches
- Stores query text, sources, filters as JSON
- Optional link to ResearchJob (reportId)
- Indexed by userId and createdAt

**SourceResult:**
- Individual content items from platforms
- Stores platform, external ID, URL, text, raw JSON
- Unique constraint: (jobId, source, externalId)
- Indexed by jobId, source, and createdAt

**Insight:**
- LLM-generated analysis for research jobs
- Stores output as JSON, model name, token count
- Indexed by jobId and createdAt

**Source Enum:**
- REDDIT, X, TIKTOK, YOUTUBE, LINKEDIN, INSTAGRAM

## API Routes

### `/api/search` (POST)

**Purpose:** Main search endpoint

**Request:**
```typescript
{
  query: string;
  sources: string[];
  timeFilter: "1d" | "7d" | "3m" | "12m";
  language?: string;
}
```

**Response:**
```typescript
{
  posts: Post[];
  summary: {
    totalPosts: number;
    platforms: Record<string, number>;
    sentiment: { positive, negative, neutral };
    timeRange: { start, end };
  };
  query: string;
  aiAnalysis?: AIAnalysis;
}
```

**Flow:**
1. Validates query and sources
2. Fetches from selected platforms in parallel
3. Aggregates and sorts posts by date
4. Generates AI analysis (if API key available)
5. Returns combined response

### `/api/search/save` (POST)

**Purpose:** Save search to Firestore

**Auth:** Firebase ID token required

**Request:**
```typescript
{
  queryText: string;
  name?: string;
  sources: string[];
  filters: { timeFilter, language? };
  totalResults?: number;
  posts?: SearchPost[];
}
```

**Response:**
```typescript
{
  success: true;
  searchId: string;
  message: string;
}
```

### `/api/search/history` (GET)

**Purpose:** Get user's search history

**Auth:** Firebase ID token required

**Query Params:** `query?`, `limit?`

**Response:**
```typescript
{
  searches: SavedSearch[];
  total: number;
  fromCache: boolean;
}
```

### `/api/auth/[...nextauth]` (GET/POST)

**Purpose:** NextAuth.js handler

**Providers:** Credentials, Google OAuth (optional)

**Callbacks:** JWT and session callbacks to include user ID

### `/api/auth/signup` (POST)

**Purpose:** User registration

**Request:**
```typescript
{
  email: string;
  password: string;
  name?: string;
}
```

**Response:**
```typescript
{
  user: { id, email, name };
}
```

### `/api/auth/sync` (POST)

**Purpose:** Sync Firebase UID with Prisma User

**Auth:** Firebase ID token required

**Flow:**
- Verifies Firebase token
- Creates or updates Prisma User with firebaseUid
- Returns user record

## Key Design Decisions

1. **Dual Auth System:** NextAuth for server sessions, Firebase for client state
2. **Unified Post Interface:** All platforms normalized to same structure
3. **Firestore for Search History:** Fast access, separate from main DB
4. **AI Analysis Fallback:** Graceful degradation if API fails
5. **Platform Error Isolation:** One platform failure doesn't break entire search
6. **URL State Management:** Search state in URL for shareability
7. **Provider Pattern:** Extensible platform integrations
8. **Centralized Config:** Single source of truth for environment variables
9. **Caching Strategy:** In-memory cache for frequently accessed data
10. **Read-Only Principle:** No engagement automation, privacy-focused

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - NextAuth base URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Auth
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Admin
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

**Platform APIs (Optional - at least one recommended):**
- `X_RAPIDAPI_KEY` - The Old Bird V2 via RapidAPI (recommended for X/Twitter)
- `X_BEARER_TOKEN` - Official X/Twitter API bearer token (fallback)
- `TIKTOK_API_KEY`, `TIKTOK_API_URL` - TikTok API (TikAPI.io)
- `YOUTUBE_API_KEY` - YouTube Data API v3
- `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD` - Bluesky AT Protocol
- `TRUTHSOCIAL_USERNAME`, `TRUTHSOCIAL_PASSWORD` - Truth Social

**Optional:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `OPENAI_API_KEY` - OpenAI API key (not currently used)

## Testing

**Unit Tests:**
- Component tests with React Testing Library
- Service tests for business logic
- Provider tests for API integrations

**E2E Tests:**
- Critical user flows (landing page, search, authentication)
- Playwright configuration in `playwright.config.ts`

**Test Commands:**
- `npm test` - Run unit tests
- `npm run test:watch` - Watch mode
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:ui` - Playwright UI mode
