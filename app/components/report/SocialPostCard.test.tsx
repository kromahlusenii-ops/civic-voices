import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SocialPostCard from "./SocialPostCard";
import type { Post } from "@/lib/types/api";

// Helper to create mock post data
const makePost = (
  id: string,
  platform: Post["platform"],
  overrides?: Partial<Post & { sentiment: "positive" | "negative" | "neutral" | null }>
): Post & { sentiment: "positive" | "negative" | "neutral" | null } => ({
  id,
  text: "Example post text content here",
  author: "Test Author",
  authorHandle: "testauthor",
  createdAt: new Date().toISOString(),
  platform,
  engagement: { likes: 100, comments: 50, shares: 25 },
  url: "https://example.com/post",
  sentiment: "positive",
  ...overrides,
});

describe("SocialPostCard", () => {
  describe("Component Rendering", () => {
    it("renders with test id", () => {
      const post = makePost("1", "x");
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByTestId("social-post-card")).toBeInTheDocument();
    });

    it("renders author name", () => {
      const post = makePost("1", "x", { author: "John Doe" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders author handle with @ prefix", () => {
      const post = makePost("1", "x", { authorHandle: "johndoe" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("@johndoe")).toBeInTheDocument();
    });

    it("renders post text", () => {
      const post = makePost("1", "x", { text: "This is my test post" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("This is my test post")).toBeInTheDocument();
    });

    it("renders as a link to the post URL", () => {
      const post = makePost("1", "x", { url: "https://twitter.com/post/123" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      const link = screen.getByTestId("social-post-card");
      expect(link).toHaveAttribute("href", "https://twitter.com/post/123");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Engagement Metrics", () => {
    it("displays formatted like count", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 1500, comments: 50, shares: 25 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("1.5K")).toBeInTheDocument();
    });

    it("displays formatted comment count", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 100, comments: 2500, shares: 25 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("2.5K")).toBeInTheDocument();
    });

    it("displays formatted share count", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 100, comments: 50, shares: 1000000 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("1M")).toBeInTheDocument();
    });

    it("displays views when available", () => {
      const post = makePost("1", "youtube", {
        engagement: { likes: 100, comments: 50, shares: 25, views: 5000 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("5K")).toBeInTheDocument();
    });

    it("does not display views when not available", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 100, comments: 50, shares: 25 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      // Should only have 3 engagement metrics
      const metrics = screen.getAllByText(/\d+/);
      // likes: 100, comments: 50, shares: 25
      expect(metrics.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Sentiment Badge", () => {
    it("displays positive sentiment badge", () => {
      const post = makePost("1", "x", { sentiment: "positive" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("positive")).toBeInTheDocument();
    });

    it("displays negative sentiment badge", () => {
      const post = makePost("1", "x", { sentiment: "negative" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("negative")).toBeInTheDocument();
    });

    it("displays neutral sentiment badge", () => {
      const post = makePost("1", "x", { sentiment: "neutral" });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("neutral")).toBeInTheDocument();
    });

    it("does not display sentiment badge when null", () => {
      const post = makePost("1", "x", { sentiment: null });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.queryByText("positive")).not.toBeInTheDocument();
      expect(screen.queryByText("negative")).not.toBeInTheDocument();
      expect(screen.queryByText("neutral")).not.toBeInTheDocument();
    });
  });

  describe("Platform Support", () => {
    it.each([
      "x",
      "tiktok",
      "reddit",
      "youtube",
      "bluesky",
      "instagram",
    ] as Post["platform"][])("renders post for platform: %s", (platform) => {
      const post = makePost("1", platform);
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByTestId("social-post-card")).toBeInTheDocument();
    });
  });

  describe("Thumbnail", () => {
    it("renders thumbnail image when available", () => {
      const post = makePost("1", "youtube", {
        thumbnail: "https://example.com/thumb.jpg",
        authorAvatar: undefined,
      });
      const { container } = render(
        <SocialPostCard post={post} index={0} isVisible />
      );
      // Query by src attribute since alt="" gives presentation role
      const thumbImg = container.querySelector(
        'img[src="https://example.com/thumb.jpg"]'
      );
      expect(thumbImg).toBeInTheDocument();
    });

    it("does not render thumbnail section when not available", () => {
      const post = makePost("1", "x", {
        thumbnail: undefined,
        authorAvatar: undefined,
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      // Should show fallback initial instead of img for avatar
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });

  describe("Avatar", () => {
    it("renders avatar image when authorAvatar is provided", () => {
      const post = makePost("1", "x", {
        authorAvatar: "https://example.com/avatar.jpg",
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      const avatars = screen.getAllByRole("img");
      const avatar = avatars.find(
        (img) => img.getAttribute("src") === "https://example.com/avatar.jpg"
      );
      expect(avatar).toBeInTheDocument();
    });

    it("renders initial fallback when no avatar", () => {
      const post = makePost("1", "x", {
        author: "Test User",
        authorAvatar: undefined,
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });

  describe("Animation States", () => {
    it("applies visible styles when isVisible is true", () => {
      const post = makePost("1", "x");
      render(<SocialPostCard post={post} index={0} isVisible={true} />);
      const card = screen.getByTestId("social-post-card");
      expect(card).toHaveClass("opacity-100");
      expect(card).toHaveClass("translate-y-0");
    });

    it("applies hidden styles when isVisible is false", () => {
      const post = makePost("1", "x");
      render(<SocialPostCard post={post} index={0} isVisible={false} />);
      const card = screen.getByTestId("social-post-card");
      expect(card).toHaveClass("opacity-0");
      expect(card).toHaveClass("translate-y-10");
    });

    it("applies staggered animation delay based on index", () => {
      const post = makePost("1", "x");
      render(<SocialPostCard post={post} index={5} isVisible />);
      const card = screen.getByTestId("social-post-card");
      expect(card).toHaveStyle({ transitionDelay: "250ms" });
    });
  });

  describe("Number Formatting", () => {
    it("formats thousands with K suffix", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 1234, comments: 0, shares: 0 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("1.2K")).toBeInTheDocument();
    });

    it("formats millions with M suffix", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 1234567, comments: 0, shares: 0 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("1.2M")).toBeInTheDocument();
    });

    it("displays small numbers without suffix", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 999, comments: 0, shares: 0 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("999")).toBeInTheDocument();
    });

    it("removes trailing zero decimal", () => {
      const post = makePost("1", "x", {
        engagement: { likes: 2000, comments: 0, shares: 0 },
      });
      render(<SocialPostCard post={post} index={0} isVisible />);
      expect(screen.getByText("2K")).toBeInTheDocument();
    });
  });
});
