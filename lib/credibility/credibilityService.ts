/**
 * Credibility Scoring Service
 *
 * Calculates credibility scores (0-1) for posts based on multiple signals:
 * - Source identity (Tier 1 matching)
 * - Platform signals (followers, account age, verification)
 * - Content signals (citations, red flags) - Phase 2
 * - Cross-reference validation - Phase 3
 *
 * Score formula:
 * Final Score = (Credibility × 0.4) + (Engagement × 0.3) + (Recency × 0.3)
 */

import {
  Post,
  CredibilityTier,
  VerificationBadge,
} from '../types/api';
import { lookupTier1, getTier1BaseScore, isTier1Source } from './tier1Lookup';
import { Tier1Source, Tier1Category } from './tier1Sources';

// ============================================
// Types
// ============================================

export interface CredibilitySignals {
  // Source identity
  tier1Match?: Tier1Source;

  // Platform signals
  followersCount?: number;
  followingCount?: number;
  accountAgeDays?: number;
  isVerified?: boolean;
  followerRatio?: number;  // followers / following

  // Content signals (Phase 2)
  hasCitations?: boolean;
  hasNamedSources?: boolean;
  hasMethodology?: boolean;

  // Red flags (Phase 2)
  redFlags?: {
    sensationalist?: boolean;
    noAttribution?: boolean;
    knownDisinfo?: boolean;
    botLike?: boolean;
  };

  // Cross-reference (Phase 3)
  crossRefSupported?: boolean;
  crossRefDisputed?: boolean;
}

export interface CredibilityResult {
  score: number;              // 0-1 clamped score
  tier: CredibilityTier;
  badge?: VerificationBadge;
  signals: CredibilitySignals;
  breakdown: {
    baseScore: number;
    adjustments: Array<{ signal: string; adjustment: number }>;
  };
}

// ============================================
// Score Adjustments Configuration
// ============================================

const SCORE_ADJUSTMENTS = {
  // Positive signals
  accountAge2Years: 0.05,
  followers100K: 0.05,
  followers1M: 0.08,
  bioEduGov: 0.10,
  hasCitations: 0.10,
  hasNamedSources: 0.05,
  hasMethodology: 0.05,
  crossRefSupported: 0.15,
  multipleOutlets: 0.10,
  platformVerified: 0.03,
  highFollowerRatio: 0.05,  // ratio > 10

  // Negative signals
  botLikePatterns: -0.20,
  noAttribution: -0.15,
  sensationalist: -0.10,
  knownDisinfo: -0.30,
  crossRefDisputed: -0.25,
  lowFollowerRatio: -0.05,  // ratio < 0.1 (more following than followers)
  newAccount: -0.05,        // < 30 days old
};

// Base scores for non-Tier1 sources
const BASE_SCORES = {
  platformVerified: 0.45,
  strongSignals: 0.40,
  mixedSignals: 0.30,
  weakSignals: 0.25,
  unknown: 0.20,
  flagged: 0.05,
};

// ============================================
// Main Scoring Functions
// ============================================

/**
 * Calculate credibility score for a post
 */
export function calculateCredibility(
  post: Post,
  additionalSignals?: Partial<CredibilitySignals>
): CredibilityResult {
  const signals = gatherSignals(post, additionalSignals);
  const { score, baseScore, adjustments } = computeScore(signals);
  const tier = determineTier(score, signals);
  const badge = assignBadge(tier, signals);

  return {
    score,
    tier,
    badge,
    signals,
    breakdown: {
      baseScore,
      adjustments,
    },
  };
}

/**
 * Gather all available signals from a post
 */
function gatherSignals(
  post: Post,
  additionalSignals?: Partial<CredibilitySignals>
): CredibilitySignals {
  const signals: CredibilitySignals = {};

  // Check Tier 1 registry
  const tier1Match = lookupTier1(post.platform, post.authorHandle);
  if (tier1Match) {
    signals.tier1Match = tier1Match;
  }

  // Extract platform signals from author metadata
  if (post.authorMetadata) {
    const meta = post.authorMetadata;
    signals.followersCount = meta.followersCount;
    signals.followingCount = meta.followingCount;
    signals.accountAgeDays = meta.accountAgeDays;
    signals.isVerified = meta.isVerified;

    // Calculate follower ratio
    if (meta.followersCount && meta.followingCount && meta.followingCount > 0) {
      signals.followerRatio = meta.followersCount / meta.followingCount;
    }
  }

  // Merge any additional signals (from content analysis, cross-ref, etc.)
  if (additionalSignals) {
    Object.assign(signals, additionalSignals);
  }

  return signals;
}

