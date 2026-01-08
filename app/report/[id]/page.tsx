"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";
import {
  ActivityChart,
  MetricsRow,
  EmotionsBreakdown,
  convertSentimentToEmotions,
  ContentBreakdown,
  generateCategoryData,
  TopicsTable,
  generateTopicsFromThemes,
  PlatformBreakdown,
  TopPosts,
} from "@/app/components/report";
import type { Post, AIAnalysis } from "@/lib/types/api";
import type { JobStatus } from "@prisma/client";

interface ReportMetrics {
  totalMentions: number;
  totalEngagement: number;
  avgEngagement: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  platformBreakdown: Record<string, number>;
}

interface ActivityDataPoint {
  date: string;
  count: number;
  engagement: number;
}

interface ReportData {
  report: {
    id: string;
    query: string;
    sources: string[];
    status: JobStatus;
    createdAt: string;
    completedAt: string | null;
  };
  metrics: ReportMetrics;
  activityOverTime: ActivityDataPoint[];
  posts: Array<Post & { sentiment: "positive" | "negative" | "neutral" | null }>;
  aiAnalysis: AIAnalysis | null;
  topPosts: Array<Post & { sentiment: "positive" | "negative" | "neutral" | null }>;
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

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, loading: authLoading, getAccessToken } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setShowAuthModal(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/report/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setShowAuthModal(true);
          setIsLoading(false);
          return;
        }
        if (response.status === 404) {
          setError("Report not found");
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to fetch report");
      }

      const data: ReportData = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, getAccessToken]);

  // Handle auth check and initial data load
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      setIsLoading(false);
    } else if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setShowAuthModal(false);
      fetchReportData();
    }
  }, [authLoading, isAuthenticated, fetchReportData]);

  // Handle successful auth
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    hasLoadedRef.current = true;
    fetchReportData();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get overall sentiment label
  const getOverallSentiment = (sentiment: ReportMetrics["sentimentBreakdown"]): "positive" | "negative" | "neutral" | "mixed" => {
    const { positive, negative, neutral } = sentiment;
    if (positive >= negative && positive >= neutral) return "positive";
    if (negative >= positive && negative >= neutral) return "negative";
    return "mixed";
  };

  // Render summary with bold highlights for key phrases
  const renderSummaryWithHighlights = (text: string): React.ReactNode => {
    // Parse **bold** markers
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
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
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
            <p className="text-gray-600">Loading report...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-red-500">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">{error}</p>
            <button
              onClick={() => router.push("/search")}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Back to Search
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!authLoading && !isLoading && !error && reportData && (
        <div className="flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <button
                      onClick={() => router.push("/search")}
                      className="hover:text-gray-700 flex items-center gap-1"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Search
                    </button>
                    <span>•</span>
                    <span>Report</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900" data-testid="report-query">
                    {reportData.report.query}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  {/* Sources */}
                  <div className="flex items-center gap-2">
                    {reportData.report.sources.map((source) => (
                      <span
                        key={source}
                        className="flex items-center gap-1 text-gray-600 bg-gray-100 rounded-full px-3 py-1 text-sm"
                      >
                        {SOURCE_ICONS[source]}
                        <span className="capitalize">{source === "x" ? "X" : source}</span>
                      </span>
                    ))}
                  </div>
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      reportData.report.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : reportData.report.status === "RUNNING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {reportData.report.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Generated on {formatDate(reportData.report.createdAt)}
              </p>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* AI Summary - Full Width */}
            {reportData.aiAnalysis && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Summary</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {renderSummaryWithHighlights(reportData.aiAnalysis.interpretation)}
                </p>
              </div>
            )}

            {/* Metrics Row - Full Width */}
            <MetricsRow
              totalMentions={reportData.metrics.totalMentions}
              totalEngagement={reportData.metrics.totalEngagement}
              avgEngagement={reportData.metrics.avgEngagement}
              overallSentiment={getOverallSentiment(reportData.metrics.sentimentBreakdown)}
            />

            {/* Activity Chart - Full Width */}
            <ActivityChart data={reportData.activityOverTime} />

            {/* Two Column: Emotions + Content Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emotions Breakdown */}
              <EmotionsBreakdown
                emotions={convertSentimentToEmotions(reportData.metrics.sentimentBreakdown)}
                total={
                  reportData.metrics.sentimentBreakdown.positive +
                  reportData.metrics.sentimentBreakdown.neutral +
                  reportData.metrics.sentimentBreakdown.negative
                }
              />

              {/* Content Breakdown */}
              {reportData.aiAnalysis?.keyThemes && (
                <ContentBreakdown
                  categories={generateCategoryData(reportData.aiAnalysis.keyThemes)}
                />
              )}
            </div>

            {/* Topics Table - Full Width */}
            {reportData.aiAnalysis?.keyThemes && (
              <TopicsTable
                topics={generateTopicsFromThemes(
                  reportData.aiAnalysis.keyThemes,
                  reportData.metrics.totalEngagement * 15,
                  reportData.metrics.totalEngagement
                )}
              />
            )}

            {/* Platform & Top Posts - Two Column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Breakdown */}
              <PlatformBreakdown platforms={reportData.metrics.platformBreakdown} />

              {/* Top Posts */}
              <TopPosts posts={reportData.topPosts} limit={5} />
            </div>

            {/* All Posts Section - Collapsible */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">
                  All Posts ({reportData.posts.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {reportData.posts.map((post) => (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-5 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 mt-0.5">
                        {SOURCE_ICONS[post.platform]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {post.author}
                          </span>
                          <span className="text-gray-400 text-xs">
                            @{post.authorHandle}
                          </span>
                          {post.sentiment && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                post.sentiment === "positive"
                                  ? "bg-green-50 text-green-700"
                                  : post.sentiment === "negative"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-50 text-gray-600"
                              }`}
                            >
                              {post.sentiment}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{post.text}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
