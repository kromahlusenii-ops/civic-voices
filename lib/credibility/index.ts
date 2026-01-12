/**
 * Credibility System Module
 *
 * Exports all credibility-related functionality for assessing
 * source reliability and content quality.
 */

// Tier 1 Source Registry
export {
  tier1Sources,
  officialSources,
  newsSources,
  journalistSources,
  expertSources,
  type Tier1Source,
  type Tier1Category,
  type Platform,
} from './tier1Sources';

// Lookup Utilities
export {
  lookupTier1,
  isTier1Source,
  getTier1Category,
  getTier1Name,
  getTier1SourcesForPlatform,
  getTier1SourcesByCategory,
  getTier1BaseScore,
  getTier1Count,
  getTier1CountsByCategory,
  tier1Map,
} from './tier1Lookup';

// Credibility Scoring Service
export {
  calculateCredibility,
  calculateEngagementScore,
  calculateRecencyScore,
  calculateFinalScore,
  calculateRawEngagement,
  processPostsCredibility,
  sortByRelevance,
  sortByRecent,
  sortByEngaged,
  filterVerifiedOnly,
  type CredibilitySignals,
  type CredibilityResult,
} from './credibilityService';
