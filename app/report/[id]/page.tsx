"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";
import FilterDropdown from "@/components/FilterDropdown";
import type { Post } from "@/lib/types/api";

const TIME_INTERVAL_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "last_week", label: "Last week" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_year", label: "Last year" },
];

const LANGUAGE_OPTIONS = [
  { id: "all", label: "All languages" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "pt", label: "Portuguese" },
  { id: "fr", label: "French" },
  { id: "ar", label: "Arabic" },
];

interface ReportData {
  query: string;
  sources: string[];
  timeFilter: string;
  languageFilter: string;
  posts: Post[];
  totalMentions: number;
  qualityBadge: "sweet_spot" | "too_narrow" | "trending" | null;
  dateRange: { start: string; end: string };
  aiAnalysis: {
    interpretation: string;
    clarifications: { label: string; suggestion: string }[];
    followUpQuestion: string;
  } | null;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  x: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  tiktok: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  reddit: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  ),
  youtube: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
};

const QUALITY_BADGE_STYLES = {
  sweet_spot: "bg-green-100 text-green-700",
  too_narrow: "bg-red-100 text-red-700",
  trending: "bg-blue-100 text-blue-700",
};

const QUALITY_BADGE_LABELS = {
  sweet_spot: "Sweet spot",
  too_narrow: "Too narrow",
  trending: "Trending",
};

