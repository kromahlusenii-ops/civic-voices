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

/**
 * Schema validation helpers to catch API contract mismatches early
 */
function validateTikTokVideoSchema(video: Record<string, unknown>, index: number): void {
  // Check for common field name alternatives
  const idField = 'id' in video ? 'id' : ('aweme_id' in video ? 'aweme_id' : null);
  const statsField = 'stats' in video ? 'stats' : ('statistics' in video ? 'statistics' : null);

  // Log field discovery for first video
  if (index === 0) {
    const actualFields = Object.keys(video).slice(0, 20);
    console.log(`[SociaVault Schema] TikTok video fields: ${actualFields.join(', ')}`);

    if (!idField) {
      console.warn(`[SociaVault Schema] TikTok video missing ID field (tried: id, aweme_id)`);
    }
    if (!statsField) {
      console.warn(`[SociaVault Schema] TikTok video missing stats field (tried: stats, statistics)`);
    }
  }

  // Check for camelCase vs snake_case mismatches
  if ('createTime' in video && !('create_time' in video)) {
    console.warn(`[SociaVault Schema] Video ${index}: Found 'createTime' but expected 'create_time'`);
  }
}

function validateRedditPostSchema(post: Record<string, unknown>, index: number): void {
  // Check for timestamp field - Reddit can use 'created' or 'created_utc'
  const hasTimestamp = 'created' in post || 'created_utc' in post;

  // Check for common field name mismatches
  if ('createdUtc' in post && !hasTimestamp) {
    console.warn(`[SociaVault Schema] Reddit post ${index}: Found 'createdUtc' but expected 'created' or 'created_utc'`);
  }

  // Log missing critical fields (only in first post)
  if (index === 0) {
    const criticalFields = ['id', 'title', 'author'];
    const missing = criticalFields.filter(f => !(f in post));
    if (missing.length > 0) {
      console.warn(`[SociaVault Schema] Reddit post missing critical fields: ${missing.join(', ')}`);
    }
    if (!hasTimestamp) {
      console.warn(`[SociaVault Schema] Reddit post missing timestamp field (created or created_utc)`);
    }
  }
}

