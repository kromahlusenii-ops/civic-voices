import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ContentBreakdown, {
  generateCategoryData,
  generateFormatData,
  type CategoryData,
  type FormatData,
} from "./ContentBreakdown";
import type { Post, IntentionData } from "@/lib/types/api";

// Helper to create mock post data
const makePost = (
  id: string,
  platform: Post["platform"],
  overrides?: Partial<Post>
): Post => ({
  id,
  text: "Example post text",
  author: "Author",
  authorHandle: "author",
  createdAt: new Date().toISOString(),
  platform,
  engagement: { likes: 10, comments: 5, shares: 2 },
  url: "https://example.com/post",
  ...overrides,
});

// Mock category data
const mockCategories: CategoryData[] = [
  { name: "Politics", percentage: 40, engagementRate: 3.5, color: "#3b82f6" },
  { name: "Economy", percentage: 30, engagementRate: 2.8, color: "#22c55e" },
  { name: "Technology", percentage: 20, engagementRate: 4.2, color: "#f97316" },
  { name: "Culture", percentage: 10, engagementRate: 1.9, color: "#a855f7" },
];

// Mock intentions data
const mockIntentions: IntentionData[] = [
  { name: "Inform", percentage: 35, engagementRate: 3.2 },
  { name: "Persuade", percentage: 25, engagementRate: 4.1 },
  { name: "Entertain", percentage: 20, engagementRate: 5.8 },
  { name: "Express", percentage: 20, engagementRate: 2.9 },
];

// Mock format data
const mockFormats: FormatData[] = [
  { name: "Text Post", percentage: 50, engagementRate: 2.5, color: "#64748b" },
  { name: "Video", percentage: 30, engagementRate: 4.0, color: "#ef4444" },
  { name: "Image", percentage: 20, engagementRate: 3.0, color: "#8b5cf6" },
];

