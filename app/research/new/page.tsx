"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

const SOURCES = [
  { id: "reddit", name: "Reddit", enabled: true, icon: "🔴" },
  { id: "tiktok", name: "TikTok", enabled: false, icon: "🎵" },
  { id: "instagram", name: "Instagram", enabled: false, icon: "📷" },
  { id: "x", name: "X", enabled: false, icon: "✖️" },
  { id: "youtube", name: "YouTube", enabled: false, icon: "▶️" },
  { id: "facebook", name: "Facebook", enabled: false, icon: "📘" },
  { id: "threads", name: "Threads", enabled: false, icon: "🧵" },
  { id: "bluesky", name: "Bluesky", enabled: false, icon: "🦋" },
];

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

export default function ResearchDashboard() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState(["reddit"]);
  const [timeFilter, setTimeFilter] = useState("3m");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "";

  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter((id) => id !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };

  const handleStartResearch = () => {
    // Placeholder for research creation
    alert("Research starting with: " + selectedSources.join(", "));
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
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
            <Link href="/research/new" className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue text-white">
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
              {firstName ? firstName[0].toUpperCase() : "U"}
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
      <main className="flex-1 lg:ml-20">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Hero section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-[#2C2C2C]" data-testid="dashboard-greeting">
              Hello{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-2 text-lg text-[#666666]">
              Discover civic conversations across social platforms
            </p>
            <p className="mt-1 text-sm text-[#666666]">Welcome back!</p>
          </div>

          {/* Search module */}
          <div className="rounded-2xl bg-white p-8 shadow-md">
            {/* Search input */}
            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search an issue, candidate, or ballot measure"
                className="w-full rounded-lg border-2 border-gray-200 px-6 py-4 text-lg transition focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
                data-testid="search-input"
              />
            </div>

            {/* Source filter chips */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-[#2C2C2C]">
                Sources
              </label>
              <div className="flex flex-wrap gap-2 overflow-x-auto">
                {SOURCES.map((source) => {
                  const isSelected = selectedSources.includes(source.id);
                  const isComingSoon = !source.enabled;

                  return (
                    <div
                      key={source.id}
                      className="relative"
                      onMouseEnter={() =>
                        isComingSoon && setHoveredSource(source.id)
                      }
                      onMouseLeave={() => setHoveredSource(null)}
                    >
                      <button
                        onClick={() => toggleSource(source.id)}
                        className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 ${
                          isSelected
                            ? "border-accent-blue bg-accent-blue text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-accent-blue"
                        }`}
                        data-testid={`source-chip-${source.id}`}
                      >
                        <span>{source.icon}</span>
                        <span>{source.name}</span>
                      </button>

                      {/* Coming soon tooltip */}
                      {isComingSoon && hoveredSource === source.id && (
                        <div
                          className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-3 py-1 text-xs text-white"
                          data-testid={`coming-soon-${source.id}`}
                        >
                          Coming soon
                          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filters row */}
            <div className="mb-6 flex flex-wrap gap-3">
              {/* Time filter */}
              <div className="relative">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="appearance-none rounded-full border-2 border-gray-300 bg-white px-4 py-2 pr-10 text-sm font-medium text-gray-700 transition hover:border-accent-blue focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
                  data-testid="time-filter"
                >
                  {TIME_FILTERS.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      📅 {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location filter */}
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="appearance-none rounded-full border-2 border-gray-300 bg-white px-4 py-2 pr-10 text-sm font-medium text-gray-700 transition hover:border-accent-blue focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
                  data-testid="location-filter"
                >
                  {LOCATION_FILTERS.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      🗺️ {filter.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start research button */}
            <button
              onClick={handleStartResearch}
              disabled={selectedSources.length === 0 || !searchQuery.trim()}
              className="w-full rounded-lg bg-accent-blue px-6 py-4 text-lg font-semibold text-white transition hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
              data-testid="start-research-btn"
            >
              Start Research
            </button>
          </div>

          {/* Empty state / Recent research */}
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-md">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-[#2C2C2C]">
              No research yet
            </h3>
            <p className="mt-2 text-sm text-[#666666]">
              Start by searching above.
            </p>
          </div>

          {/* Footer info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#666666]">
              Monitor public conversations and sentiment across major social
              platforms.
            </p>
            <button className="mt-2 inline-flex items-center gap-1 text-sm text-accent-blue hover:underline">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              How to use Civic Voices
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
