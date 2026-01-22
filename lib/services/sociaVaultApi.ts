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

// Raw API response: { data: { search_item_list: { "0": { aweme_info: {...} } } } }
interface SociaVaultTikTokRawResponse {
  success?: boolean;
  data?: {
    success?: boolean;
    search_item_list?: Record<string, { aweme_info: SociaVaultTikTokVideo }>;
    cursor?: string;
    has_more?: boolean;
  };
  credits_used?: number;
}

// Normalized response used internally
interface SociaVaultTikTokSearchResponse {
  data?: SociaVaultTikTokVideo[];
  cursor?: string;
  hasMore?: boolean;
}

// SociaVault Reddit response types
interface SociaVaultRedditPost {
  id?: string;
  title?: string;
  selftext?: string;
  body?: string; // Some responses use 'body' instead of 'selftext'
  author?: string;
  subreddit?: string;
  created?: number; // Unix timestamp
  created_utc?: number; // Alternative timestamp field
  score?: number;
  num_comments?: number;
  url?: string;
  permalink?: string;
  thumbnail?: string;
  is_video?: boolean;
  upvote_ratio?: number;
}

// SociaVault Reddit search returns { data: { posts: { "0": {...}, "1": {...} } } }
// Posts is an object with numeric keys, not an array
interface SociaVaultRedditSearchResponse {
  success?: boolean;
  data?: {
    success?: boolean;
    posts?: Record<string, SociaVaultRedditPost> | SociaVaultRedditPost[];
    after?: string;
  };
  creditsUsed?: number;
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

    console.log(`[SociaVault] Request: ${url.toString()}`);

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
   * Map timeFilter to SociaVault date_posted parameter
   * 0 = All Time, 1 = Yesterday, 7 = This Week, 30 = This Month, 90 = Last 3 Months, 180 = Last 6 Months
   */
  static getDatePostedValue(timeFilter: string): string {
    switch (timeFilter) {
      case "7d":
        return "7";
      case "30d":
        return "30";
      case "3m":
        return "90";
      case "12m":
        return "0"; // No exact match, use all time
      default:
        return "30"; // Default to last month
    }
  }

  /**
   * Search TikTok videos by keyword (single page)
   * Uses the /tiktok/search/keyword endpoint with 'query' parameter
   */
  async searchTikTokByKeyword(
    keyword: string,
    options: { cursor?: string; count?: number; datePosted?: string } = {}
  ): Promise<SociaVaultTikTokSearchResponse> {
    const params: Record<string, string> = {
      query: keyword, // API uses 'query' not 'keyword'
    };

    if (options.cursor) {
      params.cursor = options.cursor;
    }

    // Try to request more results per page
    if (options.count) {
      params.count = String(options.count);
    }

    // Add date filter
    if (options.datePosted) {
      params.date_posted = options.datePosted;
    }

    const rawResponse = await this.fetchApi<SociaVaultTikTokRawResponse>("/tiktok/search/keyword", params);

    // Debug: Log raw response structure to understand timestamp field location
    const searchList = rawResponse.data?.search_item_list;
    if (searchList) {
      const firstKey = Object.keys(searchList)[0];
      if (firstKey) {
        const firstItem = searchList[firstKey];
        console.log('[SociaVault TikTok] Raw item structure:', JSON.stringify({
          hasAwemeInfo: !!firstItem?.aweme_info,
          awemeInfoKeys: firstItem?.aweme_info ? Object.keys(firstItem.aweme_info).slice(0, 15) : [],
          createTime: firstItem?.aweme_info?.createTime,
          create_time: (firstItem?.aweme_info as Record<string, unknown>)?.create_time,
          rawItemKeys: Object.keys(firstItem || {}).slice(0, 10),
        }));
      }
    }

    // Normalize response: extract videos from search_item_list object
    const videos: SociaVaultTikTokVideo[] = searchList
      ? Object.values(searchList).map(item => item.aweme_info).filter(Boolean)
      : [];

    return {
      data: videos,
      cursor: rawResponse.data?.cursor,
      hasMore: rawResponse.data?.has_more,
    };
  }

