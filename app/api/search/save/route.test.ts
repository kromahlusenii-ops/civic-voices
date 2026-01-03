import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Mock Firebase Admin
const mockVerifyFirebaseToken = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseToken: (...args: unknown[]) => mockVerifyFirebaseToken(...args),
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
        filters: { timeFilter: "24h", locationFilter: "all" },
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
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - No token provided");
  });

  it("returns 401 if Firebase token is invalid", async () => {
    mockVerifyFirebaseToken.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer invalid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized - Invalid token");
  });

  it("returns 400 if email is not in token", async () => {
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      // No email field
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email not found in token");
  });

  it("returns 404 if user is not found in database", async () => {
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
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

    // Should try to find user by firebaseUid first, then by email
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: "firebase-uid-123" },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("returns 400 if queryText is missing", async () => {
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      firebaseUid: "firebase-uid-123",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
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
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      firebaseUid: "firebase-uid-123",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
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
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      firebaseUid: "firebase-uid-123",
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
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
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      firebaseUid: "firebase-uid-123",
    });
    (prisma.search.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "search-123",
      userId: "user-123",
      queryText: "test query",
      name: "test query",
      sources: ["X", "TIKTOK"],
      filtersJson: { timeFilter: "24h", locationFilter: "all" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
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
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      firebaseUid: "firebase-uid-123",
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
      headers: {
        "Authorization": "Bearer valid-token",
      },
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

  it("finds user by email when firebaseUid lookup fails (backwards compatibility)", async () => {
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });

    // First call (by firebaseUid) returns null, second call (by email) returns user
    (prisma.user.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user-123",
        email: "test@example.com",
        firebaseUid: null, // User created before Firebase migration
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
      headers: {
        "Authorization": "Bearer valid-token",
      },
      body: JSON.stringify({
        queryText: "test query",
        sources: ["x"],
        filters: { timeFilter: "24h", locationFilter: "all" },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);

    // Should have tried both lookups
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: "firebase-uid-123" },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("returns 500 if database operation fails", async () => {
    mockVerifyFirebaseToken.mockResolvedValue({
      uid: "firebase-uid-123",
      email: "test@example.com",
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      firebaseUid: "firebase-uid-123",
    });
    (prisma.search.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = new NextRequest("http://localhost:3000/api/search/save", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-token",
      },
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
