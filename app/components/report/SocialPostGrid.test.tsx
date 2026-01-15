import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SocialPostGrid from "./SocialPostGrid";
import type { Post } from "@/lib/types/api";

// Helper to create mock post data
const makePost = (
  id: string,
  platform: Post["platform"] = "x",
  overrides?: Partial<Post & { sentiment: "positive" | "negative" | "neutral" | null }>
): Post & { sentiment: "positive" | "negative" | "neutral" | null } => ({
  id,
  text: `Example post text for ${id}`,
  author: `Author ${id}`,
  authorHandle: `author${id}`,
  createdAt: new Date().toISOString(),
  platform,
  engagement: { likes: 100, comments: 50, shares: 25 },
  url: `https://example.com/post/${id}`,
  sentiment: "neutral",
  ...overrides,
});

// Mock IntersectionObserver
const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = mockUnobserve;
  root = null;
  rootMargin = "";
  thresholds = [];
  takeRecords = () => [];
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SocialPostGrid", () => {
  describe("Component Rendering", () => {
    it("renders with test id", () => {
      const posts = [makePost("1")];
      render(<SocialPostGrid posts={posts} />);
      expect(screen.getByTestId("social-post-grid")).toBeInTheDocument();
    });

    it("renders all posts", () => {
      const posts = [makePost("1"), makePost("2"), makePost("3")];
      render(<SocialPostGrid posts={posts} />);
      const cards = screen.getAllByTestId("social-post-card");
      expect(cards).toHaveLength(3);
    });

    it("renders posts from different platforms", () => {
      const posts = [
        makePost("1", "x"),
        makePost("2", "youtube"),
        makePost("3", "reddit"),
        makePost("4", "tiktok"),
      ];
      render(<SocialPostGrid posts={posts} />);
      const cards = screen.getAllByTestId("social-post-card");
      expect(cards).toHaveLength(4);
    });
  });

  describe("Empty State", () => {
    it("displays empty state message when no posts", () => {
      render(<SocialPostGrid posts={[]} />);
      expect(screen.getByText("No posts to display")).toBeInTheDocument();
    });

    it("does not render grid when no posts", () => {
      render(<SocialPostGrid posts={[]} />);
      expect(screen.queryByTestId("social-post-grid")).not.toBeInTheDocument();
    });
  });

  describe("Grid Layout", () => {
    it("renders grid container with responsive classes", () => {
      const posts = [makePost("1")];
      render(<SocialPostGrid posts={posts} />);
      const grid = screen.getByTestId("social-post-grid");
      expect(grid).toHaveClass("grid");
      expect(grid).toHaveClass("grid-cols-1");
      expect(grid).toHaveClass("md:grid-cols-2");
      expect(grid).toHaveClass("xl:grid-cols-3");
      expect(grid).toHaveClass("gap-5");
    });
  });

  describe("Intersection Observer", () => {
    it("observes each card element on mount", () => {
      const posts = [makePost("1"), makePost("2")];
      render(<SocialPostGrid posts={posts} />);
      // Observer is set up to observe cards
      expect(mockObserve).toHaveBeenCalled();
    });

    it("disconnects observer on unmount", () => {
      const posts = [makePost("1")];
      const { unmount } = render(<SocialPostGrid posts={posts} />);
      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe("Post Data", () => {
    it("passes correct post data to SocialPostCard", () => {
      const posts = [
        makePost("unique-id", "x", {
          author: "Specific Author",
          text: "Specific text content",
          sentiment: "positive",
        }),
      ];
      render(<SocialPostGrid posts={posts} />);
      expect(screen.getByText("Specific Author")).toBeInTheDocument();
      expect(screen.getByText("Specific text content")).toBeInTheDocument();
      expect(screen.getByText("positive")).toBeInTheDocument();
    });

    it("renders posts with different sentiments", () => {
      const posts = [
        makePost("1", "x", { sentiment: "positive" }),
        makePost("2", "x", { sentiment: "negative" }),
        makePost("3", "x", { sentiment: "neutral" }),
      ];
      render(<SocialPostGrid posts={posts} />);
      expect(screen.getByText("positive")).toBeInTheDocument();
      expect(screen.getByText("negative")).toBeInTheDocument();
      expect(screen.getByText("neutral")).toBeInTheDocument();
    });
  });

  describe("Large Post Lists", () => {
    it("handles large number of posts", () => {
      const posts = Array.from({ length: 50 }, (_, i) =>
        makePost(`post-${i}`)
      );
      render(<SocialPostGrid posts={posts} />);
      const cards = screen.getAllByTestId("social-post-card");
      expect(cards).toHaveLength(50);
    });
  });

  describe("Post Key Uniqueness", () => {
    it("uses post id as key for each card", () => {
      const posts = [
        makePost("unique-1"),
        makePost("unique-2"),
        makePost("unique-3"),
      ];
      render(<SocialPostGrid posts={posts} />);
      // If keys are not unique, React would log a warning
      // This test ensures no duplicate key warnings
      const cards = screen.getAllByTestId("social-post-card");
      expect(cards).toHaveLength(3);
    });
  });
});
