"use client";

import { useState } from "react";
import Image from "next/image";
import type { Post, TopicAnalysis } from "@/lib/types/api";

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
  postsOverview?: string;      // AI summary about posts
  commentsOverview?: string;   // AI summary about comments
  posts?: Post[];              // Related posts for Mentions section
}

interface TopicsTableProps {
  topics: TopicData[];
  initialLimit?: number;
  onViewMore?: () => void;
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

// Platform icons for topic mention cards
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  x: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  tiktok: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  reddit: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249z" />
    </svg>
  ),
  youtube: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  bluesky: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </svg>
  ),
  instagram: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
};

// Platform colors
const PLATFORM_COLORS: Record<string, string> = {
  x: "bg-black",
  tiktok: "bg-black",
  reddit: "bg-orange-500",
  youtube: "bg-red-600",
  bluesky: "bg-blue-500",
  instagram: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500",
};

// Format time ago for compact display
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return "now";
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// Compact post card for Mentions section
function TopicMentionCard({ post }: { post: Post }) {
  const platformColor = PLATFORM_COLORS[post.platform] || "bg-gray-500";

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
    >
      {/* Thumbnail */}
      {post.thumbnail && (
        <div className="relative w-24 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
          <Image
            src={post.thumbnail}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
          <div className={`absolute top-1 left-1 ${platformColor} text-white p-1 rounded`}>
            {PLATFORM_ICONS[post.platform]}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1">
          {post.authorAvatar ? (
            <Image
              src={post.authorAvatar}
              alt={post.author}
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-[10px] text-gray-500 font-medium">
                {post.author.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xs font-medium text-gray-900 truncate">
            {post.author}
          </span>
          {!post.thumbnail && (
            <span className={`${platformColor} text-white p-0.5 rounded`}>
              {PLATFORM_ICONS[post.platform]}
            </span>
          )}
          <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
        </div>

        {/* Text */}
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{post.text}</p>

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {formatNumber(post.engagement.views || 0)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {formatNumber(post.engagement.likes)}
          </span>
        </div>
      </div>
    </a>
  );
}

// Render text with **bold** markers
function renderHighlightedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-gray-900">
          {boldText}
        </strong>
      );
    }
    return part;
  });
}

