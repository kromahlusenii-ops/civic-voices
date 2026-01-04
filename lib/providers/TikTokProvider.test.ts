import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TikTokProvider,
  TikTokProviderConfig,
  TikTokRateLimitError,
  TikTokApiError,
} from "./TikTokProvider";
import type { TikTokSearchResponse } from "../types/api";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TikTokProvider", () => {
  const validConfig: TikTokProviderConfig = {
    apiKey: "test-api-key",
    maxRetries: 0,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("creates instance with valid config", () => {
      const provider = new TikTokProvider(validConfig);
      expect(provider).toBeInstanceOf(TikTokProvider);
    });

    it("throws error when API key is missing", () => {
      expect(() => new TikTokProvider({ apiKey: "" })).toThrow(
        "API key is required"
      );
    });

    it("uses default values when optional config not provided", () => {
      const provider = new TikTokProvider({ apiKey: "test-key" });
      expect(provider).toBeInstanceOf(TikTokProvider);
    });

    it("accepts custom API URL", () => {
      const provider = new TikTokProvider({
        apiKey: "test-key",
        apiUrl: "https://custom.api.com",
      });
      expect(provider).toBeInstanceOf(TikTokProvider);
    });
  });

  describe("search", () => {
    const mockResponse: TikTokSearchResponse = {
      videos: [
        {
          id: "video1",
          desc: "Test video description",
          createTime: 1704067200, // 2024-01-01 00:00:00 UTC
          author: {
            id: "author1",
            uniqueId: "testuser",
            nickname: "Test User",
            avatarLarger: "https://example.com/avatar.jpg",
          },
          stats: {
            diggCount: 100,
            shareCount: 50,
            commentCount: 25,
            playCount: 1000,
          },
          video: {
            downloadAddr: "https://example.com/video.mp4",
          },
        },
      ],
      cursor: 20,
      hasMore: true,
    };

    it("makes correct API request with default options", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.search("test query");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/public/search?"),
        expect.objectContaining({
          headers: {
            "X-API-KEY": "test-api-key",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("includes keyword in request", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.search("civic engagement");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("keyword=civic+engagement");
    });

    it("includes count parameter", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.search("test", { count: 25 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("count=25");
    });

    it("includes cursor for pagination", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.search("test", { cursor: 100 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("cursor=100");
    });

    it("returns TikTok API response", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.search("test");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("searchByHashtag", () => {
    const mockResponse: TikTokSearchResponse = {
      videos: [],
      hasMore: false,
    };

    it("makes correct API request for hashtag search", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.searchByHashtag("civictech");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/public/hashtag?");
      expect(url).toContain("name=civictech");
    });

    it("strips # from hashtag", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.searchByHashtag("#civictech");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("name=civictech");
      expect(url).not.toContain("name=%23");
    });
  });

  describe("normalizePosts", () => {
    const mockResponse: TikTokSearchResponse = {
      videos: [
        {
          id: "video123",
          desc: "This is a test video about civic engagement #civictech",
          createTime: 1704067200,
          author: {
            id: "author456",
            uniqueId: "civicvoice",
            nickname: "Civic Voice",
            avatarLarger: "https://p16-sign.tiktokcdn.com/avatar.jpg",
          },
          stats: {
            diggCount: 5000,
            shareCount: 1200,
            commentCount: 300,
            playCount: 50000,
          },
          video: {
            downloadAddr: "https://v16.tiktokcdn.com/video.mp4",
          },
        },
        {
          id: "video789",
          desc: "Another civic video",
          createTime: 1704153600,
          author: {
            id: "author999",
            uniqueId: "activistuser",
            nickname: "Activist User",
            avatarLarger: "https://p16-sign.tiktokcdn.com/avatar2.jpg",
          },
          stats: {
            diggCount: 2500,
            shareCount: 600,
            commentCount: 150,
            playCount: 25000,
          },
          video: {
            downloadAddr: "https://v16.tiktokcdn.com/video2.mp4",
          },
        },
      ],
      cursor: 40,
      hasMore: true,
    };

    it("normalizes videos to Post format", () => {
      const provider = new TikTokProvider(validConfig);
      const posts = provider.normalizePosts(mockResponse);

      expect(posts).toHaveLength(2);
      expect(posts[0]).toEqual({
        id: "video123",
        text: "This is a test video about civic engagement #civictech",
        author: "Civic Voice",
        authorHandle: "@civicvoice",
        authorAvatar: "https://p16-sign.tiktokcdn.com/avatar.jpg",
        createdAt: "2024-01-01T00:00:00.000Z",
        platform: "tiktok",
        engagement: {
          likes: 5000,
          comments: 300,
          shares: 1200,
          views: 50000,
        },
        url: "https://www.tiktok.com/@civicvoice/video/video123",
      });
    });

    it("handles empty description", () => {
      const provider = new TikTokProvider(validConfig);
      const response: TikTokSearchResponse = {
        videos: [
          {
            id: "video1",
            desc: "",
            createTime: 1704067200,
            author: {
              id: "a1",
              uniqueId: "user1",
              nickname: "User One",
            },
            stats: {
              diggCount: 10,
              shareCount: 5,
              commentCount: 2,
              playCount: 100,
            },
            video: {
              downloadAddr: "https://example.com/video.mp4",
            },
          },
        ],
      };

      const posts = provider.normalizePosts(response);
      expect(posts[0].text).toBe("");
    });

    it("constructs correct TikTok URL", () => {
      const provider = new TikTokProvider(validConfig);
      const posts = provider.normalizePosts(mockResponse);

      expect(posts[0].url).toBe(
        "https://www.tiktok.com/@civicvoice/video/video123"
      );
      expect(posts[1].url).toBe(
        "https://www.tiktok.com/@activistuser/video/video789"
      );
    });

    it("converts Unix timestamp to ISO string", () => {
      const provider = new TikTokProvider(validConfig);
      const posts = provider.normalizePosts(mockResponse);

      expect(posts[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(posts[1].createdAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("maps engagement metrics correctly", () => {
      const provider = new TikTokProvider(validConfig);
      const posts = provider.normalizePosts(mockResponse);

      expect(posts[0].engagement).toEqual({
        likes: 5000,
        comments: 300,
        shares: 1200,
        views: 50000,
      });
    });
  });

  describe("empty result handling", () => {
    it("returns empty array when videos is undefined", () => {
      const provider = new TikTokProvider(validConfig);
      const response: TikTokSearchResponse = {};

      const posts = provider.normalizePosts(response);
      expect(posts).toEqual([]);
    });

    it("returns empty array when videos array is empty", () => {
      const provider = new TikTokProvider(validConfig);
      const response: TikTokSearchResponse = {
        videos: [],
      };

      const posts = provider.normalizePosts(response);
      expect(posts).toEqual([]);
    });

    it("returns empty array for null-like response", () => {
      const provider = new TikTokProvider(validConfig);
      const response: TikTokSearchResponse = {
        videos: [],
        hasMore: false,
      };

      const posts = provider.normalizePosts(response);
      expect(posts).toEqual([]);
    });
  });

  describe("pagination", () => {
    it("searchPaginated returns cursor and hasMore", async () => {
      const provider = new TikTokProvider(validConfig);
      const mockResponse: TikTokSearchResponse = {
        videos: [
          {
            id: "v1",
            desc: "Test",
            createTime: 1704067200,
            author: { id: "a1", uniqueId: "user1", nickname: "User" },
            stats: { diggCount: 10, shareCount: 5, commentCount: 2, playCount: 100 },
            video: { downloadAddr: "https://example.com/v.mp4" },
          },
        ],
        cursor: 50,
        hasMore: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.searchPaginated("test");

      expect(result.posts).toHaveLength(1);
      expect(result.cursor).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it("searchPaginated handles last page", async () => {
      const provider = new TikTokProvider(validConfig);
      const mockResponse: TikTokSearchResponse = {
        videos: [
          {
            id: "v1",
            desc: "Last page video",
            createTime: 1704067200,
            author: { id: "a1", uniqueId: "user1", nickname: "User" },
            stats: { diggCount: 10, shareCount: 5, commentCount: 2, playCount: 100 },
            video: { downloadAddr: "https://example.com/v.mp4" },
          },
        ],
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.searchPaginated("test");

      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeUndefined();
    });

    it("searchAllPages fetches multiple pages", async () => {
      const provider = new TikTokProvider(validConfig);

      // Page 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            videos: [
              {
                id: "v1",
                desc: "Page 1",
                createTime: 1704067200,
                author: { id: "a1", uniqueId: "user1", nickname: "User" },
                stats: { diggCount: 10, shareCount: 5, commentCount: 2, playCount: 100 },
                video: { downloadAddr: "https://example.com/v.mp4" },
              },
            ],
            cursor: 20,
            hasMore: true,
          }),
      });

      // Page 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            videos: [
              {
                id: "v2",
                desc: "Page 2",
                createTime: 1704153600,
                author: { id: "a2", uniqueId: "user2", nickname: "User 2" },
                stats: { diggCount: 20, shareCount: 10, commentCount: 4, playCount: 200 },
                video: { downloadAddr: "https://example.com/v2.mp4" },
              },
            ],
            hasMore: false,
          }),
      });

      const posts = await provider.searchAllPages("test", 5);

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe("v1");
      expect(posts[1].id).toBe("v2");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("searchAllPages respects maxPages limit", async () => {
      const provider = new TikTokProvider(validConfig);

      // Mock responses that always have more pages
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              videos: [
                {
                  id: `v${i}`,
                  desc: `Page ${i}`,
                  createTime: 1704067200,
                  author: { id: `a${i}`, uniqueId: `user${i}`, nickname: `User ${i}` },
                  stats: { diggCount: 10, shareCount: 5, commentCount: 2, playCount: 100 },
                  video: { downloadAddr: "https://example.com/v.mp4" },
                },
              ],
              cursor: (i + 1) * 20,
              hasMore: true,
            }),
        });
      }

      const posts = await provider.searchAllPages("test", 2); // Limit to 2 pages

      expect(posts).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("throws TikTokApiError on 400 Bad Request", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ message: "Invalid keyword parameter" }),
      });

      try {
        await provider.search("");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TikTokApiError);
        expect((error as TikTokApiError).status).toBe(400);
        expect((error as TikTokApiError).message).toContain("Invalid keyword parameter");
      }
    });

    it("throws TikTokApiError on 401 Unauthorized", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "Invalid API key" }),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TikTokApiError);
        expect((error as TikTokApiError).status).toBe(401);
      }
    });

    it("throws TikTokRateLimitError on 429 with no retries", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: (key: string) => key === "Retry-After" ? "120" : null },
        json: () => Promise.resolve({}),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TikTokRateLimitError);
        expect((error as TikTokRateLimitError).retryAfter).toBe(120);
      }
    });

    it("handles 500 server error without retry when maxRetries is 0", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error" }),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TikTokApiError);
        expect((error as TikTokApiError).status).toBe(500);
      }
    });

    it("handles JSON parse errors gracefully", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TikTokApiError);
        expect((error as TikTokApiError).message).toContain("Bad Request");
      }
    });
  });

  describe("filterByTimeRange", () => {
    const now = Date.now();
    const posts = [
      {
        id: "1",
        text: "Recent post",
        author: "User",
        authorHandle: "@user",
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        platform: "tiktok" as const,
        engagement: { likes: 10, comments: 5, shares: 2, views: 100 },
        url: "https://tiktok.com/@user/video/1",
      },
      {
        id: "2",
        text: "Week old post",
        author: "User",
        authorHandle: "@user",
        createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
        platform: "tiktok" as const,
        engagement: { likes: 10, comments: 5, shares: 2, views: 100 },
        url: "https://tiktok.com/@user/video/2",
      },
      {
        id: "3",
        text: "Month old post",
        author: "User",
        authorHandle: "@user",
        createdAt: new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
        platform: "tiktok" as const,
        engagement: { likes: 10, comments: 5, shares: 2, views: 100 },
        url: "https://tiktok.com/@user/video/3",
      },
      {
        id: "4",
        text: "Old post",
        author: "User",
        authorHandle: "@user",
        createdAt: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
        platform: "tiktok" as const,
        engagement: { likes: 10, comments: 5, shares: 2, views: 100 },
        url: "https://tiktok.com/@user/video/4",
      },
    ];

    it("filters to last 7 days", () => {
      const filtered = TikTokProvider.filterByTimeRange(posts, "7d");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((p) => p.id)).toEqual(["1", "2"]);
    });

    it("filters to last 30 days", () => {
      const filtered = TikTokProvider.filterByTimeRange(posts, "30d");
      expect(filtered).toHaveLength(3);
      expect(filtered.map((p) => p.id)).toEqual(["1", "2", "3"]);
    });

    it("filters to last 3 months", () => {
      const filtered = TikTokProvider.filterByTimeRange(posts, "3m");
      expect(filtered).toHaveLength(3);
    });

    it("filters to last 12 months", () => {
      const filtered = TikTokProvider.filterByTimeRange(posts, "12m");
      expect(filtered).toHaveLength(4);
    });

    it("defaults to 7 days for unknown filter", () => {
      const filtered = TikTokProvider.filterByTimeRange(posts, "unknown");
      expect(filtered).toHaveLength(2);
    });
  });

  describe("searchAndNormalize", () => {
    it("combines search and normalize", async () => {
      const provider = new TikTokProvider(validConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            videos: [
              {
                id: "v1",
                desc: "Test video",
                createTime: 1704067200,
                author: { id: "a1", uniqueId: "user1", nickname: "User" },
                stats: { diggCount: 10, shareCount: 5, commentCount: 2, playCount: 100 },
                video: { downloadAddr: "https://example.com/v.mp4" },
              },
            ],
          }),
      });

      const posts = await provider.searchAndNormalize("test");

      expect(posts).toHaveLength(1);
      expect(posts[0].platform).toBe("tiktok");
      expect(posts[0].id).toBe("v1");
    });
  });

  describe("retry behavior", () => {
    it("retries on rate limit with Retry-After header", async () => {
      vi.useFakeTimers();
      const provider = new TikTokProvider({
        apiKey: "test-key",
        maxRetries: 1,
        baseDelayMs: 100,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: (key: string) => key === "Retry-After" ? "1" : null },
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ videos: [] }),
        });

      const searchPromise = provider.search("test");
      await vi.advanceTimersByTimeAsync(1500);
      const result = await searchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ videos: [] });
    });

    it("retries on 500 error", async () => {
      vi.useFakeTimers();
      const provider = new TikTokProvider({
        apiKey: "test-key",
        maxRetries: 1,
        baseDelayMs: 100,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: { get: () => null },
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ videos: [] }),
        });

      const searchPromise = provider.search("test");
      await vi.advanceTimersByTimeAsync(500);
      const result = await searchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ videos: [] });
    });
  });
});
