import type { TikTokSearchResponse, TikTokVideo, Post } from "../types/api";

const DEFAULT_API_URL = "https://www.tikapi.io";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export interface TikTokProviderConfig {
  apiKey: string;
  apiUrl?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface TikTokSearchOptions {
  count?: number;
  cursor?: number;
}

export interface TikTokPaginatedResponse {
  posts: Post[];
  cursor?: number;
  hasMore: boolean;
}

export class TikTokRateLimitError extends Error {
  retryAfter: number;
  resetTime: Date;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "TikTokRateLimitError";
    this.retryAfter = retryAfter;
    this.resetTime = new Date(Date.now() + retryAfter * 1000);
  }
}

export class TikTokApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "TikTokApiError";
    this.status = status;
    this.code = code;
  }
}

export class TikTokProvider {
  private apiKey: string;
  private apiUrl: string;
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(config: TikTokProviderConfig) {
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  /**
   * Search for TikTok videos by keyword
   */
  async search(query: string, options: TikTokSearchOptions = {}): Promise<TikTokSearchResponse> {
    const params = new URLSearchParams({
      keyword: query,
      count: String(options.count || 10),
    });

    if (options.cursor) {
      params.append("cursor", String(options.cursor));
    }

    const url = `${this.apiUrl}/public/search?${params.toString()}`;
    return this.fetchWithRetry(url);
  }

  /**
   * Search for TikTok videos by hashtag
   */
  async searchByHashtag(hashtag: string, options: TikTokSearchOptions = {}): Promise<TikTokSearchResponse> {
    // Remove # if present at the start
    const cleanHashtag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;

    const params = new URLSearchParams({
      name: cleanHashtag,
      count: String(options.count || 10),
    });

    if (options.cursor) {
      params.append("cursor", String(options.cursor));
    }

    const url = `${this.apiUrl}/public/hashtag?${params.toString()}`;
    return this.fetchWithRetry(url);
  }

  /**
   * Fetch with automatic retry on rate limits and transient errors
   */
  private async fetchWithRetry(url: string, attempt = 0): Promise<TikTokSearchResponse> {
    try {
      const response = await fetch(url, {
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response);

        if (attempt < this.maxRetries) {
          const waitTime = retryAfter > 0
            ? retryAfter * 1000
            : this.calculateBackoff(attempt);

          await this.delay(waitTime);
          return this.fetchWithRetry(url, attempt + 1);
        }

        throw new TikTokRateLimitError(
          `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
          retryAfter
        );
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < this.maxRetries) {
        const waitTime = this.calculateBackoff(attempt);
        await this.delay(waitTime);
        return this.fetchWithRetry(url, attempt + 1);
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await this.safeParseJson(response);
        const errorMessage = errorBody?.message || errorBody?.error || response.statusText;
        const errorCode = (errorBody?.code || errorBody?.type) as string | undefined;

        throw new TikTokApiError(
          `TikTok API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorCode
        );
      }

      return response.json();
    } catch (error) {
      // Re-throw known errors
      if (error instanceof TikTokRateLimitError || error instanceof TikTokApiError) {
        throw error;
      }

      // Handle network errors with retry
      if (attempt < this.maxRetries && this.isNetworkError(error)) {
        const waitTime = this.calculateBackoff(attempt);
        await this.delay(waitTime);
        return this.fetchWithRetry(url, attempt + 1);
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
    return Math.min(
      this.baseDelayMs * Math.pow(2, attempt) * jitter,
      30000 // Max 30 seconds
    );
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
   * Normalize TikTok API response to common Post format
   */
  normalizePosts(data: TikTokSearchResponse): Post[] {
    if (!data.videos || data.videos.length === 0) {
      return [];
    }

    return data.videos.map((video) => this.normalizePost(video));
  }

  /**
   * Normalize a single video to Post format
   */
  private normalizePost(video: TikTokVideo): Post {
    return {
      id: video.id,
      text: video.desc || "",
      author: video.author.nickname,
      authorHandle: `@${video.author.uniqueId}`,
      authorAvatar: video.author.avatarLarger,
      createdAt: new Date(video.createTime * 1000).toISOString(),
      platform: "tiktok",
      engagement: {
        likes: video.stats.diggCount,
        comments: video.stats.commentCount,
        shares: video.stats.shareCount,
        views: video.stats.playCount,
      },
      url: `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`,
    };
  }

  /**
   * Search and normalize in one call
   */
  async searchAndNormalize(
    query: string,
    options: TikTokSearchOptions = {}
  ): Promise<Post[]> {
    const response = await this.search(query, options);
    return this.normalizePosts(response);
  }

  /**
   * Search and return paginated response
   */
  async searchPaginated(
    query: string,
    options: TikTokSearchOptions = {}
  ): Promise<TikTokPaginatedResponse> {
    const response = await this.search(query, options);
    return {
      posts: this.normalizePosts(response),
      cursor: response.cursor,
      hasMore: response.hasMore ?? false,
    };
  }

  /**
   * Search by hashtag and return paginated response
   */
  async searchHashtagPaginated(
    hashtag: string,
    options: TikTokSearchOptions = {}
  ): Promise<TikTokPaginatedResponse> {
    const response = await this.searchByHashtag(hashtag, options);
    return {
      posts: this.normalizePosts(response),
      cursor: response.cursor,
      hasMore: response.hasMore ?? false,
    };
  }

  /**
   * Fetch all pages up to a limit
   */
  async searchAllPages(
    query: string,
    maxPages: number = 5,
    countPerPage: number = 20
  ): Promise<Post[]> {
    const allPosts: Post[] = [];
    let cursor: number | undefined;
    let pageCount = 0;

    while (pageCount < maxPages) {
      const response = await this.searchPaginated(query, {
        count: countPerPage,
        cursor,
      });

      allPosts.push(...response.posts);
      pageCount++;

      if (!response.hasMore || !response.cursor) {
        break;
      }

      cursor = response.cursor;
    }

    return allPosts;
  }

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
}

export default TikTokProvider;
