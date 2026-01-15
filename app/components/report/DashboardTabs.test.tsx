import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DashboardTabs from "./DashboardTabs";

describe("DashboardTabs", () => {
  describe("Component Rendering", () => {
    it("renders with test id", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);
      expect(screen.getByTestId("dashboard-tabs")).toBeInTheDocument();
    });

    it("renders both tab options", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Social Posts")).toBeInTheDocument();
    });

  });

  describe("Tab Interactions", () => {
    it("calls onTabChange with 'overview' when Overview tab is clicked", () => {
      const onTabChange = vi.fn();
      render(
        <DashboardTabs activeTab="social-posts" onTabChange={onTabChange} />
      );

      fireEvent.click(screen.getByText("Overview"));
      expect(onTabChange).toHaveBeenCalledWith("overview");
    });

    it("calls onTabChange with 'social-posts' when Social Posts tab is clicked", () => {
      const onTabChange = vi.fn();
      render(<DashboardTabs activeTab="overview" onTabChange={onTabChange} />);

      fireEvent.click(screen.getByText("Social Posts"));
      expect(onTabChange).toHaveBeenCalledWith("social-posts");
    });
  });

  describe("Active Tab Styling", () => {
    it("applies active styles to Overview tab when activeTab is 'overview'", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);

      const overviewTab = screen.getByRole("tab", { name: /overview/i });
      expect(overviewTab).toHaveAttribute("aria-selected", "true");
      expect(overviewTab).toHaveClass("bg-white");
    });

    it("applies active styles to Social Posts tab when activeTab is 'social-posts'", () => {
      render(<DashboardTabs activeTab="social-posts" onTabChange={() => {}} />);

      const socialPostsTab = screen.getByRole("tab", {
        name: /social posts/i,
      });
      expect(socialPostsTab).toHaveAttribute("aria-selected", "true");
      expect(socialPostsTab).toHaveClass("bg-white");
    });
  });

  describe("Accessibility", () => {
    it("has tablist role", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("has tab role for each button", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
    });

    it("has aria-label on tablist", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);
      expect(screen.getByRole("tablist")).toHaveAttribute(
        "aria-label",
        "Dashboard views"
      );
    });

    it("sets aria-controls for each tab", () => {
      render(<DashboardTabs activeTab="overview" onTabChange={() => {}} />);
      const tabs = screen.getAllByRole("tab");
      expect(tabs[0]).toHaveAttribute("aria-controls", "overview-panel");
      expect(tabs[1]).toHaveAttribute("aria-controls", "social-posts-panel");
    });
  });

});
