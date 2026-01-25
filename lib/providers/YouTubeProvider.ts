import type {
  YouTubeSearchResponse,
  YouTubeVideosResponse,
  YouTubeVideo,
  YouTubeCommentThread,
  YouTubeCommentThreadsResponse,
  Post,
  AuthorMetadata,
} from "../types/api";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export interface YouTubeProviderConfig {
  apiKey: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  pageToken?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  relevanceLanguage?: string;
  order?: "date" | "rating" | "relevance" | "title" | "viewCount";
}

export interface YouTubeSearchResult {
  posts: Post[];
  nextPageToken?: string;
  totalResults?: number;
}

export class YouTubeRateLimitError extends Error {
  retryAfter: number;
  resetTime: Date;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "YouTubeRateLimitError";
    this.retryAfter = retryAfter;
    this.resetTime = new Date(Date.now() + retryAfter * 1000);
  }
}

export class YouTubeApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.code = code;
  }
}

export class YouTubeProvider {
  private apiKey: string;
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(config: YouTubeProviderConfig) {
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  /**
   * Search for YouTube videos by query
   */
  async search(query: string, options: YouTubeSearchOptions = {}): Promise<YouTubeSearchResponse> {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: String(Math.min(options.maxResults || 25, 50)),
      key: this.apiKey,
    });

    if (options.pageToken) {
      params.append("pageToken", options.pageToken);
    }
    if (options.publishedAfter) {
      params.append("publishedAfter", options.publishedAfter);
    }
    if (options.publishedBefore) {
      params.append("publishedBefore", options.publishedBefore);
    }
    if (options.relevanceLanguage && options.relevanceLanguage !== "all") {
      params.append("relevanceLanguage", options.relevanceLanguage);
    }
    if (options.order) {
      params.append("order", options.order);
    }

