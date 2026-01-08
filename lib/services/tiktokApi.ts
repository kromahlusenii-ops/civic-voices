import type { TikTokSearchResponse, Post } from "../types/api";
import {
  extractBaseQuery,
  hasBooleanOperators,
  filterPostsByBooleanQuery,
} from "../utils/booleanQuery";

export class TikTokApiService {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.tikapi.io") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Search for TikTok videos by finding hashtags and getting their posts
   * @param query Search query/keyword
   * @param options Search options (count, cursor)
   */
  async searchVideos(
    query: string,
    options: {
      count?: number;
      cursor?: number;
    } = {}
  ): Promise<TikTokSearchResponse> {
    // Use the public/search/general endpoint for keyword search
    const params = new URLSearchParams({
      query: query,
    });

    if (options.cursor) {
      params.append("cursor", String(options.cursor));
    }

    const response = await fetch(
      `${this.apiUrl}/public/search/general?${params.toString()}`,
      {
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TikTok API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    console.log("TikAPI raw response keys:", Object.keys(data));
    console.log("TikAPI data sample:", JSON.stringify(data, null, 2).slice(0, 2000));

    // The search/general endpoint returns mixed results
    // Check various possible structures
    let videos: unknown[] = [];

    if (data.data && Array.isArray(data.data)) {
      // Items might be directly in data array or nested in item property
      videos = data.data.map((item: Record<string, unknown>) => item.item || item).filter(Boolean);
      console.log("Found videos in data.data:", videos.length);
    } else if (data.itemList) {
      videos = data.itemList;
      console.log("Found videos in itemList:", videos.length);
    } else if (data.items) {
      videos = data.items;
      console.log("Found videos in items:", videos.length);
    }

    if (videos.length > 0) {
      console.log("First video sample:", JSON.stringify(videos[0], null, 2).slice(0, 1000));
    }

    return {
      videos: videos as TikTokSearchResponse["videos"],
      cursor: data.cursor,
      hasMore: data.hasMore || data.has_more,
    };
  }

  /**
   * Transform TikTok API response to common Post format
   */
  transformToPosts(data: TikTokSearchResponse): Post[] {
    if (!data.videos || data.videos.length === 0) {
      return [];
    }

    return data.videos
      .filter((video) => video && video.id)
      .map((video) => {
        // Cast to unknown first to handle different response formats from TikAPI
        const v = video as unknown as Record<string, unknown>;
        const author = (v.author || {}) as Record<string, unknown>;
        const stats = (v.stats || v.statistics || {}) as Record<string, unknown>;
        const videoId = String(v.id || v.item_id || "");
        const authorId = String(author.uniqueId || author.unique_id || v.author_id || "unknown");
        const authorName = String(author.nickname || author.nick_name || authorId);

        return {
          id: videoId,
          text: String(v.desc || v.description || ""),
          author: authorName,
          authorHandle: `@${authorId}`,
          authorAvatar: String(author.avatarLarger || author.avatar_larger || author.avatar || ""),
          createdAt: v.createTime
            ? new Date(Number(v.createTime) * 1000).toISOString()
            : v.create_time
            ? new Date(Number(v.create_time) * 1000).toISOString()
            : new Date().toISOString(),
          platform: "tiktok" as const,
          engagement: {
            likes: Number(stats.diggCount || stats.digg_count || stats.likes || 0),
            comments: Number(stats.commentCount || stats.comment_count || stats.comments || 0),
            shares: Number(stats.shareCount || stats.share_count || stats.shares || 0),
            views: Number(stats.playCount || stats.play_count || stats.views || 0),
          },
          url: `https://www.tiktok.com/@${authorId}/video/${videoId}`,
        };
      });
  }

  /**
   * Filter videos by time range
   */
  static filterByTimeRange(
    posts: Post[],
    filter: string
  ): Post[] {
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
   * Extract base search term for API (TikTok doesn't support Boolean operators)
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

export default TikTokApiService;
