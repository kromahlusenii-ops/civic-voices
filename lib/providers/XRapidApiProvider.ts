/**
 * X (Twitter) Provider using The Old Bird V2 API via RapidAPI
 *
 * This is an unofficial API that provides read-only access to Twitter data
 * at a fraction of the official API cost.
 *
 * Pricing (as of Jan 2026):
 * - Pro: $24.99/mo - 100,000 tweets
 * - Ultra: $69.99/mo - 300,000 tweets
 * - Mega: $179.99/mo - 1,000,000 tweets
 *
 * Limitations:
 * - Read-only (no posting)
 * - Unofficial/scraping-based (could be blocked)
 * - May have different data availability than official API
 */

import type { Post, AuthorMetadata } from "../types/api";
import { extractPronouns } from "../utils/pronounDetection";

const RAPIDAPI_HOST = "twitter-v24.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export interface XRapidApiProviderConfig {
  apiKey: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface XRapidApiSearchOptions {
  maxResults?: number;
  cursor?: string;
  searchType?: "Top" | "Latest";  // Maps to API's "section" param: "top" | "latest"
}

export interface XRapidApiSearchResult {
  posts: Post[];
  cursor?: string;
  totalResults?: number;
}

// Response types from The Old Bird V2 API
interface OldBirdTweet {
  rest_id?: string;
  id?: string;
  legacy?: {
    full_text?: string;
    created_at?: string;
    favorite_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    views?: {
      count?: string;
    };
    user_id_str?: string;
  };
  views?: {
    count?: string;
  };
  core?: {
    user_results?: {
      result?: OldBirdUser;
    };
  };
}

interface OldBirdUser {
  rest_id?: string;
  id?: string;
  // New API structure
  core?: {
    created_at?: string;
    name?: string;
    screen_name?: string;
  };
  avatar?: {
    image_url?: string;
  };
  profile_bio?: {
    description?: string;
  };
  relationship_counts?: {
    followers?: number;
    following?: number;
  };
  verification?: {
    is_blue_verified?: boolean;
    verified_type?: string;
  };
  // Legacy API structure (backwards compatibility)
  legacy?: {
    name?: string;
    screen_name?: string;
    profile_image_url_https?: string;
    description?: string;
    verified?: boolean;
    followers_count?: number;
    friends_count?: number;
    created_at?: string;
    statuses_count?: number;
  };
  is_blue_verified?: boolean;
}

interface OldBirdSearchResponse {
  data?: {
    search_by_raw_query?: {
      search_timeline?: {
        timeline?: {
          instructions?: Array<{
            type?: string;
            entries?: Array<{
              content?: {
                itemContent?: {
                  tweet_results?: {
                    result?: OldBirdTweet;
                  };
                };
                cursorType?: string;
                value?: string;
              };
              entryId?: string;
            }>;
          }>;
        };
      };
    };
  };
  errors?: Array<{ message: string; code: number }>;
}

export class XRapidApiRateLimitError extends Error {
  retryAfter: number;
  resetTime: Date;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "XRapidApiRateLimitError";
    this.retryAfter = retryAfter;
    this.resetTime = new Date(Date.now() + retryAfter * 1000);
  }
}

export class XRapidApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "XRapidApiError";
    this.status = status;
    this.code = code;
  }
}

