import { describe, it, expect, vi, beforeEach } from "vitest";
import AIAnalysisService from "./aiAnalysis";
import type { Post, AIAnalysis } from "@/lib/types/api";

// Mock the anthropicGenerate function
vi.mock("./anthropicClient", () => ({
  anthropicGenerate: vi.fn(),
}));

import { anthropicGenerate } from "./anthropicClient";

const mockAnthropicGenerate = vi.mocked(anthropicGenerate);

// Helper to create mock post data
const makePost = (
  id: string,
  text: string,
  platform: Post["platform"] = "x"
): Post => ({
  id,
  text,
  author: "Author",
  authorHandle: "author",
  createdAt: new Date().toISOString(),
  platform,
  engagement: { likes: 10, comments: 5, shares: 2 },
  url: "https://example.com/post",
});

describe("AIAnalysisService", () => {
  let service: AIAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIAnalysisService("test-api-key");
  });

  describe("constructor", () => {
    it("throws error when API key is not provided", () => {
      expect(() => new AIAnalysisService("")).toThrow(
        "Anthropic API key is required"
      );
    });

    it("creates service with valid API key", () => {
      expect(() => new AIAnalysisService("valid-key")).not.toThrow();
    });
  });

  describe("generateAnalysis", () => {
    it("returns analysis with intentionsBreakdown when API succeeds", async () => {
      const mockResponse: AIAnalysis = {
        interpretation: "Test interpretation",
        keyThemes: ["theme1", "theme2"],
        sentimentBreakdown: {
          overall: "mixed",
          summary: "Mixed sentiment observed",
        },
        intentionsBreakdown: [
          { name: "Inform", percentage: 40, engagementRate: 3.0 },
          { name: "Persuade", percentage: 30, engagementRate: 4.0 },
          { name: "Entertain", percentage: 20, engagementRate: 5.0 },
          { name: "Express", percentage: 10, engagementRate: 2.0 },
        ],
        suggestedQueries: [],
        followUpQuestion: "What would you like to explore?",
      };

      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: true,
        text: JSON.stringify(mockResponse),
      });

      const posts = [makePost("1", "Test post content")];
      const result = await service.generateAnalysis("test query", posts);

      expect(result.intentionsBreakdown).toBeDefined();
      expect(result.intentionsBreakdown).toHaveLength(4);
      expect(result.intentionsBreakdown![0].name).toBe("Inform");
    });

    it("returns fallback analysis with intentionsBreakdown on API error", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: false,
        text: "",
        error: "Server error",
      });

      const posts = [makePost("1", "Test post")];
      const result = await service.generateAnalysis("test query", posts);

      // Should have fallback intentionsBreakdown
      expect(result.intentionsBreakdown).toBeDefined();
      expect(result.intentionsBreakdown).toHaveLength(4);

      // Verify fallback values
      const intentions = result.intentionsBreakdown!;
      expect(intentions.find((i) => i.name === "Inform")).toBeDefined();
      expect(intentions.find((i) => i.name === "Persuade")).toBeDefined();
      expect(intentions.find((i) => i.name === "Entertain")).toBeDefined();
      expect(intentions.find((i) => i.name === "Express")).toBeDefined();
    });

    it("returns fallback analysis when no posts provided", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: true,
        text: JSON.stringify({
          interpretation: "No posts found",
          keyThemes: ["no results"],
          sentimentBreakdown: { overall: "neutral", summary: "" },
          intentionsBreakdown: [],
          suggestedQueries: [],
          followUpQuestion: "",
        }),
      });

      const result = await service.generateAnalysis("test query", []);

      expect(result.interpretation).toContain("No posts found");
    });

    it("fallback intentionsBreakdown percentages sum to 100", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: false,
        text: "",
        error: "Error",
      });

      const posts = [makePost("1", "Test")];
      const result = await service.generateAnalysis("test", posts);

      const total = result.intentionsBreakdown!.reduce(
        (sum, i) => sum + i.percentage,
        0
      );
      expect(total).toBe(100);
    });

    it("fallback intentionsBreakdown has valid engagement rates", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: false,
        text: "",
        error: "Error",
      });

      const posts = [makePost("1", "Test")];
      const result = await service.generateAnalysis("test", posts);

      for (const intention of result.intentionsBreakdown!) {
        expect(intention.engagementRate).toBeGreaterThan(0);
        expect(intention.engagementRate).toBeLessThan(10);
      }
    });

    it("handles JSON parse errors gracefully", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: true,
        text: "invalid json{",
      });

      const posts = [makePost("1", "Test")];
      const result = await service.generateAnalysis("test query", posts);

      // Should return fallback analysis
      expect(result.intentionsBreakdown).toBeDefined();
      expect(result.intentionsBreakdown!.length).toBe(4);
    });

    it("handles empty text content gracefully", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: true,
        text: "",
      });

      const posts = [makePost("1", "Test")];
      const result = await service.generateAnalysis("test query", posts);

      // Should return fallback analysis
      expect(result.intentionsBreakdown).toBeDefined();
    });
  });

  describe("intentionsBreakdown structure", () => {
    it("only includes the 4 valid intention types", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: false,
        text: "",
        error: "Error",
      });

      const posts = [makePost("1", "Test")];
      const result = await service.generateAnalysis("test", posts);

      const validTypes = ["Inform", "Persuade", "Entertain", "Express"];
      for (const intention of result.intentionsBreakdown!) {
        expect(validTypes).toContain(intention.name);
      }
    });

    it("each intention has required properties", async () => {
      mockAnthropicGenerate.mockResolvedValueOnce({
        ok: false,
        text: "",
        error: "Error",
      });

      const posts = [makePost("1", "Test")];
      const result = await service.generateAnalysis("test", posts);

      for (const intention of result.intentionsBreakdown!) {
        expect(intention).toHaveProperty("name");
        expect(intention).toHaveProperty("percentage");
        expect(intention).toHaveProperty("engagementRate");
        expect(typeof intention.name).toBe("string");
        expect(typeof intention.percentage).toBe("number");
        expect(typeof intention.engagementRate).toBe("number");
      }
    });
  });
});
