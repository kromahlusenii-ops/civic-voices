import type { BlueskySearchResponse, BlueskyPost, Post } from "../types/api";

const BLUESKY_API_BASE = "https://public.api.bsky.app/xrpc";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export interface BlueskyProviderConfig {
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface BlueskySearchOptions {
  limit?: number;
  sort?: "top" | "latest";
  since?: string;
  until?: string;
  lang?: string;
}

export interface BlueskySearchResult {
  posts: Post[];
  cursor?: string;
  hitsTotal?: number;
}

export class BlueskyRateLimitError extends Error {
  retryAfter: number;
  resetTime: Date;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "BlueskyRateLimitError";
    this.retryAfter = retryAfter;
    this.resetTime = new Date(Date.now() + retryAfter * 1000);
  }
}

export class BlueskyApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BlueskyApiError";
    this.status = status;
  }
}

export class BlueskyProvider {
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(config: BlueskyProviderConfig = {}) {
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  private async fetchWithRetry<T>(url: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
          throw new BlueskyRateLimitError(
            `Rate limit exceeded. Retry after ${retryAfter} seconds`,
            retryAfter
          );
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new BlueskyApiError(
            `Bluesky API error: ${response.status} - ${errorBody || response.statusText}`,
            response.status
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof BlueskyRateLimitError) {
          throw error;
        }

        if (error instanceof BlueskyApiError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Unknown error occurred");
  }

  async search(query: string, options: BlueskySearchOptions = {}): Promise<BlueskySearchResult> {
    const params = new URLSearchParams();
    params.append("q", query);

    if (options.limit) {
      params.append("limit", Math.min(options.limit, 100).toString());
    }
    if (options.sort) {
      params.append("sort", options.sort);
    }
    if (options.since) {
      params.append("since", options.since);
    }
    if (options.until) {
      params.append("until", options.until);
    }
    if (options.lang && options.lang !== "all") {
      params.append("lang", options.lang);
    }

    const url = `${BLUESKY_API_BASE}/app.bsky.feed.searchPosts?${params.toString()}`;
    const response = await this.fetchWithRetry<BlueskySearchResponse>(url);

    const posts = this.normalizePosts(response.posts || []);

    return {
      posts,
      cursor: response.cursor,
      hitsTotal: response.hitsTotal,
    };
  }

  private normalizePosts(blueskyPosts: BlueskyPost[]): Post[] {
    return blueskyPosts.map((post) => this.normalizePost(post));
  }

  private normalizePost(post: BlueskyPost): Post {
    const postId = this.extractPostId(post.uri);
    const thumbnail = post.embed?.images?.[0]?.thumb;

    return {
      id: postId,
      text: post.record.text,
      author: post.author.displayName || post.author.handle,
      authorHandle: `@${post.author.handle}`,
      authorAvatar: post.author.avatar,
      createdAt: post.record.createdAt,
      platform: "bluesky",
      engagement: {
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        shares: post.repostCount || 0,
      },
      url: `https://bsky.app/profile/${post.author.handle}/post/${postId}`,
      thumbnail,
    };
  }

  private extractPostId(uri: string): string {
    const parts = uri.split("/");
    return parts[parts.length - 1];
  }

  static getTimeRange(timeFilter: string): { since?: string; until?: string } {
    const now = new Date();
    let since: Date | undefined;

    switch (timeFilter) {
      case "1d":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      since: since.toISOString(),
      until: now.toISOString(),
    };
  }
}