/**
 * Compute the credibility score from signals
 */
function computeScore(signals: CredibilitySignals): {
  score: number;
  baseScore: number;
  adjustments: Array<{ signal: string; adjustment: number }>;
} {
  const adjustments: Array<{ signal: string; adjustment: number }> = [];

  // Determine base score
  let baseScore: number;

  if (signals.tier1Match) {
    // Tier 1 source - use category-specific base score
    baseScore = getTier1BaseScore(signals.tier1Match.category);
    adjustments.push({
      signal: `tier1_${signals.tier1Match.category}`,
      adjustment: baseScore,
    });
  } else if (signals.isVerified) {
    // Platform verified but not Tier 1
    baseScore = BASE_SCORES.platformVerified;
    adjustments.push({ signal: 'platform_verified_base', adjustment: baseScore });
  } else {
    // Determine base from signal strength
    const signalStrength = assessSignalStrength(signals);
    baseScore = BASE_SCORES[signalStrength];
    adjustments.push({ signal: `${signalStrength}_base`, adjustment: baseScore });
  }

  let score = baseScore;

  // Apply positive adjustments
  if (signals.accountAgeDays && signals.accountAgeDays > 730) {
    score += SCORE_ADJUSTMENTS.accountAge2Years;
    adjustments.push({ signal: 'account_age_2y', adjustment: SCORE_ADJUSTMENTS.accountAge2Years });
  }

  if (signals.followersCount) {
    if (signals.followersCount >= 1000000) {
      score += SCORE_ADJUSTMENTS.followers1M;
      adjustments.push({ signal: 'followers_1m', adjustment: SCORE_ADJUSTMENTS.followers1M });
    } else if (signals.followersCount >= 100000) {
      score += SCORE_ADJUSTMENTS.followers100K;
      adjustments.push({ signal: 'followers_100k', adjustment: SCORE_ADJUSTMENTS.followers100K });
    }
  }

  if (signals.isVerified && !signals.tier1Match) {
    score += SCORE_ADJUSTMENTS.platformVerified;
    adjustments.push({ signal: 'platform_verified', adjustment: SCORE_ADJUSTMENTS.platformVerified });
  }

  if (signals.followerRatio && signals.followerRatio > 10) {
    score += SCORE_ADJUSTMENTS.highFollowerRatio;
    adjustments.push({ signal: 'high_follower_ratio', adjustment: SCORE_ADJUSTMENTS.highFollowerRatio });
  }

  // Content signals (Phase 2)
  if (signals.hasCitations) {
    score += SCORE_ADJUSTMENTS.hasCitations;
    adjustments.push({ signal: 'has_citations', adjustment: SCORE_ADJUSTMENTS.hasCitations });
  }

  if (signals.hasNamedSources) {
    score += SCORE_ADJUSTMENTS.hasNamedSources;
    adjustments.push({ signal: 'has_named_sources', adjustment: SCORE_ADJUSTMENTS.hasNamedSources });
  }

  if (signals.hasMethodology) {
    score += SCORE_ADJUSTMENTS.hasMethodology;
    adjustments.push({ signal: 'has_methodology', adjustment: SCORE_ADJUSTMENTS.hasMethodology });
  }

  // Cross-reference (Phase 3)
  if (signals.crossRefSupported) {
    score += SCORE_ADJUSTMENTS.crossRefSupported;
    adjustments.push({ signal: 'crossref_supported', adjustment: SCORE_ADJUSTMENTS.crossRefSupported });
  }

  // Apply negative adjustments
  if (signals.redFlags?.botLike) {
    score += SCORE_ADJUSTMENTS.botLikePatterns;
    adjustments.push({ signal: 'bot_like', adjustment: SCORE_ADJUSTMENTS.botLikePatterns });
  }

  if (signals.redFlags?.noAttribution) {
    score += SCORE_ADJUSTMENTS.noAttribution;
    adjustments.push({ signal: 'no_attribution', adjustment: SCORE_ADJUSTMENTS.noAttribution });
  }

  if (signals.redFlags?.sensationalist) {
    score += SCORE_ADJUSTMENTS.sensationalist;
    adjustments.push({ signal: 'sensationalist', adjustment: SCORE_ADJUSTMENTS.sensationalist });
  }

  if (signals.redFlags?.knownDisinfo) {
    score += SCORE_ADJUSTMENTS.knownDisinfo;
    adjustments.push({ signal: 'known_disinfo', adjustment: SCORE_ADJUSTMENTS.knownDisinfo });
  }

  if (signals.crossRefDisputed) {
    score += SCORE_ADJUSTMENTS.crossRefDisputed;
    adjustments.push({ signal: 'crossref_disputed', adjustment: SCORE_ADJUSTMENTS.crossRefDisputed });
  }

  if (signals.followerRatio && signals.followerRatio < 0.1) {
    score += SCORE_ADJUSTMENTS.lowFollowerRatio;
    adjustments.push({ signal: 'low_follower_ratio', adjustment: SCORE_ADJUSTMENTS.lowFollowerRatio });
  }

  if (signals.accountAgeDays && signals.accountAgeDays < 30) {
    score += SCORE_ADJUSTMENTS.newAccount;
    adjustments.push({ signal: 'new_account', adjustment: SCORE_ADJUSTMENTS.newAccount });
  }

  // Clamp score to [0.05, 1.0]
  score = Math.max(0.05, Math.min(1.0, score));

  return { score, baseScore, adjustments };
}

