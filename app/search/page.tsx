"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import SearchHistoryModal from "../components/SearchHistoryModal";
import SearchHistorySidebar from "../components/SearchHistorySidebar";
import AlertHistorySidebar from "../components/AlertHistorySidebar";
import DashboardHeader from "./components/DashboardHeader";
import GeoScopeToggle, { type GeoScope } from "./components/GeoScopeToggle";
import PlatformBadges from "./components/PlatformBadges";
import LegislativeSignalOverview from "./components/LegislativeSignalOverview";
import SubcategoryView from "./components/SubcategoryView";
import IssueDetailView from "./components/IssueDetailView";
import SearchLoadingView from "./components/SearchLoadingView"
import SearchResultsView from "./components/SearchResultsView"
import SearchEmptyState from "./components/SearchEmptyState"
import { TAXONOMY } from "@/lib/data/taxonomy";
import type { TaxonomyCategory, Subcategory } from "@/lib/data/taxonomy";
import type { SearchScope } from "../components/ScopeToggle";
import LocalComingSoon from "../components/LocalComingSoon";
import SettingsModal from "../../components/SettingsModal";
import ReportProgressModal from "../components/ReportProgressModal";
import TrialModal from "../components/modals/TrialModal";

import UseCaseModal from "../components/UseCaseModal";
import { useContextualTooltips } from "@/lib/hooks/useContextualTooltips";
import type { Post, SearchResponse, AIAnalysis, LegislativeSignalsResponse } from "@/lib/types/api";
import {
  isQuestion,
  convertToSearchQuery,
  USE_CASE_STORAGE_KEY,
  LOCATION_STORAGE_KEY,
  US_STATES,
} from "@/lib/search-suggestions";
import { supabase } from "@/lib/supabase";
import { useToast } from "../contexts/ToastContext";

import { useStreamingSearch } from "@/lib/hooks/useStreamingSearch";
import { useSignalsQueue } from "@/lib/hooks/useSignalsQueue";
import { resolveSubcategoryIds } from "@/lib/search-suggestions";
import {
  formatMentions,
  calculateTotalMentions,
  getMentionsBadge,
} from "@/lib/utils/mentions";

// Default sources by geo scope: City/State = Reddit + TikTok; National = all platforms
const ALL_SOURCES = ["reddit", "tiktok", "x", "youtube", "bluesky", "truthsocial"];
const LOCAL_DEFAULT_SOURCES = ["reddit", "tiktok"];

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

// Progressive display: show posts as each platform completes (default: true; set to "false" to disable)
const useStreamingSearchFlag =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FEATURE_STREAMING_SEARCH !== "false";

