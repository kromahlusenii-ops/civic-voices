import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock Supabase Server
const mockVerifySupabaseToken = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  verifySupabaseToken: (...args: unknown[]) => mockVerifySupabaseToken(...args),
}));

// Mock search storage service
const mockSaveSearch = vi.fn();
vi.mock("@/lib/services/searchStorage", () => ({
  saveSearch: (...args: unknown[]) => mockSaveSearch(...args),
}));

describe("POST /api/search/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no Authorization header is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - No token provided");
  });

  it("returns 401 if Authorization header does not start with Bearer", async () => {
    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Invalid token-format",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - No token provided");
  });

  it("returns 401 if Supabase token is invalid", async () => {
    mockVerifySupabaseToken.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer invalid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - Invalid token");
  });

  it("returns 400 if id is not in user", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      email: "test@example.com",
      // No id field
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("User ID not found in token");
  });

  it("returns 400 if queryText is missing", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 if sources array is empty", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: [],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 if no valid sources are provided", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["invalid-source"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No valid sources provided");
  });

  it("successfully saves search to PostgreSQL with valid data", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    mockSaveSearch.mockResolvedValue({
      searchId: "search-123",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x", "tiktok"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.searchId).toBe("search-123");
    expect(data.message).toBe("Search saved successfully");

    // Verify saveSearch was called with correct parameters
    // Note: route passes sources as-is; the service handles uppercasing internally
    expect(mockSaveSearch).toHaveBeenCalledWith("user-123", {
      queryText: "test query",
      name: undefined,
      sources: ["x", "tiktok"],
      filters: { timeFilter: "24h", language: "en" },
      totalResults: undefined,
      posts: undefined,
    });
  });

  it("uses custom name when provided", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    mockSaveSearch.mockResolvedValue({
      searchId: "search-123",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        name: "My Custom Search",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockSaveSearch).toHaveBeenCalledWith("user-123", {
      queryText: "test query",
      name: "My Custom Search",
      sources: ["x"],
      filters: { timeFilter: "24h", language: "en" },
      totalResults: undefined,
      posts: undefined,
    });
  });

  it("saves posts when provided", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    mockSaveSearch.mockResolvedValue({
      searchId: "search-123",
    });

    const posts = [
      {
        id: "post-1",
        text: "Test post content",
        author: "testuser",
        platform: "x",
        url: "https://x.com/test/1",
        engagement: { likes: 10, comments: 5, shares: 2 },
      },
    ];

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
        totalResults: 1,
        posts,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockSaveSearch).toHaveBeenCalledWith("user-123", {
      queryText: "test query",
      name: undefined,
      sources: ["x"],
      filters: { timeFilter: "24h", language: "en" },
      totalResults: 1,
      posts,
    });
  });

  it("returns 500 if database storage operation fails", async () => {
    mockVerifySupabaseToken.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    mockSaveSearch.mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", language: "en" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to save search");
    expect(data.details).toBe("Database connection failed");
  });
});