describe("ContentBreakdown", () => {
  describe("Component Rendering", () => {
    it("renders with test id", () => {
      render(<ContentBreakdown categories={mockCategories} />);
      expect(screen.getByTestId("content-breakdown")).toBeInTheDocument();
    });

    it("renders header with title", () => {
      render(<ContentBreakdown categories={mockCategories} />);
      expect(screen.getByText("Content breakdown")).toBeInTheDocument();
    });

    it("renders all three tabs", () => {
      render(<ContentBreakdown categories={mockCategories} />);
      expect(screen.getByText("Intentions")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Format")).toBeInTheDocument();
    });

    it("defaults to Category tab", () => {
      render(<ContentBreakdown categories={mockCategories} />);
      // Category data should be visible by default
      expect(screen.getByText("Politics")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("displays up to 4 items in the grid", () => {
      render(<ContentBreakdown categories={mockCategories} />);
      expect(screen.getByText("Politics")).toBeInTheDocument();
      expect(screen.getByText("Economy")).toBeInTheDocument();
      expect(screen.getByText("Technology")).toBeInTheDocument();
      expect(screen.getByText("Culture")).toBeInTheDocument();
    });

    it("shows 'more items' button when more than 4 items", () => {
      const manyCategories: CategoryData[] = [
        ...mockCategories,
        { name: "Sports", percentage: 5, engagementRate: 2.0, color: "#ec4899" },
        { name: "Health", percentage: 5, engagementRate: 1.5, color: "#14b8a6" },
      ];
      render(<ContentBreakdown categories={manyCategories} />);
      expect(screen.getByText("+2 more items")).toBeInTheDocument();
    });
  });

  describe("Tab Switching", () => {
    it("switches to Intentions tab and shows intentions data", () => {
      render(
        <ContentBreakdown
          categories={mockCategories}
          intentions={mockIntentions}
        />
      );

      fireEvent.click(screen.getByText("Intentions"));

      expect(screen.getByText("Inform")).toBeInTheDocument();
      expect(screen.getByText("Persuade")).toBeInTheDocument();
      expect(screen.getByText("Entertain")).toBeInTheDocument();
      expect(screen.getByText("Express")).toBeInTheDocument();
    });

    it("switches to Format tab and shows format data", () => {
      render(
        <ContentBreakdown categories={mockCategories} formats={mockFormats} />
      );

      fireEvent.click(screen.getByText("Format"));

      expect(screen.getByText("Text Post")).toBeInTheDocument();
      expect(screen.getByText("Video")).toBeInTheDocument();
      expect(screen.getByText("Image")).toBeInTheDocument();
    });

    it("falls back to categories when intentions not provided", () => {
      render(<ContentBreakdown categories={mockCategories} />);

      fireEvent.click(screen.getByText("Intentions"));

      // Should show categories as fallback
      expect(screen.getByText("Politics")).toBeInTheDocument();
    });

    it("falls back to categories when formats not provided", () => {
      render(<ContentBreakdown categories={mockCategories} />);

      fireEvent.click(screen.getByText("Format"));

      // Should show categories as fallback
      expect(screen.getByText("Politics")).toBeInTheDocument();
    });

    it("calls onTabChange callback when tab changes", () => {
      const onTabChange = vi.fn();
      render(
        <ContentBreakdown
          categories={mockCategories}
          onTabChange={onTabChange}
        />
      );

      fireEvent.click(screen.getByText("Intentions"));
      expect(onTabChange).toHaveBeenCalledWith("intentions");

      fireEvent.click(screen.getByText("Format"));
      expect(onTabChange).toHaveBeenCalledWith("format");
    });

    it("respects activeTab prop", () => {
      render(
        <ContentBreakdown
          categories={mockCategories}
          intentions={mockIntentions}
          activeTab="intentions"
        />
      );

      // Intentions data should be visible immediately
      expect(screen.getByText("Inform")).toBeInTheDocument();
    });
  });

  describe("Engagement Rate Display", () => {
    it("displays engagement rates with ER label", () => {
      render(<ContentBreakdown categories={mockCategories} />);
      expect(screen.getByText("ER 3.5%")).toBeInTheDocument();
    });
  });
});

describe("generateCategoryData", () => {
  it("generates category data from themes array", () => {
    const themes = ["Politics", "Economy", "Technology"];
    const result = generateCategoryData(themes);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Politics");
    expect(result[1].name).toBe("Economy");
    expect(result[2].name).toBe("Technology");
  });

  it("assigns colors to categories", () => {
    const themes = ["Theme1", "Theme2"];
    const result = generateCategoryData(themes);

    expect(result[0].color).toBeDefined();
    expect(result[1].color).toBeDefined();
  });

  it("generates percentages that roughly sum to 100", () => {
    const themes = ["A", "B", "C", "D"];
    const result = generateCategoryData(themes);

    const total = result.reduce((sum, cat) => sum + cat.percentage, 0);
    // Allow some variance due to randomization
    expect(total).toBeGreaterThan(80);
    expect(total).toBeLessThan(120);
  });

  it("generates engagement rates between 0.5 and 5.5", () => {
    const themes = ["Theme1"];
    const result = generateCategoryData(themes);

    expect(result[0].engagementRate).toBeGreaterThanOrEqual(0.5);
    expect(result[0].engagementRate).toBeLessThanOrEqual(5.5);
  });
});

describe("generateFormatData", () => {
  it("returns empty array for empty posts", () => {
    const result = generateFormatData([]);
    expect(result).toEqual([]);
  });

  it("returns empty array for null/undefined posts", () => {
    const result = generateFormatData(null as unknown as Post[]);
    expect(result).toEqual([]);
  });

  it("categorizes YouTube posts as Video", () => {
    const posts = [makePost("1", "youtube")];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Video");
    expect(result[0].percentage).toBe(100);
  });

  it("categorizes TikTok posts as Short-form Video", () => {
    const posts = [makePost("1", "tiktok")];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Short-form Video");
  });

  it("categorizes X posts as Text Post by default", () => {
    const posts = [makePost("1", "x", { text: "Short tweet" })];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Text Post");
  });

  it("categorizes long X posts as Thread", () => {
    const longText = "A".repeat(300); // > 280 chars
    const posts = [makePost("1", "x", { text: longText })];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Thread");
  });

  it("categorizes Reddit posts with thumbnail as Image", () => {
    const posts = [
      makePost("1", "reddit", { thumbnail: "https://example.com/img.jpg" }),
    ];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Image");
  });

  it("categorizes Reddit posts without thumbnail as Text Post", () => {
    const posts = [makePost("1", "reddit")];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Text Post");
  });

  it("groups multiple posts by format and calculates percentages", () => {
    const posts = [
      makePost("1", "youtube"),
      makePost("2", "youtube"),
      makePost("3", "x", { text: "Short" }),
      makePost("4", "x", { text: "Short" }),
    ];
    const result = generateFormatData(posts);

    const video = result.find((f) => f.name === "Video");
    const text = result.find((f) => f.name === "Text Post");

    expect(video?.percentage).toBe(50);
    expect(text?.percentage).toBe(50);
  });

  it("sorts results by percentage descending", () => {
    const posts = [
      makePost("1", "youtube"),
      makePost("2", "x", { text: "Short" }),
      makePost("3", "x", { text: "Short" }),
      makePost("4", "x", { text: "Short" }),
    ];
    const result = generateFormatData(posts);

    expect(result[0].name).toBe("Text Post");
    expect(result[0].percentage).toBe(75);
    expect(result[1].name).toBe("Video");
    expect(result[1].percentage).toBe(25);
  });

  it("calculates engagement rate based on total engagement", () => {
    const posts = [
      makePost("1", "youtube", {
        engagement: { likes: 100, comments: 50, shares: 50 },
      }),
    ];
    const result = generateFormatData(posts);

    // (100 + 50 + 50) / 1 post / 100 = 2.0
    expect(result[0].engagementRate).toBe(2);
  });

  it("assigns colors to format types", () => {
    const posts = [makePost("1", "youtube"), makePost("2", "tiktok")];
    const result = generateFormatData(posts);

    expect(result[0].color).toBeDefined();
    expect(result[1].color).toBeDefined();
  });
});
