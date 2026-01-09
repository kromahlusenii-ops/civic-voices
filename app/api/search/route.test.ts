import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock the config module
vi.mock("@/lib/config", () => ({
  config: {
    x: {
      bearerToken: "test-x-bearer-token",
    },
    tiktok: {
      apiKey: "test-tiktok-api-key",
      apiUrl: "https://api.tikapi.io",
    },
    llm: {
      anthropic: {
        apiKey: "", // Disable AI analysis in tests
      },
    },
  },
}));

// Mock XProvider - use hoisted to allow module mock to access variables
const { mockSearchWithWarning } = vi.hoisted(() => ({
  mockSearchWithWarning: vi.fn(),
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

// Mock TikTokApiService
const mockSearchVideos = vi.fn();
const mockTransformToPosts = vi.fn();

vi.mock("@/lib/services/tiktokApi", () => ({
  default: vi.fn().mockImplementation(() => ({
    searchVideos: mockSearchVideos,
    transformToPosts: mockTransformToPosts,
  })),
  __esModule: true,
}));

// We need to mock the static methods separately
vi.mock("@/lib/services/tiktokApi", async () => {
  const actual = await vi.importActual("@/lib/services/tiktokApi");
  return {
    ...actual,
    default: vi.fn().mockImplementation(() => ({
      searchVideos: mockSearchVideos,
      transformToPosts: mockTransformToPosts,
    })),
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
});