    const url = `${YOUTUBE_API_BASE}/search?${params.toString()}`;
    return this.fetchWithRetry<YouTubeSearchResponse>(url);
  }

  /**
   * Get video statistics by video IDs
   */
  async getVideoStats(videoIds: string[]): Promise<YouTubeVideosResponse> {
    if (videoIds.length === 0) {
      return { items: [] };
    }

    const params = new URLSearchParams({
      part: "statistics,snippet",
      id: videoIds.join(","),
      key: this.apiKey,
    });

    const url = `${YOUTUBE_API_BASE}/videos?${params.toString()}`;
    return this.fetchWithRetry<YouTubeVideosResponse>(url);
  }

  /**
   * Search and get full video details including statistics
   */
  async searchWithStats(
    query: string,
    options: YouTubeSearchOptions = {}
  ): Promise<YouTubeSearchResult> {
    // First, search for videos
    const searchResponse = await this.search(query, options);

    if (!searchResponse.items || searchResponse.items.length === 0) {
      return {
        posts: [],
        nextPageToken: searchResponse.nextPageToken,
        totalResults: searchResponse.pageInfo?.totalResults,
      };
    }

    // Extract video IDs
    const videoIds = searchResponse.items.map((item) => item.id.videoId);

    // Get video statistics
    const statsResponse = await this.getVideoStats(videoIds);

    // Merge search results with statistics
    const videosWithStats: YouTubeVideo[] = searchResponse.items.map((searchItem) => {
      const statsItem = statsResponse.items?.find(
        (v) => v.id === searchItem.id.videoId
      );

      return {
        id: searchItem.id.videoId,
        snippet: searchItem.snippet,
        statistics: statsItem?.statistics,
      };
    });

    // Normalize to Post format
    const posts = videosWithStats.map((video) => this.normalizePost(video));

    return {
      posts,
      nextPageToken: searchResponse.nextPageToken,
      totalResults: searchResponse.pageInfo?.totalResults,
    };
  }

  /**
   * Search with pagination - fetches multiple pages for more results
   * YouTube API returns max 50 results per page, so we fetch multiple pages
   */
  async searchWithStatsPaginated(
    query: string,
    options: YouTubeSearchOptions & { maxPages?: number } = {}
  ): Promise<YouTubeSearchResult> {
    const maxPages = options.maxPages || 4; // Default to 4 pages = ~200 videos max
    const allPosts: Post[] = [];
    let nextPageToken: string | undefined;
    let totalResults: number | undefined;
    let pagesLoaded = 0;

    while (pagesLoaded < maxPages) {
      const result = await this.searchWithStats(query, {
        ...options,
        pageToken: nextPageToken,
        maxResults: 50, // Max per page
      });

      if (result.posts.length === 0) {
        break;
      }

      allPosts.push(...result.posts);
      nextPageToken = result.nextPageToken;
      totalResults = result.totalResults;
      pagesLoaded++;

      console.log(`[YouTube Paginated] Page ${pagesLoaded}: fetched ${result.posts.length} videos, total: ${allPosts.length}`);

      // Stop if no more pages
      if (!nextPageToken) {
        break;
      }

      // Small delay between pages to avoid rate limiting
      if (pagesLoaded < maxPages) {
        await this.delay(300);
      }
    }

    return {
      posts: allPosts,
      nextPageToken,
      totalResults,
    };
  }

  /**
   * Get comments for a YouTube video
   * Uses commentThreads API (1 quota unit per request)
   */
  async getVideoComments(videoId: string, maxResults: number = 20): Promise<Post[]> {
    const params = new URLSearchParams({
      part: "snippet",
      videoId: videoId,
      maxResults: String(Math.min(maxResults, 100)),
      order: "relevance",
      textFormat: "plainText",
      key: this.apiKey,
    });

    const url = `${YOUTUBE_API_BASE}/commentThreads?${params.toString()}`;

    try {
      const response = await this.fetchWithRetry<YouTubeCommentThreadsResponse>(url);

      if (!response.items || response.items.length === 0) {
        return [];
      }

      return response.items.map((item) => this.normalizeComment(item, videoId));
    } catch (error) {
      // Handle videos with comments disabled (403 commentsDisabled)
      if (error instanceof YouTubeApiError) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("disabled") ||
          errorMessage.includes("commentsDisabled") ||
          error.code === "commentsDisabled"
        ) {
          console.log(`[YouTube] Comments disabled for video ${videoId}`);
          return [];
        }
      }
      throw error;
    }
  }

  /**
   * Normalize a YouTube comment to Post format
   */
  private normalizeComment(
    commentThread: YouTubeCommentThread,
    videoId: string
  ): Post {
    const comment = commentThread.snippet.topLevelComment;
    const snippet = comment.snippet;

    return {
      id: comment.id,
      text: snippet.textDisplay,
      author: snippet.authorDisplayName,
      authorHandle: snippet.authorChannelId?.value
        ? `@${snippet.authorChannelId.value}`
        : "@unknown",
      authorAvatar: snippet.authorProfileImageUrl,
      createdAt: snippet.publishedAt,
      platform: "youtube",
      engagement: {
        likes: snippet.likeCount || 0,
        comments: commentThread.snippet.totalReplyCount || 0,
        shares: 0,
        views: 0,
      },
      url: `https://www.youtube.com/watch?v=${videoId}&lc=${comment.id}`,
    };
  }

  /**
   * Fetch with automatic retry on rate limits and transient errors
   */
  private async fetchWithRetry<T>(url: string, attempt = 0): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Handle rate limiting (YouTube uses 403 for quota exceeded)
      if (response.status === 429 || response.status === 403) {
        const errorBody = await this.safeParseJson(response);
        const errorObj = errorBody?.error as { errors?: Array<{ reason?: string }> } | undefined;
        const isQuotaError = errorObj?.errors?.some(
          (e) => e.reason === "quotaExceeded" || e.reason === "rateLimitExceeded"
        );

        if (isQuotaError) {
          const retryAfter = this.parseRetryAfter(response);

          if (attempt < this.maxRetries && response.status === 429) {
            const waitTime = retryAfter > 0 ? retryAfter * 1000 : this.calculateBackoff(attempt);
            await this.delay(waitTime);
            return this.fetchWithRetry<T>(url, attempt + 1);
          }

          throw new YouTubeRateLimitError(
            `YouTube API quota exceeded. Retry after ${retryAfter} seconds.`,
            retryAfter
          );
        }
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < this.maxRetries) {
        const waitTime = this.calculateBackoff(attempt);
        await this.delay(waitTime);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await this.safeParseJson(response);
        const errorObj = errorBody?.error as { message?: string; code?: string } | undefined;
        const errorMessage =
          errorObj?.message || (errorBody?.message as string | undefined) || response.statusText;
        const errorCode = errorObj?.code;

        throw new YouTubeApiError(
          `YouTube API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorCode
        );
      }

      return response.json();
    } catch (error) {
      // Re-throw known errors
      if (error instanceof YouTubeRateLimitError || error instanceof YouTubeApiError) {
        throw error;
      }

      // Handle network errors with retry
      if (attempt < this.maxRetries && this.isNetworkError(error)) {
        const waitTime = this.calculateBackoff(attempt);
        await this.delay(waitTime);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Parse Retry-After header from response
   */
  private parseRetryAfter(response: Response): number {
    const retryAfter = response.headers.get("Retry-After");

    if (!retryAfter) {
      return 60; // Default to 60 seconds if no header
    }

    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Try parsing as HTTP-date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
    }

    return 60; // Default fallback
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 jitter
    return Math.min(this.baseDelayMs * Math.pow(2, attempt) * jitter, 30000);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ETIMEDOUT") ||
        error.name === "TypeError"
      );
    }
    return false;
  }

  /**
   * Safely parse JSON from response
   */
  private async safeParseJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Normalize a YouTube video to Post format
   */
  private normalizePost(video: YouTubeVideo): Post {
    const stats = video.statistics;

    // Build author metadata (limited for YouTube - no bio/pronouns in search results)
    const authorMetadata: AuthorMetadata = {
      // Note: YouTube search API doesn't return subscriber counts or channel descriptions
      // Would need separate channel API call (quota-expensive) to get these
      followersCount: undefined,
      followingCount: undefined,
      accountAgeDays: undefined,
      isVerified: false, // YouTube verified status requires channel branding API
      bio: undefined, // Not available in search results
      profileUrl: `https://www.youtube.com/channel/${video.snippet.channelId}`,
      pronouns: undefined, // Cannot extract - no bio in search results
      inferredGender: "unknown",
    };

    return {
      id: video.id,
      text: video.snippet.title + (video.snippet.description ? `\n\n${video.snippet.description.slice(0, 500)}` : ""),
      author: video.snippet.channelTitle,
      authorHandle: `@${video.snippet.channelId}`,
      createdAt: video.snippet.publishedAt,
      platform: "youtube",
      engagement: {
        likes: parseInt(stats?.likeCount || "0", 10),
        comments: parseInt(stats?.commentCount || "0", 10),
        shares: 0, // YouTube doesn't expose share count
        views: parseInt(stats?.viewCount || "0", 10),
      },
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
      authorMetadata,
    };
  }

  /**
   * Normalize array of videos to Posts
   */
  normalizePosts(videos: YouTubeVideo[]): Post[] {
    return videos.map((video) => this.normalizePost(video));
  }

  /**
   * Calculate time range based on filter string
   */
  static getTimeRange(filter: string): { publishedAfter: string; publishedBefore: string } {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;

    switch (filter) {
      case "7d":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      publishedAfter: start.toISOString(),
      publishedBefore: end,
    };
  }

  /**
   * Filter posts by time range (client-side filtering)
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
}

export default YouTubeProvider;
