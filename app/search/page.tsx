"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import SearchHistoryModal from "../components/SearchHistoryModal";
import SearchHistorySidebar from "../components/SearchHistorySidebar";
import AlertHistorySidebar from "../components/AlertHistorySidebar";
import QuerySuggestions from "../components/QuerySuggestions";
import ScopeToggle, { type SearchScope } from "../components/ScopeToggle";
import GeoFilters from "../components/GeoFilters";
import LocalComingSoon from "../components/LocalComingSoon";
import SourceFilter from "../../components/SourceFilter";
import FilterDropdown from "../../components/FilterDropdown";
import VerificationBadge from "../../components/VerificationBadge";
import SettingsModal from "../../components/SettingsModal";
import ReportProgressModal from "../components/ReportProgressModal";
import TrialModal from "../components/modals/TrialModal";
import CreditsModal from "../components/modals/CreditsModal";
import type { Post, SearchResponse, AIAnalysis } from "@/lib/types/api";
import { supabase } from "@/lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { STRIPE_CONFIG } from "@/lib/stripe-config";
// Streaming search is available but disabled by default - enable with NEXT_PUBLIC_FEATURE_STREAMING_SEARCH=true
// import { useStreamingSearch } from "@/lib/hooks/useStreamingSearch";
// import { PlatformStatusList } from "../components/PlatformStatusBadge";
import {
  formatMentions,
  calculateTotalMentions,
  getMentionsBadge,
  MENTIONS_BADGE_STYLES,
  MENTIONS_BADGE_LABELS,
} from "@/lib/utils/mentions";