// SociaVault TikTok response types - matches actual API snake_case format
interface SociaVaultTikTokVideo {
  aweme_id?: string;  // API uses aweme_id, not id
  id?: string;        // Keep for backwards compatibility
  desc?: string;
  create_time?: number;
  author?: {
    uid?: string;
    unique_id?: string;   // API uses snake_case
    uniqueId?: string;    // Keep for backwards compatibility
    nickname?: string;
    avatar_larger?: { url_list?: string[] };  // Nested structure
    avatarLarger?: string;  // Keep for backwards compatibility
    signature?: string;
    verified?: boolean;
    follower_count?: number;
    followerCount?: number;  // Keep for backwards compatibility
    following_count?: number;
    followingCount?: number;  // Keep for backwards compatibility
  };
  statistics?: {  // API uses statistics, not stats
    digg_count?: number;
    comment_count?: number;
    share_count?: number;
    play_count?: number;
  };
  stats?: {  // Keep for backwards compatibility
    diggCount?: number;
    shareCount?: number;
    commentCount?: number;
    playCount?: number;
  };
  video?: {
    cover?: { url_list?: string[] } | string;
    origin_cover?: { url_list?: string[] } | string;
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
   * Map timeFilter to SociaVault date_posted parameter for TikTok
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
   * Map timeFilter to SociaVault time parameter for Reddit
   * Reddit accepts: "hour", "day", "week", "month", "year", "all"
   */
  static getRedditTimeValue(timeFilter: string): string {
    switch (timeFilter) {
      case "24h":
        return "day";
      case "7d":
        return "week";
      case "30d":
        return "month";
      case "3m":
        return "year"; // No 3m option, use year as closest
      case "12m":
        return "year";
      default:
        return "month"; // Default to last month
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

    const searchList = rawResponse.data?.search_item_list;

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

    // Schema validation for first few videos
    data.data.slice(0, 3).forEach((video, index) => {
      validateTikTokVideoSchema(video as unknown as Record<string, unknown>, index);
    });

    return data.data
      .filter((video) => video && (video.aweme_id || video.id))
      .map((video) => {
        const author = video.author || {};
        // Support both statistics (new) and stats (old) field names
        // Cast to a union type that includes all possible fields
        const statistics = (video.statistics || video.stats || {}) as {
          digg_count?: number; diggCount?: number;
          comment_count?: number; commentCount?: number;
          share_count?: number; shareCount?: number;
          play_count?: number; playCount?: number;
        };
        // Support both aweme_id (new) and id (old)
        const videoId = String(video.aweme_id || video.id);
        // Support both unique_id (new) and uniqueId (old)
        const authorId = String(author.unique_id || author.uniqueId || author.uid || "unknown");
        const authorName = String(author.nickname || authorId);

        // Extract author metadata for credibility scoring
        const authorMetadata = this.extractTikTokAuthorMetadata(author, authorId);

        // Extract thumbnail - handle nested url_list structure
        const coverData = video.video?.origin_cover || video.video?.cover;
        const thumbnail = typeof coverData === 'object' && coverData?.url_list?.[0]
          ? coverData.url_list[0]
          : (video.video?.originCover || video.video?.dynamicCover || (typeof coverData === 'string' ? coverData : undefined));

        // Extract avatar - handle nested url_list structure
        const avatarData = author.avatar_larger || author.avatarLarger;
        const authorAvatar = typeof avatarData === 'object' && avatarData?.url_list?.[0]
          ? avatarData.url_list[0]
          : (typeof avatarData === 'string' ? avatarData : undefined);

        return {
          id: videoId,
          text: String(video.desc || ""),
          author: authorName,
          authorHandle: `@${authorId}`,
          authorAvatar,
          createdAt: video.create_time
            ? new Date(video.create_time * 1000).toISOString()
            : new Date().toISOString(),
          platform: "tiktok" as const,
          engagement: {
            // Support both snake_case (new) and camelCase (old) field names
            likes: Number(statistics.digg_count || statistics.diggCount || 0),
            comments: Number(statistics.comment_count || statistics.commentCount || 0),
            shares: Number(statistics.share_count || statistics.shareCount || 0),
            views: Number(statistics.play_count || statistics.playCount || 0),
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
      // Support both snake_case (new) and camelCase (old) field names
      followersCount: author.follower_count || author.followerCount || undefined,
      followingCount: author.following_count || author.followingCount || undefined,
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
   * Search Reddit posts with timeFilter support
   * Higher-level method that maps timeFilter to Reddit's time parameter
   */
  async searchRedditPosts(
    query: string,
    options: { limit?: number; timeFilter?: string } = {}
  ): Promise<SociaVaultRedditSearchResponse> {
    const time = options.timeFilter
      ? SociaVaultApiService.getRedditTimeValue(options.timeFilter)
      : "month";

    return this.searchReddit(query, {
      limit: options.limit || 100,
      time,
      sort: "relevance",
    });
  }

  /**
   * Search Reddit posts within specific subreddits (for local search)
   * Uses the subreddit endpoint to fetch local content with pagination, then filters by query
   */
  async searchRedditInSubreddits(
    query: string,
    subreddits: string[],
    options: { limit?: number; timeFilter?: string } = {}
  ): Promise<Post[]> {
    if (subreddits.length === 0) {
      return [];
    }

    const timeframe = options.timeFilter
      ? SociaVaultApiService.getRedditTimeValue(options.timeFilter)
      : "month";

    // Fetch more posts to ensure we have enough after filtering
    const targetPostsPerSubreddit = Math.max(100, (options.limit || 100) * 2);
    const maxPagesPerSubreddit = 3; // Fetch up to 3 pages per subreddit
    const allPosts: Post[] = [];

    // Search each subreddit using the subreddit endpoint with pagination
    const searchPromises = subreddits.map(async (subreddit) => {
      try {
        const subredditPosts: Post[] = [];
        let after: string | undefined;
        let page = 0;

        // Paginate through subreddit posts
        while (page < maxPagesPerSubreddit && subredditPosts.length < targetPostsPerSubreddit) {
          const response = await this.getSubredditPostsWithOptions(subreddit, {
            limit: 100, // Max per page
            timeframe,
            sort: "top",
            after,
          });

          const posts = this.transformRedditToPosts(response);
          if (posts.length === 0) break;

          subredditPosts.push(...posts);

          // Get cursor for next page
          after = response.data?.after;
          if (!after) break;

          page++;

          // Small delay between pages to avoid rate limiting
          if (page < maxPagesPerSubreddit && subredditPosts.length < targetPostsPerSubreddit) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        console.log(`[Reddit Local] Fetched ${subredditPosts.length} posts from r/${subreddit} (${page + 1} pages)`);
        return subredditPosts;
      } catch (error) {
        console.error(`[SociaVault] Error fetching subreddit r/${subreddit}:`, error);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    for (const posts of results) {
      allPosts.push(...posts);
    }

    // Filter by query terms (client-side)
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    let filteredPosts = allPosts.filter(post => {
      const textLower = (post.text || "").toLowerCase();
      // Match if any query term is in the post text
      return queryTerms.some(term => textLower.includes(term));
    });

    // Apply time filter client-side for accuracy (API timeframe is approximate)
    if (options.timeFilter) {
      filteredPosts = SociaVaultApiService.filterByTimeRange(filteredPosts, options.timeFilter);
    }

    console.log(`[Reddit Local] Filtered ${filteredPosts.length} posts matching query from ${allPosts.length} total`);

    // Sort by engagement (likes + comments)
    filteredPosts.sort((a, b) => {
      const engagementA = (a.engagement.likes || 0) + (a.engagement.comments || 0);
      const engagementB = (b.engagement.likes || 0) + (b.engagement.comments || 0);
      return engagementB - engagementA;
    });

    // Limit total results
    return filteredPosts.slice(0, options.limit || 100);
  }

  /**
   * Get posts from a subreddit with full options
   */
  async getSubredditPostsWithOptions(
    subreddit: string,
    options: { after?: string; limit?: number; timeframe?: string; sort?: string } = {}
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

    if (options.timeframe) {
      params.timeframe = options.timeframe;
    }

    if (options.sort) {
      params.sort = options.sort;
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

    // Schema validation for first few posts
    posts.slice(0, 3).forEach((post, index) => {
      validateRedditPostSchema(post as unknown as Record<string, unknown>, index);
    });

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
  // Comment Methods
  // ============================================

  /**
   * Get comments for a TikTok video
   * Endpoint: /tiktok/comments?url=...
   */
  async getTikTokComments(videoUrl: string, maxComments: number = 30): Promise<Post[]> {
    try {
      const response = await this.fetchApi<{
        comments?: Array<{
          cid?: string;
          text?: string;
          user?: {
            unique_id?: string;
            uniqueId?: string;
            nickname?: string;
            avatar_thumb?: { url_list?: string[] };
          };
          create_time?: number;
          digg_count?: number;
          reply_comment_total?: number;
        }>;
        has_more?: number;
        cursor?: number;
      }>("/tiktok/comments", { url: videoUrl });

      if (!response.comments || response.comments.length === 0) {
        return [];
      }

      return response.comments.slice(0, maxComments).map((comment) => {
        const authorId = comment.user?.unique_id || comment.user?.uniqueId || "unknown";
        return {
          id: comment.cid || `tiktok-comment-${Date.now()}`,
          text: comment.text || "",
          author: comment.user?.nickname || authorId,
          authorHandle: `@${authorId}`,
          authorAvatar: comment.user?.avatar_thumb?.url_list?.[0],
          createdAt: comment.create_time
            ? new Date(comment.create_time * 1000).toISOString()
            : new Date().toISOString(),
          platform: "tiktok" as const,
          engagement: {
            likes: comment.digg_count || 0,
            comments: comment.reply_comment_total || 0,
            shares: 0,
          },
          url: videoUrl,
        };
      });
    } catch (error) {
      console.error(`[SociaVault] Failed to fetch TikTok comments:`, error);
      return [];
    }
  }

  /**
   * Get comments for a Reddit post
   * Endpoint: /reddit/post/comments?url=...
   */
  async getRedditComments(postUrl: string, maxComments: number = 30): Promise<Post[]> {
    try {
      const response = await this.fetchApi<{
        data?: {
          comments?: Record<string, {
            id?: string;
            body?: string;
            author?: string;
            created?: number;
            created_utc?: number;
            score?: number;
            permalink?: string;
          }> | Array<{
            id?: string;
            body?: string;
            author?: string;
            created?: number;
            created_utc?: number;
            score?: number;
            permalink?: string;
          }>;
        };
      }>("/reddit/post/comments", { url: postUrl });

      const commentsData = response.data?.comments;
      if (!commentsData) {
        return [];
      }

      // Handle both object and array formats
      const comments = Array.isArray(commentsData)
        ? commentsData
        : Object.values(commentsData);

      return comments.slice(0, maxComments).map((comment) => {
        const author = comment.author || "[deleted]";
        const timestamp = comment.created || comment.created_utc;
        return {
          id: comment.id || `reddit-comment-${Date.now()}`,
          text: comment.body || "",
          author,
          authorHandle: `u/${author}`,
          createdAt: timestamp
            ? new Date(timestamp * 1000).toISOString()
            : new Date().toISOString(),
          platform: "reddit" as const,
          engagement: {
            likes: comment.score || 0,
            comments: 0,
            shares: 0,
          },
          url: comment.permalink
            ? `https://www.reddit.com${comment.permalink}`
            : postUrl,
        };
      });
    } catch (error) {
      console.error(`[SociaVault] Failed to fetch Reddit comments:`, error);
      return [];
    }
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
