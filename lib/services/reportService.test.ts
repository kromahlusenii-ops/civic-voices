import { describe, expect, it } from "vitest";
import type { Post } from "@/lib/types/api";
import { getEngagementScore, getTopSentimentPosts } from "./reportService";

const makePost = (
  id: string,
  engagement: Post["engagement"]
): Post => ({
  id,
  text: "Example post",
  author: "Author",
  authorHandle: "author",
  createdAt: new Date().toISOString(),
  platform: "x",
  engagement,
  url: "https://example.com/post",
});

describe("reportService helpers", () => {
  describe("getEngagementScore", () => {
    it("sums likes, comments, shares, and views", () => {
      const post = makePost("p1", {
        likes: 3,
        comments: 2,
        shares: 1,
        views: 10,
      });

      expect(getEngagementScore(post)).toBe(16);
    });

    it("handles missing views", () => {
      const post = makePost("p2", {
        likes: 4,
        comments: 1,
        shares: 2,
      });

      expect(getEngagementScore(post)).toBe(7);
    });
  });

  describe("getTopSentimentPosts", () => {
    it("returns highest engagement posts in descending order", () => {
      const posts = [
        makePost("low", { likes: 10, comments: 0, shares: 0, views: 0 }),
        makePost("high", { likes: 1, comments: 1, shares: 1, views: 50 }),
        makePost("mid", { likes: 20, comments: 0, shares: 0, views: 0 }),
      ];

      const result = getTopSentimentPosts(posts, 2);
      expect(result.map((post) => post.id)).toEqual(["high", "mid"]);
    });

    it("returns original array when limit is zero", () => {
      const posts = [
        makePost("one", { likes: 1, comments: 0, shares: 0, views: 0 }),
        makePost("two", { likes: 2, comments: 0, shares: 0, views: 0 }),
      ];

      const result = getTopSentimentPosts(posts, 0);
      expect(result).toBe(posts);
    });
  });
});
