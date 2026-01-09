// Common types for API responses

export interface SearchParams {
  query: string;
  sources: string[];
  timeFilter: string;
  locationFilter?: string;
  language?: string;
}

export interface Post {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  createdAt: string;
  platform: "x" | "tiktok" | "reddit" | "instagram" | "youtube" | "linkedin";
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  url: string;
  thumbnail?: string;
  sentiment?: "positive" | "negative" | "neutral";
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
  };
  query: string;
  aiAnalysis?: AIAnalysis;
  errors?: PlatformError[];
  warnings?: string[];  // Non-fatal warnings (e.g., time range clamped)
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
