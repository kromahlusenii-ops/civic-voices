"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import Image from "next/image";
import type { SearchResponse, Post } from "@/lib/types/api";
import SourceFilter from "@/components/SourceFilter";

interface SearchParams {
  query: string;
  sources: string[];
  timeFilter: string;
  locationFilter: string;
}

export default function ResearchJobPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/search?auth=true");
    }
  }, [isAuthenticated, loading, router]);

  // Load search results from sessionStorage
  useEffect(() => {
    if (!isAuthenticated) return; // Don't load results if not authenticated

    const storedResults = sessionStorage.getItem("searchResults");
    const storedParams = sessionStorage.getItem("searchParams");

    if (!storedResults || !storedParams) {
      // No results found - redirect back to search
      router.push("/search");
      return;
    }

    try {
      const parsedResults = JSON.parse(storedResults);
      const parsedParams = JSON.parse(storedParams);

      setResults(parsedResults);
      setSearchParams(parsedParams);
      setSelectedSources(parsedParams.sources || []);
      setFilteredPosts(parsedResults.posts || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error parsing search results:", error);
      router.push("/search");
    }
  }, [router, isAuthenticated]);

  // Filter posts by selected sources
  useEffect(() => {
    if (!results) return;

    if (selectedSources.length === 0) {
      setFilteredPosts(results.posts);
    } else {
      const filtered = results.posts.filter((post) =>
        selectedSources.includes(post.platform)
      );
      setFilteredPosts(filtered);
    }
  }, [selectedSources, results]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-accent-blue"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results || !searchParams) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900" data-testid="results-query">
                {searchParams.query}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {results.summary.totalPosts} posts from {selectedSources.length} source
                {selectedSources.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => router.push("/search")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              New Search
            </button>
          </div>

          {/* Source Filter */}
          <div className="mt-4">
            <SourceFilter
              selectedSources={selectedSources}
              onSourcesChange={setSelectedSources}
              updateUrlParams={true}
            />
          </div>
        </div>
      </header>

      {/* Split-screen layout */}
      <div className="flex flex-1">
        {/* AI Analysis Panel (Left) */}
        <div className="w-1/2 overflow-y-auto border-r border-gray-200 bg-white p-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Analysis</h2>

            {/* Sentiment Overview */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Sentiment</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Positive</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(results.summary.sentiment.positive / results.summary.totalPosts) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {results.summary.sentiment.positive}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Neutral</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-gray-400"
                        style={{
                          width: `${(results.summary.sentiment.neutral / results.summary.totalPosts) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {results.summary.sentiment.neutral}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Negative</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${(results.summary.sentiment.negative / results.summary.totalPosts) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {results.summary.sentiment.negative}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Breakdown */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Platform Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(results.summary.platforms).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-gray-600">{platform}</span>
                    <span className="text-sm font-medium text-gray-900">{count} posts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Placeholder for future AI insights */}
            <div className="mt-6 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-500">
                AI-generated insights coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Posts Feed Panel (Right) */}
        <div className="w-1/2 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Posts ({filteredPosts.length})
            </h2>

            {filteredPosts.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-600">No posts found for selected sources</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-md"
                    data-testid="post-card"
                  >
                    {/* Post Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {post.authorAvatar && (
                          <Image
                            src={post.authorAvatar}
                            alt={post.author}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{post.author}</p>
                          <p className="text-sm text-gray-500">{post.authorHandle}</p>
                        </div>
                      </div>
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                        {post.platform}
                      </span>
                    </div>

                    {/* Post Content */}
                    <p className="mb-3 text-gray-800">{post.text}</p>

                    {/* Post Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>❤️ {post.engagement.likes.toLocaleString()}</span>
                      <span>💬 {post.engagement.comments.toLocaleString()}</span>
                      <span>🔁 {post.engagement.shares.toLocaleString()}</span>
                      {post.engagement.views && (
                        <span>👁️ {post.engagement.views.toLocaleString()}</span>
                      )}
                    </div>

                    {/* Post Link */}
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-accent-blue hover:underline"
                      >
                        View original →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
