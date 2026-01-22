import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ActivityChart, { type DataPointClickEvent } from "./ActivityChart";

// Mock ResizeObserver as a class
class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    // Simulate resize event with a width
    this.callback([{ contentRect: { width: 800, height: 280 } } as ResizeObserverEntry], this);
  }

  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

// Sample test data
const mockData = [
  { date: "2024-01-01", count: 10, engagement: 100, views: 1500 },
  { date: "2024-01-02", count: 15, engagement: 150, views: 2250 },
  { date: "2024-01-03", count: 8, engagement: 80, views: 1200 },
  { date: "2024-01-04", count: 20, engagement: 200, views: 3000 },
  { date: "2024-01-05", count: 12, engagement: 120, views: 1800 },
];

const mockSentimentData = {
  positive: 45,
  negative: 25,
  neutral: 30,
};

describe("ActivityChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders title", () => {
      render(<ActivityChart data={mockData} />);
      expect(screen.getByText("Activity over time")).toBeInTheDocument();
    });

    it("shows empty state when no data", () => {
      render(<ActivityChart data={[]} />);
      expect(screen.getByText("No activity data available")).toBeInTheDocument();
    });

    it("renders mode toggle buttons", () => {
      render(<ActivityChart data={mockData} sentimentData={mockSentimentData} />);
      expect(screen.getByText("Volume")).toBeInTheDocument();
      expect(screen.getByText("Sentiment")).toBeInTheDocument();
    });

    it("always renders mode toggle even without sentimentData", () => {
      render(<ActivityChart data={mockData} />);
      // The toggle is always present (Volume/Sentiment tabs)
      expect(screen.getByText("Volume")).toBeInTheDocument();
      expect(screen.getByText("Sentiment")).toBeInTheDocument();
    });
  });

  describe("Mode Switching", () => {
    it("switches to sentiment mode when clicking Sentiment button", () => {
      const onModeChange = vi.fn();
      render(
        <ActivityChart
          data={mockData}
          sentimentData={mockSentimentData}
          onModeChange={onModeChange}
        />
      );

      fireEvent.click(screen.getByText("Sentiment"));
      expect(onModeChange).toHaveBeenCalledWith("sentiment");
    });

    it("calls onModeChange when switching modes", () => {
      const onModeChange = vi.fn();
      render(
        <ActivityChart
          data={mockData}
          sentimentData={mockSentimentData}
          onModeChange={onModeChange}
        />
      );

      fireEvent.click(screen.getByText("Sentiment"));
      expect(onModeChange).toHaveBeenCalledWith("sentiment");

      fireEvent.click(screen.getByText("Volume"));
      expect(onModeChange).toHaveBeenCalledWith("volume");
    });
  });

  describe("DataPointClickEvent Interface", () => {
    it("has correct type definition for DataPointClickEvent", () => {
      // This test validates the type at compile time
      const mockEvent: DataPointClickEvent = {
        date: "2024-01-01",
        count: 10,
        views: 1500,
        engagement: 100,
        formattedDate: "Jan 1, 2024",
      };

      expect(mockEvent.date).toBe("2024-01-01");
      expect(mockEvent.count).toBe(10);
      expect(mockEvent.views).toBe(1500);
      expect(mockEvent.engagement).toBe(100);
      expect(mockEvent.formattedDate).toBe("Jan 1, 2024");
    });
  });

  describe("onDataPointClick Prop", () => {
    it("accepts onDataPointClick callback prop", () => {
      const onDataPointClick = vi.fn();
      // This should not throw
      render(
        <ActivityChart
          data={mockData}
          onDataPointClick={onDataPointClick}
        />
      );
      expect(screen.getByText("Activity over time")).toBeInTheDocument();
    });

    it("shows AI insight hint when onDataPointClick is provided", () => {
      const onDataPointClick = vi.fn();
      render(
        <ActivityChart
          data={mockData}
          onDataPointClick={onDataPointClick}
        />
      );
      expect(
        screen.getByText("Click any data point for AI-powered insights")
      ).toBeInTheDocument();
    });

    it("does not show AI insight hint when onDataPointClick is not provided", () => {
      render(<ActivityChart data={mockData} />);
      expect(
        screen.queryByText("Click any data point for AI-powered insights")
      ).not.toBeInTheDocument();
    });
  });

  describe("Legend", () => {
    it("displays Views legend item", () => {
      render(<ActivityChart data={mockData} />);
      expect(screen.getByText("Views")).toBeInTheDocument();
    });

    it("displays Mentions legend item", () => {
      render(<ActivityChart data={mockData} />);
      expect(screen.getByText("Mentions")).toBeInTheDocument();
    });

    it("shows sentiment legend items in sentiment mode", () => {
      render(
        <ActivityChart
          data={mockData}
          sentimentData={mockSentimentData}
          mode="sentiment"
        />
      );
      // Check that sentiment legend items are present (may have multiple due to chart labels)
      expect(screen.getAllByText(/Positive/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Negative/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Neutral/).length).toBeGreaterThan(0);
    });
  });

  describe("Custom Height", () => {
    it("accepts custom height prop", () => {
      render(<ActivityChart data={mockData} height={400} />);
      // Component should render without errors
      expect(screen.getByText("Activity over time")).toBeInTheDocument();
    });
  });
});
