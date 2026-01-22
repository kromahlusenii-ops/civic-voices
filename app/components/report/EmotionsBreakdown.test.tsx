import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmotionsBreakdown, {
  convertSentimentToEmotions,
  type EmotionsData,
} from "./EmotionsBreakdown";

// Sample emotions data
const mockEmotions: EmotionsData = {
  neutral: 30,
  joy: 25,
  surprise: 15,
  sadness: 12,
  anger: 10,
  fear: 8,
};

describe("EmotionsBreakdown", () => {
  describe("Component Rendering", () => {
    it("renders with test id", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);
      expect(screen.getByTestId("emotions-breakdown")).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);
      expect(screen.getByText("Emotions breakdown")).toBeInTheDocument();
    });

    it("renders all six emotion labels", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);

      expect(screen.getByText("Neutral")).toBeInTheDocument();
      expect(screen.getByText("Joy")).toBeInTheDocument();
      expect(screen.getByText("Surprise")).toBeInTheDocument();
      expect(screen.getByText("Sadness")).toBeInTheDocument();
      expect(screen.getByText("Anger")).toBeInTheDocument();
      expect(screen.getByText("Fear")).toBeInTheDocument();
    });

    it("renders emoji icons for each emotion", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);

      // Check for emoji characters in the document
      expect(screen.getByText("😐")).toBeInTheDocument(); // Neutral
      expect(screen.getByText("😊")).toBeInTheDocument(); // Joy
      expect(screen.getByText("😮")).toBeInTheDocument(); // Surprise
      expect(screen.getByText("😢")).toBeInTheDocument(); // Sadness
      expect(screen.getByText("😠")).toBeInTheDocument(); // Anger
      expect(screen.getByText("😰")).toBeInTheDocument(); // Fear
    });

    it("displays percentages correctly", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);

      expect(screen.getByText("30%")).toBeInTheDocument(); // Neutral
      expect(screen.getByText("25%")).toBeInTheDocument(); // Joy
      expect(screen.getByText("15%")).toBeInTheDocument(); // Surprise
      expect(screen.getByText("12%")).toBeInTheDocument(); // Sadness
      expect(screen.getByText("10%")).toBeInTheDocument(); // Anger
      expect(screen.getByText("8%")).toBeInTheDocument(); // Fear
    });

    it("displays total posts in summary", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);
      expect(screen.getByText("Based on 100 analyzed posts")).toBeInTheDocument();
    });

    it("formats large totals with locale string", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={12345} />);
      expect(screen.getByText("Based on 12,345 analyzed posts")).toBeInTheDocument();
    });
  });

  describe("InfoIcon Tooltip", () => {
    it("renders info icon", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);
      const infoButton = screen.getByRole("button", { name: "More information" });
      expect(infoButton).toBeInTheDocument();
    });

    it("shows tooltip on hover", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);

      const infoButton = screen.getByRole("button", { name: "More information" });
      fireEvent.mouseEnter(infoButton);

      expect(
        screen.getByText(/Derived from AI sentiment classification/)
      ).toBeInTheDocument();
    });

    it("hides tooltip on mouse leave", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);

      const infoButton = screen.getByRole("button", { name: "More information" });
      fireEvent.mouseEnter(infoButton);
      fireEvent.mouseLeave(infoButton);

      expect(
        screen.queryByText(/Derived from AI sentiment classification/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Percentage Calculation", () => {
    it("calculates percentages correctly", () => {
      const emotions: EmotionsData = {
        neutral: 50,
        joy: 25,
        surprise: 10,
        sadness: 8,
        anger: 5,
        fear: 2,
      };

      render(<EmotionsBreakdown emotions={emotions} total={100} />);

      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("25%")).toBeInTheDocument();
    });

    it("handles zero total gracefully", () => {
      const emotions: EmotionsData = {
        neutral: 0,
        joy: 0,
        surprise: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
      };

      render(<EmotionsBreakdown emotions={emotions} total={0} />);

      // All should show 0%
      const zeroPercents = screen.getAllByText("0%");
      expect(zeroPercents.length).toBe(6);
    });

    it("rounds percentages to whole numbers", () => {
      const emotions: EmotionsData = {
        neutral: 33,
        joy: 33,
        surprise: 0,
        sadness: 0,
        anger: 0,
        fear: 34,
      };

      render(<EmotionsBreakdown emotions={emotions} total={100} />);

      // All three should round to 33% or 34%
      expect(screen.getAllByText("33%").length).toBe(2);
      expect(screen.getByText("34%")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("sorts emotions by value descending", () => {
      const emotions: EmotionsData = {
        neutral: 10,
        joy: 50,
        surprise: 5,
        sadness: 15,
        anger: 3,
        fear: 17,
      };

      render(<EmotionsBreakdown emotions={emotions} total={100} />);

      // Get all emotion labels
      const labels = screen.getAllByText(/Joy|Neutral|Surprise|Sadness|Anger|Fear/);

      // Joy should be first (highest value)
      expect(labels[0].textContent).toBe("Joy");
    });
  });

  describe("Container Styling", () => {
    it("has overflow-visible class for tooltip positioning", () => {
      render(<EmotionsBreakdown emotions={mockEmotions} total={100} />);

      const container = screen.getByTestId("emotions-breakdown");
      expect(container).toHaveClass("overflow-visible");
    });
  });
});

