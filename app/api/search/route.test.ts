import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Config that can be modified per test
const mockConfig = {
  x: {
    bearerToken: "test-x-bearer-token",
    rapidApiKey: "", // Empty by default to use official API for existing tests
  },
  tiktok: {
    apiKey: "test-tiktok-api-key",
    accountKey: "test-tiktok-account-key",
    apiUrl: "https://api.tikapi.io",
  },
  sociaVault: {
    apiKey: "", // Empty by default to use TikAPI for existing tests
  },
  llm: {
    anthropic: {
      apiKey: "", // Disable AI analysis in tests
    },
  },
  providers: {
    youtube: { apiKey: "" },
  },
  bluesky: { identifier: "", appPassword: "" },
  truthSocial: { username: "", password: "" },
};

// Mock the config module
vi.mock("@/lib/config", () => ({
  get config() {
    return mockConfig;
  },
}));

// Mock XProvider - use hoisted to allow module mock to access variables
const { mockSearchWithWarning, mockSearchLatest } = vi.hoisted(() => ({
  mockSearchWithWarning: vi.fn(),
  mockSearchLatest: vi.fn(),
}));

vi.mock("@/lib/providers/XProvider", () => {
  class MockXProvider {
    searchWithWarning = mockSearchWithWarning;

    static getTimeRange = vi.fn().mockReturnValue({
      startTime: "2024-01-08T00:00:00Z",
      endTime: "2024-01-15T00:00:00Z",
    });
  }

  return { XProvider: MockXProvider };
});

// Mock XRapidApiProvider
vi.mock("@/lib/providers/XRapidApiProvider", () => {
  class MockXRapidApiProvider {
    searchLatest = mockSearchLatest;

    static filterByTimeRange = vi.fn((posts) => posts);
  }

  return { XRapidApiProvider: MockXRapidApiProvider };
});

// Mock TikTokApiService - use hoisted
const { mockSearchVideos, mockTransformToPosts } = vi.hoisted(() => ({
  mockSearchVideos: vi.fn(),
  mockTransformToPosts: vi.fn(),
}));

vi.mock("@/lib/services/tiktokApi", () => {
  class MockTikTokApiService {
    searchVideos = mockSearchVideos;
    transformToPosts = mockTransformToPosts;

    static getBaseQuery = vi.fn((query: string) => query);
    static filterByTimeRange = vi.fn((posts) => posts);
    static hasBooleanQuery = vi.fn(() => false);
    static filterByBooleanQuery = vi.fn((posts) => posts);
  }

  return {
    default: MockTikTokApiService,
    __esModule: true,
  };
});

// Mock SociaVaultApiService - use hoisted
const { mockSearchTikTokVideos, mockTransformTikTokToPosts, mockSearchReddit, mockTransformRedditToPosts } = vi.hoisted(() => ({
  mockSearchTikTokVideos: vi.fn(),
  mockTransformTikTokToPosts: vi.fn(),
  mockSearchReddit: vi.fn(),
  mockTransformRedditToPosts: vi.fn(),
}));

vi.mock("@/lib/services/sociaVaultApi", () => {
  class MockSociaVaultApiService {
    searchTikTokVideos = mockSearchTikTokVideos;
    transformTikTokToPosts = mockTransformTikTokToPosts;
    searchReddit = mockSearchReddit;
    transformRedditToPosts = mockTransformRedditToPosts;

    static getBaseQuery = vi.fn((query: string) => query);
    static filterByTimeRange = vi.fn((posts) => posts);
    static hasBooleanQuery = vi.fn(() => false);
    static filterByBooleanQuery = vi.fn((posts) => posts);
  }

  return {
    default: MockSociaVaultApiService,
    __esModule: true,
  };
});

function createMockRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config to default (no RapidAPI key) for existing tests
    mockConfig.x.rapidApiKey = "";
  });

  describe("validation", () => {
    it("returns 400 if query is missing", async () => {
      const request = createMockRequest({
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Query is required");
    });

    it("returns 400 if query is empty", async () => {
      const request = createMockRequest({
        query: "   ",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Query is required");
    });

    it("returns 400 if sources is empty", async () => {
      const request = createMockRequest({
        query: "climate change",
        sources: [],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one source must be selected");
    });

    it("returns 400 if sources is missing", async () => {
      const request = createMockRequest({
        query: "climate change",
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one source must be selected");
    });
  });

  describe("X API integration", () => {
    it("returns X posts when X source is selected", async () => {
      const mockXPosts = [
        {
          id: "tweet1",
          text: "Test tweet about climate",
          author: "Test User",
          authorHandle: "@testuser",
          platform: "x",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 100, comments: 10, shares: 5 },
          url: "https://twitter.com/testuser/status/tweet1",
        },
      ];

      mockSearchWithWarning.mockResolvedValueOnce({
        posts: mockXPosts,
        response: { data: [] },
        warning: undefined,
      });

      const request = createMockRequest({
        query: "climate change",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].platform).toBe("x");
      expect(data.summary.platforms.x).toBe(1);
      expect(data.warnings).toBeUndefined();
    });

    it("returns warning when time range exceeds 7 days", async () => {
      mockSearchWithWarning.mockResolvedValueOnce({
        posts: [],
        response: { data: [] },
        warning: "X API (Basic tier) only supports the last 7 days. Time range has been adjusted.",
      });

      const request = createMockRequest({
        query: "climate change",
        sources: ["x"],
        timeFilter: "3m", // 3 months - exceeds 7 day limit
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.warnings).toContain(
        "X API (Basic tier) only supports the last 7 days. Time range has been adjusted."
      );
    });

    it("returns warning when X API fails", async () => {
      mockSearchWithWarning.mockRejectedValueOnce(
        new Error("X API error: 401 - Unauthorized")
      );

      const request = createMockRequest({
        query: "climate change",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(0);
      expect(data.summary.platforms.x).toBe(0);
      expect(data.warnings).toContain("X search failed: X API error: 401 - Unauthorized");
    });

    it("passes language filter to X API", async () => {
      mockSearchWithWarning.mockResolvedValueOnce({
        posts: [],
        response: { data: [] },
        warning: undefined,
      });

      const request = createMockRequest({
        query: "climate change",
        sources: ["x"],
        timeFilter: "7d",
        language: "en",
      });

      await POST(request);

      expect(mockSearchWithWarning).toHaveBeenCalledWith(
        "climate change",
        expect.objectContaining({
          language: "en",
        })
      );
    });
  });

  describe("response structure", () => {
    it("returns correct response structure", async () => {
      mockSearchWithWarning.mockResolvedValueOnce({
        posts: [],
        response: { data: [] },
        warning: undefined,
      });

      const request = createMockRequest({
        query: "test query",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("posts");
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("query", "test query");
      expect(data.summary).toHaveProperty("totalPosts");
      expect(data.summary).toHaveProperty("platforms");
      expect(data.summary).toHaveProperty("sentiment");
      expect(data.summary).toHaveProperty("timeRange");
      expect(data.summary.timeRange).toHaveProperty("start");
      expect(data.summary.timeRange).toHaveProperty("end");
    });

    it("sorts posts by creation date (newest first)", async () => {
      const mockXPosts = [
        {
          id: "tweet1",
          text: "Older tweet",
          author: "User",
          authorHandle: "@user",
          platform: "x",
          createdAt: "2024-01-14T10:00:00Z",
          engagement: { likes: 10, comments: 1, shares: 0 },
          url: "https://twitter.com/user/status/tweet1",
        },
        {
          id: "tweet2",
          text: "Newer tweet",
          author: "User",
          authorHandle: "@user",
          platform: "x",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 20, comments: 2, shares: 1 },
          url: "https://twitter.com/user/status/tweet2",
        },
      ];

      mockSearchWithWarning.mockResolvedValueOnce({
        posts: mockXPosts,
        response: { data: [] },
        warning: undefined,
      });

      const request = createMockRequest({
        query: "test",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.posts[0].id).toBe("tweet2"); // Newer first
      expect(data.posts[1].id).toBe("tweet1"); // Older second
    });
  });

  describe("error handling", () => {
    it("returns 500 on unexpected errors", async () => {
      // Create a request that will cause an unexpected error
      const request = new NextRequest("http://localhost:3000/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json{",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("X RapidAPI retry-on-empty", () => {
    beforeEach(() => {
      // Enable RapidAPI for these tests
      mockConfig.x.rapidApiKey = "test-rapidapi-key";
    });

    it("retries when X RapidAPI returns empty results", async () => {
      const mockXPosts = [
        {
          id: "tweet1",
          text: "Test tweet",
          author: "User",
          authorHandle: "@user",
          platform: "x",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 10, comments: 1, shares: 0, views: 100 },
          url: "https://twitter.com/user/status/tweet1",
        },
      ];

      // First call returns empty, second call returns results
      mockSearchLatest
        .mockResolvedValueOnce({ posts: [] })
        .mockResolvedValueOnce({ posts: mockXPosts });

      const request = createMockRequest({
        query: "test query",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have retried and got results on second attempt
      expect(mockSearchLatest).toHaveBeenCalledTimes(2);
      expect(data.posts).toHaveLength(1);
      expect(data.summary.platforms.x).toBe(1);
    }, 15000); // Longer timeout for retry delays

    it("returns empty after max retries when X RapidAPI consistently returns empty", async () => {
      // All calls return empty
      mockSearchLatest.mockResolvedValue({ posts: [] });

      const request = createMockRequest({
        query: "obscure query with no results",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have retried max times (1 initial + 3 retries + 1 final = 5 calls)
      expect(mockSearchLatest).toHaveBeenCalledTimes(5);
      expect(data.posts).toHaveLength(0);
      expect(data.warnings).toContain(
        "X/Twitter returned no results after multiple attempts. The topic may have limited coverage or API is rate limited."
      );
    }, 30000); // Longer timeout for multiple retries with delays

    it("returns results immediately on first attempt if not empty", async () => {
      const mockXPosts = [
        {
          id: "tweet1",
          text: "Test tweet",
          author: "User",
          authorHandle: "@user",
          platform: "x",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 10, comments: 1, shares: 0, views: 100 },
          url: "https://twitter.com/user/status/tweet1",
        },
      ];

      mockSearchLatest.mockResolvedValue({ posts: mockXPosts });

      const request = createMockRequest({
        query: "popular query",
        sources: ["x"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should only call once since first attempt had results
      expect(mockSearchLatest).toHaveBeenCalledTimes(1);
      expect(data.posts).toHaveLength(1);
      expect(data.warnings).toBeUndefined();
    });
  });

  describe("TikTok retry-on-empty", () => {
    it("retries when TikTok returns empty results", async () => {
      const mockTikTokPosts = [
        {
          id: "video1",
          text: "Test TikTok video",
          author: "TikTokUser",
          authorHandle: "@tiktokuser",
          platform: "tiktok",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 100, comments: 10, shares: 5, views: 1000 },
          url: "https://tiktok.com/@tiktokuser/video/video1",
        },
      ];

      // First call returns empty, second call returns results
      mockSearchVideos
        .mockResolvedValueOnce({ videos: [] })
        .mockResolvedValueOnce({ videos: [{ id: "video1" }] });

      // transformToPosts is called once with the final (non-empty) result
      mockTransformToPosts.mockReturnValue(mockTikTokPosts);

      const request = createMockRequest({
        query: "test query",
        sources: ["tiktok"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have retried and got results on second attempt
      expect(mockSearchVideos).toHaveBeenCalledTimes(2);
      expect(data.posts).toHaveLength(1);
      expect(data.summary.platforms.tiktok).toBe(1);
    }, 15000); // Longer timeout for retry delays

    it("returns empty after max retries when TikTok consistently returns empty", async () => {
      // All calls return empty
      mockSearchVideos.mockResolvedValue({ videos: [] });
      mockTransformToPosts.mockReturnValue([]);

      const request = createMockRequest({
        query: "obscure query with no results",
        sources: ["tiktok"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have retried max times (1 initial + 3 retries + 1 final = 5 calls)
      expect(mockSearchVideos).toHaveBeenCalledTimes(5);
      expect(data.posts).toHaveLength(0);
      expect(data.warnings).toContain(
        "TikTok returned no results after multiple attempts. The topic may have limited coverage or API is rate limited."
      );
    }, 30000); // Longer timeout for multiple retries with delays

    it("returns results immediately on first attempt if not empty", async () => {
      const mockTikTokPosts = [
        {
          id: "video1",
          text: "Test TikTok video",
          author: "TikTokUser",
          authorHandle: "@tiktokuser",
          platform: "tiktok",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 100, comments: 10, shares: 5, views: 1000 },
          url: "https://tiktok.com/@tiktokuser/video/video1",
        },
      ];

      mockSearchVideos.mockResolvedValue({ videos: [{ id: "video1" }] });
      mockTransformToPosts.mockReturnValue(mockTikTokPosts);

      const request = createMockRequest({
        query: "popular query",
        sources: ["tiktok"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should only call once since first attempt had results
      expect(mockSearchVideos).toHaveBeenCalledTimes(1);
      expect(data.posts).toHaveLength(1);
      expect(data.warnings).toBeUndefined();
    });

    it("handles undefined videos array gracefully", async () => {
      // Return response without videos array
      mockSearchVideos.mockResolvedValue({});
      mockTransformToPosts.mockReturnValue([]);

      const request = createMockRequest({
        query: "test query",
        sources: ["tiktok"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should retry since videos is undefined (treated as empty)
      expect(mockSearchVideos.mock.calls.length).toBeGreaterThan(1);
      expect(data.posts).toHaveLength(0);
    }, 30000); // Longer timeout for multiple retries
  });

  describe("combined retry-on-empty for multiple sources", () => {
    beforeEach(() => {
      // Enable RapidAPI for these tests
      mockConfig.x.rapidApiKey = "test-rapidapi-key";
    });

    it("retries both X and TikTok independently when both return empty initially", async () => {
      const mockXPosts = [
        {
          id: "tweet1",
          text: "Test tweet",
          author: "User",
          authorHandle: "@user",
          platform: "x",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 10, comments: 1, shares: 0, views: 100 },
          url: "https://twitter.com/user/status/tweet1",
        },
      ];

      const mockTikTokPosts = [
        {
          id: "video1",
          text: "Test TikTok video",
          author: "TikTokUser",
          authorHandle: "@tiktokuser",
          platform: "tiktok",
          createdAt: "2024-01-15T10:00:00Z",
          engagement: { likes: 100, comments: 10, shares: 5, views: 1000 },
          url: "https://tiktok.com/@tiktokuser/video/video1",
        },
      ];

      // X: first empty, second has results
      mockSearchLatest
        .mockResolvedValueOnce({ posts: [] })
        .mockResolvedValueOnce({ posts: mockXPosts });

      // TikTok: first empty, second has results
      mockSearchVideos
        .mockResolvedValueOnce({ videos: [] })
        .mockResolvedValueOnce({ videos: [{ id: "video1" }] });

      // transformToPosts is called once with the final result
      mockTransformToPosts.mockReturnValue(mockTikTokPosts);

      const request = createMockRequest({
        query: "test query",
        sources: ["x", "tiktok"],
        timeFilter: "7d",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSearchLatest).toHaveBeenCalledTimes(2);
      expect(mockSearchVideos).toHaveBeenCalledTimes(2);
      expect(data.posts).toHaveLength(2);
      expect(data.summary.platforms.x).toBe(1);
      expect(data.summary.platforms.tiktok).toBe(1);
    }, 20000); // Longer timeout for parallel retries
  });
});
