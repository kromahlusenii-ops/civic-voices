import type { XSearchResponse, XTweet, XUser, Post } from "../types/api";

const X_API_BASE = "https://api.twitter.com/2";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export interface XProviderConfig {
  bearerToken: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface XSearchOptions {
  maxResults?: number;
  startTime?: string;
  endTime?: string;
  nextToken?: string;
  language?: string;          // BCP47 language code (e.g., 'en')
  excludeRetweets?: boolean;  // Default: true
}

export interface XSearchResult {
  response: XSearchResponse;
  posts: Post[];
  warning?: string;  // Warning message (e.g., time filter clamped)
}

export class XRateLimitError extends Error {
  retryAfter: number;
  resetTime: Date;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "XRateLimitError";
    this.retryAfter = retryAfter;
    this.resetTime = new Date(Date.now() + retryAfter * 1000);
  }
}

export class XApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "XApiError";
    this.status = status;
    this.code = code;
  }
}

// Maximum time range for Basic tier (7 days in milliseconds)
const MAX_TIME_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

export class XProvider {
  private bearerToken: string;
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(config: XProviderConfig) {
    if (!config.bearerToken) {
      throw new Error("Bearer token is required");
    }
    this.bearerToken = config.bearerToken;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  /**
   * Build X API query with language filter and retweet exclusion
   */
  static buildQuery(
    baseQuery: string,
    options: { language?: string; excludeRetweets?: boolean } = {}
  ): string {
    const parts: string[] = [baseQuery];

    // Add language filter if specified
    if (options.language) {
      parts.push(`lang:${options.language}`);
    }

    // Exclude retweets by default for cleaner results
    if (options.excludeRetweets !== false) {
      parts.push("-is:retweet");
    }

    return parts.join(" ");
  }

  /**
   * Validate and clamp time range to 7 days (Basic tier limit)
   * Returns clamped times and optional warning message
   */
  static validateTimeRange(
    startTime?: string,
    endTime?: string
  ): { startTime?: string; endTime?: string; warning?: string } {
    if (!startTime) {
      return { startTime, endTime };
    }

    const now = new Date();
    const end = endTime ? new Date(endTime) : now;
    const start = new Date(startTime);
    const timeRangeMs = end.getTime() - start.getTime();

    // If within 7 days, no clamping needed
    if (timeRangeMs <= MAX_TIME_RANGE_MS) {
      return { startTime, endTime };
    }

    // Clamp to 7 days from end time
    const clampedStart = new Date(end.getTime() - MAX_TIME_RANGE_MS);

    return {
      startTime: clampedStart.toISOString(),
      endTime: endTime || now.toISOString(),
      warning: `X API (Basic tier) only supports the last 7 days. Time range has been adjusted.`,
    };
  }

  /**
   * Search for tweets matching a keyword query
   */
  async search(query: string, options: XSearchOptions = {}): Promise<XSearchResponse> {
    // Build query with language filter and retweet exclusion
    const builtQuery = XProvider.buildQuery(query, {
      language: options.language,
      excludeRetweets: options.excludeRetweets,
    });

    // Validate and clamp time range to 7 days
    const validatedTime = XProvider.validateTimeRange(
      options.startTime,
      options.endTime
    );

    const params = new URLSearchParams({
      query: builtQuery,
      "tweet.fields": "created_at,public_metrics,author_id",
      "user.fields": "name,username,profile_image_url",
      expansions: "author_id",
      max_results: String(Math.min(options.maxResults || 10, 100)), // Basic tier max is 100
    });

    if (validatedTime.startTime) {
      params.append("start_time", validatedTime.startTime);
    }
    if (validatedTime.endTime) {
      params.append("end_time", validatedTime.endTime);
    }
    if (options.nextToken) {
      params.append("next_token", options.nextToken);
    }

    const url = `${X_API_BASE}/tweets/search/recent?${params.toString()}`;
    return this.fetchWithRetry(url);
  }

  /**
   * Search with full result including warning messages
   */
  async searchWithWarning(
    query: string,
    options: XSearchOptions = {}
  ): Promise<XSearchResult> {
    // Validate time range and capture warning
    const validatedTime = XProvider.validateTimeRange(
      options.startTime,
      options.endTime
    );

    const response = await this.search(query, {
      ...options,
      startTime: validatedTime.startTime,
      endTime: validatedTime.endTime,
    });

    const posts = this.normalizePosts(response);

    return {
      response,
      posts,
      warning: validatedTime.warning,
    };
  }

  /**
   * Fetch with automatic retry on rate limits and transient errors
   */
  private async fetchWithRetry(url: string, attempt = 0): Promise<XSearchResponse> {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
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

        throw new XRateLimitError(
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
        const errorMessage = errorBody?.detail || errorBody?.message || response.statusText;
        const errorCode = (errorBody?.type || errorBody?.code) as string | undefined;

        throw new XApiError(
          `X API error: ${response.status} - ${errorMessage}`,
          response.status,
          errorCode
        );
      }

      return response.json();
    } catch (error) {
      // Re-throw known errors
      if (error instanceof XRateLimitError || error instanceof XApiError) {
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
      // Check for x-rate-limit-reset header (Unix timestamp)
      const resetTime = response.headers.get("x-rate-limit-reset");
      if (resetTime) {
        const resetTimestamp = parseInt(resetTime, 10);
        const now = Math.floor(Date.now() / 1000);
        return Math.max(0, resetTimestamp - now);
      }
      return 60; // Default to 60 seconds if no header
    }

    // Retry-After can be seconds or HTTP-date
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
   * Normalize X API response to common Post format
   */
  normalizePosts(data: XSearchResponse): Post[] {
    if (!data.data || data.data.length === 0) {
      return [];
    }

    const users = data.includes?.users || [];
    const userMap = new Map<string, XUser>(users.map((u) => [u.id, u]));

    return data.data.map((tweet) => this.normalizePost(tweet, userMap));
  }

  /**
   * Normalize a single tweet to Post format
   */
  private normalizePost(tweet: XTweet, userMap: Map<string, XUser>): Post {
    const author = userMap.get(tweet.author_id);

    return {
      id: tweet.id,
      text: tweet.text,
      author: author?.name || "Unknown",
      authorHandle: `@${author?.username || "unknown"}`,
      authorAvatar: author?.profile_image_url,
      createdAt: tweet.created_at,
      platform: "x",
      engagement: {
        likes: tweet.public_metrics.like_count,
        comments: tweet.public_metrics.reply_count,
        shares: tweet.public_metrics.retweet_count + tweet.public_metrics.quote_count,
        views: tweet.public_metrics.impression_count,
      },
      url: `https://twitter.com/${author?.username || "i"}/status/${tweet.id}`,
    };
  }

  /**
   * Search and normalize in one call
   */
  async searchAndNormalize(
    query: string,
    options: XSearchOptions = {}
  ): Promise<Post[]> {
    const response = await this.search(query, options);
    return this.normalizePosts(response);
  }

  /**
   * Calculate time range based on filter string
   */
  static getTimeRange(filter: string): { startTime: string; endTime: string } {
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
      startTime: start.toISOString(),
      endTime: end,
    };
  }
}

export default XProvider;
