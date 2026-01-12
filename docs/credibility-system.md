# Civic Voices Credibility System

> **Last Updated:** January 2026
> **Status:** Phase 1 Complete, Phase 2-4 In Progress

---

## Overview

The Civic Voices credibility system assesses source reliability and content quality using multiple signals, then surfaces the most trustworthy content first. It works dynamically — most content comes from sources we haven't pre-curated, so the system infers credibility in real-time.

### Key Principle: Transparency, Not Gatekeeping

**We display ALL content from ALL sources.** The badge system exists to help users understand source credibility, not to filter or hide content. Users see:
- Posts from verified news outlets with badges
- Posts from everyday users without badges
- Posts from any account, regardless of credibility score

Badges and scores are informational signals that help users make their own judgments about reliability.

## Core Concepts

### 1. Credibility Score (0-1)

Every post receives a credibility score from 0 (unreliable) to 1 (highly authoritative). This score combines:

| Signal Category | Weight | What It Measures |
|-----------------|--------|------------------|
| Source Identity | High | Is this a known outlet, institution, or expert? |
| Platform Signals | Medium | Follower count, account age, platform verification |
| Content Signals | Medium | Citations, named sources, methodology mentioned |
| Cross-Reference | High | Does this claim align with academic/research sources? |
| Red Flags | Negative | Known disinfo, bot behavior, sensationalist framing |

### 2. Three-Tier Source System

**Tier 1: Known Sources (Curated)**
- ~200 editorially verified sources from around the world
- Categories: Government, Wire Services, Major News, Domain Experts
- Regions: International, Europe, North America, Asia-Pacific, Middle East, Africa, Latin America
- Base scores: 0.80 - 0.95
- Examples: @WHO, @Reuters, @BBC, @AlJazeera, @NDTV, @DailyMaverick, @Folha

**Tier 2: Inferred Credibility (Dynamic)**
- All sources not in Tier 1
- Credibility computed from available signals
- Base scores: 0.20 - 0.70
- Adjusts based on account age, followers, content quality

**Tier 3: Cross-Referenced (Validated)**
- Claims checked against authoritative sources
- Academic databases, fact-checkers, official records
- Adds "Sourced" or "Additional context" badges

### 3. Verification Badges

| Badge | Meaning | When Applied |
|-------|---------|--------------|
| ✓ Official | Government, institution | Tier 1 official sources |
| ✓ News | Major news outlet | Tier 1 news sources |
| ✓ Journalist | Credentialed reporter | Verified journalists |
| ✓ Expert | Academic, researcher | Domain experts |
| ✓ Verified | Platform blue check | Platform verification (weaker signal) |
| 📚 Sourced | Claim backed by research | Cross-reference confirmed |
| ℹ️ Additional context | Contradicts authoritative sources | Cross-reference contradiction |

---

## How Ranking Works

### Final Score Formula

```
Final Score = (Credibility × 0.4) + (Engagement × 0.3) + (Recency × 0.3)
```

Credibility gets highest weight to surface reliable sources first.

### Engagement Normalization

Raw engagement is weighted and normalized:
```
Raw = likes + (comments × 2) + (shares × 3)
```
- Comments weighted 2x (indicates discussion)
- Shares weighted 3x (indicates content worth spreading)
- Normalized to 0-1 scale within result set
- Platform-specific: TikTok numbers differ from X

### Recency Decay

- Linear decay over 7 days
- Day 0: score = 1.0
- Day 7: score = 0.0
- Breaking news topics may weight recency higher

### Sort Options

| Option | Behavior |
|--------|----------|
| Relevance (default) | Weighted score (credibility + engagement + recency) |
| Most Recent | By timestamp, credibility as tiebreaker |
| Most Engaged | By raw engagement, credibility as tiebreaker |
| Verified Only | Filter to Tier 1 sources, then by relevance |

---

## How Credibility Scoring Works

### Base Scores by Source Type

