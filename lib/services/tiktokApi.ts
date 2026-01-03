import type { TikTokSearchResponse, Post } from "../types/api";

export class TikTokApiService {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://www.tikapi.io") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Search for TikTok videos matching a query
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
    const params = new URLSearchParams({
      keyword: query,
      count: String(options.count || 10),
    });

    if (options.cursor) {
      params.append("cursor", String(options.cursor));
    }

    const response = await fetch(
      `${this.apiUrl}/public/search?${params.toString()}`,
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

    return response.json();
  }

  /**
   * Transform TikTok API response to common Post format
   */
  transformToPosts(data: TikTokSearchResponse): Post[] {
    if (!data.videos || data.videos.length === 0) {
      return [];
    }

    return data.videos.map((video) => {
      return {
        id: video.id,
        text: video.desc || "",
        author: video.author.nickname,
        authorHandle: `@${video.author.uniqueId}`,
        authorAvatar: video.author.avatarLarger,
        createdAt: new Date(video.createTime * 1000).toISOString(),
        platform: "tiktok" as const,
        engagement: {
          likes: video.stats.diggCount,
          comments: video.stats.commentCount,
          shares: video.stats.shareCount,
          views: video.stats.playCount,
        },
        url: `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`,
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
}

export default TikTokApiService;