// Mock data generator for demo
function generateMockReportData(query: string, sources: string[]): ReportData {
  const mockPosts: Post[] = [
    {
      id: "1",
      text: `Breaking: Major developments regarding "${query}". Local lawmakers are weighing in on the situation with varying perspectives.`,
      author: "Boston 25 News",
      authorHandle: "@boston25",
      createdAt: new Date().toISOString(),
      platform: "x",
      engagement: { likes: 1200, comments: 89, shares: 456, views: 45000 },
      url: "https://x.com/boston25/status/1",
    },
    {
      id: "2",
      text: `If the reports are accurate, this would mark a significant shift in policy. The implications could be far-reaching...`,
      author: "ABC News",
      authorHandle: "@ABCNews",
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      platform: "x",
      engagement: { likes: 3400, comments: 567, shares: 1200, views: 120000 },
      url: "https://x.com/ABCNews/status/2",
      thumbnail: "https://picsum.photos/seed/abc/640/360",
    },
    {
      id: "3",
      text: `Rep. Carbajal weighs in: "This decision was reckless and deeply destabilizing."`,
      author: "RepCarbajal",
      authorHandle: "@RepCarbajal",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      platform: "x",
      engagement: { likes: 144, comments: 23, shares: 67, views: 8900 },
      url: "https://x.com/RepCarbajal/status/3",
    },
    {
      id: "4",
      text: `U.S. Attorney General comments on the situation, mentioning potential charges and indictments.`,
      author: "ABC7NY",
      authorHandle: "@ABC7NY",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      platform: "tiktok",
      engagement: { likes: 8900, comments: 234, shares: 567, views: 234000 },
      url: "https://tiktok.com/@abc7ny/video/4",
      thumbnail: "https://picsum.photos/seed/tiktok1/360/640",
    },
    {
      id: "5",
      text: `Analysis: There is a striking parallel between this situation and historical events from the early 2000s...`,
      author: "Chellaney",
      authorHandle: "@Chellaney",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      platform: "x",
      engagement: { likes: 567, comments: 89, shares: 234, views: 34000 },
      url: "https://x.com/Chellaney/status/5",
    },
  ];

  return {
    query,
    sources,
    timeFilter: "3m",
    languageFilter: "en",
    posts: mockPosts.filter((p) => sources.includes(p.platform)),
    totalMentions: 167700,
    qualityBadge: "sweet_spot",
    dateRange: {
      start: "2025-10-05",
      end: "2026-01-03",
    },
    aiAnalysis: {
      interpretation: `Your question is quite broad and appears to ask for recent explanations or discussions around the idea of "${query}." To make the results more relevant, could you clarify if you're referring to:`,
      clarifications: [
        {
          label: "Rumors, misinformation, or discussion of hypothetical scenarios?",
          suggestion: `"${query}" AND (rumor OR speculation)`,
        },
        {
          label: "Actual diplomatic/military events or incidents?",
          suggestion: `${query} AND (incident OR escalation)`,
        },
        {
          label: "Social reactions, memes, or public sentiment?",
          suggestion: `${query} AND (meme OR reaction)`,
        },
      ],
      followUpQuestion:
        "Focusing on real incidents, trending debates, or even viral conspiracy theories each would steer us to distinct insights. Do you want to emphasize official news, social opinions, or speculation in user-generated content?",
    },
  };
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["x", "tiktok"]);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);

  // Parse URL params
  const queryFromUrl = searchParams.get("message") || searchParams.get("query") || "";
  const sourcesFromUrl = searchParams.getAll("sources");

  // Initialize time and language from URL or defaults
  const [timeRange, setTimeRange] = useState(() => {
    const urlTimeRange = searchParams.get("time_range");
    return urlTimeRange && TIME_INTERVAL_OPTIONS.some(o => o.id === urlTimeRange)
      ? urlTimeRange
      : "last_3_months";
  });
  const [language, setLanguage] = useState(() => {
    const urlLanguage = searchParams.get("language");
    return urlLanguage && LANGUAGE_OPTIONS.some(o => o.id === urlLanguage)
      ? urlLanguage
      : "all";
  });

  // Update URL params helper
  const updateUrlParams = useCallback((newParams: Record<string, string | string[]>) => {
    const url = new URL(window.location.href);

    Object.entries(newParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        url.searchParams.delete(key);
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, value);
      }
    });

    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
    updateUrlParams({ time_range: value });
    // Reload data with new filter
    if (reportData) {
      loadReportData();
    }
  }, [reportData, updateUrlParams]);

  // Handle language change
  const handleLanguageChange = useCallback((value: string) => {
    setLanguage(value);
    updateUrlParams({ language: value });
    // Reload data with new filter
    if (reportData) {
      loadReportData();
    }
  }, [reportData, updateUrlParams]);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Load report data function (not wrapped in useCallback to avoid dep issues)
  const loadReportData = () => {
    setIsLoading(true);

    // Get sources from URL or use defaults
    const sources = sourcesFromUrl.length > 0 ? sourcesFromUrl : selectedSources;

    // In real implementation, this would fetch from API
    // For now, generate mock data
    setTimeout(() => {
      const data = generateMockReportData(queryFromUrl, sources);
      setReportData(data);
      setSelectedSources(sources);
      setIsLoading(false);
    }, 1000);
  };

  // Handle auth check and initial data load
  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish

    if (!isAuthenticated) {
      setShowAuthModal(true);
      setIsLoading(false); // Stop loading if showing auth modal
    } else if (!hasLoadedRef.current) {
      // Only load once when authenticated
      hasLoadedRef.current = true;
      setShowAuthModal(false);
      loadReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Handle successful auth
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    hasLoadedRef.current = true;
    loadReportData();
  };

  // Handle follow-up search
  const handleFollowUpSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;

    // Update URL and reload data
    const newParams = new URLSearchParams();
    newParams.set("message", followUpQuery);
    selectedSources.forEach((s) => newParams.append("sources", s));

    router.push(`/report/${params.id}?${newParams.toString()}`);
    setFollowUpQuery("");
  };

  // Handle source change
  const handleSourceToggle = (source: string) => {
    const newSources = selectedSources.includes(source)
      ? selectedSources.filter((s) => s !== source)
      : [...selectedSources, source];

    if (newSources.length === 0) return; // Must have at least one source

    setSelectedSources(newSources);

    // Update URL
    const newParams = new URLSearchParams();
    newParams.set("message", queryFromUrl);
    newSources.forEach((s) => newParams.append("sources", s));
    router.push(`/report/${params.id}?${newParams.toString()}`);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  // Format date range
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} – ${endDate.toLocaleDateString("en-US", options)}`;
  };

  // Source filter button label
  const getSourceButtonLabel = () => {
    if (selectedSources.length === 0) return "Select sources";
    const first = selectedSources[0];
    const label = first === "x" ? "X" : first.charAt(0).toUpperCase() + first.slice(1);
    if (selectedSources.length === 1) return label;
    return `${label} +${selectedSources.length - 1}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Loading State */}
      {(authLoading || isLoading) && !showAuthModal && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 mx-auto"></div>
            <p className="text-gray-600">Thinking...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!authLoading && !isLoading && reportData && (
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left Panel - AI Analysis */}
          <div className="flex flex-col w-full lg:w-1/2 border-r border-gray-200 bg-white">
            {/* Left Header */}
            <div className="border-b border-gray-200 p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-medium text-gray-900 truncate max-w-[80%]" data-testid="report-query">
                  {reportData.query}
                </h1>
                <div className="relative">
                  <button
                    onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    data-testid="left-source-filter"
                  >
                    {SOURCE_ICONS[selectedSources[0]]}
                    <span>{getSourceButtonLabel()}</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {sourceDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                      {["x", "tiktok", "reddit", "youtube"].map((source) => (
                        <button
                          key={source}
                          onClick={() => handleSourceToggle(source)}
                          disabled={source === "reddit" || source === "youtube"}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                            source === "reddit" || source === "youtube" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <div className={`flex h-5 w-5 items-center justify-center rounded ${
                            selectedSources.includes(source) ? "bg-gray-900 text-white" : "border border-gray-300"
                          }`}>
                            {selectedSources.includes(source) && (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="flex items-center gap-2">
                            {SOURCE_ICONS[source]}
                            {source === "x" ? "X" : source.charAt(0).toUpperCase() + source.slice(1)}
                          </span>
                          {(source === "reddit" || source === "youtube") && (
                            <span className="ml-auto text-xs text-gray-400">Coming soon</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Analysis Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {reportData.aiAnalysis && (
                <div className="space-y-6">
                  {/* AI Icon */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed" data-testid="ai-interpretation">
                        {reportData.aiAnalysis.interpretation}
                      </p>
                    </div>
                  </div>

                  {/* Clarifications */}
                  <ul className="space-y-4 pl-11">
                    {reportData.aiAnalysis.clarifications.map((clarification, index) => (
                      <li key={index} className="space-y-1">
                        <p className="text-gray-800">
                          <span className="font-medium">{clarification.label}</span>
                          {" ( "}
                          <code className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-700">
                            {clarification.suggestion}
                          </code>
                          {" )"}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Follow-up Question */}
                  <div className="pl-11">
                    <p className="text-gray-700 leading-relaxed">
                      {reportData.aiAnalysis.followUpQuestion}
                    </p>
                  </div>

                  {/* Query Chip */}
                  <div className="pl-11">
                    <div className="inline-block rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                      {reportData.query}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up Input */}
            <div className="border-t border-gray-200 p-4 lg:p-6">
              <form onSubmit={handleFollowUpSearch} className="relative">
                <input
                  type="text"
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder="Search a topic or paste a URL"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  data-testid="follow-up-input"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:opacity-50"
                  disabled={!followUpQuery.trim()}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel - Posts Preview */}
          <div className="flex flex-col w-full lg:w-1/2 bg-gray-50">
            {/* Right Header */}
            <div className="border-b border-gray-200 bg-white p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Posts preview for query</h2>

              {/* Query Chip */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-800">
                  {reportData.query}
                </span>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {/* Sources */}
                <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                  {selectedSources.map((source) => (
                    <span key={source} className="flex items-center text-gray-600">
                      {SOURCE_ICONS[source]}
                    </span>
                  ))}
                  <span className="text-gray-600 ml-1">{getSourceButtonLabel()}</span>
                </div>

                {/* Time Interval Filter */}
                <FilterDropdown
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                  label="Time range"
                  options={TIME_INTERVAL_OPTIONS}
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  testId="report-time-range-filter"
                />

                {/* Language Filter */}
                <FilterDropdown
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  }
                  label="Language"
                  options={LANGUAGE_OPTIONS}
                  value={language}
                  onChange={handleLanguageChange}
                  testId="report-language-filter"
                />

                {/* Start Research Button */}
                <button className="ml-auto rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  Start research
                </button>
              </div>
            </div>

            {/* Statistics Row */}
            <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-gray-900">
                  {reportData.totalMentions.toLocaleString()} total mentions
                </span>
                {reportData.qualityBadge && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${QUALITY_BADGE_STYLES[reportData.qualityBadge]}`}>
                    {QUALITY_BADGE_LABELS[reportData.qualityBadge]}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatDateRange(reportData.dateRange.start, reportData.dateRange.end)}
              </p>
            </div>

            {/* Posts Feed */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="space-y-4">
                {reportData.posts.map((post) => (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-md hover:border-gray-300"
                    data-testid="post-card"
                  >
                    {/* Platform-specific rendering */}
                    {post.platform === "tiktok" ? (
                      /* TikTok Card */
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-pink-500">{SOURCE_ICONS.tiktok}</span>
                          <span className="font-medium text-gray-900">{post.author}</span>
                        </div>
                        {post.thumbnail && (
                          <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-100 aspect-video">
                            <img
                              src={post.thumbnail}
                              alt={post.text}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-black/60 p-3">
                                <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="text-gray-800 line-clamp-2">{post.text}</p>
                      </div>
                    ) : (
                      /* X (Twitter) Card */
                      <div>
                        <div className="flex items-start gap-3">
                          <span className="text-gray-900 mt-0.5">{SOURCE_ICONS.x}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{post.author}</span>
                              <span className="text-gray-500">{post.authorHandle}</span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500 text-sm">{formatRelativeTime(post.createdAt)}</span>
                            </div>
                            <p className="text-gray-800 mb-3">{post.text}</p>
                            {post.thumbnail && (
                              <div className="rounded-lg overflow-hidden mb-3">
                                <img
                                  src={post.thumbnail}
                                  alt={post.text}
                                  className="w-full object-cover max-h-64"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