  /**
   * Search TikTok videos with pagination - fetches multiple pages for more results
   */
  async searchTikTokByKeywordPaginated(
    keyword: string,
    options: { maxPages?: number; count?: number; datePosted?: string } = {}
  ): Promise<SociaVaultTikTokSearchResponse> {
    const maxPages = options.maxPages || 3; // Default to 3 pages
    const count = options.count || 30; // Request 30 per page if supported
    const datePosted = options.datePosted;

    const allVideos: SociaVaultTikTokVideo[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let pagesLoaded = 0;

    while (hasMore && pagesLoaded < maxPages) {
      const result = await this.searchTikTokByKeyword(keyword, { cursor, count, datePosted });

      if (result.data && result.data.length > 0) {
        allVideos.push(...result.data);
      }

      cursor = result.cursor;
      hasMore = result.hasMore === true && !!cursor;
      pagesLoaded++;

      // Small delay between pages to avoid rate limiting
      if (hasMore && pagesLoaded < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      data: allVideos,
      hasMore: hasMore,
      cursor: cursor,
    };
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
   * Search TikTok videos - fetches multiple pages for maximum results
   */
  async searchTikTokVideos(
    query: string,
    options: { maxPages?: number; timeFilter?: string } = {}
  ): Promise<SociaVaultTikTokSearchResponse> {
    // Convert timeFilter to date_posted value
    const datePosted = options.timeFilter
      ? SociaVaultApiService.getDatePostedValue(options.timeFilter)
      : undefined;

    // Use paginated search to get more results
    return this.searchTikTokByKeywordPaginated(query, {
      maxPages: options.maxPages || 3,
      count: 30,
      datePosted
    });
  }

  /**
   * Transform SociaVault TikTok response to common Post format
   */
  transformTikTokToPosts(data: SociaVaultTikTokSearchResponse): Post[] {
    if (!data.data || data.data.length === 0) {
      return [];
    }

    // Debug: Log first 3 raw createTime values
    const sampleRawTimes = data.data.slice(0, 3).map(v => ({
      id: v.id,
      createTime: v.createTime,
      asDate: v.createTime ? new Date(v.createTime * 1000).toISOString() : 'no timestamp'
    }));
    console.log('[SociaVault TikTok] Raw createTime samples:', JSON.stringify(sampleRawTimes));

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
   * SociaVault Reddit search uses 'query', 'sort', and 'time' parameters
   */
  async searchReddit(
    query: string,
    options: { after?: string; limit?: number; sort?: string; time?: string } = {}
  ): Promise<SociaVaultRedditSearchResponse> {
    const params: Record<string, string> = {
      query: query,
      sort: options.sort || "relevance",
      time: options.time || "month",
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
   * SociaVault returns { data: { posts: { "0": {...}, "1": {...} } } } - object with numeric keys
   */
  transformRedditToPosts(data: SociaVaultRedditSearchResponse): Post[] {
    // Handle the nested structure: data.posts (can be object or array)
    const postsData = data.data?.posts;
    if (!postsData) {
      return [];
    }

    // Convert object with numeric keys to array if needed
    const posts: SociaVaultRedditPost[] = Array.isArray(postsData)
      ? postsData
      : Object.values(postsData);

    if (posts.length === 0) {
      return [];
    }

    return posts
      .filter((post) => post && (post.id || post.url || post.title))
      .map((post, index) => {
        // Generate ID from url, id, or index
        const postId = post.id ? String(post.id) :
          post.url ? post.url.split('/').pop() || `reddit-${index}` :
          `reddit-${index}`;
        const author = String(post.author || "[deleted]");

        // SociaVault uses 'body' instead of 'selftext'
        const bodyText = post.body || post.selftext;
        const text = bodyText
          ? `${post.title || ""}\n\n${bodyText}`.trim()
          : String(post.title || "");

        // Reddit engagement: score (upvotes - downvotes), comments
        // Shares are not directly available, estimate from score
        const score = Number(post.score || 0);
        const comments = Number(post.num_comments || 0);

        // Build Reddit URL - use provided url or construct from permalink
        const url = post.url || (post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : `https://www.reddit.com/r/${post.subreddit || 'all'}/comments/${postId}`);

        // Get thumbnail (filter out Reddit's placeholder values)
        let thumbnail = post.thumbnail;
        if (thumbnail === "self" || thumbnail === "default" || thumbnail === "nsfw" || thumbnail === "spoiler") {
          thumbnail = undefined;
        }

        // Use created or created_utc (API returns 'created')
        const timestamp = post.created || post.created_utc;

        return {
          id: postId,
          text,
          author,
          authorHandle: `u/${author}`,
          createdAt: timestamp
            ? new Date(timestamp * 1000).toISOString()
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

    // Debug: Log first 3 post dates for debugging
    if (posts.length > 0) {
      const sampleDates = posts.slice(0, 3).map(p => ({
        createdAt: p.createdAt,
        date: new Date(p.createdAt).toISOString()
      }));
      console.log(`[SociaVault] Filter cutoff: ${cutoffDate.toISOString()}, Sample post dates:`, JSON.stringify(sampleDates));
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