| Source Type | Base Score |
|-------------|------------|
| Tier 1 — Official | 0.95 |
| Tier 1 — Wire Services | 0.92 |
| Tier 1 — Major News | 0.90 |
| Tier 1 — Journalist/Expert | 0.80 - 0.85 |
| Tier 2 — Strong signals | 0.50 - 0.70 |
| Tier 2 — Mixed signals | 0.30 - 0.50 |
| Tier 2 — Unknown | 0.20 - 0.30 |
| Flagged sources | 0.05 |

### Dynamic Adjustments

**Positive signals (add to score):**
- Account age > 2 years: +0.05
- Followers > 100K: +0.05
- Bio links to .edu/.gov: +0.10
- Content contains citations: +0.10
- Cross-reference supported: +0.15
- Multiple outlets reporting same: +0.10

**Negative signals (subtract from score):**
- Bot-like patterns: -0.20
- No attribution on claims: -0.15
- Sensationalist framing: -0.10
- Links to known disinfo: -0.30
- Contradicted by research: -0.25

### Score Clamping

Final score is clamped to [0.05, 1.0] to ensure:
- Nothing scores exactly 0 (always some uncertainty)
- Nothing scores above 1.0 (despite additive bonuses)

---

## How Cross-Reference Works

### When to Cross-Reference

Not all topics need academic verification. Priority based on claim type:

| Topic Type | Priority | Reason |
|------------|----------|--------|
| Scientific/medical | High | Misinformation risk; sources exist |
| Statistical claims | High | Verifiable against official data |
| Policy/legal | High | Check legislation, court records |
| Historical | Medium | Academic consensus usually exists |
| Breaking news | Low | No sources available yet |
| Opinion | Low | Not fact-checkable |

### Cross-Reference Sources

| Type | Source | Use Case |
|------|--------|----------|
| Fact-checks | Google Fact Check API, ClaimBuster | Disputed claims |
| Academic | Semantic Scholar, PubMed | Scientific claims |
| Government | Data.gov, Census, BLS | Statistical claims |
| Legal | CourtListener, Congress.gov | Policy claims |

### Progressive Loading Flow

1. User submits search
2. Posts returned immediately with Tier 1/2 scoring
3. Async job extracts claims from high-value posts
4. Claims checked against fact-checkers and academic sources
5. Badges updated via polling (2-3 second delay)
6. AI synthesis includes cross-reference context

---

## How AI Synthesis Works

### Comment Selection Strategy

| Bucket | Allocation | Purpose |
|--------|------------|---------|
| Top Engaged | 60% | Community consensus |
| Recent | 25% | Fresh perspectives |
| Verified/Expert | 15% | Expert credentialed sources |

**Special Rule:** Tier 1 sources bypass engagement thresholds. A CDC expert's comment with 5 likes is included alongside viral content.

### Engagement Thresholds by Platform

| Platform | Minimum | Rationale |
|----------|---------|-----------|
| X/Twitter | 10 likes | Filters noise |
| Reddit | 5 upvotes | More curated voting |
| TikTok | 50 likes | Higher engagement numbers |
| YouTube | 25 likes | Moderate threshold |

### AI Prompt Context

Claude receives:
1. Filtered comments with engagement metrics
2. Credibility tier for each source
3. Cross-reference results (supported/contradicted claims)
4. Instructions to weight by consensus and flag contradictions

### Output Requirements

AI insights include:
- **Confidence level**: High / Medium / Low
- **Signal strength**: "Strong consensus" / "Debated" / "Limited data"
- **Sample size**: "Based on 47 high-engagement comments"
- **Research alignment**: When claim aligns/contradicts academic sources
- **Caveats**: What we couldn't verify

---

## Platform Signal Extraction

### What We Collect from Each Platform

| Platform | Followers | Account Age | Verified | Engagement | Pronouns/Gender |
|----------|-----------|-------------|----------|------------|-----------------|
| X | ✓ | ✓ | ✓ | likes, replies, retweets, views | ✓ (from bio/name) |
| YouTube | ✗ | ✗ | ✗ | views, likes, comments | ✗ (no bio in search) |
| TikTok | ✓ | ✗ | ✓ | likes, comments, shares, views | ✓ (from signature) |
| Bluesky | ✗ | ✓ | ✗ | likes, replies, reposts | ✓ (from display name) |
| Truth Social | ✓ | ✗ | ✗ | likes, replies, shares | ✓ (from display name) |