/**
 * Assess overall signal strength for base score determination
 */
function assessSignalStrength(signals: CredibilitySignals): keyof typeof BASE_SCORES {
  let positiveSignals = 0;
  let negativeSignals = 0;

  // Count positive signals
  if (signals.accountAgeDays && signals.accountAgeDays > 365) positiveSignals++;
  if (signals.followersCount && signals.followersCount > 10000) positiveSignals++;
  if (signals.followerRatio && signals.followerRatio > 1) positiveSignals++;
  if (signals.hasCitations) positiveSignals++;
  if (signals.hasNamedSources) positiveSignals++;

  // Count negative signals
  if (signals.redFlags?.botLike) negativeSignals += 2;
  if (signals.redFlags?.knownDisinfo) negativeSignals += 3;
  if (signals.redFlags?.noAttribution) negativeSignals++;
  if (signals.redFlags?.sensationalist) negativeSignals++;

  // Determine strength
  if (negativeSignals >= 2) return 'flagged';
  if (positiveSignals >= 3) return 'strongSignals';
  if (positiveSignals >= 1) return 'mixedSignals';
  if (negativeSignals >= 1) return 'weakSignals';
  return 'unknown';
}

/**
 * Determine credibility tier from score and signals
 */
function determineTier(score: number, signals: CredibilitySignals): CredibilityTier {
  // Tier 1 sources get their category as tier
  if (signals.tier1Match) {
    return signals.tier1Match.category as CredibilityTier;
  }

  // Platform verified sources
  if (signals.isVerified && score >= 0.45) {
    return 'verified';
  }

  // Score-based tiers
  if (score >= 0.80) return 'expert';
  if (score >= 0.60) return 'verified';
  return 'unknown';
}

/**
 * Assign verification badge based on tier and signals
 */
function assignBadge(
  tier: CredibilityTier,
  signals: CredibilitySignals
): VerificationBadge | undefined {
  // Cross-reference badges take priority
  if (signals.crossRefSupported) {
    return {
      type: 'sourced',
      label: 'Sourced',
      description: 'This claim has been checked against academic research or fact-checkers and is supported.',
    };
  }

  if (signals.crossRefDisputed) {
    return {
      type: 'context',
      label: 'Additional context',
      description: 'This claim has been reviewed and contradicting evidence is available.',
    };
  }

  // Tier 1 badges
  if (signals.tier1Match) {
    const badgeConfig = getTier1BadgeConfig(signals.tier1Match.category);
    return badgeConfig;
  }

  // Platform verified badge (weaker signal)
  if (signals.isVerified && tier === 'verified') {
    return {
      type: 'verified',
      label: 'Verified',
      description: 'This account is verified by the platform.',
    };
  }

  return undefined;
}