function SearchPageContent() {
  const { isAuthenticated, loading, user, session, billing, refreshBilling } = useAuth();
  const streamingState = useStreamingSearch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { onResultsLoaded } = useContextualTooltips();

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("message") || "");
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    const sources = searchParams.getAll("sources");
    return sources.length > 0 ? sources : ALL_SOURCES;
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSearchHistoryModal, setShowSearchHistoryModal] = useState(false);
  const [showSearchHistorySidebar, setShowSearchHistorySidebar] = useState(false);
  const [showAlertHistorySidebar, setShowAlertHistorySidebar] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<string>("Searching across platforms...");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [_reportError, setReportError] = useState<string | null>(null);
  const [showReportProgress, setShowReportProgress] = useState(false);
  const [reportAccessToken, setReportAccessToken] = useState<string | null>(null);
  const [_isSavingReportSearch, setIsSavingReportSearch] = useState(false);
  const [_verifiedOnly, setVerifiedOnly] = useState(false);
  const [clickedPostCount, setClickedPostCount] = useState(0);
  const [showTrialModal, setShowTrialModal] = useState(false);

  const [trialModalFeature, setTrialModalFeature] = useState<string | undefined>();
  const [showMentionsPreview, setShowMentionsPreview] = useState(false);
  const [hasSearched, setHasSearched] = useState(false)
  const [searchScope, setSearchScope] = useState<SearchScope>("national");
  const [geoScope, setGeoScope] = useState<GeoScope>("national");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showLocalComingSoon, setShowLocalComingSoon] = useState(false);
  const [showUseCaseModal, setShowUseCaseModal] = useState(false);
  const [userUseCase, setUserUseCase] = useState<string | null>(null);

  // Subcategory / Issue Detail view state
  const [viewMode, setViewMode] = useState<"dashboard" | "subcategory" | "issue-detail">("dashboard");
  const [selectedCategory, setSelectedCategory] = useState<TaxonomyCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [trackedCategoryIds, setTrackedCategoryIds] = useState<Set<string>>(new Set());
  const [trackedSubcategoryIds, setTrackedSubcategoryIds] = useState<Set<string>>(new Set());
  const [legislativeSignalsCache, setLegislativeSignalsCache] = useState<Record<string, LegislativeSignalsResponse>>({});
  const [legislativeTimeRange, setLegislativeTimeRange] = useState<"7d" | "3m" | "12m">("7d");
  
  // User's selected topics from onboarding
  const [userSelectedTopics, setUserSelectedTopics] = useState<string[] | null>(null); // null = loading, [] = none selected
  const [userTopicsLoaded, setUserTopicsLoaded] = useState(false);

  // User's onboarding geo level — drives toggle filtering
  const [userGeoLevel, setUserGeoLevel] = useState<GeoScope | null>(null);
  const hasAppliedInitialGeo = useRef(false);

  const buildLegislativeCacheKey = useCallback((subId: string, s?: string | null, c?: string | null, t?: string | null) => {
    const sources = "reddit,x"
    const language = "all"
    return `${subId}:${s ?? "n"}:${c ?? "n"}:${t ?? "7d"}:${sources}:${language}`
  }, []);

  // Stable ref for the cache — passed to the queue so the loop never reads stale values.
  const signalsCacheRef = useRef(legislativeSignalsCache)
  useEffect(() => { signalsCacheRef.current = legislativeSignalsCache })

  // Centralized priority queue — replaces useBackgroundSignals + SubcategoryView eager fetch.
  // Geo params mirror IssueDetailView's logic: state only when not national, city only when city.
  const queue = useSignalsQueue(
    signalsCacheRef,
    setLegislativeSignalsCache,
    geoScope !== "national" ? (selectedState ?? undefined) : undefined,
    geoScope === "city" ? (selectedCity ?? undefined) : undefined,
    geoScope,
    legislativeTimeRange
  )

  // Once user profile is loaded, enqueue their topics as LOW priority background prefetch.
  // Also re-enqueues after geo change (queue resets on geo change, clears seenRef).
  useEffect(() => {
    if (!userTopicsLoaded || userUseCase === null) return
    const ids = resolveSubcategoryIds(userUseCase, userSelectedTopics)
    if (ids.length > 0) queue.enqueue(ids, "low")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTopicsLoaded, userUseCase, JSON.stringify(userSelectedTopics), geoScope, selectedState, selectedCity, legislativeTimeRange])

  const handleSignalsLoaded = useCallback((key: string, data: LegislativeSignalsResponse) => {
    setLegislativeSignalsCache((prev) => ({ ...prev, [key]: data }))
  }, []);

  // When streaming completes, convert to searchResults and run save/deduct
  const streamingCompleteRef = useRef(false);
  useEffect(() => {
    if (
      !useStreamingSearchFlag ||
      !streamingState.isComplete ||
      streamingCompleteRef.current
    )
      return;
    streamingCompleteRef.current = true;
    const query = searchParams.get("message") || searchQuery;
    const results: SearchResults = {
      query,
      posts: streamingState.posts,
      totalMentions: calculateTotalMentions(streamingState.posts),
      qualityBadge: getMentionsBadge(calculateTotalMentions(streamingState.posts)),
      dateRange: streamingState.summary?.timeRange
        ? {
            start: String(streamingState.summary.timeRange.start).split("T")[0],
            end: String(streamingState.summary.timeRange.end).split("T")[0],
          }
        : { start: "", end: "" },
      aiAnalysis: streamingState.aiAnalysis || null,
      keyThemes: streamingState.aiAnalysis?.keyThemes || [],
      warnings: streamingState.warnings,
    };
    setSearchResults(results);
    setPendingSearch(false);

    const runPostSearch = async () => {
      if (isAuthenticated && user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const saveRes = await fetch("/api/search/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                queryText: query,
                sources: selectedSources,
                filters: { timeFilter: timeRange, language },
                totalResults: streamingState.posts.length,
                posts: streamingState.posts.map((p) => ({
                  id: p.id,
                  text: p.text,
                  author: p.author,
                  authorHandle: p.authorHandle,
                  authorAvatar: p.authorAvatar,
                  platform: p.platform,
                  url: p.url,
                  thumbnail: p.thumbnail,
                  createdAt: p.createdAt,
                  engagement: p.engagement,
                })),
              }),
            });
            if (saveRes.ok) {
              const saveData = await saveRes.json();
              setSearchResults((prev) => (prev ? { ...prev, searchId: saveData.searchId } : null));
            }
          }
        } catch (e) {
          console.error("Streaming post-search:", e);
        }
      }
    };
    runPostSearch();
  }, [
    streamingState.isComplete,
    streamingState.posts,
    streamingState.aiAnalysis,
    streamingState.summary,
    streamingState.warnings,
    searchQuery,
    selectedSources,
    timeRange,
    language,
    isAuthenticated,
    user,
    refreshBilling,
    searchParams,
  ]);

  // Read stored location from localStorage
  const getStoredLocation = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { city?: string; state?: string };
        return {
          city: parsed.city ?? "Little Rock",
          state: parsed.state ?? "AR",
        };
      }
    } catch {}
    return { city: "Little Rock", state: "AR" };
  }, []);

  // Sync geoScope with searchScope and default sources by scope
  const handleGeoScopeChange = useCallback((scope: GeoScope) => {
    setGeoScope(scope);
    if (scope === "national") {
      setSearchScope("national");
      setSelectedSources(ALL_SOURCES);
    } else {
      setSearchScope("local");
      setSelectedSources(LOCAL_DEFAULT_SOURCES);
      const stored = getStoredLocation();
      setSelectedState(stored.state);
      setSelectedCity(stored.city);
    }
  }, [getStoredLocation]);

  // When user saves location in Settings → refresh legislative dashboard
  const handleLocationChange = useCallback((city: string, state: string) => {
    setSelectedCity(city);
    setSelectedState(state);
    setViewMode("dashboard");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchScope("local");
    setGeoScope("city");
  }, []);

  // When a state-onboarded user picks a city from the dropdown
  const handleCitySelect = useCallback((city: string) => {
    setSelectedCity(city)
    setGeoScope("city")
    setSearchScope("local")
    setSelectedSources(LOCAL_DEFAULT_SOURCES)
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      state: selectedState, city
    }))
  }, [selectedState]);

  // Fetch user's selected topics from onboarding
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    
    fetch('/api/topics')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.selectedTopics) {
          setUserSelectedTopics(data.selectedTopics);
        } else {
          setUserSelectedTopics([]); // No topics selected
        }
        setUserTopicsLoaded(true);

        // Apply onboarding geo as initial state
        const dbGeo = data?.geoScope as GeoScope | null
        if (dbGeo) setUserGeoLevel(dbGeo)
        if (dbGeo && dbGeo !== "national" && !hasAppliedInitialGeo.current) {
          hasAppliedInitialGeo.current = true
          setGeoScope(dbGeo)
          setSearchScope("local")
          setSelectedSources(LOCAL_DEFAULT_SOURCES)
          if (data.geoState) setSelectedState(data.geoState)
          if (data.geoCity) setSelectedCity(data.geoCity)
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
            state: data.geoState, city: data.geoCity
          }))
        }
      })
      .catch(err => {
        console.error('Failed to fetch user topics:', err);
        setUserSelectedTopics([]); // Fallback to empty on error
        setUserTopicsLoaded(true);
      });
  }, [isAuthenticated, loading]);

  // When switching to local search, reset sources to Reddit + TikTok
  useEffect(() => {
    if (searchScope === "local") {
      setSelectedSources(LOCAL_DEFAULT_SOURCES);
    }
  }, [searchScope]);

  const _postsContainerRef = useRef<HTMLDivElement>(null);
  const hasExecutedAuthCallbackSearch = useRef(false);
  const hasHandledSubscriptionSuccess = useRef(false);

  // Load location from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: string; city?: string };
        if (parsed.state) setSelectedState(parsed.state);
        if (parsed.city) setSelectedCity(parsed.city);
        // Infer geo level from stored location as fallback (DB may not have geoScope)
        if (!hasAppliedInitialGeo.current) {
          if (parsed.city && parsed.state) {
            setUserGeoLevel("city")
            setGeoScope("city")
            setSearchScope("local")
            setSelectedSources(LOCAL_DEFAULT_SOURCES)
            hasAppliedInitialGeo.current = true
          } else if (parsed.state) {
            setUserGeoLevel("state")
            setGeoScope("state")
            setSearchScope("local")
            setSelectedSources(LOCAL_DEFAULT_SOURCES)
            hasAppliedInitialGeo.current = true
          }
        }
      }
    } catch (e) {
      console.error('Failed to load location from localStorage:', e);
    }
  }, []);

  // Load use case from localStorage on mount, show modal if none set
  useEffect(() => {
    const stored = localStorage.getItem(USE_CASE_STORAGE_KEY)
    if (stored) {
      setUserUseCase(stored)
    } else if (isAuthenticated && !loading) {
      setShowUseCaseModal(true)
    }
  }, [isAuthenticated, loading])

  // Rotating placeholder text


  const displayIsSearching =
    isSearching || (useStreamingSearchFlag && streamingState.isSearching)
  const displayResults: SearchResults | null =
    searchResults ??
    (useStreamingSearchFlag && streamingState.posts.length > 0
      ? {
          query: searchQuery || searchParams.get("message") || "",
          posts: streamingState.posts,
          totalMentions: calculateTotalMentions(streamingState.posts),
          qualityBadge: getMentionsBadge(calculateTotalMentions(streamingState.posts)),
          dateRange: streamingState.summary?.timeRange
            ? {
                start: String(streamingState.summary.timeRange.start).split("T")[0],
                end: String(streamingState.summary.timeRange.end).split("T")[0],
              }
            : { start: "", end: "" },
          aiAnalysis: streamingState.aiAnalysis ?? null,
          keyThemes: streamingState.aiAnalysis?.keyThemes ?? [],
          warnings: streamingState.warnings,
        }
      : null)

  // Start tooltip sequence on page load, but wait until persona modal is closed
  useEffect(() => {
    if (!showUseCaseModal) {
      onResultsLoaded()
    }
  }, [onResultsLoaded, showUseCaseModal])

  // Handle use case modal close
  const handleUseCaseSelect = (useCase: string) => {
    setUserUseCase(useCase)
    setShowUseCaseModal(false)
  }

  // Helper to check if time range is allowed for free tier
  const isTimeRangeAllowedForFree = (range: string): boolean => {
    // Free tier allows: today (1d -> maps to 7d for checking), last_week (7d), and last_year (12m -> 1y)
    // Basically "last_week" and "last_year" are allowed
    return range === "last_week" || range === "last_year";
  };

  // Check if user has active subscription (including canceled with remaining period)
  const hasActiveSubscription = billing?.subscriptionStatus === "active" ||
    billing?.subscriptionStatus === "trialing" ||
    (billing?.subscriptionStatus === "canceled" && billing?.currentPeriodEnd && new Date(billing.currentPeriodEnd) > new Date());

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
      executeSearch(pendingMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, loading, isSearching, searchResults, router]);

  // Handle subscription success - trigger pending report generation
  useEffect(() => {
    const isSubscriptionSuccess = searchParams.get("subscription") === "success";

    if (!isSubscriptionSuccess || hasHandledSubscriptionSuccess.current) return;
    if (loading) return; // Wait for auth; billing loads in background

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
            const geoParams = searchScope === "local" ? { state: selectedState, city: selectedCity } : undefined;
            executeSearchWithFilters(query, sources, savedTimeRange || timeRange, savedLanguage || language, geoParams);
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
  }, [searchParams, loading, router, refreshBilling, showToast]);

  // Handle time range change
  const _handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
    updateUrlParams({ time_range: value });
    // If there are existing results, re-run the search
    if (searchResults && searchQuery.trim()) {
      const geoParams = searchScope === "local" ? { state: selectedState, city: selectedCity } : undefined;
      executeSearchWithFilters(searchQuery, selectedSources, value, language, geoParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, searchQuery, selectedSources, language, updateUrlParams, searchScope, selectedState, selectedCity]);

  // Handle language change
  const _handleLanguageChange = useCallback((value: string) => {
    setLanguage(value);
    updateUrlParams({ language: value });
    // If there are existing results, re-run the search
    if (searchResults && searchQuery.trim()) {
      const geoParams = searchScope === "local" ? { state: selectedState, city: selectedCity } : undefined;
      executeSearchWithFilters(searchQuery, selectedSources, timeRange, value, geoParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, searchQuery, selectedSources, timeRange, updateUrlParams, searchScope, selectedState, selectedCity]);

  const executeSearchWithFilters = async (
    query: string,
    sources: string[],
    currentTimeRange: string,
    currentLanguage: string,
    geoParams?: { state?: string | null; city?: string | null }
  ) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchProgress("Searching across platforms...")

    try {
      // Convert URL time_range to API timeFilter
      const apiTimeFilter = TIME_RANGE_TO_API[currentTimeRange] || "3m";

      // Build request body
      const requestBody: Record<string, unknown> = {
        query,
        sources,
        timeFilter: apiTimeFilter,
        language: currentLanguage,
      };

      // Add geo params for local search
      if (geoParams?.state) {
        requestBody.state = geoParams.state;
        if (geoParams?.city) {
          requestBody.city = geoParams.city;
        }
      }

      // Call the real search API
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSearching(false);
      setPendingSearch(false);
    }
  };

  const executeSearch = async (query: string) => {
    setHasSearched(true)
    const geoParams = searchScope === "local" ? { state: selectedState, city: selectedCity } : undefined;
    if (useStreamingSearchFlag) {
      streamingCompleteRef.current = false;
      streamingState.reset();
      setSearchError(null);
      setSearchResults(null);
      streamingState.startSearch({
        query,
        sources: selectedSources,
        timeFilter: TIME_RANGE_TO_API[timeRange] || "3m",
        language: language === "all" ? undefined : language,
        sort: "relevance",
        ...(geoParams?.state && { state: geoParams.state }),
        ...(geoParams?.city && { city: geoParams.city }),
      });
      return;
    }
    await executeSearchWithFilters(query, selectedSources, timeRange, language, geoParams);
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

    // Check subscription status for premium time ranges
    if (!hasActiveSubscription && !isTimeRangeAllowedForFree(timeRange)) {
      setTrialModalFeature("Advanced time range filters");
      setShowTrialModal(true);
      return;
    }

    // Question detection hint
    if (isQuestion(searchQuery)) {
      const converted = convertToSearchQuery(searchQuery)
      if (converted !== searchQuery.trim()) {
        showToast({
          message: `Tip: Try searching "${converted}" for better results`,
          duration: 5000,
        })
      }
    }

    executeSearch(searchQuery);
  };

  const _handleFollowUpSearch = (e: React.FormEvent) => {
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

  const handleNewResearch = useCallback(() => {
    setSearchResults(null);
    setSearchQuery("");
    setFollowUpQuery("");
    setReportError(null);
    setClickedPostCount(0);
    setShowMentionsPreview(false);
    setShowLocalComingSoon(false);
    setSearchScope("national");
    setGeoScope("national");
    setSelectedSources(ALL_SOURCES);
    setSelectedState(null);
    setSelectedCity(null);
    router.replace("/search", { scroll: false });
  }, [router]);

  // Handle switching back to national search from Local Coming Soon
  const handleBackToNational = () => {
    setSearchScope("national");
    setGeoScope("national");
    setSelectedSources(ALL_SOURCES);
    setShowLocalComingSoon(false);
    setSelectedState(null);
    setSelectedCity(null);
  };

  // Handle post card click - prompt to generate report instead of navigating away
  const _handlePostClick = useCallback(() => {
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
  const _handleStartReportGeneration = async () => {
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

  const _formatRelativeTime = (dateString: string): string => {
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

  const _formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const _getSourceLabel = (): string => {
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
  const _renderFormattedText = (text: string) => {
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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F5F0E8" }}>
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
        onClose={() => {
          setShowSettingsModal(false)
          // Re-read persona in case it was changed in settings
          const stored = localStorage.getItem(USE_CASE_STORAGE_KEY)
          if (stored) setUserUseCase(stored)
        }}
        onLocationChange={handleLocationChange}
        onTopicsChange={(topics) => setUserSelectedTopics(topics)}
      />

      {/* Trial Modal */}
      <TrialModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        feature={trialModalFeature}
      />

      {/* Use Case Selection Modal */}
      <UseCaseModal
        isOpen={showUseCaseModal}
        onClose={handleUseCaseSelect}
        accessToken={session?.access_token || null}
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

      {/* Click outside to close user menu - z-30 so header (z-50) stays clickable */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Top Header - Civic Intelligence Dashboard */}
      <DashboardHeader
        onShowAuth={() => setShowAuthModal(true)}
        onNewResearch={handleNewResearch}
        onShowSettings={() => setShowSettingsModal(true)}
        showUserMenu={showUserMenu}
        onToggleUserMenu={() => setShowUserMenu(!showUserMenu)}
        selectedState={selectedState}
        geoScope={geoScope}
      />

      {/* Main content - no left sidebar */}
      <main className={`flex-1 transition-all duration-300 ${showSearchHistorySidebar || showAlertHistorySidebar ? "lg:ml-80" : ""}`} style={{ backgroundColor: "#F5F0E8" }}>
        {/* Local Coming Soon State */}
        {showLocalComingSoon && (
          <LocalComingSoon
            query={searchQuery}
            selectedState={selectedState}
            selectedCity={selectedCity}
            onBackToNational={handleBackToNational}
          />
        )}

        {/* Initial Search State - Civic Intelligence Dashboard */}
        {!displayResults && !displayIsSearching && !showLocalComingSoon && !hasSearched && (
          <div className="relative z-10 flex flex-col px-4 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              {/* Search bar - full width, no embedded dropdown */}
              <div
                className="flex gap-3 rounded-xl p-2"
                style={{
                  backgroundColor: "rgba(0,0,0,0.025)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search civic issues -- childcare, immigration enforcement, road conditions..."
                  className="flex-1 rounded-lg border-0 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "rgba(0,0,0,0.08)",
                    color: "#2C2519",
                  }}
                  data-testid="search-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) handleStartResearch();
                  }}
                />
                <button
                  onClick={handleStartResearch}
                  disabled={!searchQuery.trim() || displayIsSearching}
                  className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
                  style={{ background: "linear-gradient(135deg, #D4654A, #D4A24A)" }}
                  data-testid="start-research-btn"
                  aria-label={displayIsSearching ? "Searching..." : "Scan"}
                >
                  {displayIsSearching ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  ) : (
                    "Scan"
                  )}
                </button>
              </div>

              {/* Geo scope + Time range controls — interactive on dashboard, locked in sub/detail views */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                {viewMode === "dashboard" ? (
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <div className="shrink-0 w-auto max-w-full">
                      <GeoScopeToggle
                        scope={geoScope}
                        onScopeChange={handleGeoScopeChange}
                        userGeoLevel={userGeoLevel ?? undefined}
                        onCitySelect={handleCitySelect}
                        cityLabel={selectedCity || "Little Rock"}
                        stateLabel={selectedState || "AR"}
                        stateSublabel={US_STATES.find((s) => s.code === (selectedState || "AR"))?.name ?? "Select state"}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.45)" }}>Time:</span>
                      <select
                        value={legislativeTimeRange}
                        onChange={(e) => setLegislativeTimeRange(e.target.value as "7d" | "3m" | "12m")}
                        className="rounded-md border px-2.5 py-1.5 text-sm w-[140px]"
                        style={{ borderColor: "rgba(0,0,0,0.12)", backgroundColor: "rgba(255,255,255,0.8)", color: "#2C2519" }}
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="3m">Last 3 months</option>
                        <option value="12m">Last year</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Locked context pill shown when drilling into subcategory / detail view */
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "rgba(0,0,0,0.5)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {geoScope === "city" && selectedCity
                        ? `${selectedCity}, ${selectedState}`
                        : geoScope === "state" && selectedState
                          ? selectedState
                          : "All US"}
                      {" · "}
                      {legislativeTimeRange === "7d" ? "Last 7 days" : legislativeTimeRange === "3m" ? "Last 3 months" : "Last year"}
                    </span>
                  </div>
                )}
                <div className="shrink-0 min-w-0">
                  <PlatformBadges selectedPlatforms={selectedSources} />
                </div>
              </div>

              {searchError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{searchError}</div>
              )}

              {/* Subcategory View — after clicking a category */}
              {viewMode === "subcategory" && selectedCategory && (
                <SubcategoryView
                  category={selectedCategory}
                  geoScope={geoScope}
                  state={geoScope !== "national" ? (selectedState ?? undefined) : undefined}
                  city={geoScope === "city" ? (selectedCity ?? "Little Rock") : undefined}
                  timeFilter={legislativeTimeRange}
                  geoLabel={
                    geoScope === "city"
                      ? selectedCity || "Little Rock"
                      : geoScope === "state"
                        ? selectedState || "Arkansas"
                        : "All US"
                  }
                  signalsCache={legislativeSignalsCache}
                  buildCacheKey={(subId, s, c) => buildLegislativeCacheKey(subId, s, c, legislativeTimeRange)}
                  onSignalsLoaded={handleSignalsLoaded}
                  selectedTopicIds={userSelectedTopics}
                  loadingSubcategoryId={queue.currentSubcategoryId}
                  isQueueComplete={queue.isComplete}
                  onBack={() => {
                    setSearchResults(null);
                    streamingState.reset();
                    setSearchQuery("");
                    setViewMode("dashboard");
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  }}
                  onSubcategoryClick={(sub) => {
                    queue.enqueue([sub.id], "high");
                    setSelectedSubcategory(sub);
                    setSearchQuery(sub.name);
                    setSearchResults(null); // Clear any query search results
                    streamingState.reset(); // Clear streaming state
                    setViewMode("issue-detail");
                  }}
                  onTrackCategory={() => {
                    setTrackedCategoryIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(selectedCategory.id)) next.delete(selectedCategory.id);
                      else next.add(selectedCategory.id);
                      return next;
                    });
                  }}
                  isCategoryTracked={trackedCategoryIds.has(selectedCategory.id)}
                />
              )}

              {/* Issue Detail View — after clicking a subcategory */}
              {viewMode === "issue-detail" && selectedCategory && selectedSubcategory && (
                <IssueDetailView
                  category={selectedCategory}
                  subcategory={selectedSubcategory}
                  geoScope={geoScope}
                  state={geoScope !== "national" ? (selectedState ?? undefined) : undefined}
                  city={geoScope === "city" ? (selectedCity ?? "Little Rock") : undefined}
                  timeFilter={legislativeTimeRange}
                  geoLabel={
                    geoScope === "city"
                      ? selectedCity || "Little Rock"
                      : geoScope === "state"
                        ? selectedState || "Arkansas"
                        : "All US"
                  }
                  signalsCache={legislativeSignalsCache}
                  buildCacheKey={(subId, s, c) => buildLegislativeCacheKey(subId, s, c, legislativeTimeRange)}
                  onSignalsLoaded={handleSignalsLoaded}
                  onMissing={(subId) => queue.enqueue([subId], "high")}
                  loadingSubcategoryId={queue.currentSubcategoryId}
                  onBack={() => {
                    setSearchResults(null);
                    streamingState.reset();
                    setSearchQuery("");
                    setViewMode("subcategory");
                    setSelectedSubcategory(null);
                  }}
                  onTrackIssue={() => {
                    setTrackedSubcategoryIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(selectedSubcategory.id)) next.delete(selectedSubcategory.id);
                      else next.add(selectedSubcategory.id);
                      return next;
                    });
                  }}
                  isTracked={trackedSubcategoryIds.has(selectedSubcategory.id)}
                  isSubscribed={!!hasActiveSubscription}
                  isAuthenticated={isAuthenticated}
                  onSubscribe={() => {
                    if (!isAuthenticated) {
                      setShowAuthModal(true)
                    } else {
                      setShowTrialModal(true)
                    }
                  }}
                />
              )}

              {/* Dashboard — Legislative Signal Overview only (Trending, Suggested, Sources shelved) */}
              {viewMode === "dashboard" && (
                <>
                  {!userTopicsLoaded ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-stone-600">Loading your topics...</p>
                      </div>
                    </div>
                  ) : (
                    <LegislativeSignalOverview
                      city={selectedCity || "Little Rock"}
                      state={selectedState || "AR"}
                      selectedTopicIds={userSelectedTopics ?? []}
                      signalsCache={legislativeSignalsCache}
                      getCacheKey={(subId) => buildLegislativeCacheKey(
                        subId,
                        geoScope !== "national" ? selectedState : null,
                        geoScope === "city" ? selectedCity : null,
                        legislativeTimeRange
                      )}
                      loadingSubcategoryId={queue.currentSubcategoryId}
                      fetchProgress={queue.progress}
                      isQueueComplete={queue.isComplete}
                      onCategoryClick={(categoryId) => {
                        const cat = TAXONOMY.find((c) => c.id === categoryId);
                        if (cat) {
                          // Enqueue all subcategories in this category as HIGH priority
                          // so they load fast when the user enters SubcategoryView.
                          const subcategoryIds = cat.subcategories.map((s) => s.id);
                          console.log("[page.tsx] Category clicked:", {
                            categoryId,
                            categoryName: cat.name,
                            subcategoryIds,
                            geoScope,
                            selectedState,
                            selectedCity,
                            legislativeTimeRange
                          });
                          queue.enqueue(subcategoryIds, "high");
                          setSelectedCategory(cat);
                          setSelectedSubcategory(null);
                          setSearchResults(null); // Clear any query search results
                          streamingState.reset(); // Clear streaming state
                          setViewMode("subcategory");
                        }
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {displayIsSearching && (
          <SearchLoadingView
            streamingState={streamingState}
            selectedSources={selectedSources}
            isStreaming={useStreamingSearchFlag}
            searchProgress={searchProgress}
          />
        )}

        {/* Results State */}
        {displayResults && !displayIsSearching && (
          <SearchResultsView
            results={displayResults}
            streamingState={streamingState}
            isStreaming={useStreamingSearchFlag}
            onBackToDashboard={() => {
              setSearchResults(null)
              setHasSearched(false)
              streamingState.reset()
              setViewMode("dashboard")
              setSelectedCategory(null)
              setSelectedSubcategory(null)
            }}
            selectedSources={selectedSources}
          />
        )}

        {/* Empty State */}
        {!displayResults && !displayIsSearching && hasSearched && (
          <SearchEmptyState
            query={searchQuery}
            onBackToDashboard={() => {
              setHasSearched(false)
              setViewMode("dashboard")
              setSelectedCategory(null)
              setSelectedSubcategory(null)
            }}
          />
        )}

      </main>
    </div>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-gray-200" />
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex gap-3">
            <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
