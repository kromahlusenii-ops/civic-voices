import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AudienceChatSidebar from "./AudienceChatSidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock useAudienceChat hook
const mockSendMessage = vi.fn();
const mockClearHistory = vi.fn();
const mockExportConversation = vi.fn().mockReturnValue("# Chat Export");

vi.mock("@/lib/hooks/useAudienceChat", () => ({
  useAudienceChat: () => ({
    messages: [],
    status: "idle",
    error: null,
    sendMessage: mockSendMessage,
    clearHistory: mockClearHistory,
    exportConversation: mockExportConversation,
  }),
}));

// Sample report data
const mockReportData = {
  report: {
    id: "report-123",
    query: "climate change",
  },
  posts: [
    { id: "post-1" },
    { id: "post-2" },
    { id: "post-3" },
  ],
};

// Mock getAccessToken
const mockGetAccessToken = vi.fn().mockResolvedValue("test-access-token");

// Mock onScrollToPost
const mockOnScrollToPost = vi.fn();

// Mock onClose
const mockOnClose = vi.fn();

describe("AudienceChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders sidebar when isOpen is true", () => {
      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      expect(screen.getByText("Talk to the Audience")).toBeInTheDocument();
    });

    it("displays post count in header", () => {
      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      expect(screen.getByText("Speaking for 3 posts")).toBeInTheDocument();
    });

    it("applies translate class based on isOpen", () => {
      const { rerender } = render(
        <AudienceChatSidebar
          isOpen={false}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      // Get the aside element by its aria-label
      const sidebar = screen.getByLabelText("Audience chat panel");
      expect(sidebar).toHaveClass("translate-x-full");

      rerender(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      expect(sidebar).toHaveClass("translate-x-0");
    });
  });

  describe("Access Token Loading", () => {
    it("calls getAccessToken when sidebar opens", async () => {
      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      await waitFor(() => {
        expect(mockGetAccessToken).toHaveBeenCalled();
      });
    });
  });

  describe("Initial Message Handling", () => {
    it("accepts initialMessage prop", () => {
      // This test validates that the component accepts the prop without error
      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
          initialMessage="What caused the spike on January 15th?"
        />
      );

      expect(screen.getByText("Talk to the Audience")).toBeInTheDocument();
    });

    it("accepts onInitialMessageSent callback prop", () => {
      const onInitialMessageSent = vi.fn();

      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
          initialMessage="Test message"
          onInitialMessageSent={onInitialMessageSent}
        />
      );

      expect(screen.getByText("Talk to the Audience")).toBeInTheDocument();
    });
  });

  describe("Props Interface", () => {
    it("has correct required props", () => {
      // This validates the component interface at compile time
      const requiredProps = {
        isOpen: true,
        onClose: mockOnClose,
        reportData: mockReportData,
        getAccessToken: mockGetAccessToken,
        onScrollToPost: mockOnScrollToPost,
      };

      render(<AudienceChatSidebar {...requiredProps} />);
      expect(screen.getByText("Talk to the Audience")).toBeInTheDocument();
    });

    it("has correct optional props", () => {
      // Test with all optional props
      const onInitialMessageSent = vi.fn();

      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={mockReportData}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
          initialMessage="Test initial message"
          onInitialMessageSent={onInitialMessageSent}
        />
      );

      expect(screen.getByText("Talk to the Audience")).toBeInTheDocument();
    });
  });

  describe("Report Data Handling", () => {
    it("handles report with no posts", () => {
      const reportDataNoPosts = {
        report: {
          id: "report-456",
          query: "test query",
        },
      };

      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={reportDataNoPosts}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      expect(screen.getByText("Speaking for 0 posts")).toBeInTheDocument();
    });

    it("formats large post counts with locale string", () => {
      const reportDataManyPosts = {
        report: {
          id: "report-789",
          query: "test query",
        },
        posts: Array(1500).fill({ id: "post" }),
      };

      render(
        <AudienceChatSidebar
          isOpen={true}
          onClose={mockOnClose}
          reportData={reportDataManyPosts}
          getAccessToken={mockGetAccessToken}
          onScrollToPost={mockOnScrollToPost}
        />
      );

      expect(screen.getByText("Speaking for 1,500 posts")).toBeInTheDocument();
    });
  });
});