/**
 * Get badge configuration for Tier 1 category
 */
function getTier1BadgeConfig(category: Tier1Category): VerificationBadge {
  switch (category) {
    case 'official':
      return {
        type: 'official',
        label: 'Official',
        description: 'This is an official government or institutional account.',
      };
    case 'news':
      return {
        type: 'news',
        label: 'News',
        description: 'This is a verified major news organization.',
      };
    case 'journalist':
      return {
        type: 'journalist',
        label: 'Journalist',
        description: 'This is a verified credentialed journalist.',
      };
    case 'expert':
      return {
        type: 'expert',
        label: 'Expert',
        description: 'This is a verified academic, researcher, or domain expert.',
      };
  }
}

// ============================================
// Ranking Functions
// ============================================

/**
 * Calculate engagement score (normalized 0-1)
 * Formula: likes + (comments × 2) + (shares × 3)
 */
export function calculateEngagementScore(
  post: Post,
  maxEngagement: number
): number {
  const raw =
    (post.engagement.likes || 0) +
    (post.engagement.comments || 0) * 2 +
    (post.engagement.shares || 0) * 3;

  if (maxEngagement === 0) return 0;
  return Math.min(1, raw / maxEngagement);
}

/**
 * Calculate recency score (linear decay over 7 days)
 */
export function calculateRecencyScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / 3600000;
  const decayDays = 7;
  const decayHours = decayDays * 24;

  return Math.max(0, 1 - ageHours / decayHours);
}

/**
 * Calculate final ranking score
 * Formula: (Credibility × 0.4) + (Engagement × 0.3) + (Recency × 0.3)
 */
export function calculateFinalScore(
  credibilityScore: number,
  engagementScore: number,
  recencyScore: number
): number {
  return (
    credibilityScore * 0.4 +
    engagementScore * 0.3 +
    recencyScore * 0.3
  );
}

/**
 * Calculate raw engagement for normalization
 */
export function calculateRawEngagement(post: Post): number {
  return (
    (post.engagement.likes || 0) +
    (post.engagement.comments || 0) * 2 +
    (post.engagement.shares || 0) * 3
  );
}

// ============================================
// Batch Processing
// ============================================

/**
 * Process credibility for a batch of posts
 * Also calculates and normalizes engagement scores
 */
export function processPostsCredibility(posts: Post[]): Post[] {
  if (posts.length === 0) return posts;

  // Calculate max engagement for normalization
  const maxEngagement = Math.max(...posts.map(calculateRawEngagement), 1);

  return posts.map((post) => {
    const result = calculateCredibility(post);
    const engagementScore = calculateEngagementScore(post, maxEngagement);
    const recencyScore = calculateRecencyScore(post.createdAt);
    const finalScore = calculateFinalScore(result.score, engagementScore, recencyScore);

    return {
      ...post,
      credibilityScore: result.score,
      credibilityTier: result.tier,
      verificationBadge: result.badge,
      // Store final score for sorting (internal use)
      _finalScore: finalScore,
    } as Post & { _finalScore: number };
  });
}

/**
 * Sort posts by final score (relevance)
 */
export function sortByRelevance(posts: (Post & { _finalScore?: number })[]): Post[] {
  return [...posts].sort((a, b) => (b._finalScore || 0) - (a._finalScore || 0));
}

/**
 * Sort posts by recency (credibility as tiebreaker)
 */
export function sortByRecent(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return (b.credibilityScore || 0) - (a.credibilityScore || 0);
  });
}

/**
 * Sort posts by engagement (credibility as tiebreaker)
 */
export function sortByEngaged(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const engA = calculateRawEngagement(a);
    const engB = calculateRawEngagement(b);
    if (engB !== engA) return engB - engA;
    return (b.credibilityScore || 0) - (a.credibilityScore || 0);
  });
}

/**
 * Filter to verified sources only, then sort by relevance
 */
export function filterVerifiedOnly(posts: Post[]): Post[] {
  const verified = posts.filter((post) => {
    // Include Tier 1 sources
    if (isTier1Source(post.platform, post.authorHandle)) return true;
    // Include high credibility scores
    if (post.credibilityScore && post.credibilityScore >= 0.70) return true;
    return false;
  });

  return sortByRelevance(verified as (Post & { _finalScore?: number })[]);
}
