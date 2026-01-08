"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface SavedSearch {
  id: string;
  name: string;
  queryText: string;
  sources: string[];
  filters: Record<string, unknown>;
  createdAt: string;
  reportId: string | null;
  totalResults: number;
}

interface GroupedSearches {
  recent: SavedSearch[];
  previous7Days: SavedSearch[];
  previous30Days: SavedSearch[];
  older: SavedSearch[];
}

// Export for testing
export function groupSearchesByDate(searches: SavedSearch[]): GroupedSearches {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: GroupedSearches = {
    recent: [],
    previous7Days: [],
    previous30Days: [],
    older: [],
  };

  searches.forEach((search) => {
    const searchDate = new Date(search.createdAt);
    const searchDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());

    if (searchDay >= today) {
      groups.recent.push(search);
    } else if (searchDay >= sevenDaysAgo) {
      groups.previous7Days.push(search);
    } else if (searchDay >= thirtyDaysAgo) {
      groups.previous30Days.push(search);
    } else {
      groups.older.push(search);
    }
  });

  return groups;
}

interface SearchHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function SearchHistorySidebar({ isOpen, onClose, onMouseEnter, onMouseLeave }: SearchHistorySidebarProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fetchSearchHistory = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session");
      }
      const response = await fetch("/api/search/history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch search history");
      }

      const data = await response.json();
      setSearches(data.searches);
    } catch (err) {
      console.error("Error fetching search history:", err);
      setError("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      fetchSearchHistory();
    }
  }, [isOpen, isAuthenticated, user, fetchSearchHistory]);

  const handleSearchClick = (search: SavedSearch) => {
    if (search.reportId) {
      router.push(`/report/${search.reportId}?message=${encodeURIComponent(search.queryText)}`);
    } else {
      router.push(`/search?message=${encodeURIComponent(search.queryText)}`);
    }
  };

  const handleMenuClick = (e: React.MouseEvent, searchId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === searchId ? null : searchId);
  };

  const handleDelete = async (e: React.MouseEvent, searchId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    // TODO: Implement delete functionality
    console.log("Delete search:", searchId);
  };

  const handleRename = (e: React.MouseEvent, searchId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    // TODO: Implement rename functionality
    console.log("Rename search:", searchId);
  };

  const groupedSearches = groupSearchesByDate(searches);

  const renderSearchGroup = (title: string, items: SavedSearch[], testId: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4" data-testid={testId}>
        <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
        <ul className="space-y-0.5">
          {items.map((search) => (
            <li
              key={search.id}
              className="relative"
              onMouseEnter={() => setHoveredId(search.id)}
              onMouseLeave={() => {
                setHoveredId(null);
                if (menuOpenId === search.id) setMenuOpenId(null);
              }}
            >
              <button
                onClick={() => handleSearchClick(search)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center justify-between group"
                data-testid={`sidebar-search-item-${search.id}`}
              >
                <span className="truncate flex-1 pr-2">{search.name}</span>

                {/* Kebab menu button */}
                {(hoveredId === search.id || menuOpenId === search.id) && (
                  <button
                    onClick={(e) => handleMenuClick(e, search.id)}
                    className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    data-testid={`search-menu-btn-${search.id}`}
                    aria-label="More options"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                )}
              </button>

              {/* Dropdown menu */}
              {menuOpenId === search.id && (
                <div
                  className="absolute right-2 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  data-testid={`search-dropdown-${search.id}`}
                >
                  <button
                    onClick={(e) => handleRename(e, search.id)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, search.id)}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-16 z-30 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? "w-64 opacity-100" : "w-0 opacity-0 overflow-hidden"
      }`}
      data-testid="search-history-sidebar"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 min-w-64">
        <h2 className="text-sm font-semibold text-gray-900 whitespace-nowrap">Search History</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          aria-label="Close sidebar"
          data-testid="close-sidebar-btn"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2 min-w-64">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchSearchHistory}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Try again
            </button>
          </div>
        ) : searches.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <svg className="h-10 w-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-500 whitespace-nowrap">No search history</p>
            <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">Your searches will appear here</p>
          </div>
        ) : (
          <>
            {renderSearchGroup("Recent", groupedSearches.recent, "group-recent")}
            {renderSearchGroup("Previous 7 days", groupedSearches.previous7Days, "group-7days")}
            {renderSearchGroup("Previous 30 days", groupedSearches.previous30Days, "group-30days")}
            {renderSearchGroup("Older", groupedSearches.older, "group-older")}
          </>
        )}
      </div>
    </aside>
  );
}
