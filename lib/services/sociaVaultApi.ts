/**
 * SociaVault API Service
 * Provides TikTok and Reddit search capabilities via SociaVault API
 * https://docs.sociavault.com/quickstart
 */

import type { Post, AuthorMetadata } from "../types/api";
import {
  extractBaseQuery,
  hasBooleanOperators,
  filterPostsByBooleanQuery,
} from "../utils/booleanQuery";
import { extractPronouns } from "../utils/pronounDetection";

const BASE_URL = "https://api.sociavault.com/v1/scrape";

// SociaVault TikTok response types
interface SociaVaultTikTokVideo {
  id: string;
  desc?: string;
  createTime?: number;
  author?: {
    id?: string;
    uniqueId?: string;
    nickname?: string;
    avatarLarger?: string;
    signature?: string;
    verified?: boolean;
    followerCount?: number;
    followingCount?: number;
  };
  stats?: {
    diggCount?: number;
    shareCount?: number;
    commentCount?: number;
    playCount?: number;
  };
  video?: {
    cover?: string;
    originCover?: string;
    dynamicCover?: string;
  };
}

interface SociaVaultTikTokSearchResponse {
  data?: SociaVaultTikTokVideo[];
  cursor?: string;
  hasMore?: boolean;
}

// SociaVault Reddit response types
interface SociaVaultRedditPost {
  id: string;
  title?: string;
  selftext?: string;
  author?: string;
  subreddit?: string;
  created_utc?: number;
  score?: number;
  num_comments?: number;
  url?: string;
  permalink?: string;
  thumbnail?: string;
  is_video?: boolean;
  upvote_ratio?: number;
}

interface SociaVaultRedditSearchResponse {
  data?: SociaVaultRedditPost[];
  after?: string;
}

