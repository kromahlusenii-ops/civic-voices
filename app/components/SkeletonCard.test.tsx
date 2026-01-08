import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SkeletonCard, { SkeletonCardList } from "./SkeletonCard";

describe("SkeletonCard", () => {
  describe("Single Card", () => {
    it("renders skeleton card with correct structure", () => {
      render(<SkeletonCard />);

      const card = screen.getByTestId("skeleton-card");
      expect(card).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
      render(<SkeletonCard className="custom-class" />);

      const card = screen.getByTestId("skeleton-card");
      expect(card).toHaveClass("custom-class");
    });

    it("has animate-pulse elements for loading animation", () => {
      render(<SkeletonCard />);

      const card = screen.getByTestId("skeleton-card");
      const pulsingElements = card.querySelectorAll(".animate-pulse");

      // Should have multiple pulsing placeholder elements
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it("has correct base styling", () => {
      render(<SkeletonCard />);

      const card = screen.getByTestId("skeleton-card");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("bg-white");
    });
  });

  describe("SkeletonCardList", () => {
    it("renders default count of 6 skeleton cards", () => {
      render(<SkeletonCardList />);

      const list = screen.getByTestId("skeleton-card-list");
      expect(list).toBeInTheDocument();

      const cards = screen.getAllByTestId("skeleton-card");
      expect(cards).toHaveLength(6);
    });

    it("renders custom count of skeleton cards", () => {
      render(<SkeletonCardList count={3} />);

      const cards = screen.getAllByTestId("skeleton-card");
      expect(cards).toHaveLength(3);
    });

    it("renders 10 skeleton cards when count is 10", () => {
      render(<SkeletonCardList count={10} />);

      const cards = screen.getAllByTestId("skeleton-card");
      expect(cards).toHaveLength(10);
    });

    it("renders with correct container styling", () => {
      render(<SkeletonCardList count={2} />);

      const list = screen.getByTestId("skeleton-card-list");
      expect(list).toHaveClass("space-y-4");
    });
  });
});
