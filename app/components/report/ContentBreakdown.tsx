"use client";

import { useState } from "react";
import type { Post, IntentionData } from "@/lib/types/api";

export interface CategoryData {
  name: string;
  percentage: number;
  engagementRate: number;
  color: string;
}

export interface FormatData {
  name: string;
  percentage: number;
  engagementRate: number;
  color: string;
}

type TabType = "intentions" | "category" | "format";

interface ContentBreakdownProps {
  categories: CategoryData[];
  intentions?: IntentionData[];
  formats?: FormatData[];
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

// Default category colors
const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
];

// Intention-specific colors
const INTENTION_COLORS: Record<string, string> = {
  Inform: "#3b82f6",    // blue - knowledge
  Persuade: "#f97316",  // orange - action
  Entertain: "#ec4899", // pink - fun
  Express: "#a855f7",   // purple - emotion
};

// Format-specific colors
const FORMAT_COLORS: Record<string, string> = {
  Video: "#ef4444",         // red (YouTube)
  "Short-form Video": "#000000", // black (TikTok)
  Thread: "#1d9bf0",        // blue (X)
  "Text Post": "#64748b",   // gray
  Image: "#8b5cf6",         // violet
};

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

// Engagement rate indicator with tooltip
function EngagementIndicator({ rate }: { rate: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Color based on engagement rate
  const getColor = () => {
    if (rate >= 5) return "text-green-600 bg-green-100";
    if (rate >= 2) return "text-amber-600 bg-amber-100";
    return "text-gray-600 bg-gray-100";
  };

  return (
    <div className="relative inline-block">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${getColor()}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        ER {rate.toFixed(1)}%
      </span>
      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap">
          Engagement Rate: (likes + comments + shares) / impressions
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export default function ContentBreakdown({
  categories,
  intentions,
  formats,
  activeTab = "category",
  onTabChange,
}: ContentBreakdownProps) {
  const [currentTab, setCurrentTab] = useState<TabType>(activeTab);

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  // Determine which data to display based on current tab
  const getCurrentData = (): CategoryData[] => {
    switch (currentTab) {
      case "intentions":
        if (intentions && intentions.length > 0) {
          return intentions.map((item, index) => ({
            name: item.name,
            percentage: item.percentage,
            engagementRate: item.engagementRate,
            color: INTENTION_COLORS[item.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          }));
        }
        return categories;
      case "format":
        if (formats && formats.length > 0) {
          return formats;
        }
        return categories;
      case "category":
      default:
        return categories;
    }
  };

  const displayData = getCurrentData();

  // Ensure data has colors
  const dataWithColors = displayData.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  // Calculate total for bar segments
  const total = dataWithColors.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: "intentions", label: "Intentions" },
    { key: "category", label: "Category" },
    { key: "format", label: "Format" },
  ];

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-hidden"
      data-testid="content-breakdown"
    >
      {/* Header with tabs - stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-gray-800">
            Content breakdown
          </h3>
          <InfoIcon tooltip="Distribution of content by type and category" />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 self-start sm:self-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Segmented bar */}
      <div className="h-3 rounded-full overflow-hidden flex w-full min-w-0 mb-4 sm:mb-5">
        {dataWithColors.map((item, index) => (
          <div
            key={index}
            className="h-full transition-all duration-300"
            style={{
              width: `${(item.percentage / total) * 100}%`,
              backgroundColor: item.color,
            }}
            title={`${item.name}: ${item.percentage}%`}
          />
        ))}
      </div>

      {/* Data cards - stacked on mobile, 2x2 grid on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dataWithColors.slice(0, 4).map((item, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700 truncate">
                {item.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">
                  {item.percentage}%
                </span>
                <InfoIcon tooltip={`${item.percentage}% of posts matched this ${currentTab === "intentions" ? "intention" : currentTab === "format" ? "format" : "category"}`} />
              </div>
              <EngagementIndicator rate={item.engagementRate} />
            </div>
          </div>
        ))}
      </div>

      {/* Show more if more than 4 items */}
      {dataWithColors.length > 4 && (
        <button className="mt-3 w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium">
          +{dataWithColors.length - 4} more items
        </button>
      )}
    </div>
  );
}

// Helper function to generate category data from themes and posts
export function generateCategoryData(
  themes: string[],
  posts?: Post[],
  topicAnalysis?: { topic: string; postIds?: string[] }[]
): CategoryData[] {
  if (!posts || posts.length === 0) {
    // Fallback to even distribution if no posts
    const basePercentage = Math.floor(100 / themes.length);
    return themes.map((theme, index) => ({
      name: theme,
      percentage: basePercentage,
      engagementRate: 0,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }

  // Create a map of post IDs to posts for quick lookup
  const postsMap = new Map(posts.map(p => [p.id, p]));

  // Create a map of topic analysis by topic name (case-insensitive)
  const analysisMap = new Map(
    topicAnalysis?.map(ta => [ta.topic.toLowerCase(), ta]) || []
  );

  // Calculate metrics for each theme
  const themeMetrics = themes.map((theme, index) => {
    const themeLower = theme.toLowerCase();
    const analysis = analysisMap.get(themeLower);

    // Get posts for this theme
    let themePosts: Post[] = [];

    if (analysis?.postIds && analysis.postIds.length > 0) {
      // Use AI-identified post IDs
      themePosts = analysis.postIds
        .map(id => postsMap.get(id))
        .filter((p): p is Post => p !== undefined);
    }

    // Fallback: text matching if no AI analysis
    if (themePosts.length === 0) {
      const themeWords = themeLower.split(/\s+/);
      themePosts = posts.filter(post => {
        const textLower = post.text.toLowerCase();
        return themeWords.some(word => word.length > 3 && textLower.includes(word));
      });
    }

    // Calculate total engagement for this theme
    let totalEngagement = 0;
    let totalImpressions = 0;

    themePosts.forEach(post => {
      const engagement = (post.engagement.likes || 0) +
                         (post.engagement.comments || 0) +
                         (post.engagement.shares || 0);
      totalEngagement += engagement;
      // Use views as impressions, fallback to engagement * 10 estimate
      totalImpressions += post.engagement.views || engagement * 10;
    });

    // Calculate engagement rate (engagement / impressions * 100)
    const engagementRate = totalImpressions > 0
      ? Math.round((totalEngagement / totalImpressions) * 1000) / 10
      : 0;

    return {
      name: theme,
      postCount: themePosts.length,
      engagementRate,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
  });

  // Calculate percentages based on post counts
  const totalPostCount = themeMetrics.reduce((sum, m) => sum + m.postCount, 0);

  return themeMetrics.map(metric => ({
    name: metric.name,
    percentage: totalPostCount > 0
      ? Math.round((metric.postCount / totalPostCount) * 100)
      : Math.floor(100 / themes.length),
    engagementRate: metric.engagementRate,
    color: metric.color,
  }));
}

// Helper to determine content format from post data
function deriveFormatFromPost(post: Post): string {
  switch (post.platform) {
    case "youtube":
      return "Video";
    case "tiktok":
      return "Short-form Video";
    case "x":
      // Thread detection: if text > 280 chars, likely a thread
      return post.text.length > 280 ? "Thread" : "Text Post";
    case "reddit":
    case "bluesky":
    case "truthsocial":
      if (post.thumbnail) {
        return "Image";
      }
      return "Text Post";
    case "instagram":
      return post.thumbnail ? "Image" : "Text Post";
    default:
      return "Text Post";
  }
}

// Helper function to generate format breakdown from posts
export function generateFormatData(posts: Post[]): FormatData[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  const formatCounts: Record<string, { count: number; totalEngagement: number }> = {};

  posts.forEach((post) => {
    const format = deriveFormatFromPost(post);
    if (!formatCounts[format]) {
      formatCounts[format] = { count: 0, totalEngagement: 0 };
    }
    formatCounts[format].count += 1;
    formatCounts[format].totalEngagement +=
      post.engagement.likes + post.engagement.comments + post.engagement.shares;
  });

  const total = posts.length;

  return Object.entries(formatCounts)
    .map(([name, data]) => ({
      name,
      percentage: Math.round((data.count / total) * 100),
      engagementRate: Math.round((data.totalEngagement / data.count / 100) * 10) / 10,
      color: FORMAT_COLORS[name] || DEFAULT_COLORS[0],
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
