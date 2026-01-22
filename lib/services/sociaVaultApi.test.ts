import { describe, it, expect, vi, beforeEach } from "vitest";
import SociaVaultApiService from "./sociaVaultApi";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SociaVaultApiService", () => {
  let service: SociaVaultApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SociaVaultApiService("test-api-key");
  });

  describe("constructor", () => {
    it("throws error if API key is missing", () => {
      expect(() => new SociaVaultApiService("")).toThrow("SociaVault API key is required");
    });

    it("creates instance with valid API key", () => {
      const svc = new SociaVaultApiService("valid-key");
      expect(svc).toBeInstanceOf(SociaVaultApiService);
    });
  });

  describe("TikTok search", () => {
    it("calls correct endpoint with query parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { search_item_list: {} } }),
      });

      await service.searchTikTokByKeyword("test query");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toContain("/tiktok/search/keyword");
      expect(url).toContain("query=test+query"); // API uses 'query' parameter
      expect(options.headers["X-API-Key"]).toBe("test-api-key");
    });

    it("includes cursor parameter when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { search_item_list: {} } }),
      });

      await service.searchTikTokByKeyword("test", { cursor: "abc123" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("cursor=abc123");
    });

    it("includes count parameter when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { search_item_list: {} } }),
      });

      await service.searchTikTokByKeyword("test", { count: 30 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("count=30");
    });

    it("paginates through multiple pages", async () => {
      // First page with has_more=true (using raw API format)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            success: true,
            search_item_list: { "0": { aweme_info: { id: "1", desc: "Video 1" } } },
            has_more: true,
            cursor: "cursor1",
          },
        }),
      });
      // Second page with has_more=true
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            success: true,
            search_item_list: { "0": { aweme_info: { id: "2", desc: "Video 2" } } },
            has_more: true,
            cursor: "cursor2",
          },
        }),
      });
      // Third page with has_more=false
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            success: true,
            search_item_list: { "0": { aweme_info: { id: "3", desc: "Video 3" } } },
            has_more: false,
          },
        }),
      });

      const result = await service.searchTikTokVideos("test", { maxPages: 3 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].id).toBe("1");
      expect(result.data?.[1].id).toBe("2");
      expect(result.data?.[2].id).toBe("3");
    });

    it("stops pagination when hasMore is false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            success: true,
            search_item_list: { "0": { aweme_info: { id: "1" } } },
            has_more: false,
          },
        }),
      });

      const result = await service.searchTikTokVideos("test", { maxPages: 5 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
    });

    it("transforms TikTok response to Post format", () => {
      const response = {
        data: [
          {
            id: "12345",
            desc: "Test video description",
            create_time: 1705320000, // 2024-01-15T10:00:00Z
            author: {
              uniqueId: "testuser",
              nickname: "Test User",
              avatarLarger: "https://example.com/avatar.jpg",
              verified: true,
              followerCount: 1000,
            },
            stats: {
              diggCount: 500,
              commentCount: 50,
              shareCount: 25,
              playCount: 10000,
            },
            video: {
              cover: "https://example.com/cover.jpg",
            },
          },
        ],
      };

      const posts = service.transformTikTokToPosts(response);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        id: "12345",
        text: "Test video description",
        author: "Test User",
        authorHandle: "@testuser",
        platform: "tiktok",
        engagement: {
          likes: 500,
          comments: 50,
          shares: 25,
          views: 10000,
        },
        url: "https://www.tiktok.com/@testuser/video/12345",
      });
    });
  });

  describe("Reddit search", () => {
    it("calls correct endpoint with query parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.searchReddit("test query");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toContain("/reddit/search");
      expect(url).toContain("query=test+query");
      expect(url).toContain("sort=relevance");
      expect(url).toContain("time=month");
      expect(options.headers["X-API-Key"]).toBe("test-api-key");
    });

    it("includes limit parameter when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.searchReddit("test", { limit: 100 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("limit=100");
    });

    it("includes after parameter for pagination", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.searchReddit("test", { after: "t3_abc123" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("after=t3_abc123");
    });

    it("transforms Reddit response to Post format", () => {
      // SociaVault returns { data: { posts: [...] } }
      const response = {
        data: {
          posts: [
            {
              id: "abc123",
              title: "Test Post Title",
              body: "This is the post content", // SociaVault uses 'body'
              author: "testuser",
              subreddit: "test",
              created_utc: 1705320000, // 2024-01-15T10:00:00Z
              score: 100,
              num_comments: 25,
              permalink: "/r/test/comments/abc123/test_post/",
            },
          ],
        },
      };

      const posts = service.transformRedditToPosts(response);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        id: "abc123",
        text: "Test Post Title\n\nThis is the post content",
        author: "testuser",
        authorHandle: "u/testuser",
        platform: "reddit",
        engagement: {
          likes: 100,
          comments: 25,
          shares: 10, // 10% of score
        },
        url: "https://www.reddit.com/r/test/comments/abc123/test_post/",
      });
    });

    it("handles missing body in Reddit posts", () => {
      const response = {
        data: {
          posts: [
            {
              id: "abc123",
              title: "Link Post Title",
              author: "testuser",
              subreddit: "test",
              created_utc: 1705320000,
              score: 50,
              num_comments: 10,
            },
          ],
        },
      };

      const posts = service.transformRedditToPosts(response);

      expect(posts[0].text).toBe("Link Post Title");
    });
  });

  describe("error handling", () => {
    it("throws error on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(service.searchReddit("test")).rejects.toThrow(
        "SociaVault API error: 401 - Unauthorized"
      );
    });

    it("throws error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.searchReddit("test")).rejects.toThrow("Network error");
    });
  });

  describe("static utility methods", () => {
    it("filters posts by time range", () => {
      const now = new Date();
      // Minimal Post-like objects for testing filterByTimeRange
      const posts = [
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() }, // 1 day ago
        { createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
        { createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString() }, // 60 days ago
      ] as unknown as Parameters<typeof SociaVaultApiService.filterByTimeRange>[0];

      const filtered7d = SociaVaultApiService.filterByTimeRange(posts, "7d");
      expect(filtered7d).toHaveLength(1);

      const filtered30d = SociaVaultApiService.filterByTimeRange(posts, "30d");
      expect(filtered30d).toHaveLength(2);

      const filtered3m = SociaVaultApiService.filterByTimeRange(posts, "3m");
      expect(filtered3m).toHaveLength(3);
    });

    it("extracts base query from boolean query", () => {
      expect(SociaVaultApiService.getBaseQuery("climate AND change")).toBe("climate");
      expect(SociaVaultApiService.getBaseQuery("simple query")).toBe("simple query");
    });

    it("detects boolean operators in query", () => {
      expect(SociaVaultApiService.hasBooleanQuery("climate AND change")).toBe(true);
      expect(SociaVaultApiService.hasBooleanQuery("simple query")).toBe(false);
    });

    it("maps timeFilter to TikTok date_posted values", () => {
      expect(SociaVaultApiService.getDatePostedValue("7d")).toBe("7");
      expect(SociaVaultApiService.getDatePostedValue("30d")).toBe("30");
      expect(SociaVaultApiService.getDatePostedValue("3m")).toBe("90");
      expect(SociaVaultApiService.getDatePostedValue("12m")).toBe("0");
      expect(SociaVaultApiService.getDatePostedValue("unknown")).toBe("30"); // default
    });

    it("maps timeFilter to Reddit time values", () => {
      expect(SociaVaultApiService.getRedditTimeValue("24h")).toBe("day");
      expect(SociaVaultApiService.getRedditTimeValue("7d")).toBe("week");
      expect(SociaVaultApiService.getRedditTimeValue("30d")).toBe("month");
      expect(SociaVaultApiService.getRedditTimeValue("3m")).toBe("year");
      expect(SociaVaultApiService.getRedditTimeValue("12m")).toBe("year");
      expect(SociaVaultApiService.getRedditTimeValue("unknown")).toBe("month"); // default
    });
  });
});
