import { describe, it, expect } from "vitest";
import {
  formatMentions,
  calculateTotalMentions,
  getMentionsBadge,
  MENTIONS_THRESHOLDS,
} from "./mentions";
import type { Post } from "@/lib/types/api";

describe("formatMentions", () => {
  describe("numbers under 1K", () => {
    it("returns number as string for 0", () => {
      expect(formatMentions(0)).toBe("0");
    });

    it("returns number as string for small numbers", () => {
      expect(formatMentions(500)).toBe("500");
      expect(formatMentions(999)).toBe("999");
    });
  });

  describe("numbers in thousands (K)", () => {
    it("formats 1000 as 1K", () => {
      expect(formatMentions(1000)).toBe("1K");
    });

    it("formats numbers with decimal when needed", () => {
      expect(formatMentions(1500)).toBe("1.5K");
      expect(formatMentions(2300)).toBe("2.3K");
    });

    it("removes trailing .0", () => {
      expect(formatMentions(5000)).toBe("5K");
      expect(formatMentions(10000)).toBe("10K");
    });

    it("handles large thousands", () => {
      expect(formatMentions(111500)).toBe("111.5K");
      expect(formatMentions(999000)).toBe("999K");
    });
  });

  describe("numbers in millions (M)", () => {
    it("formats 1000000 as 1M", () => {
      expect(formatMentions(1000000)).toBe("1M");
    });

    it("formats numbers with decimal when needed", () => {
      expect(formatMentions(1500000)).toBe("1.5M");
      expect(formatMentions(2300000)).toBe("2.3M");
    });

    it("removes trailing .0", () => {
      expect(formatMentions(5000000)).toBe("5M");
      expect(formatMentions(10000000)).toBe("10M");
    });

    it("handles very large numbers", () => {
      expect(formatMentions(100000000)).toBe("100M");
    });
  });
});

describe("calculateTotalMentions", () => {
  const createMockPost = (engagement: Partial<Post["engagement"]>): Post => ({
    id: "test-id",
    text: "Test post",
    author: "testuser",
    authorHandle: "@testuser",
    createdAt: new Date().toISOString(),
    platform: "tiktok",
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      ...engagement,
    },
    url: "https://example.com",
  });

  it("returns 0 for empty posts array", () => {
    expect(calculateTotalMentions([])).toBe(0);
  });

  it("sums all engagement metrics for a single post", () => {
    const posts = [
      createMockPost({
        likes: 100,
        comments: 50,
        shares: 25,
        views: 1000,
      }),
    ];
    expect(calculateTotalMentions(posts)).toBe(1175);
  });

  it("sums engagement across multiple posts", () => {
    const posts = [
      createMockPost({ likes: 100, comments: 10, shares: 5, views: 500 }),
      createMockPost({ likes: 200, comments: 20, shares: 10, views: 1000 }),
      createMockPost({ likes: 300, comments: 30, shares: 15, views: 1500 }),
    ];
    expect(calculateTotalMentions(posts)).toBe(3690);
  });

  it("handles posts without views", () => {
    const posts = [
      createMockPost({ likes: 100, comments: 10, shares: 5, views: undefined }),
    ];
    expect(calculateTotalMentions(posts)).toBe(115);
  });

  it("handles posts with zero engagement", () => {
    const posts = [
      createMockPost({ likes: 0, comments: 0, shares: 0, views: 0 }),
    ];
    expect(calculateTotalMentions(posts)).toBe(0);
  });

  it("handles large engagement numbers", () => {
    const posts = [
      createMockPost({
        likes: 500000,
        comments: 50000,
        shares: 100000,
        views: 10000000,
      }),
    ];
    expect(calculateTotalMentions(posts)).toBe(10650000);
  });
});

describe("getMentionsBadge", () => {
  describe("too_narrow badge", () => {
    it("returns too_narrow for 0 mentions", () => {
      expect(getMentionsBadge(0)).toBe("too_narrow");
    });

    it("returns too_narrow for mentions below threshold", () => {
      expect(getMentionsBadge(1000)).toBe("too_narrow");
      expect(getMentionsBadge(4999)).toBe("too_narrow");
    });
  });

  describe("sweet_spot badge", () => {
    it("returns sweet_spot at lower boundary", () => {
      expect(getMentionsBadge(MENTIONS_THRESHOLDS.TOO_NARROW_MAX)).toBe("sweet_spot");
    });

    it("returns sweet_spot for mid-range mentions", () => {
      expect(getMentionsBadge(50000)).toBe("sweet_spot");
      expect(getMentionsBadge(500000)).toBe("sweet_spot");
    });

    it("returns sweet_spot at upper boundary", () => {
      expect(getMentionsBadge(MENTIONS_THRESHOLDS.SWEET_SPOT_MAX)).toBe("sweet_spot");
    });
  });

  describe("too_broad badge", () => {
    it("returns too_broad above sweet spot max", () => {
      expect(getMentionsBadge(MENTIONS_THRESHOLDS.SWEET_SPOT_MAX + 1)).toBe("too_broad");
    });

    it("returns too_broad for very high mentions", () => {
      expect(getMentionsBadge(5000000)).toBe("too_broad");
      expect(getMentionsBadge(100000000)).toBe("too_broad");
    });
  });
});

describe("MENTIONS_THRESHOLDS", () => {
  it("has correct threshold values", () => {
    expect(MENTIONS_THRESHOLDS.TOO_NARROW_MAX).toBe(5000);
    expect(MENTIONS_THRESHOLDS.SWEET_SPOT_MAX).toBe(1000000);
  });
});
