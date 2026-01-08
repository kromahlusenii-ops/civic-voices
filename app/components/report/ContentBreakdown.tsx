"use client";

import { useState } from "react";

export interface CategoryData {
  name: string;
  percentage: number;
  engagementRate: number;
  color: string;
}

type TabType = "intentions" | "category" | "format";

interface ContentBreakdownProps {
  categories: CategoryData[];
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

// Engagement rate indicator
function EngagementIndicator({ rate }: { rate: number }) {
  // Color based on engagement rate
  const getColor = () => {
    if (rate >= 5) return "text-green-600 bg-green-100";
    if (rate >= 2) return "text-amber-600 bg-amber-100";
    return "text-gray-600 bg-gray-100";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getColor()}`}
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
  );
}

export default function ContentBreakdown({
  categories,
  activeTab = "category",
  onTabChange,
}: ContentBreakdownProps) {
  const [currentTab, setCurrentTab] = useState<TabType>(activeTab);

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  // Ensure categories have colors
  const categoriesWithColors = categories.map((cat, index) => ({
    ...cat,
    color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  // Calculate total for bar segments
  const total = categoriesWithColors.reduce(
    (sum, cat) => sum + cat.percentage,
    0
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: "intentions", label: "Intentions" },
    { key: "category", label: "Category" },
    { key: "format", label: "Format" },
  ];

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
      data-testid="content-breakdown"
    >
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-gray-800">
            Content breakdown
          </h3>
          <InfoIcon tooltip="Distribution of content by type and category" />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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
      <div className="h-3 rounded-full overflow-hidden flex mb-5">
        {categoriesWithColors.map((category, index) => (
          <div
            key={index}
            className="h-full transition-all duration-300"
            style={{
              width: `${(category.percentage / total) * 100}%`,
              backgroundColor: category.color,
            }}
            title={`${category.name}: ${category.percentage}%`}
          />
        ))}
      </div>

      {/* Category cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {categoriesWithColors.slice(0, 4).map((category, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm text-gray-700 truncate">
                {category.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">
                {category.percentage}%
              </span>
              <EngagementIndicator rate={category.engagementRate} />
            </div>
          </div>
        ))}
      </div>

      {/* Show more if more than 4 categories */}
      {categoriesWithColors.length > 4 && (
        <button className="mt-3 w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium">
          +{categoriesWithColors.length - 4} more categories
        </button>
      )}
    </div>
  );
}

// Helper function to generate mock category data from themes
export function generateCategoryData(themes: string[]): CategoryData[] {
  const total = themes.length;
  const basePercentage = Math.floor(100 / total);
  let remaining = 100 - basePercentage * total;

  return themes.map((theme, index) => {
    const bonus = remaining > 0 ? 1 : 0;
    remaining -= bonus;

    return {
      name: theme,
      percentage: basePercentage + bonus + Math.floor(Math.random() * 10) - 5,
      engagementRate: Math.round((Math.random() * 5 + 0.5) * 10) / 10,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
  });
}
