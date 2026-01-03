import type { XSearchResponse, Post } from "../types/api";

const X_API_BASE = "https://api.twitter.com/2";

export class XApiService {
  private bearerToken: string;

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  /**
   * Search for tweets matching a query
   * @param query Search query
   * @param options Search options (max_results, start_time, end_time)
   */
  async searchTweets(
    query: string,
    options: {
      maxResults?: number;
      startTime?: string;
      endTime?: string;
    } = {}
  ): Promise<XSearchResponse> {
    const params = new URLSearchParams({
      query,
      "tweet.fields": "created_at,public_metrics,author_id",
      "user.fields": "name,username,profile_image_url",
      expansions: "author_id",
      max_results: String(options.maxResults || 10),
    });

    if (options.startTime) {
      params.append("start_time", options.startTime);
    }
    if (options.endTime) {
      params.append("end_time", options.endTime);
    }

    const response = await fetch(
      `${X_API_BASE}/tweets/search/recent?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`X API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Transform X API response to common Post format
   */
  transformToPosts(data: XSearchResponse): Post[] {
    if (!data.data || data.data.length === 0) {
      return [];
    }

    const users = data.includes?.users || [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return data.data.map((tweet) => {
      const author = userMap.get(tweet.author_id);

      return {
        id: tweet.id,
        text: tweet.text,
        author: author?.name || "Unknown",
        authorHandle: `@${author?.username || "unknown"}`,
        authorAvatar: author?.profile_image_url,
        createdAt: tweet.created_at,
        platform: "x" as const,
        engagement: {
          likes: tweet.public_metrics.like_count,
          comments: tweet.public_metrics.reply_count,
          shares:
            tweet.public_metrics.retweet_count +
            tweet.public_metrics.quote_count,
          views: tweet.public_metrics.impression_count,
        },
        url: `https://twitter.com/${author?.username || "i"}/status/${tweet.id}`,
      };
    });
  }

  /**
   * Calculate time range based on filter
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

export default XApiService;
