import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    search: {
      create: vi.fn(),
    },
  },
}));

// Mock authOptions
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("POST /api/search/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 if user is not found in database", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 400 if queryText is missing", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 if sources array is empty", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: [],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 if no valid sources are provided", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: ["invalid-source"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No valid sources provided");
  });

  it("successfully creates search record with valid data", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    (prisma.search.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "search-123",
      userId: "user-123",
      queryText: "test query",
      name: "test query",
      sources: ["X"],
      filtersJson: { timeFilter: "24h", locationFilter: "all" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x", "tiktok"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.searchId).toBe("search-123");
    expect(data.message).toBe("Search saved successfully");

    expect(prisma.search.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        queryText: "test query",
        name: "test query",
        sources: ["X", "TIKTOK"],
        filtersJson: { timeFilter: "24h", locationFilter: "all" },
      },
    });
  });

  it("uses custom name when provided", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    (prisma.search.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "search-123",
      userId: "user-123",
      queryText: "test query",
      name: "My Custom Search",
      sources: ["X"],
      filtersJson: { timeFilter: "24h", locationFilter: "all" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        name: "My Custom Search",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(201);
    expect(prisma.search.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        queryText: "test query",
        name: "My Custom Search",
        sources: ["X"],
        filtersJson: { timeFilter: "24h", locationFilter: "all" },
      },
    });
  });

  it("returns 500 if database operation fails", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    (prisma.search.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to save search");
    expect(data.details).toBe("Database connection failed");
  });
});
