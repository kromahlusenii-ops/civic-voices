import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    researchJob: {
      findUnique: vi.fn(),
    },
  },
}))

// Import prisma after mocking
import { prisma } from "@/lib/prisma"

const mockPrisma = prisma as unknown as {
  researchJob: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

describe("OG Image Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/report/[id]/og", () => {
    it("returns 404 when report is not found", async () => {
      mockPrisma.researchJob.findUnique.mockResolvedValue(null)

      const request = new Request("https://test.com/api/report/not-found/og")
      const response = await GET(request, {
        params: Promise.resolve({ id: "not-found" }),
      })

      expect(response.status).toBe(404)
      expect(await response.text()).toBe("Report not found")
    })

    it("returns image response for valid report", async () => {
      mockPrisma.researchJob.findUnique.mockResolvedValue({
        id: "test-report-123",
        queryJson: { query: "climate change" },
        totalResults: 150,
        status: "COMPLETED",
        searches: [{ sources: ["x", "youtube", "reddit"] }],
        insights: [
          {
            outputJson: {
              interpretation: "Climate change is a hot topic",
              keyThemes: ["Policy", "Environment", "Economy"],
              sentimentBreakdown: { overall: "mixed" },
            },
          },
        ],
      })

      const request = new Request("https://test.com/api/report/test-report-123/og")
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-report-123" }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("image/png")
    })

    it("handles report without insights", async () => {
      mockPrisma.researchJob.findUnique.mockResolvedValue({
        id: "test-report-no-insights",
        queryJson: { query: "test query" },
        totalResults: 50,
        status: "COMPLETED",
        searches: [{ sources: ["x"] }],
        insights: [],
      })

      const request = new Request(
        "https://test.com/api/report/test-report-no-insights/og"
      )
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-report-no-insights" }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("image/png")
    })

    it("handles report without searches", async () => {
      mockPrisma.researchJob.findUnique.mockResolvedValue({
        id: "test-report-no-searches",
        queryJson: { query: "test query" },
        totalResults: 0,
        status: "RUNNING",
        searches: [],
        insights: [],
      })

      const request = new Request(
        "https://test.com/api/report/test-report-no-searches/og"
      )
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-report-no-searches" }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("image/png")
    })

    it("truncates long query text", async () => {
      const longQuery = "A".repeat(100) // > 60 chars
      mockPrisma.researchJob.findUnique.mockResolvedValue({
        id: "test-report-long-query",
        queryJson: { query: longQuery },
        totalResults: 10,
        status: "COMPLETED",
        searches: [{ sources: ["x"] }],
        insights: [],
      })

      const request = new Request(
        "https://test.com/api/report/test-report-long-query/og"
      )
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-report-long-query" }),
      })

      // Should still return successfully (truncation happens in rendering)
      expect(response.status).toBe(200)
    })

    it("handles different sentiment values", async () => {
      const sentiments = ["positive", "negative", "neutral", "mixed"]

      for (const sentiment of sentiments) {
        mockPrisma.researchJob.findUnique.mockResolvedValue({
          id: `test-report-${sentiment}`,
          queryJson: { query: "test" },
          totalResults: 100,
          status: "COMPLETED",
          searches: [{ sources: ["x"] }],
          insights: [
            {
              outputJson: {
                sentimentBreakdown: { overall: sentiment },
              },
            },
          ],
        })

        const request = new Request(
          `https://test.com/api/report/test-report-${sentiment}/og`
        )
        const response = await GET(request, {
          params: Promise.resolve({ id: `test-report-${sentiment}` }),
        })

        expect(response.status).toBe(200)
      }
    })

    it("handles null queryJson gracefully", async () => {
      mockPrisma.researchJob.findUnique.mockResolvedValue({
        id: "test-report-null-query",
        queryJson: null,
        totalResults: 0,
        status: "COMPLETED",
        searches: [],
        insights: [],
      })

      const request = new Request(
        "https://test.com/api/report/test-report-null-query/og"
      )
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-report-null-query" }),
      })

      expect(response.status).toBe(200)
    })

    it("handles database errors gracefully", async () => {
      mockPrisma.researchJob.findUnique.mockRejectedValue(
        new Error("Database connection failed")
      )

      const request = new Request("https://test.com/api/report/test-report/og")
      const response = await GET(request, {
        params: Promise.resolve({ id: "test-report" }),
      })

      expect(response.status).toBe(500)
      expect(await response.text()).toBe("Error generating image")
    })
  })
})
