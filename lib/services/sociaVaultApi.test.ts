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

    it("transforms TikTok response with actual API snake_case format", () => {
      // This test uses the ACTUAL API response structure (snake_case)
      // to catch API contract mismatches early
      const response = {
        data: [
          {
            aweme_id: "7329876543210987654",  // Real API uses aweme_id
            desc: "Test video description #trending",
            create_time: 1737590400,
            author: {
              uid: "123456789",
              unique_id: "testuser",           // Real API uses snake_case
              nickname: "Test User",
              avatar_larger: { url_list: ["https://example.com/avatar.jpg"] },  // Nested structure
              signature: "Bio text",
              verified: true,
              follower_count: 10000,           // Real API uses snake_case
              following_count: 500,
            },
            statistics: {                      // Real API uses 'statistics' not 'stats'
              digg_count: 5000,                // Real API uses snake_case
              comment_count: 200,
              share_count: 100,
              play_count: 50000,
            },
            video: {
              cover: { url_list: ["https://example.com/cover.jpg"] },  // Nested structure
              origin_cover: { url_list: ["https://example.com/origin_cover.jpg"] },
            },
          },
        ],
      };

      const posts = service.transformTikTokToPosts(response);

      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        id: "7329876543210987654",
        text: "Test video description #trending",
        author: "Test User",
        authorHandle: "@testuser",
        authorAvatar: "https://example.com/avatar.jpg",
        platform: "tiktok",
        engagement: {
          likes: 5000,
          comments: 200,
          shares: 100,
          views: 50000,
        },
        url: "https://www.tiktok.com/@testuser/video/7329876543210987654",
        thumbnail: "https://example.com/origin_cover.jpg",
      });
      expect(posts[0].authorMetadata).toMatchObject({
        followersCount: 10000,
        followingCount: 500,
        isVerified: true,
        bio: "Bio text",
      });
    });

    it("transforms TikTok response with legacy camelCase format (backwards compatibility)", () => {
      // This test ensures backwards compatibility with old format
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

    it("transforms Reddit response with actual API format (object with numeric keys)", () => {
      // This test uses the ACTUAL API response structure
      // SociaVault returns posts as object with numeric keys, not an array
      const response = {
        success: true,
        data: {
          success: true,
          posts: {
            "0": {
              id: "abc123xyz",
              title: "Test post about climate change policy",
              selftext: "This is the body text discussing climate policy initiatives.",
              author: "civic_researcher",
              subreddit: "politics",
              created: 1737590400,  // API uses 'created', not 'created_utc'
              score: 1250,
              num_comments: 347,
              permalink: "/r/politics/comments/abc123xyz/test_post_about_climate_change_policy/",
              thumbnail: "https://example.com/thumbnail.jpg",
              is_video: false,
              upvote_ratio: 0.89,
            },
            "1": {
              id: "def456uvw",
              title: "Link post with no body text",
              author: "news_poster",
              subreddit: "news",
              created: 1737504000,
              score: 532,
              num_comments: 89,
              permalink: "/r/news/comments/def456uvw/link_post_with_no_body_text/",
              thumbnail: "default",  // Reddit placeholder values should be filtered
              is_video: false,
            },
          },
          after: "t3_def456uvw",
        },
        creditsUsed: 1,
      };

      const posts = service.transformRedditToPosts(response);

      expect(posts).toHaveLength(2);

      // First post with body text
      expect(posts[0]).toMatchObject({
        id: "abc123xyz",
        text: "Test post about climate change policy\n\nThis is the body text discussing climate policy initiatives.",
        author: "civic_researcher",
        authorHandle: "u/civic_researcher",
        platform: "reddit",
        engagement: {
          likes: 1250,
          comments: 347,
          shares: 125, // 10% of score
        },
        url: "https://www.reddit.com/r/politics/comments/abc123xyz/test_post_about_climate_change_policy/",
        thumbnail: "https://example.com/thumbnail.jpg",
      });
      expect(posts[0].authorMetadata).toMatchObject({
        profileUrl: "https://www.reddit.com/user/civic_researcher",
      });

      // Second post without body (link post)
      expect(posts[1]).toMatchObject({
        id: "def456uvw",
        text: "Link post with no body text",
        author: "news_poster",
        authorHandle: "u/news_poster",
        platform: "reddit",
      });
      // Thumbnail "default" should be filtered out
      expect(posts[1].thumbnail).toBeUndefined();
    });

    it("handles selftext vs body field variations", () => {
      // API can use either 'selftext' (Reddit native) or 'body' (SociaVault normalized)
      const responseWithBody = {
        data: {
          posts: {
            "0": {
              id: "test1",
              title: "Post Title",
              body: "Content via body field",  // SociaVault uses 'body'
              author: "user1",
              subreddit: "test",
              created: 1737590400,
              score: 100,
              num_comments: 10,
            },
          },
        },
      };

      const responseWithSelftext = {
        data: {
          posts: {
            "0": {
              id: "test2",
              title: "Post Title",
              selftext: "Content via selftext field",  // Reddit native
              author: "user2",
              subreddit: "test",
              created: 1737590400,
              score: 100,
              num_comments: 10,
            },
          },
        },
      };

      const postsBody = service.transformRedditToPosts(responseWithBody);
      const postsSelftext = service.transformRedditToPosts(responseWithSelftext);

      expect(postsBody[0].text).toContain("Content via body field");
      expect(postsSelftext[0].text).toContain("Content via selftext field");
    });

    it("handles created vs created_utc timestamp variations", () => {
      // API can use either 'created' or 'created_utc'
      const responseWithCreated = {
        data: {
          posts: {
            "0": {
              id: "test1",
              title: "Post",
              author: "user",
              subreddit: "test",
              created: 1737590400,  // Just 'created'
              score: 100,
              num_comments: 10,
            },
          },
        },
      };

      const responseWithCreatedUtc = {
        data: {
          posts: {
            "0": {
              id: "test2",
              title: "Post",
              author: "user",
              subreddit: "test",
              created_utc: 1737504000,  // Just 'created_utc'
              score: 100,
              num_comments: 10,
            },
          },
        },
      };

      const posts1 = service.transformRedditToPosts(responseWithCreated);
      const posts2 = service.transformRedditToPosts(responseWithCreatedUtc);

      // Both should parse the timestamp correctly
      expect(new Date(posts1[0].createdAt).getTime()).toBe(1737590400 * 1000);
      expect(new Date(posts2[0].createdAt).getTime()).toBe(1737504000 * 1000);
    });

    it("filters Reddit thumbnail placeholder values", () => {
      const response = {
        data: {
          posts: {
            "0": { id: "1", title: "T", author: "u", subreddit: "s", created: 1, score: 1, num_comments: 0, thumbnail: "self" },
            "1": { id: "2", title: "T", author: "u", subreddit: "s", created: 1, score: 1, num_comments: 0, thumbnail: "default" },
            "2": { id: "3", title: "T", author: "u", subreddit: "s", created: 1, score: 1, num_comments: 0, thumbnail: "nsfw" },
            "3": { id: "4", title: "T", author: "u", subreddit: "s", created: 1, score: 1, num_comments: 0, thumbnail: "spoiler" },
            "4": { id: "5", title: "T", author: "u", subreddit: "s", created: 1, score: 1, num_comments: 0, thumbnail: "https://example.com/real.jpg" },
          },
        },
      };

      const posts = service.transformRedditToPosts(response);

      expect(posts[0].thumbnail).toBeUndefined();  // "self" filtered
      expect(posts[1].thumbnail).toBeUndefined();  // "default" filtered
      expect(posts[2].thumbnail).toBeUndefined();  // "nsfw" filtered
      expect(posts[3].thumbnail).toBeUndefined();  // "spoiler" filtered
      expect(posts[4].thumbnail).toBe("https://example.com/real.jpg");  // Real URL kept
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

  describe("searchRedditInSubreddits (local search)", () => {
    it("returns empty array when no subreddits provided", async () => {
      const result = await service.searchRedditInSubreddits("test query", []);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("searches each subreddit in parallel", async () => {
      // Mock responses for each subreddit
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              posts: {
                "0": {
                  id: "post1",
                  title: "Test climate post in California",
                  author: "user1",
                  subreddit: "California",
                  created: Date.now() / 1000,
                  score: 100,
                  num_comments: 10,
                },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              posts: {
                "0": {
                  id: "post2",
                  title: "Climate discussion in LA",
                  author: "user2",
                  subreddit: "LosAngeles",
                  created: Date.now() / 1000,
                  score: 200,
                  num_comments: 20,
                },
              },
            },
          }),
        });

      const result = await service.searchRedditInSubreddits(
        "climate",
        ["California", "LosAngeles"]
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Both posts contain "climate" so both should be included
      expect(result.length).toBe(2);
    });

    it("filters posts by query terms", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            posts: {
              "0": {
                id: "post1",
                title: "Climate change is real",
                author: "user1",
                subreddit: "California",
                created: Date.now() / 1000,
                score: 100,
                num_comments: 10,
              },
              "1": {
                id: "post2",
                title: "Best pizza in town",
                author: "user2",
                subreddit: "California",
                created: Date.now() / 1000,
                score: 50,
                num_comments: 5,
              },
            },
          },
        }),
      });

      const result = await service.searchRedditInSubreddits("climate", ["California"]);

      // Only the post about climate should be returned
      expect(result.length).toBe(1);
      expect(result[0].text).toContain("Climate");
    });

    it("sorts results by engagement (likes + comments)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            posts: {
              "0": {
                id: "low",
                title: "Low engagement climate post",
                author: "user1",
                subreddit: "California",
                created: Date.now() / 1000,
                score: 10,
                num_comments: 5,
              },
              "1": {
                id: "high",
                title: "High engagement climate discussion",
                author: "user2",
                subreddit: "California",
                created: Date.now() / 1000,
                score: 500,
                num_comments: 100,
              },
            },
          },
        }),
      });

      const result = await service.searchRedditInSubreddits("climate", ["California"]);

      expect(result.length).toBe(2);
      // Higher engagement should come first
      expect(result[0].id).toBe("high");
      expect(result[1].id).toBe("low");
    });

    it("limits total results", async () => {
      const posts: Record<string, object> = {};
      for (let i = 0; i < 10; i++) {
        posts[String(i)] = {
          id: `post${i}`,
          title: `Climate post number ${i}`,
          author: `user${i}`,
          subreddit: "California",
          created: Date.now() / 1000,
          score: 100 - i,
          num_comments: 10,
        };
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { posts } }),
      });

      const result = await service.searchRedditInSubreddits("climate", ["California"], {
        limit: 5,
      });

      expect(result.length).toBe(5);
    });

    it("handles API errors gracefully for individual subreddits", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: {
              posts: {
                "0": {
                  id: "post1",
                  title: "Climate post from working subreddit",
                  author: "user1",
                  subreddit: "California",
                  created: Date.now() / 1000,
                  score: 100,
                  num_comments: 10,
                },
              },
            },
          }),
        })
        .mockRejectedValueOnce(new Error("API error for second subreddit"));

      const result = await service.searchRedditInSubreddits(
        "climate",
        ["California", "LosAngeles"]
      );

      // Should return results from the working subreddit
      expect(result.length).toBe(1);
      expect(result[0].text).toContain("Climate post from working subreddit");
    });

    it("applies time filter to results", async () => {
      const now = Date.now();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            posts: {
              "0": {
                id: "recent",
                title: "Recent climate post",
                author: "user1",
                subreddit: "California",
                created: now / 1000 - 3 * 24 * 60 * 60, // 3 days ago
                score: 100,
                num_comments: 10,
              },
              "1": {
                id: "old",
                title: "Old climate post",
                author: "user2",
                subreddit: "California",
                created: now / 1000 - 60 * 24 * 60 * 60, // 60 days ago
                score: 50,
                num_comments: 5,
              },
            },
          },
        }),
      });

      const result = await service.searchRedditInSubreddits(
        "climate",
        ["California"],
        { timeFilter: "7d" }
      );

      // Only the recent post should be included
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("recent");
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