### Pronoun/Gender Detection

The system extracts pronouns from author bios and display names where available:

- **Detected patterns**: she/her, he/him, they/them, mixed pronouns (she/they), neopronouns (xe/xem)
- **Inferred gender**: male, female, non-binary, other, unknown
- **Storage**: Both raw pronouns and inferred gender stored in database for demographic analysis
- **Privacy note**: This data is derived from publicly displayed profile information

---

## User-Facing Transparency

### Info Button Explanations

| Element | User Sees |
|---------|-----------|
| Relevance sort | "Results ranked by source credibility (40%), engagement (30%), and recency (30%)" |
| Credibility score | "Reflects source reliability based on account history, credentials, and citation quality" |
| Verified badge | "Editorially verified as [type] based on institutional affiliation or credentials" |
| 📚 Sourced | "Checked against academic research or fact-checkers and supported" |
| ℹ️ Additional context | "This claim has been reviewed — see contradicting evidence" |

---

## Maintenance

### Adding Tier 1 Sources

1. Nomination (user feedback, discovery)
2. Verification (confirm affiliation, track record)
3. Categorization (Official/News/Journalist/Expert)
4. Documentation (record rationale)
5. Quarterly review

### Flagging Problematic Sources

1. Detection (user reports, automated red flags)
2. Editorial review
3. Add to flagged list with reason
4. Show users why flagged
5. Appeals process

---

## Technical Implementation

### Key Files

```
lib/credibility/
├── index.ts              # Module exports
├── tier1Sources.ts       # Curated source list (~100 sources)
├── tier1Lookup.ts        # O(1) source lookup utilities
└── credibilityService.ts # Score calculation & ranking

lib/types/api.ts          # Extended Post interface with credibility fields
lib/providers/XProvider.ts # Author metadata extraction (updated)
app/api/search/route.ts   # Weighted ranking integration
```

### API Changes

**SearchParams** now accepts:
```typescript
{
  query: string;
  sources: string[];
  timeFilter: string;
  language?: string;
  sort?: 'relevance' | 'recent' | 'engaged' | 'verified';  // NEW
}
```

**SearchResponse** now includes:
```typescript
{
  posts: Post[];  // Now includes credibilityScore, credibilityTier, verificationBadge
  summary: {
    // ... existing fields
    credibility?: {           // NEW
      averageScore: number;
      tier1Count: number;
      verifiedCount: number;
    };
  };
  sort?: SortOption;          // NEW
  // ... existing fields
}
```

**Post** now includes:
```typescript
{
  // ... existing fields
  authorMetadata?: AuthorMetadata;
  credibilityScore?: number;
  credibilityTier?: CredibilityTier;
  verificationBadge?: VerificationBadge;
}
```

---

## Implementation Status

### Phase 1: Foundation ✅
- [x] Extended Post interface with credibility fields
- [x] Tier 1 source registry (~100 sources)
- [x] Credibility scoring service
- [x] X Provider author metadata extraction
- [x] Search API weighted ranking
- [x] Sort options (relevance, recent, engaged, verified)

### Phase 2: Dynamic Assessment (Pending)
- [ ] Content signal detection (citations, red flags)
- [ ] Enhanced credibility calculation with content signals
- [ ] User feedback collection
- [ ] Update remaining providers (YouTube, Bluesky, TikTok, Truth Social)

### Phase 3: Cross-Reference (Pending)
- [ ] Fact-check API integration
- [ ] Academic source search (Semantic Scholar)
- [ ] Claim extraction via Claude
- [ ] Progressive loading with polling
- [ ] "Sourced" and "Additional context" badges

### Phase 4: Refinement (Pending)
- [ ] A/B testing infrastructure
- [ ] Admin source management
- [ ] Public methodology page
- [ ] Prisma schema updates for persistence

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Tier 1 sources in top 10 | >30% | TBD |
| Cross-ref coverage | >50% for policy/science | TBD |
| User trust | >70% "credible" rating | TBD |
| Performance | <3s initial results | TBD |
