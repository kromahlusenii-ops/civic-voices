import type { Post, TruthSocialSearchResponse, TruthSocialStatus, AuthorMetadata } from "../types/api";
import { extractPronouns } from "../utils/pronounDetection";

const TRUTH_SOCIAL_API_BASE = "https://truthsocial.com/api";

// OAuth client credentials from truthbrush
const CLIENT_ID = "9X1Fdd-pxNsAgEDNi_SfhJWi8T-vLuV2WVzKIbkTCw4";
const CLIENT_SECRET = "ozF8jzI4968oTKFkEnsBC-UbLPCdrSv0MkXGQu2o_-M";

export class TruthSocialApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "TruthSocialApiError";
  }
}

interface TruthSocialSession {
  access_token: string;
  token_type: string;
  expires_in?: number;
  created_at?: number;
}

interface TruthSocialConfig {
  username: string;
  password: string;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  minId?: string;
  maxId?: string;
}

export class TruthSocialProvider {
  private username: string;
  private password: string;
  private session: TruthSocialSession | null = null;

  constructor(config: TruthSocialConfig) {
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * Authenticate with Truth Social using OAuth 2.0 password grant
   */
  private async authenticate(): Promise<void> {
    if (!this.username || !this.password) {
      throw new TruthSocialApiError("Truth Social credentials not configured", 401);
    }

    const params = new URLSearchParams({
      grant_type: "password",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: this.username,
      password: this.password,
      scope: "read",
    });

    const response = await fetch(`${TRUTH_SOCIAL_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new TruthSocialApiError(
        `Authentication failed: ${error}`,
        response.status
      );
    }

    this.session = await response.json();
  }

  /**
   * Make an authenticated request to Truth Social API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.session) {
      await this.authenticate();
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${TRUTH_SOCIAL_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.session!.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      // Token expired, re-authenticate and retry
      this.session = null;
      await this.authenticate();

      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.session!.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new TruthSocialApiError(
          `API request failed: ${error}`,
          retryResponse.status
        );
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      const error = await response.text();
      throw new TruthSocialApiError(
        `API request failed: ${error}`,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Search for truths (posts) on Truth Social
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<{ posts: Post[]; total?: number }> {
    const params = new URLSearchParams({
      q: query,
      type: "statuses",
      resolve: "true",
    });

    if (options.limit) {
      params.append("limit", String(options.limit));
    }
    if (options.offset) {
      params.append("offset", String(options.offset));
    }
    if (options.minId) {
      params.append("min_id", options.minId);
    }
    if (options.maxId) {
      params.append("max_id", options.maxId);
    }

    const response = await this.makeRequest<TruthSocialSearchResponse>(
      `/v2/search?${params.toString()}`
    );

    const posts = this.transformToPosts(response.statuses || []);

    return { posts };
  }

  /**
   * Transform Truth Social statuses to common Post format
   */
  private transformToPosts(statuses: TruthSocialStatus[]): Post[] {
    return statuses.map((status) => {
      // Strip HTML tags from content
      const plainText = status.content
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      // Extract author metadata for credibility scoring
      const authorMetadata = this.extractAuthorMetadata(status);

      return {
        id: status.id,
        text: plainText,
        author: status.account.display_name || status.account.username,
        authorHandle: `@${status.account.username}`,
        authorAvatar: status.account.avatar,
        createdAt: status.created_at,
        platform: "truthsocial" as const,
        engagement: {
          likes: status.favourites_count || 0,
          comments: status.replies_count || 0,
          shares: status.reblogs_count || 0,
        },
        url: status.url || `https://truthsocial.com/@${status.account.username}/posts/${status.id}`,
        thumbnail: status.media_attachments?.[0]?.preview_url,
        authorMetadata,
      };
    });
  }

  /**
   * Extract author metadata for credibility scoring
   * Truth Social (Mastodon API) provides rich account metadata
   */
  private extractAuthorMetadata(status: TruthSocialStatus): AuthorMetadata | undefined {
    const account = status.account;
    if (!account) return undefined;

    // Truth Social doesn't have platform verification
    // But we could potentially detect official accounts by other signals

    // Try to extract pronouns from display name (bio not in current response type)
    const displayNamePronouns = extractPronouns(account.display_name);

    return {
      followersCount: account.followers_count,
      followingCount: account.following_count,
      accountAgeDays: undefined, // Account created_at not in the response type, would need to add
      isVerified: false, // Truth Social doesn't have verification badges
      bio: undefined, // Not in current response type
      profileUrl: `https://truthsocial.com/@${account.username}`,
      pronouns: displayNamePronouns.pronouns,
      inferredGender: displayNamePronouns.inferredGender,
    };
  }

  /**
   * Get time range for filtering (client-side for Truth Social)
   */
  static getTimeRange(filter: string): { since?: Date; until?: Date } {
    const now = new Date();
    let since: Date | undefined;

    switch (filter) {
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

    return { since, until: now };
  }

  /**
   * Filter posts by time range (client-side)
   */
  static filterByTimeRange(posts: Post[], filter: string): Post[] {
    const { since } = TruthSocialProvider.getTimeRange(filter);
    if (!since) return posts;

    return posts.filter((post) => {
      const postDate = new Date(post.createdAt);
      return postDate >= since;
    });
  }
}

export default TruthSocialProvider;