export class SociaVaultApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("SociaVault API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Make authenticated request to SociaVault API
   */
  private async fetchApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SociaVault API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // TikTok Methods
  // ============================================

  /**
   * Search TikTok videos by keyword
   * Uses the /tiktok/search/keyword endpoint for keyword-based search
   */
  async searchTikTokByKeyword(
    keyword: string,
    options: { cursor?: string } = {}
  ): Promise<SociaVaultTikTokSearchResponse> {
    const params: Record<string, string> = {
      keyword: keyword,
    };

    if (options.cursor) {
      params.cursor = options.cursor;
    }

    return this.fetchApi<SociaVaultTikTokSearchResponse>("/tiktok/search/keyword", params);
  }

  /**
   * Search TikTok users
   */
  async searchTikTokUsers(
    query: string,
    options: { cursor?: string } = {}
  ): Promise<{ data?: Array<{ uniqueId: string; nickname: string }> }> {
    const params: Record<string, string> = {
      keyword: query,
    };

    if (options.cursor) {
      params.cursor = options.cursor;
    }

    return this.fetchApi("/tiktok/search/users", params);
  }

  /**
   * Get TikTok trending videos
   */
  async getTikTokTrending(): Promise<SociaVaultTikTokSearchResponse> {
    return this.fetchApi<SociaVaultTikTokSearchResponse>("/tiktok/trending");
  }

  /**
   * Search TikTok videos - uses keyword search as the primary method
   */
  async searchTikTokVideos(
    query: string,
    options: { cursor?: string } = {}
  ): Promise<SociaVaultTikTokSearchResponse> {
    return this.searchTikTokByKeyword(query, options);
  }

  /**
   * Transform SociaVault TikTok response to common Post format
   */
  transformTikTokToPosts(data: SociaVaultTikTokSearchResponse): Post[] {
    if (!data.data || data.data.length === 0) {
      return [];
    }

    return data.data
      .filter((video) => video && video.id)
      .map((video) => {
        const author = video.author || {};
        const stats = video.stats || {};
        const videoId = String(video.id);
        const authorId = String(author.uniqueId || "unknown");
        const authorName = String(author.nickname || authorId);

        // Extract author metadata for credibility scoring
        const authorMetadata = this.extractTikTokAuthorMetadata(author, authorId);

        // Extract thumbnail
        const thumbnail = video.video?.originCover || video.video?.cover || video.video?.dynamicCover;

        return {
          id: videoId,
          text: String(video.desc || ""),
          author: authorName,
          authorHandle: `@${authorId}`,
          authorAvatar: author.avatarLarger,
          createdAt: video.createTime
            ? new Date(video.createTime * 1000).toISOString()
            : new Date().toISOString(),
          platform: "tiktok" as const,
          engagement: {
            likes: Number(stats.diggCount || 0),
            comments: Number(stats.commentCount || 0),
            shares: Number(stats.shareCount || 0),
            views: Number(stats.playCount || 0),
          },
          url: `https://www.tiktok.com/@${authorId}/video/${videoId}`,
          thumbnail,
          authorMetadata,
        };
      });
  }

  /**
   * Extract TikTok author metadata for credibility scoring
   */
  private extractTikTokAuthorMetadata(
    author: SociaVaultTikTokVideo["author"],
    authorId: string
  ): AuthorMetadata | undefined {
    if (!author || Object.keys(author).length === 0) return undefined;

    const bio = author.signature ? String(author.signature) : undefined;
    const pronounResult = extractPronouns(bio);

    return {
      followersCount: author.followerCount || undefined,
      followingCount: author.followingCount || undefined,
      isVerified: Boolean(author.verified),
      bio,
      profileUrl: `https://www.tiktok.com/@${authorId}`,
      pronouns: pronounResult.pronouns,
      inferredGender: pronounResult.inferredGender,
    };
  }

  // ============================================
  // Reddit Methods
  // ============================================

  /**
   * Search Reddit posts
   */
  async searchReddit(
    query: string,
    options: { after?: string; limit?: number } = {}
  ): Promise<SociaVaultRedditSearchResponse> {
    const params: Record<string, string> = {
      query: query,
    };

    if (options.after) {
      params.after = options.after;
    }

    if (options.limit) {
      params.limit = String(options.limit);
    }

    return this.fetchApi<SociaVaultRedditSearchResponse>("/reddit/search", params);
  }

  /**
   * Get posts from a subreddit
   */
  async getSubredditPosts(
    subreddit: string,
    options: { after?: string; limit?: number } = {}
  ): Promise<SociaVaultRedditSearchResponse> {
    const params: Record<string, string> = {
      subreddit: subreddit,
    };

    if (options.after) {
      params.after = options.after;
    }

    if (options.limit) {
      params.limit = String(options.limit);
    }

    return this.fetchApi<SociaVaultRedditSearchResponse>("/reddit/subreddit", params);
  }

  /**
   * Transform SociaVault Reddit response to common Post format
   */
  transformRedditToPosts(data: SociaVaultRedditSearchResponse): Post[] {
    if (!data.data || data.data.length === 0) {
      return [];
    }

    return data.data
      .filter((post) => post && post.id)
      .map((post) => {
        const postId = String(post.id);
        const author = String(post.author || "[deleted]");

        // Combine title and selftext for the post content
        const text = post.selftext
          ? `${post.title || ""}\n\n${post.selftext}`.trim()
          : String(post.title || "");

        // Reddit engagement: score (upvotes - downvotes), comments
        // Shares are not directly available, estimate from score
        const score = Number(post.score || 0);
        const comments = Number(post.num_comments || 0);

        // Build Reddit URL
        const url = post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : `https://www.reddit.com/r/${post.subreddit}/comments/${postId}`;

        // Get thumbnail (filter out Reddit's placeholder values)
        let thumbnail = post.thumbnail;
        if (thumbnail === "self" || thumbnail === "default" || thumbnail === "nsfw" || thumbnail === "spoiler") {
          thumbnail = undefined;
        }

        return {
          id: postId,
          text,
          author,
          authorHandle: `u/${author}`,
          createdAt: post.created_utc
            ? new Date(post.created_utc * 1000).toISOString()
            : new Date().toISOString(),
          platform: "reddit" as const,
          engagement: {
            likes: score,
            comments,
            shares: Math.floor(score * 0.1), // Estimate shares from score
          },
          url,
          thumbnail,
          authorMetadata: {
            profileUrl: `https://www.reddit.com/user/${author}`,
          },
        };
      });
  }

  // ============================================
  // Static Utility Methods
  // ============================================

  /**
   * Filter posts by time range
   */
  static filterByTimeRange(posts: Post[], filter: string): Post[] {
    const now = new Date();
    let cutoffDate: Date;

    switch (filter) {
      case "7d":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return posts.filter((post) => {
      const postDate = new Date(post.createdAt);
      return postDate >= cutoffDate;
    });
  }

  /**
   * Extract base search term for API (doesn't support Boolean operators)
   */
  static getBaseQuery(query: string): string {
    return extractBaseQuery(query);
  }

  /**
   * Check if query has Boolean operators that need client-side filtering
   */
  static hasBooleanQuery(query: string): boolean {
    return hasBooleanOperators(query);
  }

  /**
   * Filter posts by Boolean query (client-side filtering for AND/OR logic)
   */
  static filterByBooleanQuery(posts: Post[], query: string): Post[] {
    return filterPostsByBooleanQuery(posts, query);
  }
}

export default SociaVaultApiService;
