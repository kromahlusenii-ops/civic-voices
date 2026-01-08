import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SentimentClassificationService,
  type Sentiment,
} from "./sentimentClassification";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SentimentClassificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("throws error if API key is not provided", () => {
      expect(() => new SentimentClassificationService("")).toThrow(
        "Anthropic API key is required"
      );
    });

    it("creates instance with valid API key", () => {
      const service = new SentimentClassificationService("test-api-key");
      expect(service).toBeInstanceOf(SentimentClassificationService);
    });

    it("accepts custom batch size and concurrency", () => {
      const service = new SentimentClassificationService("test-api-key", {
        batchSize: 5,
        maxConcurrent: 2,
      });
      expect(service).toBeInstanceOf(SentimentClassificationService);
    });
  });

  describe("classifyBatch", () => {
    it("returns empty array for empty input", async () => {
      const service = new SentimentClassificationService("test-api-key");
      const result = await service.classifyBatch([]);
      expect(result).toEqual([]);
    });

    it("classifies posts correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify([
                { id: "1", sentiment: "positive" },
                { id: "2", sentiment: "negative" },
                { id: "3", sentiment: "neutral" },
              ]),
            },
          ],
        }),
      });

      const service = new SentimentClassificationService("test-api-key");
      const result = await service.classifyBatch([
        { id: "post-1", text: "I love this!" },
        { id: "post-2", text: "This is terrible" },
        { id: "post-3", text: "Just the facts" },
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ postId: "post-1", sentiment: "positive" });
      expect(result[1]).toEqual({ postId: "post-2", sentiment: "negative" });
      expect(result[2]).toEqual({ postId: "post-3", sentiment: "neutral" });
    });

    it("returns neutral for all posts on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "API Error",
      });

      const service = new SentimentClassificationService("test-api-key");
      const result = await service.classifyBatch([
        { id: "post-1", text: "Test post" },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].sentiment).toBe("neutral");
    });

    it("returns neutral for all posts on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const service = new SentimentClassificationService("test-api-key");
      const result = await service.classifyBatch([
        { id: "post-1", text: "Test post" },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].sentiment).toBe("neutral");
    });

    it("sends correct request to Claude API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify([{ id: "1", sentiment: "positive" }]),
            },
          ],
        }),
      });

      const service = new SentimentClassificationService("test-api-key");
      await service.classifyBatch([{ id: "post-1", text: "Test post" }]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-api-key",
            "anthropic-version": "2023-06-01",
          }),
        })
      );
    });

    it("truncates long post text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify([{ id: "1", sentiment: "neutral" }]),
            },
          ],
        }),
      });

      const service = new SentimentClassificationService("test-api-key");
      const longText = "a".repeat(500);
      await service.classifyBatch([{ id: "post-1", text: longText }]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Text should be truncated to 300 chars
      expect(callBody.messages[0].content).not.toContain("a".repeat(400));
    });
  });

  describe("classifyAll", () => {
    it("returns empty map for empty input", async () => {
      const service = new SentimentClassificationService("test-api-key");
      const result = await service.classifyAll([]);
      expect(result.size).toBe(0);
    });

    it("processes posts in batches", async () => {
      // Set batch size to 2 for testing
      const service = new SentimentClassificationService("test-api-key", {
        batchSize: 2,
        maxConcurrent: 1,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [
              {
                type: "text",
                text: JSON.stringify([
                  { id: "1", sentiment: "positive" },
                  { id: "2", sentiment: "negative" },
                ]),
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [
              {
                type: "text",
                text: JSON.stringify([{ id: "1", sentiment: "neutral" }]),
              },
            ],
          }),
        });

      const result = await service.classifyAll([
        { id: "post-1", text: "Post 1" },
        { id: "post-2", text: "Post 2" },
        { id: "post-3", text: "Post 3" },
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(3);
    });

    it("returns map with correct sentiment values", async () => {
      const service = new SentimentClassificationService("test-api-key");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify([
                { id: "1", sentiment: "positive" },
                { id: "2", sentiment: "negative" },
              ]),
            },
          ],
        }),
      });

      const result = await service.classifyAll([
        { id: "post-1", text: "Happy post" },
        { id: "post-2", text: "Sad post" },
      ]);

      expect(result.get("post-1")).toBe("positive");
      expect(result.get("post-2")).toBe("negative");
    });
  });

  describe("calculateBreakdown", () => {
    it("calculates correct breakdown", () => {
      const sentiments = new Map<string, Sentiment>([
        ["1", "positive"],
        ["2", "positive"],
        ["3", "negative"],
        ["4", "neutral"],
        ["5", "neutral"],
        ["6", "neutral"],
      ]);

      const breakdown =
        SentimentClassificationService.calculateBreakdown(sentiments);

      expect(breakdown).toEqual({
        positive: 2,
        negative: 1,
        neutral: 3,
        total: 6,
      });
    });

    it("returns zeros for empty map", () => {
      const sentiments = new Map<string, Sentiment>();

      const breakdown =
        SentimentClassificationService.calculateBreakdown(sentiments);

      expect(breakdown).toEqual({
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
      });
    });
  });
});
