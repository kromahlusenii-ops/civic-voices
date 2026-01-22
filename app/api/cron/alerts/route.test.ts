import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

// Mock prisma
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alert: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Mock loops
const mockSendTransactionalEmail = vi.fn();
vi.mock("@/lib/loops", () => ({
  isLoopsEnabled: () => true,
  getLoopsClient: () => ({
    sendTransactionalEmail: mockSendTransactionalEmail,
  }),
  LOOPS_TEMPLATES: {
    alertDigest: "test-template-id",
  },
}));

// Track fetch calls for verification
const fetchCalls: { url: string; options: RequestInit }[] = [];

// Mock global fetch
const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
  fetchCalls.push({ url, options: options || {} });
  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        posts: [
          {
            text: "Test post about Donald Trump",
            url: "https://youtube.com/watch?v=123",
            platform: "youtube",
            author: "Test Author",
            authorHandle: "@testauthor",
            createdAt: new Date().toISOString(),
            sentiment: "neutral",
          },
        ],
        summary: { totalPosts: 1 },
      }),
  });
});

vi.stubGlobal("fetch", mockFetch);

// Mock environment variables
vi.stubEnv("CRON_SECRET", "test-secret");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://test.civicvoices.ai");
vi.stubEnv("NODE_ENV", "production");

describe("Alert Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCalls.length = 0;
    mockUpdate.mockResolvedValue({});
  });

  function createRequest(authHeader?: string): NextRequest {
    const headers = new Headers();
    if (authHeader) {
      headers.set("authorization", authHeader);
    }
    return new NextRequest("https://test.civicvoices.ai/api/cron/alerts", {
      method: "GET",
      headers,
    });
  }

  describe("Authorization", () => {
    it("returns 401 when no authorization header is provided", async () => {
      const request = createRequest();
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 401 when authorization header is invalid", async () => {
      const request = createRequest("Bearer wrong-secret");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("allows request with correct authorization header", async () => {
      mockFindMany.mockResolvedValue([]);
      const request = createRequest("Bearer test-secret");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Platform Name Conversion", () => {
    it("converts uppercase platform names to lowercase for search API", async () => {
      // Set up mock alert with uppercase platform names (as stored in Prisma)
      mockFindMany.mockResolvedValue([
        {
          id: "alert-1",
          searchQuery: "Donald Trump",
          platforms: ["YOUTUBE", "TIKTOK"], // Uppercase from Prisma enum
          frequency: "INSTANTLY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [
            {
              email: "test@example.com",
              verified: true,
              isOwner: true,
            },
          ],
          user: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      await GET(request);

      // Verify fetch was called with lowercase platform names
      expect(fetchCalls.length).toBeGreaterThan(0);
      const searchCall = fetchCalls.find((call) =>
        call.url.includes("/api/search")
      );
      expect(searchCall).toBeDefined();

      const body = JSON.parse(searchCall!.options.body as string);
      expect(body.sources).toEqual(["youtube", "tiktok"]); // Should be lowercase
    });

    it("handles single platform correctly", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "alert-2",
          searchQuery: "Test Query",
          platforms: ["REDDIT"],
          frequency: "DAILY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [
            {
              email: "test@example.com",
              verified: true,
              isOwner: true,
            },
          ],
          user: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      await GET(request);

      const searchCall = fetchCalls.find((call) =>
        call.url.includes("/api/search")
      );
      const body = JSON.parse(searchCall!.options.body as string);
      expect(body.sources).toEqual(["reddit"]);
    });

    it("handles all supported platforms", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "alert-3",
          searchQuery: "Test Query",
          platforms: ["X", "YOUTUBE", "TIKTOK", "REDDIT", "INSTAGRAM"],
          frequency: "HOURLY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [
            {
              email: "test@example.com",
              verified: true,
              isOwner: true,
            },
          ],
          user: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      await GET(request);

      const searchCall = fetchCalls.find((call) =>
        call.url.includes("/api/search")
      );
      const body = JSON.parse(searchCall!.options.body as string);
      expect(body.sources).toEqual(["x", "youtube", "tiktok", "reddit", "instagram"]);
    });
  });

  describe("Alert Processing", () => {
    it("skips alerts with no verified recipients", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "alert-no-recipients",
          searchQuery: "Test",
          platforms: ["YOUTUBE"],
          frequency: "DAILY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [], // No verified recipients
          user: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      const response = await GET(request);

      // Should still update nextScheduledAt
      expect(mockUpdate).toHaveBeenCalled();
      // But should not call the search API
      expect(fetchCalls.length).toBe(0);

      const json = await response.json();
      expect(json.processed).toBe(0);
    });

    it("sends email when search returns results", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "alert-with-results",
          searchQuery: "Donald Trump",
          platforms: ["YOUTUBE"],
          frequency: "INSTANTLY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [
            {
              email: "recipient@example.com",
              verified: true,
              isOwner: true,
            },
          ],
          user: {
            email: "recipient@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      const response = await GET(request);

      expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionalId: "test-template-id",
          email: "recipient@example.com",
        })
      );

      const json = await response.json();
      expect(json.processed).toBe(1);
    });

    it("updates nextScheduledAt after processing", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "alert-update",
          searchQuery: "Test",
          platforms: ["YOUTUBE"],
          frequency: "INSTANTLY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [
            {
              email: "test@example.com",
              verified: true,
              isOwner: true,
            },
          ],
          user: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      await GET(request);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alert-update" },
          data: expect.objectContaining({
            nextScheduledAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("Search Parameters", () => {
    it("uses correct time filter for alerts", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "alert-time",
          searchQuery: "Test",
          platforms: ["X"],
          frequency: "DAILY",
          preferredTime: "09:00",
          preferredDay: null,
          recipients: [
            {
              email: "test@example.com",
              verified: true,
              isOwner: true,
            },
          ],
          user: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      ]);

      const request = createRequest("Bearer test-secret");
      await GET(request);

      const searchCall = fetchCalls.find((call) =>
        call.url.includes("/api/search")
      );
      const body = JSON.parse(searchCall!.options.body as string);
      expect(body.timeFilter).toBe("24h");
      expect(body.sort).toBe("relevance");
    });
  });
});
