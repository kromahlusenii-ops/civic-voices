import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { XProvider, XRateLimitError, XApiError } from "./XProvider";
import type { XSearchResponse } from "../types/api";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("XProvider", () => {
  const validConfig = {
    bearerToken: "test-bearer-token",
    maxRetries: 2,
    baseDelayMs: 10, // Short delay for tests
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("throws error if bearer token is missing", () => {
      expect(() => new XProvider({ bearerToken: "" })).toThrow(
        "Bearer token is required"
      );
    });

    it("creates instance with valid config", () => {
      const provider = new XProvider(validConfig);
      expect(provider).toBeInstanceOf(XProvider);
    });

    it("uses default values for optional config", () => {
      const provider = new XProvider({ bearerToken: "token" });
      expect(provider).toBeInstanceOf(XProvider);
    });
  });

  describe("search", () => {
    const mockResponse: XSearchResponse = {
      data: [
        {
          id: "123",
          text: "Test tweet about climate change",
          author_id: "user1",
          created_at: "2024-01-15T10:00:00.000Z",
          public_metrics: {
            retweet_count: 100,
            reply_count: 50,
            like_count: 500,
            quote_count: 25,
            impression_count: 10000,
          },
        },
      ],
      includes: {
        users: [
          {
            id: "user1",
            name: "Test User",
            username: "testuser",
            profile_image_url: "https://example.com/avatar.jpg",
          },
        ],
      },
      meta: {
        result_count: 1,
      },
    };

    it("makes correct API request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const provider = new XProvider(validConfig);
      await provider.search("climate change");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("tweets/search/recent"),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-bearer-token",
            "Content-Type": "application/json",
          },
        })
      );

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("query=climate+change");
      expect(calledUrl).toContain("tweet.fields=created_at%2Cpublic_metrics%2Cauthor_id");
      expect(calledUrl).toContain("expansions=author_id");
    });

    it("includes time range parameters when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const provider = new XProvider(validConfig);
      await provider.search("test", {
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-15T00:00:00Z",
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("start_time=2024-01-01T00%3A00%3A00Z");
      expect(calledUrl).toContain("end_time=2024-01-15T00%3A00%3A00Z");
    });

    it("includes pagination token when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const provider = new XProvider(validConfig);
      await provider.search("test", { nextToken: "abc123" });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("next_token=abc123");
    });

    it("returns search response on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const provider = new XProvider(validConfig);
      const result = await provider.search("test");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("normalizePosts", () => {
    const mockResponse: XSearchResponse = {
      data: [
        {
          id: "tweet1",
          text: "First tweet about politics",
          author_id: "user1",
          created_at: "2024-01-15T10:00:00.000Z",
          public_metrics: {
            retweet_count: 100,
            reply_count: 50,
            like_count: 500,
            quote_count: 25,
            impression_count: 10000,
          },
        },
        {
          id: "tweet2",
          text: "Second tweet about economy",
          author_id: "user2",
          created_at: "2024-01-14T15:30:00.000Z",
          public_metrics: {
            retweet_count: 200,
            reply_count: 75,
            like_count: 1000,
            quote_count: 50,
            impression_count: 25000,
          },
        },
      ],
      includes: {
        users: [
          {
            id: "user1",
            name: "John Doe",
            username: "johndoe",
            profile_image_url: "https://example.com/john.jpg",
          },
          {
            id: "user2",
            name: "Jane Smith",
            username: "janesmith",
          },
        ],
      },
    };

    it("normalizes tweets to Post format", () => {
      const provider = new XProvider(validConfig);
      const posts = provider.normalizePosts(mockResponse);

      expect(posts).toHaveLength(2);

      // Check first post
      expect(posts[0]).toEqual({
        id: "tweet1",
        text: "First tweet about politics",
        author: "John Doe",
        authorHandle: "@johndoe",
        authorAvatar: "https://example.com/john.jpg",
        createdAt: "2024-01-15T10:00:00.000Z",
        platform: "x",
        engagement: {
          likes: 500,
          comments: 50,
          shares: 125, // retweet + quote
          views: 10000,
        },
        url: "https://twitter.com/johndoe/status/tweet1",
      });

      // Check second post (no avatar)
      expect(posts[1].author).toBe("Jane Smith");
      expect(posts[1].authorHandle).toBe("@janesmith");
      expect(posts[1].authorAvatar).toBeUndefined();
    });

    it("returns empty array when no data", () => {
      const provider = new XProvider(validConfig);

      expect(provider.normalizePosts({})).toEqual([]);
      expect(provider.normalizePosts({ data: [] })).toEqual([]);
    });

    it("handles missing user data", () => {
      const provider = new XProvider(validConfig);
      const responseWithoutUsers: XSearchResponse = {
        data: [
          {
            id: "tweet1",
            text: "Orphan tweet",
            author_id: "unknown_user",
            created_at: "2024-01-15T10:00:00.000Z",
            public_metrics: {
              retweet_count: 10,
              reply_count: 5,
              like_count: 50,
              quote_count: 2,
            },
          },
        ],
      };

      const posts = provider.normalizePosts(responseWithoutUsers);

      expect(posts[0].author).toBe("Unknown");
      expect(posts[0].authorHandle).toBe("@unknown");
      expect(posts[0].url).toContain("/i/status/tweet1");
    });

    it("handles missing impression count", () => {
      const provider = new XProvider(validConfig);
      const responseWithoutImpressions: XSearchResponse = {
        data: [
          {
            id: "tweet1",
            text: "Tweet without views",
            author_id: "user1",
            created_at: "2024-01-15T10:00:00.000Z",
            public_metrics: {
              retweet_count: 10,
              reply_count: 5,
              like_count: 50,
              quote_count: 2,
            },
          },
        ],
        includes: {
          users: [{ id: "user1", name: "User", username: "user1" }],
        },
      };

      const posts = provider.normalizePosts(responseWithoutImpressions);
      expect(posts[0].engagement.views).toBeUndefined();
    });
  });

  describe("rate limit handling", () => {
    it("retries on 429 with Retry-After header", async () => {
      const provider = new XProvider(validConfig);

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ "Retry-After": "2" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        });

      const searchPromise = provider.search("test");

      // Advance timers to trigger retry
      await vi.advanceTimersByTimeAsync(2000);

      const result = await searchPromise;
      expect(result).toEqual({ data: [] });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("retries on 429 with x-rate-limit-reset header", async () => {
      const provider = new XProvider(validConfig);
      const resetTime = Math.floor(Date.now() / 1000) + 3;

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({
            "x-rate-limit-reset": String(resetTime),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        });

      const searchPromise = provider.search("test");

      // Advance timers
      await vi.advanceTimersByTimeAsync(5000);

      const result = await searchPromise;
      expect(result).toEqual({ data: [] });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws XRateLimitError when max retries exhausted", async () => {
      // Use real timers for this test
      vi.useRealTimers();

      // Create provider with no retries to test immediate throw
      const provider = new XProvider({ ...validConfig, maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "60" }),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(XRateLimitError);
        expect((error as XRateLimitError).retryAfter).toBe(60);
      }

      // Restore fake timers
      vi.useFakeTimers();
    });
  });

  describe("error handling", () => {
    it("throws XApiError on 400 Bad Request", async () => {
      const provider = new XProvider(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () =>
          Promise.resolve({
            detail: "Invalid query parameter",
            type: "invalid_request",
          }),
      });

      try {
        await provider.search("");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(XApiError);
        expect((error as XApiError).status).toBe(400);
        expect((error as XApiError).code).toBe("invalid_request");
      }
    });

    it("throws XApiError on 401 Unauthorized", async () => {
      const provider = new XProvider(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            message: "Invalid or expired token",
          }),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(XApiError);
        expect((error as XApiError).status).toBe(401);
      }
    });

    it("throws XApiError on 403 Forbidden", async () => {
      const provider = new XProvider(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () =>
          Promise.resolve({
            detail: "Access denied",
          }),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(XApiError);
        expect((error as XApiError).status).toBe(403);
      }
    });

    it("retries on 500 server error", async () => {
      const provider = new XProvider(validConfig);

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        });

      const searchPromise = provider.search("test");

      // Advance timers for backoff
      await vi.advanceTimersByTimeAsync(100);

      const result = await searchPromise;
      expect(result).toEqual({ data: [] });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws XApiError when max retries on server error exhausted", async () => {
      // Use real timers for this test
      vi.useRealTimers();

      // Create provider with no retries to test immediate throw
      const provider = new XProvider({ ...validConfig, maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: () => Promise.reject(new Error("No JSON")),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(XApiError);
        expect((error as XApiError).status).toBe(503);
      }

      // Restore fake timers
      vi.useFakeTimers();
    });

    it("handles network errors with retry", async () => {
      const provider = new XProvider(validConfig);

      mockFetch
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }),
        });

      const searchPromise = provider.search("test");

      // Advance timers for backoff
      await vi.advanceTimersByTimeAsync(100);

      const result = await searchPromise;
      expect(result).toEqual({ data: [] });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("handles malformed JSON response gracefully", async () => {
      const provider = new XProvider(validConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      });

      try {
        await provider.search("test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(XApiError);
        expect((error as XApiError).message).toContain("Bad Request");
      }
    });
  });

  describe("searchAndNormalize", () => {
    it("searches and normalizes in one call", async () => {
      const mockResponse: XSearchResponse = {
        data: [
          {
            id: "tweet1",
            text: "Test tweet",
            author_id: "user1",
            created_at: "2024-01-15T10:00:00.000Z",
            public_metrics: {
              retweet_count: 10,
              reply_count: 5,
              like_count: 50,
              quote_count: 2,
            },
          },
        ],
        includes: {
          users: [{ id: "user1", name: "User", username: "testuser" }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const provider = new XProvider(validConfig);
      const posts = await provider.searchAndNormalize("test");

      expect(posts).toHaveLength(1);
      expect(posts[0].platform).toBe("x");
      expect(posts[0].author).toBe("User");
    });
  });

  describe("getTimeRange", () => {
    it("returns correct range for 7d filter", () => {
      const range = XProvider.getTimeRange("7d");

      const start = new Date(range.startTime);
      const end = new Date(range.endTime);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(7, 0);
    });

    it("returns correct range for 30d filter", () => {
      const range = XProvider.getTimeRange("30d");

      const start = new Date(range.startTime);
      const end = new Date(range.endTime);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(30, 0);
    });

    it("returns correct range for 3m filter", () => {
      const range = XProvider.getTimeRange("3m");

      const start = new Date(range.startTime);
      const end = new Date(range.endTime);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(90, 0);
    });

    it("returns correct range for 12m filter", () => {
      const range = XProvider.getTimeRange("12m");

      const start = new Date(range.startTime);
      const end = new Date(range.endTime);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(365, 0);
    });

    it("defaults to 7d for unknown filter", () => {
      const range = XProvider.getTimeRange("unknown");

      const start = new Date(range.startTime);
      const end = new Date(range.endTime);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(7, 0);
    });
  });
});