export class XRapidApiProvider {
  private apiKey: string;
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(config: XRapidApiProviderConfig) {
    if (!config.apiKey) {
      throw new Error("RapidAPI key is required");
    }
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  /**
   * Search for tweets matching a keyword query
   */
  async search(
    query: string,
    options: XRapidApiSearchOptions = {}
  ): Promise<XRapidApiSearchResult> {
    const section = options.searchType === "Top" ? "top" : "latest";
    const requestedResults = options.maxResults || 20;
    const perPage = 40; // API's max per request

    const allPosts: Post[] = [];
    let cursor: string | undefined = options.cursor;
    let page = 0;

    // Fetch multiple pages if requesting more than perPage
    while (allPosts.length < requestedResults) {
      const remaining = requestedResults - allPosts.length;
      const limit = Math.min(remaining, perPage);

      const params = new URLSearchParams({
        query: query,
        section: section,
        limit: String(limit),
      });

      if (cursor) {
        params.append("cursor", cursor);
      }

      // Note: The API uses /search/ with trailing slash
      const url = `${RAPIDAPI_BASE}/search/?${params.toString()}`;
      const response = await this.fetchWithRetry<OldBirdSearchResponse>(url);
      const result = this.parseSearchResponse(response);

      page++;
      console.log(`[X RapidAPI] Page ${page}: fetched ${result.posts.length} posts, cursor: ${result.cursor ? 'yes' : 'no'}`);

      allPosts.push(...result.posts);
      cursor = result.cursor;

      // Stop if no more results or no cursor for next page
      if (result.posts.length === 0 || !cursor) {
        break;
      }
    }

    console.log(`[X RapidAPI] Total fetched: ${allPosts.length} posts across ${page} page(s)`);
    return { posts: allPosts, cursor };
  }

  /**
   * Search for recent/latest tweets
   */
  async searchLatest(
    query: string,
    options: Omit<XRapidApiSearchOptions, "searchType"> = {}
  ): Promise<XRapidApiSearchResult> {
    return this.search(query, { ...options, searchType: "Latest" });
  }

  /**
   * Search for top/popular tweets
   */
  async searchTop(
    query: string,
    options: Omit<XRapidApiSearchOptions, "searchType"> = {}
  ): Promise<XRapidApiSearchResult> {
    return this.search(query, { ...options, searchType: "Top" });
  }

  /**
   * Get user profile by username
   * Endpoint: /user/about?username=...
   */
  async getUserByUsername(username: string): Promise<OldBirdUser | null> {
    const cleanUsername = username.replace(/^@/, "");
    const url = `${RAPIDAPI_BASE}/user/about?username=${encodeURIComponent(cleanUsername)}`;

    try {
      const response = await this.fetchWithRetry<{ data?: { user?: { result?: OldBirdUser } } }>(url);
      return response.data?.user?.result || null;
    } catch {
      return null;
    }
  }

  /**
   * Get tweet details by ID
   * Endpoint: /tweet/details?tweet_id=...
   */
  async getTweetById(tweetId: string): Promise<Post | null> {
    const url = `${RAPIDAPI_BASE}/tweet/details?tweet_id=${tweetId}`;

    try {
      const response = await this.fetchWithRetry<{ data?: { tweetResult?: { result?: OldBirdTweet } } }>(url);
      const tweet = response.data?.tweetResult?.result;
      if (!tweet) return null;
      return this.normalizeTweet(tweet);
    } catch {
      return null;
    }
  }

  /**
   * Get replies/comments for a tweet
   * Endpoint: /tweet/replies?tweet_id=...
   */
  async getTweetReplies(tweetId: string, maxResults: number = 50): Promise<Post[]> {
    const url = `${RAPIDAPI_BASE}/tweet/replies?tweet_id=${tweetId}&count=${maxResults}`;

    try {
      const response = await this.fetchWithRetry<OldBirdSearchResponse>(url);
      const result = this.parseSearchResponse(response);
      return result.posts;
    } catch (error) {
      console.error(`[X RapidAPI] Failed to fetch replies for tweet ${tweetId}:`, error);
      return [];
    }
  }

  /**
   * Parse search response into posts
   */
  private parseSearchResponse(response: OldBirdSearchResponse): XRapidApiSearchResult {
    const posts: Post[] = [];
    let cursor: string | undefined;

    const instructions = response.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];

    for (const instruction of instructions) {
      if (instruction.type === "TimelineAddEntries" && instruction.entries) {
        for (const entry of instruction.entries) {
          // Extract cursor for pagination
          if (entry.content?.cursorType === "Bottom") {
            cursor = entry.content.value;
            continue;
          }

          // Extract tweet
          const tweet = entry.content?.itemContent?.tweet_results?.result;
          if (tweet) {
            const post = this.normalizeTweet(tweet);
            if (post) {
              posts.push(post);
            }
          }
        }
      }
    }

    return { posts, cursor };
  }

  /**
   * Normalize Old Bird tweet to Post format
   * Handles both new API structure and legacy structure for backwards compatibility
   */
  private normalizeTweet(tweet: OldBirdTweet): Post | null {
    const tweetId = tweet.rest_id || tweet.id;
    const legacy = tweet.legacy;
    const user = tweet.core?.user_results?.result;

    if (!tweetId || !legacy) return null;

    // Get user info from new structure (user.core) or fallback to legacy (user.legacy)
    const userName = user?.core?.name || user?.legacy?.name || "Unknown";
    const screenName = user?.core?.screen_name || user?.legacy?.screen_name || "unknown";
    const avatarUrl = user?.avatar?.image_url?.replace("_normal", "_bigger") ||
                     user?.legacy?.profile_image_url_https?.replace("_normal", "_bigger");

    // Parse Twitter's date format: "Wed Jan 08 14:23:45 +0000 2025"
    const createdAt = legacy.created_at
      ? this.parseTwitterDate(legacy.created_at)
      : new Date().toISOString();

    // Get view count from view_count_info or legacy
    const viewCount = parseInt(
      tweet.views?.count || legacy.views?.count || "0",
      10
    );

    // Extract author metadata for credibility scoring
    const authorMetadata = this.extractAuthorMetadata(user);

    return {
      id: tweetId,
      text: legacy.full_text || "",
      author: userName,
      authorHandle: `@${screenName}`,
      authorAvatar: avatarUrl,
      createdAt,
      platform: "x",
      engagement: {
        likes: legacy.favorite_count || 0,
        comments: legacy.reply_count || 0,
        shares: (legacy.retweet_count || 0) + (legacy.quote_count || 0),
        views: viewCount,
      },
      url: `https://twitter.com/${screenName}/status/${tweetId}`,
      authorMetadata,
    };
  }

