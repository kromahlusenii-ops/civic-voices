import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QuerySuggestions from "./QuerySuggestions";
import type { SuggestedQuery } from "@/lib/types/api";

const mockSuggestions: SuggestedQuery[] = [
  {
    label: "Emotional reactions",
    description: "Explore how people feel about this topic",
    query: "climate change AND (hope OR fear OR concern)",
  },
  {
    label: "Policy & regulation",
    description: "Find discussions about laws and policies",
    query: "climate change AND (policy OR law OR regulation)",
  },
  {
    label: "Controversies",
    description: "Discover debates and opposing views",
    query: "climate change AND (controversy OR debate)",
  },
];

describe("QuerySuggestions", () => {
  const mockOnQuerySelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe("Rendering", () => {
    it("renders nothing when suggestions array is empty", () => {
      render(<QuerySuggestions suggestions={[]} onQuerySelect={mockOnQuerySelect} />);
      expect(screen.queryByTestId("query-suggestions")).not.toBeInTheDocument();
    });

    it("renders nothing when suggestions is undefined", () => {
      render(<QuerySuggestions suggestions={undefined as unknown as SuggestedQuery[]} onQuerySelect={mockOnQuerySelect} />);
      expect(screen.queryByTestId("query-suggestions")).not.toBeInTheDocument();
    });

    it("renders all suggestions when provided", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      expect(screen.getByTestId("query-suggestions")).toBeInTheDocument();

      const items = screen.getAllByTestId("query-suggestion-item");
      expect(items).toHaveLength(3);
    });

    it("displays label and description for each suggestion", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      expect(screen.getByText("Emotional reactions")).toBeInTheDocument();
      expect(screen.getByText("Explore how people feel about this topic")).toBeInTheDocument();

      expect(screen.getByText("Policy & regulation")).toBeInTheDocument();
      expect(screen.getByText("Find discussions about laws and policies")).toBeInTheDocument();
    });

    it("displays Boolean query in monospace format", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      expect(screen.getByText("climate change AND (hope OR fear OR concern)")).toBeInTheDocument();
      expect(screen.getByText("climate change AND (policy OR law OR regulation)")).toBeInTheDocument();
    });
  });

  describe("Query Selection", () => {
    it("calls onQuerySelect when clicking a suggestion item", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const firstItem = screen.getAllByTestId("query-suggestion-item")[0];
      fireEvent.click(firstItem);

      expect(mockOnQuerySelect).toHaveBeenCalledWith("climate change AND (hope OR fear OR concern)");
    });

    it("calls onQuerySelect with correct query for each item", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const items = screen.getAllByTestId("query-suggestion-item");

      fireEvent.click(items[1]);
      expect(mockOnQuerySelect).toHaveBeenCalledWith("climate change AND (policy OR law OR regulation)");

      fireEvent.click(items[2]);
      expect(mockOnQuerySelect).toHaveBeenCalledWith("climate change AND (controversy OR debate)");
    });
  });

  describe("Copy Functionality", () => {
    it("renders copy button for each suggestion", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const copyButtons = screen.getAllByTestId("copy-query-btn");
      expect(copyButtons).toHaveLength(3);
    });

    it("copies query to clipboard when copy button is clicked", async () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const copyButtons = screen.getAllByTestId("copy-query-btn");
      fireEvent.click(copyButtons[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "climate change AND (hope OR fear OR concern)"
      );
    });

    it("does not trigger query selection when copy button is clicked", async () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const copyButtons = screen.getAllByTestId("copy-query-btn");
      fireEvent.click(copyButtons[0]);

      // Copy should not trigger the parent click handler
      expect(mockOnQuerySelect).not.toHaveBeenCalled();
    });

    it("shows check icon after successful copy", async () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const copyButton = screen.getAllByTestId("copy-query-btn")[0];
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(copyButton).toHaveAttribute("aria-label", "Copied!");
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label on copy buttons", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const copyButtons = screen.getAllByTestId("copy-query-btn");
      copyButtons.forEach((button) => {
        expect(button).toHaveAttribute("aria-label", "Copy query");
      });
    });

    it("suggestion items are keyboard accessible", () => {
      render(<QuerySuggestions suggestions={mockSuggestions} onQuerySelect={mockOnQuerySelect} />);

      const items = screen.getAllByTestId("query-suggestion-item");
      items.forEach((item) => {
        expect(item).toHaveAttribute("role", "button");
        expect(item).toHaveAttribute("tabIndex", "0");
      });
    });
  });
});
