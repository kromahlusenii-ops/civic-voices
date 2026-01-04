"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import SourceFilter from "../../components/SourceFilter";

const TIME_FILTERS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "3m", label: "Last 3 months" },
  { id: "12m", label: "Last 12 months" },
];

const LOCATION_FILTERS = [
  { id: "all", label: "All regions" },
  { id: "us", label: "United States" },
  { id: "nc", label: "North Carolina" },
  { id: "dc", label: "Washington DC" },
  { id: "custom", label: "Custom..." },
];

function SearchPageContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState(["x", "tiktok"]);
  const [timeFilter, setTimeFilter] = useState("3m");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Check if user came from "Log In" button
  useEffect(() => {
    if (searchParams.get("auth") === "true" && !isAuthenticated && !loading) {
      setShowAuthModal(true);
    }
  }, [searchParams, isAuthenticated, loading]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const executeSearch = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          sources: selectedSources,
          timeFilter,
          locationFilter,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Search failed");
      }

      const data = await response.json();

      // Store results in sessionStorage for the results page
      sessionStorage.setItem("searchResults", JSON.stringify(data));
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({
          query: searchQuery,
          sources: selectedSources,
          timeFilter,
          locationFilter,
        })
      );

      // Save search to database (don't block navigation if it fails)
      if (isAuthenticated && user) {
        try {
          // Get Firebase ID token
          const idToken = await user.getIdToken();

          await fetch("/api/search/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              queryText: searchQuery,
              sources: selectedSources,
              filters: {
                timeFilter,
                locationFilter,
              },
            }),
          });
        } catch (saveError) {
          console.error("Failed to save search to database:", saveError);
          // Continue with navigation even if save fails
        }
      }

      // Navigate to report page with URL params
      const reportId = Date.now().toString();
      const params = new URLSearchParams();
      params.set("message", searchQuery);
      selectedSources.forEach(s => params.append("sources", s));
      params.set("time", timeFilter);
      params.set("location", locationFilter);
      window.location.href = `/report/${reportId}?${params.toString()}`;
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsSearching(false);
      setPendingSearch(false);
    }
  };

  const handleStartResearch = () => {
    // If not authenticated, show modal and mark search as pending
    if (!isAuthenticated) {
      setPendingSearch(true);
      setShowAuthModal(true);
      return;
    }

    // If authenticated, execute search immediately
    executeSearch();
  };

  const handleAuthSuccess = () => {
    // After successful auth, execute search if it was pending
    if (pendingSearch && searchQuery.trim()) {
      executeSearch();
    }
  };

  // Get display names for selected values
  const getTimeLabel = () => {
    return TIME_FILTERS.find((f) => f.id === timeFilter)?.label || "Time";
  };

  const getLocationLabel = () => {
    return LOCATION_FILTERS.find((f) => f.id === locationFilter)?.label || "Location";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-20 transform bg-white shadow-lg transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-between py-6">
          {/* Top section */}
          <div className="flex flex-col items-center space-y-6">
            {/* Logo */}
            <Link href="/search" className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue text-white">
              <span className="text-xl font-bold">CV</span>
            </Link>

            {/* Primary actions */}
            <button
              aria-label="New Research"
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-accent-blue hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
              data-testid="new-research-btn"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>

            <button
              aria-label="Search"
              className="flex h-12 w-12 items-center justify-center rounded-lg transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            <button
              aria-label="Notifications"
              className="relative flex h-12 w-12 items-center justify-center rounded-lg transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col items-center space-y-4">
            <button
              aria-label="User profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
            >
              {isAuthenticated ? (user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U") : "?"}
            </button>

            <button
              aria-label="Settings"
              className="flex h-12 w-12 items-center justify-center rounded-lg transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-h-screen flex-1 items-center justify-center lg:ml-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Hero section */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-normal text-[#9CA3AF]" data-testid="dashboard-greeting">
              {isAuthenticated && user?.displayName
                ? `Hello, ${user.displayName.split(' ')[0]}`
                : "Discover what people buzz about"}
            </h1>
          </div>

          {/* Search module */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            {/* Search bar with button */}
            <div className="mb-4 flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search an issue, candidate, or ballot measure"
                  className="w-full rounded-lg border border-gray-300 px-5 py-3.5 text-base transition focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  data-testid="search-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim() && selectedSources.length > 0) {
                      handleStartResearch();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleStartResearch}
                disabled={selectedSources.length === 0 || !searchQuery.trim() || isSearching}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                data-testid="start-research-btn"
                aria-label="Start research"
              >
                {isSearching ? (
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Error message */}
            {searchError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {searchError}
              </div>
            )}

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {/* Source filter */}
              <SourceFilter
                selectedSources={selectedSources}
                onSourcesChange={setSelectedSources}
                updateUrlParams={false}
              />

              {/* Time filter dropdown */}
              <div className="relative" ref={timeDropdownRef}>
                <button
                  onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                  className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
                  data-testid="time-filter-chip"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{getTimeLabel()}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showTimeDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Time dropdown menu */}
                {showTimeDropdown && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                    {TIME_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => {
                          setTimeFilter(filter.id);
                          setShowTimeDropdown(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-gray-50"
                        data-testid={`time-option-${filter.id}`}
                      >
                        <span>{filter.label}</span>
                        {timeFilter === filter.id && (
                          <svg
                            className="h-5 w-5 text-accent-blue"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location filter dropdown */}
              <div className="relative" ref={locationDropdownRef}>
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
                  data-testid="location-filter-chip"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{getLocationLabel()}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showLocationDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Location dropdown menu */}
                {showLocationDropdown && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                    {LOCATION_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => {
                          setLocationFilter(filter.id);
                          setShowLocationDropdown(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-gray-50"
                        data-testid={`location-option-${filter.id}`}
                      >
                        <span>{filter.label}</span>
                        {locationFilter === filter.id && (
                          <svg
                            className="h-5 w-5 text-accent-blue"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