  /**
   * Extract author metadata for credibility scoring
   * Handles both new API structure and legacy structure
   */
  private extractAuthorMetadata(user: OldBirdUser | undefined): AuthorMetadata | undefined {
    if (!user) return undefined;

    // Get values from new structure or fallback to legacy
    const screenName = user.core?.screen_name || user.legacy?.screen_name;
    const name = user.core?.name || user.legacy?.name;
    const bio = user.profile_bio?.description || user.legacy?.description;
    const createdAtStr = user.core?.created_at || user.legacy?.created_at;
    const followersCount = user.relationship_counts?.followers || user.legacy?.followers_count;
    const followingCount = user.relationship_counts?.following || user.legacy?.friends_count;
    const isVerified = user.verification?.is_blue_verified || user.is_blue_verified || user.legacy?.verified || false;

    // Calculate account age in days
    let accountAgeDays: number | undefined;
    if (createdAtStr) {
      const createdDate = this.parseTwitterDate(createdAtStr);
      if (createdDate) {
        const now = new Date();
        accountAgeDays = Math.floor(
          (now.getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // Extract pronouns from bio and/or name
    const bioPronouns = extractPronouns(bio);
    const namePronouns = extractPronouns(name);

    // Prefer bio pronouns over name pronouns if both found
    const pronouns = bioPronouns.pronouns || namePronouns.pronouns;
    const inferredGender = bioPronouns.pronouns
      ? bioPronouns.inferredGender
      : namePronouns.inferredGender;

    return {
      followersCount,
      followingCount,
      accountAgeDays,
      isVerified,
      bio,
      profileUrl: screenName ? `https://twitter.com/${screenName}` : undefined,
      createdAt: createdAtStr ? this.parseTwitterDate(createdAtStr) : undefined,
      pronouns,
      inferredGender,
    };
  }

  /**
   * Parse Twitter's date format to ISO string
   * Format: "Wed Jan 08 14:23:45 +0000 2025"
   */
  private parseTwitterDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Fallback parsing for Twitter format
        const parts = dateStr.split(" ");
        if (parts.length >= 6) {
          const reformatted = `${parts[1]} ${parts[2]}, ${parts[5]} ${parts[3]}`;
          const fallbackDate = new Date(reformatted);
          if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate.toISOString();
          }
        }
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Fetch with automatic retry on rate limits and transient errors
   */
  private async fetchWithRetry<T>(url: string, attempt = 0): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
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
          return this.fetchWithRetry<T>(url, attempt + 1);
        }

        throw new XRapidApiRateLimitError(
          `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
          retryAfter
        );
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < this.maxRetries) {
        const waitTime = this.calculateBackoff(attempt);
        await this.delay(waitTime);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new XRapidApiError(
          "Unauthorized - check your X_RAPIDAPI_KEY environment variable",
          401,
          "AUTH_ERROR"
        );
      }

      // Handle subscription/payment errors
      if (response.status === 403) {
        throw new XRapidApiError(
          "Access forbidden - check your RapidAPI subscription status",
          403,
          "SUBSCRIPTION_ERROR"
        );
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await this.safeParseJson(response);
        const errorMessage = (errorBody?.message as string) || response.statusText;

        throw new XRapidApiError(
          `RapidAPI error: ${response.status} - ${errorMessage}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      // Re-throw known errors
      if (error instanceof XRapidApiRateLimitError || error instanceof XRapidApiError) {
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
      return 60; // Default to 60 seconds
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

    return 60;
  }

  private calculateBackoff(attempt: number): number {
    const jitter = Math.random() * 0.3 + 0.85;
    return Math.min(this.baseDelayMs * Math.pow(2, attempt) * jitter, 30000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

  private async safeParseJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Calculate time range for client-side filtering
   * (The Old Bird API doesn't support native time filtering)
   */
  static getTimeRange(filter: string): { since: Date; until: Date } {
    const now = new Date();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const daysMap: Record<string, number> = {
      "1d": 1,
      "today": 1,
      "7d": 7,
      "last_week": 7,
      "30d": 30,
      "3m": 90,
      "last_3_months": 90,
      "12m": 365,
      "last_year": 365,
    };

    const days = daysMap[filter] ?? 90;
    const since = new Date(now.getTime() - days * DAY_MS);

    return { since, until: now };
  }

  /**
   * Filter posts by time range (client-side filtering)
   */
  static filterByTimeRange(posts: Post[], filter: string): Post[] {
    const { since } = XRapidApiProvider.getTimeRange(filter);

    return posts.filter((post) => {
      const postDate = new Date(post.createdAt);
      return postDate >= since;
    });
  }
}

export default XRapidApiProvider;
