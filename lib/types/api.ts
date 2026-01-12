// Common types for API responses

// ============================================
// Credibility System Types
// ============================================

export type CredibilityTier = 'official' | 'news' | 'journalist' | 'expert' | 'verified' | 'unknown';

export type VerificationBadgeType = 'official' | 'news' | 'journalist' | 'expert' | 'verified' | 'sourced' | 'context';

export interface VerificationBadge {
  type: VerificationBadgeType;
  label: string;
  description?: string;
}

// Gender inferred from pronouns in bio or name patterns
export type InferredGender = 'male' | 'female' | 'non-binary' | 'other' | 'unknown';

export interface AuthorMetadata {
  followersCount?: number;
  followingCount?: number;
  accountAgeDays?: number;      // Days since account creation
  isVerified?: boolean;         // Platform verification (blue check)
  isPlatformOfficial?: boolean; // Platform-designated official account
  bio?: string;
  profileUrl?: string;
  createdAt?: string;           // Account creation date (ISO string)

  // Demographic data for analysis
  inferredGender?: InferredGender;  // Inferred from pronouns/bio
  pronouns?: string;                 // Raw pronouns if found (e.g., "she/her", "they/them")
}

export type SortOption = 'relevance' | 'recent' | 'engaged' | 'verified';

// ============================================
// Search Types
// ============================================

export interface SearchParams {
  query: string;
  sources: string[];
  timeFilter: string;
  locationFilter?: string;
  language?: string;
  sort?: SortOption;
}

export interface Post {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  createdAt: string;
  platform: "x" | "tiktok" | "reddit" | "instagram" | "youtube" | "linkedin" | "bluesky" | "truthsocial";
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  url: string;
  thumbnail?: string;
  sentiment?: "positive" | "negative" | "neutral";

  // Credibility system fields
  authorMetadata?: AuthorMetadata;
  credibilityScore?: number;        // 0-1 computed score
  credibilityTier?: CredibilityTier;
  verificationBadge?: VerificationBadge;
}

export interface SuggestedQuery {
  label: string;
  description: string;
  query: string;
}

export interface AIAnalysis {
  interpretation: string;
  keyThemes: string[];
  sentimentBreakdown: {
    overall: "positive" | "negative" | "neutral" | "mixed";
    summary: string;
  };
  suggestedQueries: SuggestedQuery[];
  followUpQuestion: string;
}

export interface PlatformError {
  platform: string;
  error: string;
}

export interface SearchResponse {
  posts: Post[];
  summary: {
    totalPosts: number;
    platforms: Record<string, number>;
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
    };
    timeRange: {
      start: string;
      end: string;
    };
    credibility?: {
      averageScore: number;
      tier1Count: number;    // Count of Tier 1 (curated) sources
      verifiedCount: number; // Count of platform-verified sources
    };
  };
  query: string;
  sort?: SortOption;
  aiAnalysis?: AIAnalysis;
  errors?: PlatformError[];
  warnings?: string[];  // Non-fatal warnings (e.g., time range clamped)
  crossRefJobId?: string; // Poll this endpoint for cross-reference updates
}

// X (Twitter) specific types
export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  // Credibility-relevant fields
  verified?: boolean;
  created_at?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface XSearchResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

// TikTok specific types
export interface TikTokVideo {
  id: string;
  desc: string;
  createTime: number;
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatarLarger?: string;
  };
  stats: {
    diggCount: number;
    shareCount: number;
    commentCount: number;
    playCount: number;
  };
  video: {
    downloadAddr: string;
  };
}

export interface TikTokSearchResponse {
  videos?: TikTokVideo[];
  cursor?: number;
  hasMore?: boolean;
}

// YouTube specific types
export interface YouTubeVideo {
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export interface YouTubeSearchResponse {
  items?: Array<{
    id: { videoId: string };
    snippet: YouTubeVideo["snippet"];
  }>;
  nextPageToken?: string;
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeVideosResponse {
  items?: YouTubeVideo[];
}

// Bluesky specific types
export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BlueskyRecord {
  text: string;
  createdAt: string;
  langs?: string[];
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  author: BlueskyAuthor;
  record: BlueskyRecord;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
  embed?: {
    $type: string;
    images?: Array<{
      thumb: string;
      fullsize: string;
      alt?: string;
    }>;
  };
}

export interface BlueskySearchResponse {
  posts: BlueskyPost[];
  cursor?: string;
  hitsTotal?: number;
}

// Truth Social specific types (Mastodon-compatible API)
export interface TruthSocialAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  avatar_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
}

export interface TruthSocialStatus {
  id: string;
  created_at: string;
  content: string;
  url: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  account: TruthSocialAccount;
  media_attachments?: Array<{
    id: string;
    type: string;
    url: string;
    preview_url: string;
  }>;
  visibility: string;
  spoiler_text?: string;
}

export interface TruthSocialSearchResponse {
  accounts?: TruthSocialAccount[];
  statuses?: TruthSocialStatus[];
  hashtags?: Array<{
    name: string;
    url: string;
  }>;
}
