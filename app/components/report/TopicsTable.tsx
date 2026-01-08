"use client";

import { useState } from "react";

export interface TopicData {
  id: string;
  name: string;
  icon: string;
  views: number;
  likes: number;
  resonance: "Low" | "Medium" | "High";
  sentimentPositive: number;
  sentimentNegative: number;
  date: Date;
  details?: string;
}

interface TopicsTableProps {
  topics: TopicData[];
  initialLimit?: number;
}

// Format number with K/M suffix
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Resonance badge component
function ResonanceBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  const config = {
    Low: {
      bg: "bg-gray-100",
      text: "text-gray-600",
    },
    Medium: {
      bg: "bg-amber-100",
      text: "text-amber-700",
    },
    High: {
      bg: "bg-green-100",
      text: "text-green-700",
    },
  };

  const { bg, text } = config[level];

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      {level}
    </span>
  );
}

// Sentiment bar component
function SentimentBar({
  positive,
  negative,
}: {
  positive: number;
  negative: number;
}) {
  const total = positive + negative;
  const positivePercent = total > 0 ? (positive / total) * 100 : 50;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${positivePercent}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${100 - positivePercent}%` }}
        />
      </div>
    </div>
  );
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

export default function TopicsTable({
  topics,
  initialLimit = 5,
}: TopicsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState<keyof TopicData>("views");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sort topics
  const sortedTopics = [...topics].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === "desc"
        ? bValue.getTime() - aValue.getTime()
        : aValue.getTime() - bValue.getTime();
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    }

    return 0;
  });

  // Limit display
  const displayTopics = showAll
    ? sortedTopics
    : sortedTopics.slice(0, initialLimit);

  const handleSort = (field: keyof TopicData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: keyof TopicData }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === "desc" ? "\u25BC" : "\u25B2"}
      </span>
    );
  };

  if (topics.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Topics</h3>
        <p className="text-sm text-gray-500 text-center py-8">
          No topics data available
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      data-testid="topics-table"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-gray-800">Topics</h3>
          <InfoIcon tooltip="Key topics identified from the content analysis" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Topic
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("views")}
              >
                Est. views
                <SortIndicator field="views" />
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("likes")}
              >
                Est. likes
                <SortIndicator field="likes" />
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resonance
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Sentiment
              </th>
              <th
                className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("date")}
              >
                Date
                <SortIndicator field="date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayTopics.map((topic) => (
              <>
                <tr
                  key={topic.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(topic.id)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{topic.icon}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {topic.name}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedId === topic.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {formatNumber(topic.views)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {formatNumber(topic.likes)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ResonanceBadge level={topic.resonance} />
                  </td>
                  <td className="px-4 py-3">
                    <SentimentBar
                      positive={topic.sentimentPositive}
                      negative={topic.sentimentNegative}
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(topic.date)}
                    </span>
                  </td>
                </tr>
                {/* Expanded details row */}
                {expandedId === topic.id && topic.details && (
                  <tr key={`${topic.id}-details`} className="bg-gray-50/50">
                    <td colSpan={6} className="px-5 py-4">
                      <p className="text-sm text-gray-600 pl-9">
                        {topic.details}
                      </p>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more button */}
      {topics.length > initialLimit && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
          >
            {showAll ? "Show less" : `Show ${topics.length - initialLimit} more`}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to generate topic data from themes and posts
export function generateTopicsFromThemes(
  themes: string[],
  totalViews: number,
  totalLikes: number
): TopicData[] {
  const themeIcons: Record<string, string> = {
    policy: "\uD83D\uDCDC",
    environment: "\uD83C\uDF33",
    politics: "\uD83C\uDFDB\uFE0F",
    health: "\u2764\uFE0F",
    economy: "\uD83D\uDCB0",
    technology: "\uD83D\uDCBB",
    education: "\uD83D\uDCDA",
    social: "\uD83D\uDC65",
    climate: "\uD83C\uDF21\uFE0F",
    default: "\uD83D\uDCAC",
  };

  return themes.map((theme, index) => {
    const icon =
      themeIcons[theme.toLowerCase()] ||
      themeIcons.default;

    // Distribute views and likes among themes
    const viewShare = (Math.random() * 0.3 + 0.1) * totalViews;
    const likeShare = (Math.random() * 0.3 + 0.1) * totalLikes;

    // Random resonance
    const resonanceOptions: ("Low" | "Medium" | "High")[] = [
      "Low",
      "Medium",
      "High",
    ];
    const resonance =
      resonanceOptions[Math.floor(Math.random() * resonanceOptions.length)];

    // Random sentiment distribution
    const sentimentPositive = Math.floor(Math.random() * 80 + 10);
    const sentimentNegative = 100 - sentimentPositive;

    // Random date within last 24 hours
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);

    return {
      id: `topic-${index}`,
      name: theme,
      icon,
      views: Math.round(viewShare),
      likes: Math.round(likeShare),
      resonance,
      sentimentPositive,
      sentimentNegative,
      date,
      details: `Topic "${theme}" is trending with significant engagement. Key discussions focus on recent developments and their implications.`,
    };
  });
}
