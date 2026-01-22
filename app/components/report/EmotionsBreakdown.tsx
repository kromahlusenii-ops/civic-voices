"use client";

import { useState } from "react";

export interface EmotionsData {
  neutral: number;
  joy: number;
  surprise: number;
  sadness: number;
  anger: number;
  fear: number;
}

interface EmotionsBreakdownProps {
  emotions: EmotionsData;
  total: number;
}

// Info icon component
function InfoIcon({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block z-30">
      <button
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="More information"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeWidth="2" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal max-w-[200px] sm:max-w-xs">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

const EMOTION_CONFIG = [
  {
    key: "neutral" as const,
    label: "Neutral",
    icon: "\uD83D\uDE10",
    color: "bg-gray-500",
    lightColor: "bg-gray-100",
  },
  {
    key: "joy" as const,
    label: "Joy",
    icon: "\uD83D\uDE0A",
    color: "bg-green-500",
    lightColor: "bg-green-100",
  },
  {
    key: "surprise" as const,
    label: "Surprise",
    icon: "\uD83D\uDE2E",
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
  },
  {
    key: "sadness" as const,
    label: "Sadness",
    icon: "\uD83D\uDE22",
    color: "bg-indigo-500",
    lightColor: "bg-indigo-100",
  },
  {
    key: "anger" as const,
    label: "Anger",
    icon: "\uD83D\uDE20",
    color: "bg-red-500",
    lightColor: "bg-red-100",
  },
  {
    key: "fear" as const,
    label: "Fear",
    icon: "\uD83D\uDE30",
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
  },
];

export default function EmotionsBreakdown({
  emotions,
  total,
}: EmotionsBreakdownProps) {
  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Sort emotions by percentage (highest first) for better visualization
  const sortedEmotions = [...EMOTION_CONFIG].sort((a, b) => {
    return emotions[b.key] - emotions[a.key];
  });

  // Find the max value for scaling
  const maxPercentage = Math.max(
    ...EMOTION_CONFIG.map((e) => getPercentage(emotions[e.key]))
  );

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-visible"
      data-testid="emotions-breakdown"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-gray-800">
            Emotions breakdown
          </h3>
          <InfoIcon tooltip="Derived from AI sentiment classification: Positive → Joy (70%) + Surprise (30%). Negative → Anger (40%) + Sadness (40%) + Fear (20%). Neutral posts stay neutral." />
        </div>
      </div>

      {/* Emotion bars */}
      <div className="space-y-3 w-full min-w-0">
        {sortedEmotions.map((emotion) => {
          const value = emotions[emotion.key];
          const percentage = getPercentage(value);
          // Scale bar width relative to max value for better visualization
          const barWidth = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;

          return (
            <div key={emotion.key} className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
              {/* Emoji icon */}
              <span className="text-base sm:text-lg w-5 sm:w-6 text-center flex-shrink-0">
                {emotion.icon}
              </span>

              {/* Label - narrower on mobile */}
              <span className="text-xs sm:text-sm text-gray-700 w-16 sm:w-20 flex-shrink-0 truncate">
                {emotion.label}
              </span>

              {/* Progress bar container */}
              <div className="flex-1 min-w-0 h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${emotion.color} rounded-full transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Percentage */}
              <span className="text-xs sm:text-sm font-medium text-gray-900 w-10 sm:w-12 text-right flex-shrink-0">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Based on {total.toLocaleString()} analyzed posts
        </p>
      </div>
    </div>
  );
}

// Helper function to convert 3-sentiment to 6-emotion (for backward compatibility)
export function convertSentimentToEmotions(sentiment: {
  positive: number;
  neutral: number;
  negative: number;
}): EmotionsData {
  // Distribute positive into joy (70%) and surprise (30%)
  const joy = Math.round(sentiment.positive * 0.7);
  const surprise = sentiment.positive - joy;

  // Distribute negative into anger (40%), sadness (40%), and fear (20%)
  const anger = Math.round(sentiment.negative * 0.4);
  const sadness = Math.round(sentiment.negative * 0.4);
  const fear = sentiment.negative - anger - sadness;

  return {
    neutral: sentiment.neutral,
    joy,
    surprise,
    sadness,
    anger,
    fear,
  };
}