export default function TopicsTable({
  topics,
  initialLimit = 5,
  onViewMore,
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
              <th className="text-left px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="flex items-center">
                  Topic
                  <InfoIcon tooltip="Key themes identified by AI from the content" />
                </span>
              </th>
              {/* Hide views on mobile */}
              <th
                className="hidden sm:table-cell text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("views")}
              >
                <span className="flex items-center justify-end">
                  Views
                  <InfoIcon tooltip="Total views from posts related to this topic" />
                  <SortIndicator field="views" />
                </span>
              </th>
              {/* Hide likes on mobile */}
              <th
                className="hidden sm:table-cell text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("likes")}
              >
                <span className="flex items-center justify-end">
                  Likes
                  <InfoIcon tooltip="Total likes from posts related to this topic" />
                  <SortIndicator field="likes" />
                </span>
              </th>
              <th className="text-center px-2 sm:px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="flex items-center justify-center">
                  Resonance
                  <InfoIcon tooltip="How well this topic performed vs average. High = 1.5x+ avg engagement, Medium = 0.75x-1.5x, Low = below 0.75x" />
                </span>
              </th>
              <th className="text-center px-2 sm:px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24 sm:w-32">
                <span className="flex items-center justify-center">
                  Sentiment
                  <InfoIcon tooltip="Positive vs negative sentiment ratio from AI-classified posts about this topic" />
                </span>
              </th>
              {/* Hide date on mobile */}
              <th
                className="hidden sm:table-cell text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("date")}
              >
                <span className="flex items-center justify-end">
                  Latest
                  <InfoIcon tooltip="Most recent post date for this topic" />
                  <SortIndicator field="date" />
                </span>
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
                  <td className="px-3 sm:px-5 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg">{topic.icon}</span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                        {topic.name}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
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
                  {/* Hidden on mobile */}
                  <td className="hidden sm:table-cell px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {formatNumber(topic.views)}
                    </span>
                  </td>
                  {/* Hidden on mobile */}
                  <td className="hidden sm:table-cell px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {formatNumber(topic.likes)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center">
                    <ResonanceBadge level={topic.resonance} />
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <SentimentBar
                      positive={topic.sentimentPositive}
                      negative={topic.sentimentNegative}
                    />
                  </td>
                  {/* Hidden on mobile */}
                  <td className="hidden sm:table-cell px-5 py-3 text-right">
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(topic.date)}
                    </span>
                  </td>
                </tr>
                {/* Expanded details row */}
                {expandedId === topic.id && (
                  <tr key={`${topic.id}-details`} className="bg-gray-50/30">
                    <td colSpan={6} className="px-3 sm:px-5 py-4 sm:py-5">
                      <div className="space-y-4 sm:space-y-5 animate-accordion-open">
                        {/* Posts overview and Comments overview - two columns on desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {/* Posts overview */}
                          {topic.postsOverview && (
                            <div
                              className="bg-white rounded-lg border border-gray-100 p-4 animate-parallax-item"
                              style={{ animationDelay: "0ms" }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <span className="text-xs font-medium text-gray-700">Posts overview</span>
                                <InfoIcon tooltip="Key trends and highlights from posts about this topic" />
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {renderHighlightedText(topic.postsOverview)}
                              </p>
                            </div>
                          )}

                          {/* Comments overview */}
                          {topic.commentsOverview && (
                            <div
                              className="bg-white rounded-lg border border-gray-100 p-4 animate-parallax-item"
                              style={{ animationDelay: "75ms" }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                <span className="text-xs font-medium text-gray-700">Comments overview</span>
                                <InfoIcon tooltip="How audiences are engaging and reacting in comments" />
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {renderHighlightedText(topic.commentsOverview)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Mentions section */}
                        {topic.posts && topic.posts.length > 0 && (
                          <div
                            className="animate-parallax-item"
                            style={{ animationDelay: "150ms" }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-gray-700">Mentions</span>
                              {onViewMore && (
                                <button
                                  onClick={onViewMore}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  View more
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {topic.posts.slice(0, 4).map((post, idx) => (
                                <div
                                  key={post.id}
                                  className="animate-parallax-item"
                                  style={{ animationDelay: `${200 + idx * 50}ms` }}
                                >
                                  <TopicMentionCard post={post} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
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

// Helper function to calculate resonance based on engagement rate
function calculateResonance(
  totalEngagement: number,
  postCount: number,
  allPostsAvgEngagement: number
): "Low" | "Medium" | "High" {
  if (postCount === 0) return "Low";
  const avgEngagement = totalEngagement / postCount;

  // Compare to overall average engagement
  if (avgEngagement >= allPostsAvgEngagement * 1.5) return "High";
  if (avgEngagement >= allPostsAvgEngagement * 0.75) return "Medium";
  return "Low";
}

// Helper function to generate topic data from themes and posts
export function generateTopicsFromThemes(
  themes: string[],
  _totalViews: number,
  _totalLikes: number,
  topicAnalysis?: TopicAnalysis[],
  posts?: Post[]
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

  // Create a map of posts by ID for quick lookup
  const postsMap = new Map(posts?.map(p => [p.id, p]) || []);

  // Create a map of topic analysis by topic name (case-insensitive)
  const analysisMap = new Map(
    topicAnalysis?.map(ta => [ta.topic.toLowerCase(), ta]) || []
  );

  // Calculate overall average engagement for resonance comparison
  const allPostsTotalEngagement = posts?.reduce((sum, p) =>
    sum + (p.engagement.likes || 0) + (p.engagement.comments || 0) + (p.engagement.shares || 0), 0
  ) || 0;
  const allPostsAvgEngagement = posts && posts.length > 0
    ? allPostsTotalEngagement / posts.length
    : 0;

  return themes.map((theme, index) => {
    const icon =
      themeIcons[theme.toLowerCase()] ||
      themeIcons.default;

    // Get topic analysis for this theme
    const analysis = analysisMap.get(theme.toLowerCase());

    // Get posts for this topic from the analysis
    let topicPosts: Post[] = [];
    if (analysis?.postIds && postsMap.size > 0) {
      topicPosts = analysis.postIds
        .map(id => postsMap.get(id))
        .filter((p): p is Post => p !== undefined);
    }

    // Fallback: if no posts from analysis, try text matching
    if (topicPosts.length === 0 && posts && posts.length > 0) {
      const themeLower = theme.toLowerCase();
      const themeWords = themeLower.split(/\s+/);

      topicPosts = posts.filter(post => {
        const textLower = post.text.toLowerCase();
        // Match if any word from theme appears in post
        return themeWords.some(word => word.length > 3 && textLower.includes(word));
      });

      // If still no matches, use a subset based on index
      if (topicPosts.length === 0) {
        const startIndex = (index * 4) % posts.length;
        topicPosts = posts.slice(startIndex, startIndex + 4);
        if (topicPosts.length < 4) {
          topicPosts = [...topicPosts, ...posts.slice(0, 4 - topicPosts.length)];
        }
      }
    }

    // Calculate real metrics from topic posts
    let totalViews = 0;
    let totalLikes = 0;
    let totalEngagement = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let mostRecentDate = new Date(0);

    topicPosts.forEach(post => {
      totalViews += post.engagement.views || 0;
      totalLikes += post.engagement.likes || 0;
      totalEngagement += (post.engagement.likes || 0) +
                         (post.engagement.comments || 0) +
                         (post.engagement.shares || 0);

      // Count sentiment from post data
      const sentiment = (post as Post & { sentiment?: string }).sentiment;
      if (sentiment === "positive") positiveCount++;
      else if (sentiment === "negative") negativeCount++;
      else neutralCount++;

      // Track most recent post
      const postDate = new Date(post.createdAt);
      if (postDate > mostRecentDate) {
        mostRecentDate = postDate;
      }
    });

    // Calculate sentiment percentages (include neutral as partial positive/negative)
    const totalSentiment = positiveCount + negativeCount + neutralCount;
    let sentimentPositive = 50;
    let sentimentNegative = 50;

    if (totalSentiment > 0) {
      // Neutral posts split 50/50 between positive and negative for visualization
      const neutralHalf = neutralCount / 2;
      sentimentPositive = Math.round(((positiveCount + neutralHalf) / totalSentiment) * 100);
      sentimentNegative = 100 - sentimentPositive;
    }

    // Calculate resonance based on engagement
    const resonance = calculateResonance(totalEngagement, topicPosts.length, allPostsAvgEngagement);

    // Use most recent post date, or current date if no posts
    const date = mostRecentDate.getTime() > 0 ? mostRecentDate : new Date();

    return {
      id: `topic-${index}`,
      name: theme,
      icon,
      views: totalViews,
      likes: totalLikes,
      resonance,
      sentimentPositive,
      sentimentNegative,
      date,
      postsOverview: analysis?.postsOverview,
      commentsOverview: analysis?.commentsOverview,
      posts: topicPosts.slice(0, 4), // Limit to 4 for display
    };
  });
}
