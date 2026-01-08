"use client";

import { useState } from "react";

interface MetricsRowProps {
  totalMentions: number;
  totalEngagement: number;
  avgEngagement: number;
  overallSentiment: "positive" | "neutral" | "negative" | "mixed";
  totalViews?: number;
  potentialReach?: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toLocaleString();
}

function formatPercentage(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

// Info icon component
function InfoIcon({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
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
        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

const SENTIMENT_CONFIG = {
  positive: {
    label: "Positive",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  negative: {
    label: "Negative",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  neutral: {
    label: "Neutral",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  mixed: {
    label: "Mixed",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
};

export default function MetricsRow({
  totalMentions,
  totalEngagement,
  avgEngagement,
  overallSentiment,
  totalViews,
  potentialReach,
}: MetricsRowProps) {
  const sentimentConfig = SENTIMENT_CONFIG[overallSentiment];

  // Calculate engagement rate (engagements / views * 100)
  const engagementRate = totalViews && totalViews > 0
    ? (totalEngagement / totalViews) * 100
    : avgEngagement > 0 ? (avgEngagement / 100) * 100 : 0;

  // Estimate views if not provided (based on engagement patterns)
  const estimatedViews = totalViews ?? totalEngagement * 15;

  // Estimate potential reach if not provided
  const estimatedReach = potentialReach ?? Math.round(estimatedViews * 2.5);

  const metrics = [
    {
      label: "Est. engagements",
      value: formatNumber(totalEngagement),
      tooltip: "Total likes, comments, shares, and other interactions",
    },
    {
      label: "Engagement rate",
      value: formatPercentage(engagementRate),
      tooltip: "Percentage of viewers who engaged with content",
    },
    {
      label: "Est. views",
      value: formatNumber(estimatedViews),
      tooltip: "Estimated total content views across platforms",
    },
    {
      label: "Potential reach",
      value: formatNumber(estimatedReach),
      tooltip: "Estimated unique users who could see this content",
    },
    {
      label: "Est. mentions",
      value: formatNumber(totalMentions),
      tooltip: "Total posts and mentions found",
      sentiment: overallSentiment,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-5 gap-3"
      data-testid="metrics-row"
    >
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow ${
            metric.sentiment ? sentimentConfig.bgColor : ""
          }`}
        >
          <div className="flex items-center mb-2">
            <p className="text-xs text-gray-500 font-medium">
              {metric.label}
            </p>
            <InfoIcon tooltip={metric.tooltip} />
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              metric.sentiment ? sentimentConfig.color : "text-gray-900"
            }`}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}