describe("convertSentimentToEmotions", () => {
  it("converts positive sentiment to joy (70%) and surprise (30%)", () => {
    const sentiment = { positive: 100, neutral: 0, negative: 0 };
    const result = convertSentimentToEmotions(sentiment);

    expect(result.joy).toBe(70);
    expect(result.surprise).toBe(30);
  });

  it("converts negative sentiment to anger (40%), sadness (40%), fear (20%)", () => {
    const sentiment = { positive: 0, neutral: 0, negative: 100 };
    const result = convertSentimentToEmotions(sentiment);

    expect(result.anger).toBe(40);
    expect(result.sadness).toBe(40);
    expect(result.fear).toBe(20);
  });

  it("keeps neutral sentiment unchanged", () => {
    const sentiment = { positive: 0, neutral: 100, negative: 0 };
    const result = convertSentimentToEmotions(sentiment);

    expect(result.neutral).toBe(100);
    expect(result.joy).toBe(0);
    expect(result.anger).toBe(0);
  });

  it("handles mixed sentiment correctly", () => {
    const sentiment = { positive: 50, neutral: 30, negative: 20 };
    const result = convertSentimentToEmotions(sentiment);

    // Positive: 50 → Joy: 35, Surprise: 15
    expect(result.joy).toBe(35);
    expect(result.surprise).toBe(15);

    // Neutral: 30
    expect(result.neutral).toBe(30);

    // Negative: 20 → Anger: 8, Sadness: 8, Fear: 4
    expect(result.anger).toBe(8);
    expect(result.sadness).toBe(8);
    expect(result.fear).toBe(4);
  });

  it("handles zero values", () => {
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    const result = convertSentimentToEmotions(sentiment);

    expect(result.neutral).toBe(0);
    expect(result.joy).toBe(0);
    expect(result.surprise).toBe(0);
    expect(result.sadness).toBe(0);
    expect(result.anger).toBe(0);
    expect(result.fear).toBe(0);
  });

  it("returns EmotionsData type with all required fields", () => {
    const sentiment = { positive: 33, neutral: 34, negative: 33 };
    const result = convertSentimentToEmotions(sentiment);

    expect(result).toHaveProperty("neutral");
    expect(result).toHaveProperty("joy");
    expect(result).toHaveProperty("surprise");
    expect(result).toHaveProperty("sadness");
    expect(result).toHaveProperty("anger");
    expect(result).toHaveProperty("fear");
  });

  it("ensures emotions sum equals original total", () => {
    const sentiment = { positive: 40, neutral: 35, negative: 25 };
    const originalTotal = sentiment.positive + sentiment.neutral + sentiment.negative;

    const result = convertSentimentToEmotions(sentiment);
    const resultTotal =
      result.neutral +
      result.joy +
      result.surprise +
      result.sadness +
      result.anger +
      result.fear;

    expect(resultTotal).toBe(originalTotal);
  });

  it("handles rounding correctly for odd numbers", () => {
    const sentiment = { positive: 7, neutral: 0, negative: 3 };
    const result = convertSentimentToEmotions(sentiment);

    // Positive 7: Joy = round(7 * 0.7) = 5, Surprise = 7 - 5 = 2
    expect(result.joy).toBe(5);
    expect(result.surprise).toBe(2);

    // Negative 3: Anger = round(3 * 0.4) = 1, Sadness = round(3 * 0.4) = 1, Fear = 3 - 1 - 1 = 1
    expect(result.anger).toBe(1);
    expect(result.sadness).toBe(1);
    expect(result.fear).toBe(1);
  });
});