const TIME_INTERVAL_OPTIONS = [
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
  youtube: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  instagram: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  bluesky: (
    <svg className="h-4 w-4" viewBox="0 0 600 530" fill="currentColor">
      <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
  ),
  reddit: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
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
  const { isAuthenticated, loading, user, billing, billingLoading, refreshBilling } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("message") || "");
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    const sources = searchParams.getAll("sources");
    return sources.length > 0 ? sources : ["youtube", "tiktok"];
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
  const [showAlertHistorySidebar, setShowAlertHistorySidebar] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [showReportProgress, setShowReportProgress] = useState(false);
  const [reportAccessToken, setReportAccessToken] = useState<string | null>(null);
  const [isSavingReportSearch, setIsSavingReportSearch] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [clickedPostCount, setClickedPostCount] = useState(0);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [trialModalFeature, setTrialModalFeature] = useState<string | undefined>();
  const [showMentionsPreview, setShowMentionsPreview] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>("national");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showLocalComingSoon, setShowLocalComingSoon] = useState(false);

  const postsContainerRef = useRef<HTMLDivElement>(null);
  const hasExecutedAuthCallbackSearch = useRef(false);
  const hasHandledSubscriptionSuccess = useRef(false);

  // Helper to check if time range is allowed for free tier
  const isTimeRangeAllowedForFree = (range: string): boolean => {
    // Free tier allows: today (1d -> maps to 7d for checking), last_week (7d), and last_year (12m -> 1y)
    // Basically "last_week" and "last_year" are allowed
    return range === "last_week" || range === "last_year";
  };

  // Check if user has active subscription
  const hasActiveSubscription = billing?.subscriptionStatus === "active" || billing?.subscriptionStatus === "trialing";

  // Check if user has enough credits
  const hasEnoughCredits = (required: number): boolean => {
    return (billing?.credits?.total || 0) >= required;
  };

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

  // Auto-execute search after OAuth callback if there's a pending query
  useEffect(() => {
    const isAuthCallback = searchParams.get("auth_callback") === "true";
    const pendingMessage = searchParams.get("message");

    // Prevent double execution using ref
    if (hasExecutedAuthCallbackSearch.current) return;

    if (isAuthCallback && isAuthenticated && !loading && pendingMessage && !isSearching && !searchResults) {
      hasExecutedAuthCallbackSearch.current = true;

      // Remove the auth_callback param from URL to prevent re-execution on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_callback");
      router.replace(url.pathname + url.search, { scroll: false });

      // Execute the pending search
      setSearchQuery(pendingMessage);
      executeSearchWithFilters(pendingMessage, selectedSources, timeRange, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, loading, isSearching, searchResults, router]);

  // Handle subscription success - trigger pending report generation
  useEffect(() => {
    const isSubscriptionSuccess = searchParams.get("subscription") === "success";

    if (!isSubscriptionSuccess || hasHandledSubscriptionSuccess.current) return;
    if (loading || billingLoading) return; // Wait for auth and billing to load

    hasHandledSubscriptionSuccess.current = true;

    // Remove the subscription param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("subscription");
    router.replace(url.pathname + url.search, { scroll: false });

    // Refresh billing status to get updated subscription
    refreshBilling();

    // Show success toast
    showToast({ message: "Subscription activated! Welcome to Pro." });

    // Check for pending report generation in localStorage
    const pendingReport = localStorage.getItem("pendingReportGeneration");
    if (pendingReport) {
      try {
        const { query, sources, timeRange: savedTimeRange, language: savedLanguage } = JSON.parse(pendingReport);
        localStorage.removeItem("pendingReportGeneration");

        // Restore the search state if we have one
        if (query && sources) {
          setSearchQuery(query);
          setSelectedSources(sources);
          if (savedTimeRange) setTimeRange(savedTimeRange);
          if (savedLanguage) setLanguage(savedLanguage);

          // If we don't have search results yet, execute the search first
          if (!searchResults) {
            executeSearchWithFilters(query, sources, savedTimeRange || timeRange, savedLanguage || language);
          }

          // Show a message that report will start after search
          showToast({ message: "Your search is being restored. Report generation will start shortly." });
        }
      } catch (e) {
        console.error("Failed to parse pending report:", e);
        localStorage.removeItem("pendingReportGeneration");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, billingLoading, router, refreshBilling, showToast]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
    updateUrlParams({ time_range: value });
    // If there are existing results, re-run the search
    if (searchResults && searchQuery.trim()) {
      executeSearchWithFilters(searchQuery, selectedSources, value, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, searchQuery, selectedSources, language, updateUrlParams]);

  // Handle language change
  const handleLanguageChange = useCallback((value: string) => {
    setLanguage(value);
    updateUrlParams({ language: value });
    // If there are existing results, re-run the search
    if (searchResults && searchQuery.trim()) {
      executeSearchWithFilters(searchQuery, selectedSources, timeRange, value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                authorHandle: post.authorHandle,
                authorAvatar: post.authorAvatar,
                platform: post.platform,
                url: post.url,
                thumbnail: post.thumbnail,
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

      // Track credit usage for authenticated users (API handles free tier gracefully)
      if (isAuthenticated) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch("/api/billing/deduct", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                action: "search",
                description: `Search: ${query}`,
              }),
            });
            // Refresh billing to update credit display
            refreshBilling();
          }
        } catch (deductError) {
          console.error("Failed to deduct credits:", deductError);
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

    // If local scope is selected, show coming soon instead of executing search
    if (searchScope === "local") {
      setShowLocalComingSoon(true);
      return;
    }

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

    // Check subscription status for premium time ranges
    if (!hasActiveSubscription && !isTimeRangeAllowedForFree(timeRange)) {
      setTrialModalFeature("Advanced time range filters");
      setShowTrialModal(true);
      return;
    }

    // Check credits for paid users
    if (hasActiveSubscription && !hasEnoughCredits(STRIPE_CONFIG.creditCosts.search)) {
      setShowCreditsModal(true);
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
    setClickedPostCount(0);
    setShowMentionsPreview(false);
    setShowLocalComingSoon(false);
    setSearchScope("national");
    setSelectedState(null);
    setSelectedCity(null);
    // Clear URL query parameters for fresh search
    router.replace("/search", { scroll: false });
  };

  // Handle switching back to national search from Local Coming Soon
  const handleBackToNational = () => {
    setSearchScope("national");
    setShowLocalComingSoon(false);
    setSelectedState(null);
    setSelectedCity(null);
  };

  // Handle post card click - prompt to generate report instead of navigating away
  const handlePostClick = useCallback(() => {
    const newCount = clickedPostCount + 1;
    setClickedPostCount(newCount);

    const message = clickedPostCount === 0
      ? "Generate a report to view full post details and analysis"
      : `${newCount} posts viewed. Generate report for comprehensive analysis.`;

    showToast({
      message,
      action: searchResults?.searchId
        ? {
            label: "Generate Report",
            onClick: () => {
              // Navigate to report generation
              if (searchResults?.searchId) {
                window.location.href = `/report/${searchResults.searchId}`;
              }
            },
          }
        : undefined,
      duration: 4000,
    });
  }, [clickedPostCount, searchResults?.searchId, showToast]);

  // Start report generation from saved search
  const handleStartReportGeneration = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Check if user has active subscription (reports require subscription)
    if (!hasActiveSubscription) {
      // Save pending report to localStorage so it can be resumed after subscription
      if (searchResults) {
        localStorage.setItem("pendingReportGeneration", JSON.stringify({
          query: searchResults.query,
          sources: selectedSources,
          timeRange,
          language,
          searchId: searchResults.searchId,
        }));
      }
      setTrialModalFeature("AI-powered report generation");
      setShowTrialModal(true);
      return;
    }

    // Check if user has enough credits for report generation
    if (!hasEnoughCredits(STRIPE_CONFIG.creditCosts.reportGeneration)) {
      setShowCreditsModal(true);
      return;
    }

    setReportError(null);

    try {
      let searchId = searchResults?.searchId;
      if (!searchId && searchResults) {
        setIsSavingReportSearch(true);
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
            queryText: searchResults.query,
            sources: selectedSources,
            filters: { timeFilter: timeRange, language },
            posts: searchResults.posts.map((post) => ({
              id: post.id,
              text: post.text,
              author: post.author,
              authorHandle: post.authorHandle,
              authorAvatar: post.authorAvatar,
              platform: post.platform,
              url: post.url,
              thumbnail: post.thumbnail,
              createdAt: post.createdAt,
              engagement: post.engagement,
            })),
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to save search: ${saveResponse.status}`);
        }

        const saveData = await saveResponse.json();
        searchId = saveData.searchId;
        setSearchResults((prev) => prev ? { ...prev, searchId } : prev);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session");
      }

      // Deduct credits for report generation
      try {
        await fetch("/api/billing/deduct", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "report_generation",
            description: `Report: ${searchResults?.query || "Search report"}`,
          }),
        });
        // Refresh billing to update credit display
        refreshBilling();
      } catch (deductError) {
        console.error("Failed to deduct credits:", deductError);
      }

      // Store the access token and show the progress modal
      setReportAccessToken(session.access_token);
      setShowReportProgress(true);
    } catch (error) {
      console.error("Report generation error:", error);
      setReportError(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsSavingReportSearch(false);
    }
  };

  // Handle report progress modal close
  const handleReportProgressClose = () => {
    setShowReportProgress(false);
    setReportAccessToken(null);
  };

  // Handle report generation error
  const handleReportError = (message: string) => {
    setReportError(message);
    setShowReportProgress(false);
    setReportAccessToken(null);
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "Just now";
    }
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    return `${diffDays} days ago`;
  };

  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const getSourceLabel = (): string => {
    const sourceLabels: Record<string, string> = {
      x: "X",
      tiktok: "TikTok",
      youtube: "YouTube",
      reddit: "Reddit",
      instagram: "Instagram",
      bluesky: "Bluesky",
      truthsocial: "Truth Social",
    };

    if (selectedSources.length === 0) {
      return "Sources";
    }
    if (selectedSources.length === 1) {
      return sourceLabels[selectedSources[0]] || selectedSources[0];
    }
    const firstLabel = sourceLabels[selectedSources[0]] || selectedSources[0];
    return `${firstLabel} +${selectedSources.length - 1}`;
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
        redirectUrl={pendingSearch ? window.location.href : undefined}
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

      {/* Alert History Sidebar */}
      <AlertHistorySidebar
        isOpen={showAlertHistorySidebar}
        onClose={() => setShowAlertHistorySidebar(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Trial Modal */}
      <TrialModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        feature={trialModalFeature}
      />

      {/* Credits Modal */}
      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        currentCredits={billing?.credits?.total || 0}
        requiredCredits={STRIPE_CONFIG.creditCosts.search}
      />

      {/* Report Progress Modal */}
      {searchResults?.searchId && reportAccessToken && (
        <ReportProgressModal
          isOpen={showReportProgress}
          searchId={searchResults.searchId}
          accessToken={reportAccessToken}
          onClose={handleReportProgressClose}
          onError={handleReportError}
        />
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

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
                  setShowAlertHistorySidebar(false);
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

            {/* Alert History */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                } else {
                  setShowSearchHistorySidebar(false);
                  setShowAlertHistorySidebar(!showAlertHistorySidebar);
                }
              }}
              aria-label="Email Alerts"
              className={`flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 ${showAlertHistorySidebar ? "bg-gray-100" : ""}`}
              data-testid="alert-history-btn"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowUserMenu(!showUserMenu);
                } else {
                  setShowAuthModal(true);
                }
              }}
              aria-label="User profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
            >
              {isAuthenticated ? (user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U") : "?"}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && isAuthenticated && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50" onClick={(e) => e.stopPropagation()}>
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.user_metadata?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowSettingsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                    Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 lg:ml-16 ${showSearchHistorySidebar || showAlertHistorySidebar ? "lg:ml-80" : ""}`}>
        {/* Local Coming Soon State */}
        {showLocalComingSoon && (
          <LocalComingSoon
            query={searchQuery}
            selectedState={selectedState}
            selectedCity={selectedCity}
            onBackToNational={handleBackToNational}
          />
        )}

        {/* Initial Search State */}
        {!searchResults && !isSearching && !showLocalComingSoon && (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-2xl">
              <h1 className="mb-8 text-center text-3xl font-light text-gray-400" data-testid="dashboard-greeting">
                {isAuthenticated && user?.user_metadata?.name
                  ? `Hello, ${(user.user_metadata.name as string).split(" ")[0]}`
                  : "Discover what people buzz about"}
              </h1>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                {/* Search bar with inline scope toggle */}
                <div className="mb-4 flex gap-3">
                  <div className="flex flex-1">
                    <ScopeToggle
                      scope={searchScope}
                      onScopeChange={setSearchScope}
                      variant="inline"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search an issue, candidate, or ballot measure"
                      className="flex-1 rounded-r-lg border border-l-0 border-gray-300 px-4 h-[48px] focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      data-testid="search-input"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery.trim()) {
                          handleStartResearch();
                        }
                      }}
                    />
                  </div>
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

                {/* Geo Filters - show below search bar when local scope */}
                {searchScope === "local" && (
                  <div className="mb-4">
                    <GeoFilters
                      selectedState={selectedState}
                      selectedCity={selectedCity}
                      onStateChange={setSelectedState}
                      onCityChange={setSelectedCity}
                    />
                  </div>
                )}

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

        {/* Loading State - Centered */}
        {isSearching && (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" role="status" aria-live="polite" aria-busy="true">
            <div className="w-full max-w-2xl">
              {/* Query Badge */}
              <div className="flex justify-end mb-6">
                <div className="inline-block rounded-full bg-white border border-gray-200 px-4 py-2 text-sm text-gray-800 shadow-sm">
                  {searchQuery}
                </div>
              </div>

              {/* Loading indicator */}
              <div className="mb-8 flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                <span className="text-gray-600" data-testid="thinking-indicator">
                  Searching across platforms...
                </span>
              </div>

              {/* Placeholder Card */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                {/* Filters Row Skeleton */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-8 w-28 animate-pulse rounded-full bg-gray-100" />
                  <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
                </div>

                {/* Stats Skeleton */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="h-6 w-32 animate-pulse rounded bg-gray-100 mb-2" />
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-100" />
                    <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results State - Centered Summary (before Preview) */}
        {searchResults && !isSearching && !showMentionsPreview && (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-2xl">
              {/* Query Badge */}
              <div className="flex justify-end mb-6">
                <div className="inline-block rounded-full bg-white border border-gray-200 px-4 py-2 text-sm text-gray-800 shadow-sm">
                  {searchResults.query}
                </div>
              </div>

              {/* AI Analysis */}
              <div className="mb-8 space-y-4">
                {searchResults.aiAnalysis ? (
                  <>
                    <p className="text-gray-700 leading-relaxed" data-testid="ai-interpretation">
                      {renderFormattedText(searchResults.aiAnalysis.interpretation)}
                    </p>

                    {/* Suggested Boolean Search */}
                    {searchResults.aiAnalysis.suggestedQueries && searchResults.aiAnalysis.suggestedQueries.length > 0 && (
                      <div className="space-y-3">
                        <QuerySuggestions
                          suggestions={searchResults.aiAnalysis.suggestedQueries}
                          onQuerySelect={(query) => {
                            setFollowUpQuery(query);
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-700 leading-relaxed" data-testid="ai-interpretation">
                    Found {searchResults.totalMentions} posts about &quot;{searchResults.query}&quot;.
                  </p>
                )}
              </div>

              {/* Search Builder Card */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                {/* Boolean Query Display */}
                {searchResults.aiAnalysis?.suggestedQueries && searchResults.aiAnalysis.suggestedQueries.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <span className="rounded bg-white border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800">
                      {searchResults.query}
                    </span>
                  </div>
                )}

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {/* Sources */}
                  <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                    {selectedSources.slice(0, 2).map((source) => (
                      <span key={source} className="text-gray-600">
                        {SOURCE_ICONS[source]}
                      </span>
                    ))}
                    <span className="ml-1">{getSourceLabel()}</span>
                  </div>

                  {/* Time Range */}
                  <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{TIME_INTERVAL_OPTIONS.find(o => o.id === timeRange)?.label || "Last 3 months"}</span>
                  </div>

                  {/* Language */}
                  <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>{LANGUAGE_OPTIONS.find(o => o.id === language)?.label || "All languages"}</span>
                  </div>
                </div>

                {/* Stats and Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900" data-testid="total-mentions">
                        {formatMentions(searchResults.totalMentions)} mentions
                      </span>
                      {searchResults.qualityBadge && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowMentionsPreview(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      data-testid="preview-mentions-btn"
                    >
                      Preview mentions
                    </button>
                    <button
                      onClick={handleStartReportGeneration}
                      disabled={showReportProgress || isSavingReportSearch}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      data-testid="generate-report-btn"
                    >
                      {isSavingReportSearch ? "Saving..." : "Start research"}
                    </button>
                  </div>
                </div>

                {/* Report error message */}
                {reportError && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {reportError}
                  </div>
                )}

                {/* API Warnings */}
                {searchResults.warnings && searchResults.warnings.length > 0 && (
                  <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
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

              {/* Follow-up Search */}
              <div className="mt-6">
                <form onSubmit={handleFollowUpSearch} className="relative">
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Search a topic or paste a URL"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    data-testid="follow-up-input"
                  />
                  <button
                    type="submit"
                    disabled={!followUpQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Results State - Split Screen with Mentions Preview */}
        {searchResults && !isSearching && showMentionsPreview && (
          <div className="flex h-screen">
            {/* Left Panel - AI Analysis (hidden on mobile) */}
            <div className="hidden w-1/2 flex-col border-r border-gray-200 md:flex">
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

                          {/* Suggested Boolean Search */}
                          {searchResults.aiAnalysis.suggestedQueries && searchResults.aiAnalysis.suggestedQueries.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium text-gray-700">Suggested Boolean Search</h3>
                              <QuerySuggestions
                                suggestions={searchResults.aiAnalysis.suggestedQueries}
                                onQuerySelect={(query) => {
                                  setFollowUpQuery(query);
                                }}
                              />
                            </div>
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

            {/* Right Panel - Posts Preview (full width on mobile) */}
            <div className="flex w-full flex-col bg-gray-50 md:w-1/2">
              {/* Header */}
              <div className="border-b border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Mentions preview</h2>
                  <button
                    onClick={() => setShowMentionsPreview(false)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>

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

                  {/* Verified Only Toggle */}
                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      verifiedOnly
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    data-testid="verified-only-filter"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verified only
                  </button>
                </div>

                {/* Generate Report Button - prominent placement */}
                <div className="mt-4">
                  <button
                    onClick={handleStartReportGeneration}
                    disabled={showReportProgress || isSavingReportSearch}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="generate-report-btn"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isSavingReportSearch ? "Saving..." : "Start research"}
                  </button>
                </div>

                {/* Report error message */}
                {reportError && (
                  <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
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
                  {searchResults.posts
                    .filter((post) => !verifiedOnly || post.verificationBadge || (post.credibilityScore && post.credibilityScore >= 0.7))
                    .map((post) => (
                    <div
                      key={post.id}
                      role="button"
                      tabIndex={0}
                      onClick={handlePostClick}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handlePostClick();
                        }
                      }}
                      className="block cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                            {post.verificationBadge && (
                              <VerificationBadge badge={post.verificationBadge} size="sm" />
                            )}
                            <span className="text-sm text-gray-500">{formatRelativeTime(post.createdAt)}</span>
                          </div>
                          <p className="text-gray-800 line-clamp-3">{post.text}</p>
                          {post.thumbnail && (
                            <div className="mt-3 rounded-lg overflow-hidden relative h-32">
                              <Image
                                src={post.thumbnail}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
