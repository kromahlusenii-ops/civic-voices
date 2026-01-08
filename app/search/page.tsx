"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import SearchHistoryModal from "../components/SearchHistoryModal";
import SearchHistorySidebar from "../components/SearchHistorySidebar";
import { SkeletonCardList } from "../components/SkeletonCard";
import QuerySuggestions from "../components/QuerySuggestions";
import SourceFilter from "../../components/SourceFilter";
import FilterDropdown from "../../components/FilterDropdown";
import type { Post, SearchResponse, AIAnalysis } from "@/lib/types/api";
import { supabase } from "@/lib/supabase";
import {
  formatMentions,
  calculateTotalMentions,
  getMentionsBadge,
  MENTIONS_BADGE_STYLES,
  MENTIONS_BADGE_LABELS,
} from "@/lib/utils/mentions";

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

// Map URL time_range values to API timeFilter values
const TIME_RANGE_TO_API: Record<string, string> = {
  today: "1d",
  last_week: "7d",
  last_3_months: "3m",
  last_year: "12m",
};

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
  instagram: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
};

interface SearchResults {
  query: string;
  posts: Post[];
  totalMentions: number;
  qualityBadge: string | null;
  dateRange: { start: string; end: string };
  aiAnalysis: AIAnalysis | null;
  keyThemes: string[];
  searchId?: string; // ID of saved search for report generation
  warnings?: string[]; // Non-fatal warnings (e.g., time range clamped)
}

function SearchPageContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("message") || "");
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    const sources = searchParams.getAll("sources");
    return sources.length > 0 ? sources : ["tiktok"];
  });
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSearchHistoryModal, setShowSearchHistoryModal] = useState(false);
  const [showSearchHistorySidebar, setShowSearchHistorySidebar] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const postsContainerRef = useRef<HTMLDivElement>(null);

  // Update URL when filters change
  const updateUrlParams = useCallback((params: {
    message?: string;
    sources?: string[];
    time_range?: string;
    language?: string;
  }) => {
    const url = new URL(window.location.href);

    if (params.message !== undefined) {
      if (params.message) {
        url.searchParams.set("message", params.message);
      } else {
        url.searchParams.delete("message");
      }
    }

    if (params.sources !== undefined) {
      url.searchParams.delete("sources");
      params.sources.forEach(source => {
        url.searchParams.append("sources", source);
      });
    }

    if (params.time_range !== undefined) {
      url.searchParams.set("time_range", params.time_range);
    }

    if (params.language !== undefined) {
      url.searchParams.set("language", params.language);
    }

    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Check if user came from "Log In" button
  useEffect(() => {
    if (searchParams.get("auth") === "true" && !isAuthenticated && !loading) {
      setShowAuthModal(true);
    }
  }, [searchParams, isAuthenticated, loading]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
    updateUrlParams({ time_range: value });
    // If there are existing results, re-run the search
    if (searchResults && searchQuery.trim()) {
      executeSearchWithFilters(searchQuery, selectedSources, value, language);
    }
  }, [searchResults, searchQuery, selectedSources, language, updateUrlParams]);

  // Handle language change
  const handleLanguageChange = useCallback((value: string) => {
    setLanguage(value);
    updateUrlParams({ language: value });
    // If there are existing results, re-run the search
    if (searchResults && searchQuery.trim()) {
      executeSearchWithFilters(searchQuery, selectedSources, timeRange, value);
    }
  }, [searchResults, searchQuery, selectedSources, timeRange, updateUrlParams]);

  const executeSearchWithFilters = async (
    query: string,
    sources: string[],
    currentTimeRange: string,
    currentLanguage: string
  ) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      // Convert URL time_range to API timeFilter
      const apiTimeFilter = TIME_RANGE_TO_API[currentTimeRange] || "3m";

      // Call the real search API
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          sources,
          timeFilter: apiTimeFilter,
          language: currentLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed: ${response.status}`);
      }

      const apiResponse: SearchResponse = await response.json();

      // Calculate total mentions from aggregated engagement (likes + comments + shares + views)
      const totalMentions = calculateTotalMentions(apiResponse.posts);

      // Transform API response to SearchResults format
      const results: SearchResults = {
        query,
        posts: apiResponse.posts,
        totalMentions,
        qualityBadge: getMentionsBadge(totalMentions),
        dateRange: {
          start: apiResponse.summary.timeRange.start.split("T")[0],
          end: apiResponse.summary.timeRange.end.split("T")[0],
        },
        aiAnalysis: apiResponse.aiAnalysis || null,
        keyThemes: apiResponse.aiAnalysis?.keyThemes || [],
        warnings: apiResponse.warnings,
      };

      setSearchResults(results);

      // Auto-save search to database if authenticated
      if (isAuthenticated && user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error("No active session");
          }
          const saveResponse = await fetch("/api/search/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              queryText: query,
              sources,
              filters: { timeFilter: currentTimeRange, language: currentLanguage },
              totalResults: apiResponse.summary.totalPosts,
              posts: apiResponse.posts.map((post) => ({
                id: post.id,
                text: post.text,
                author: post.author,
                platform: post.platform,
                url: post.url,
                createdAt: post.createdAt,
                engagement: post.engagement,
              })),
            }),
          });

          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            // Update results with the saved searchId
            setSearchResults((prev) => prev ? { ...prev, searchId: saveData.searchId } : null);
          }
        } catch (saveError) {
          console.error("Failed to save search:", saveError);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSearching(false);
      setPendingSearch(false);
    }
  };

  const executeSearch = async (query: string) => {
    await executeSearchWithFilters(query, selectedSources, timeRange, language);
  };

  const handleStartResearch = () => {
    if (!searchQuery.trim()) return;

    // Update URL with current search state
    updateUrlParams({
      message: searchQuery,
      sources: selectedSources,
      time_range: timeRange,
      language: language,
    });

    if (!isAuthenticated) {
      setPendingSearch(true);
      setShowAuthModal(true);
      return;
    }

    executeSearch(searchQuery);
  };

  const handleFollowUpSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;

    setSearchQuery(followUpQuery);
    executeSearch(followUpQuery);
    setFollowUpQuery("");
  };

  const handleAuthSuccess = () => {
    if (pendingSearch && searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  const handleNewResearch = () => {
    setSearchResults(null);
    setSearchQuery("");
    setFollowUpQuery("");
    setReportError(null);
  };

  // Start report generation from saved search
  const handleStartReportGeneration = async () => {
    if (!searchResults?.searchId) {
      setReportError("Please wait for search to be saved before generating report");
      return;
    }

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch("/api/report/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          searchId: searchResults.searchId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();

      // Redirect to the report page
      router.push(`/report/${data.reportId}`);
    } catch (error) {
      console.error("Report generation error:", error);
      setReportError(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

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

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const getSourceLabel = () => {
    if (selectedSources.length === 0) return "Sources";
    const labels: Record<string, string> = { x: "X", tiktok: "TikTok", instagram: "Instagram" };
    if (selectedSources.length === 1) return labels[selectedSources[0]] || selectedSources[0];
    return `${labels[selectedSources[0]]} +${selectedSources.length - 1}`;
  };

  // Render markdown-like text with bold and code
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Search History Modal */}
      <SearchHistoryModal
        isOpen={showSearchHistoryModal}
        onClose={() => setShowSearchHistoryModal(false)}
      />

      {/* Search History Sidebar */}
      <SearchHistorySidebar
        isOpen={showSearchHistorySidebar}
        onClose={() => setShowSearchHistorySidebar(false)}
      />

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-16 transform bg-white border-r border-gray-200 transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-between py-4">
          <div className="flex flex-col items-center space-y-4">
            {/* Logo */}
            <Link href="/search" className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </Link>

            {/* New Research */}
            <button
              onClick={handleNewResearch}
              aria-label="New Research"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100"
              data-testid="new-research-btn"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {/* Search History */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                } else {
                  setShowSearchHistorySidebar(!showSearchHistorySidebar);
                }
              }}
              aria-label="Search History"
              className={`flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 ${showSearchHistorySidebar ? "bg-gray-100" : ""}`}
              data-testid="search-history-btn"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* User */}
          <button
            aria-label="User profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700"
          >
            {isAuthenticated ? (user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U") : "?"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 lg:ml-16 ${showSearchHistorySidebar ? "lg:ml-80" : ""}`}>
        {/* Initial Search State */}
        {!searchResults && !isSearching && (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-2xl">
              <h1 className="mb-8 text-center text-3xl font-light text-gray-400" data-testid="dashboard-greeting">
                {isAuthenticated && user?.user_metadata?.name
                  ? `Hello, ${(user.user_metadata.name as string).split(" ")[0]}`
                  : "Discover what people buzz about"}
              </h1>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search an issue, candidate, or ballot measure"
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    data-testid="search-input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        handleStartResearch();
                      }
                    }}
                  />
                  <button
                    onClick={handleStartResearch}
                    disabled={!searchQuery.trim() || isSearching}
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="start-research-btn"
                    aria-label={isSearching ? "Searching..." : "Start research"}
                  >
                    {isSearching ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-white" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </button>
                </div>

                {searchError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{searchError}</div>
                )}

                <div className="flex flex-wrap gap-2">
                  <SourceFilter
                    selectedSources={selectedSources}
                    onSourcesChange={setSelectedSources}
                    updateUrlParams={false}
                  />

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
                    testId="time-range-filter"
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
                    testId="language-filter"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State - Split Screen */}
        {isSearching && (
          <div className="flex h-screen" role="status" aria-live="polite" aria-busy="true">
            {/* Left Panel - Thinking State */}
            <div className="flex w-1/2 flex-col border-r border-gray-200">
              {/* Header with query */}
              <div className="border-b border-gray-200 p-6">
                <div className="inline-block rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-800">
                  {searchQuery}
                </div>
              </div>

              {/* Thinking Content */}
              <div className="flex-1 flex items-start p-6">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 text-lg" data-testid="thinking-indicator">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Skeleton Cards */}
            <div className="flex w-1/2 flex-col bg-gray-50">
              {/* Header skeleton */}
              <div className="border-b border-gray-200 bg-white p-6">
                <div className="h-6 w-48 animate-pulse rounded bg-gray-200 mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-8 w-28 animate-pulse rounded-full bg-gray-200" />
                </div>
              </div>

              {/* Stats skeleton */}
              <div className="border-b border-gray-200 bg-white px-6 py-3">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200 mb-1" />
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              </div>

              {/* Skeleton cards */}
              <div className="flex-1 overflow-y-auto p-6">
                <SkeletonCardList count={6} />
              </div>
            </div>
          </div>
        )}

        {/* Results State - Split Screen */}
        {searchResults && !isSearching && (
          <div className="flex h-screen">
            {/* Left Panel - AI Analysis */}
            <div className="flex w-1/2 flex-col border-r border-gray-200">
              {/* Header with query */}
              <div className="border-b border-gray-200 p-6">
                <div className="inline-block rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-800">
                  {searchResults.query}
                </div>
              </div>

              {/* AI Analysis Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* AI Response */}
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 space-y-4">
                      {searchResults.aiAnalysis ? (
                        <>
                          <p className="text-gray-800 leading-relaxed" data-testid="ai-interpretation">
                            {renderFormattedText(searchResults.aiAnalysis.interpretation)}
                          </p>

                          {/* Key Themes */}
                          {searchResults.keyThemes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {searchResults.keyThemes.map((theme, i) => (
                                <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sentiment Summary */}
                          {searchResults.aiAnalysis.sentimentBreakdown && (
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Sentiment: </span>
                                <span className={`capitalize ${
                                  searchResults.aiAnalysis.sentimentBreakdown.overall === "positive" ? "text-green-600" :
                                  searchResults.aiAnalysis.sentimentBreakdown.overall === "negative" ? "text-red-600" :
                                  searchResults.aiAnalysis.sentimentBreakdown.overall === "mixed" ? "text-yellow-600" : "text-gray-600"
                                }`}>
                                  {searchResults.aiAnalysis.sentimentBreakdown.overall}
                                </span>
                                {" - "}{searchResults.aiAnalysis.sentimentBreakdown.summary}
                              </p>
                            </div>
                          )}

                          <p className="text-gray-800 leading-relaxed">
                            {renderFormattedText(searchResults.aiAnalysis.followUpQuestion)}
                          </p>

                          {/* Query Refinement Suggestions */}
                          {searchResults.aiAnalysis.suggestedQueries && searchResults.aiAnalysis.suggestedQueries.length > 0 && (
                            <QuerySuggestions
                              suggestions={searchResults.aiAnalysis.suggestedQueries}
                              onQuerySelect={(query) => {
                                setFollowUpQuery(query);
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <p className="text-gray-800 leading-relaxed" data-testid="ai-interpretation">
                          Found {searchResults.totalMentions} posts about &quot;{searchResults.query}&quot;.
                          Browse the posts on the right to see what people are saying.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-up Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleFollowUpSearch} className="relative">
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Search a topic or paste a URL"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    data-testid="follow-up-input"
                  />
                  <button
                    type="submit"
                    disabled={!followUpQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Panel - Posts Preview */}
            <div className="flex w-1/2 flex-col bg-gray-50">
              {/* Header */}
              <div className="border-b border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">Posts preview for query</h2>

                {/* Key themes */}
                {searchResults.keyThemes.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {searchResults.keyThemes.map((theme, i) => (
                      <span
                        key={i}
                        className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-800"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                )}

                {/* Filters row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                    {selectedSources.map((source) => (
                      <span key={source} className="text-gray-600">
                        {SOURCE_ICONS[source]}
                      </span>
                    ))}
                    <span className="ml-1">{getSourceLabel()}</span>
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
                    testId="results-time-range-filter"
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
                    testId="results-language-filter"
                  />

                  <button
                    onClick={handleStartReportGeneration}
                    disabled={isGeneratingReport || !searchResults.searchId}
                    className="ml-auto rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="generate-report-btn"
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Generating...
                      </>
                    ) : (
                      "Generate Report"
                    )}
                  </button>
                </div>

                {/* Report error message */}
                {reportError && (
                  <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                    {reportError}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="border-b border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900" data-testid="total-mentions">
                    {formatMentions(searchResults.totalMentions)} total mentions
                  </span>
                  {searchResults.qualityBadge && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        MENTIONS_BADGE_STYLES[searchResults.qualityBadge]
                      }`}
                      data-testid="mentions-badge"
                    >
                      {MENTIONS_BADGE_LABELS[searchResults.qualityBadge]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {formatDateRange(searchResults.dateRange.start, searchResults.dateRange.end)}
                </p>
                {/* API Warnings */}
                {searchResults.warnings && searchResults.warnings.length > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    {searchResults.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-amber-800 flex items-center gap-2">
                        <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Posts Feed - Scrollable */}
              <div ref={postsContainerRef} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {searchResults.posts.map((post) => (
                    <a
                      key={post.id}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
                      data-testid="post-card"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <span className={post.platform === "tiktok" ? "text-black" : "text-pink-600"}>
                            {SOURCE_ICONS[post.platform] || SOURCE_ICONS.instagram}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium text-gray-900">{post.author}</span>
                            <span className="text-sm text-gray-500">{formatRelativeTime(post.createdAt)}</span>
                          </div>
                          <p className="text-gray-800 line-clamp-3">{post.text}</p>
                          {post.thumbnail && (
                            <div className="mt-3 rounded-lg overflow-hidden">
                              <img
                                src={post.thumbnail}
                                alt=""
                                className="w-full h-32 object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
