import type { TikTokSearchResponse, Post, AuthorMetadata } from "../types/api";
import {
  extractBaseQuery,
  hasBooleanOperators,
  filterPostsByBooleanQuery,
} from "../utils/booleanQuery";
import { extractPronouns } from "../utils/pronounDetection";

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
      // New format: data[].common.doc_id_str contains the ID, data[].item contains the video
      videos = data.data.map((entry: Record<string, unknown>) => {
        const item = entry.item as Record<string, unknown> | undefined;
        const common = entry.common as Record<string, unknown> | undefined;

        if (item) {
          // Merge the ID from common into the item
          const videoId = common?.doc_id_str || item.id;
          return { ...item, id: videoId };
        }
        return entry;
      }).filter(Boolean);
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

        // Extract author metadata for credibility scoring
        const authorMetadata = this.extractAuthorMetadata(author, authorId);

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
          authorMetadata,
        };
      });
  }

  /**
   * Extract author metadata for credibility scoring
   * TikTok API may include follower counts in author object
   */
  private extractAuthorMetadata(
    author: Record<string, unknown>,
    authorId: string
  ): AuthorMetadata | undefined {
    if (!author || Object.keys(author).length === 0) return undefined;

    // TikTok API may return follower/following counts
    const followersCount = Number(author.followerCount || author.follower_count || 0) || undefined;
    const followingCount = Number(author.followingCount || author.following_count || 0) || undefined;

    // TikTok has verified badges
    const isVerified = Boolean(author.verified || author.is_verified);

    // Extract bio (signature in TikTok)
    const bio = author.signature ? String(author.signature) : undefined;

    // Extract pronouns and infer gender from bio
    const pronounResult = extractPronouns(bio);

    return {
      followersCount,
      followingCount,
      accountAgeDays: undefined, // Not available in TikTok API
      isVerified,
      bio,
      profileUrl: `https://www.tiktok.com/@${authorId}`,
      pronouns: pronounResult.pronouns,
      inferredGender: pronounResult.inferredGender,
    };
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
