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
  generateFormatData,
  TopicsTable,
  generateTopicsFromThemes,
  TopPosts,
  ShareModal,
  DashboardTabs,
  SocialPostGrid,
} from "@/app/components/report";
import type { DashboardTab } from "@/app/components/report";
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_insightsError, setInsightsError] = useState<string | null>(null);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);
  const hasTriggeredInsightsRef = useRef(false);
  const insightsPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch report data from API
  const fetchReportData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Check for share token in URL
      const searchParams = new URLSearchParams(window.location.search);
      const shareToken = searchParams.get("token");

      // Build fetch URL
      let url = `/api/report/${params.id}`;
      if (shareToken) {
        url += `?token=${shareToken}`;
      }

      // Try authenticated access if available
      const token = await getAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          // No auth and no valid share - show login
          if (!shareToken) {
            setShowAuthModal(true);
            setIsLoading(false);
            return;
          }
          setError("Share link is invalid or expired");
          setIsLoading(false);
          return;
        }
        if (response.status === 404) {
          setError(shareToken ? "Share link is invalid or expired" : "Report not found");
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to fetch report");
      }

      const data = await response.json();
      setReportData(data);
      setIsOwner(data.isOwner === true);
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [params.id, getAccessToken]);

  // Handle auth check and initial data load
  useEffect(() => {
    if (authLoading) return;

    const searchParams = new URLSearchParams(window.location.search);
    const shareToken = searchParams.get("token");

    // If has share token, proceed without requiring auth
    if (shareToken) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        fetchReportData();
      }
      return;
    }

    // Otherwise check auth
    if (!isAuthenticated) {
      // Try fetching anyway - might be a public report
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        fetchReportData();
      }
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

  const triggerInsights = useCallback(async (): Promise<boolean> => {
    if (hasTriggeredInsightsRef.current) return false;
    hasTriggeredInsightsRef.current = true;
    setInsightsError(null);
    setIsInsightsLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Authentication required to generate insights");
      }

      const response = await fetch(`/api/report/${params.id}/insights`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start insights");
      }

      return true;
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to generate insights");
      setIsInsightsLoading(false);
      hasTriggeredInsightsRef.current = false;
      return false;
    }
  }, [getAccessToken, params.id]);

  const startInsightsPolling = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 12;
    const intervalMs = 10000;

    const poll = async () => {
      attempts += 1;
      await fetchReportData({ silent: true });

      if (attempts >= maxAttempts) {
        setIsInsightsLoading(false);
        return;
      }

      insightsPollTimeoutRef.current = setTimeout(poll, intervalMs);
    };

    insightsPollTimeoutRef.current = setTimeout(poll, 4000);
  }, [fetchReportData]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRetryInsights = useCallback(async () => {
    hasTriggeredInsightsRef.current = false;
    setInsightsError(null);
    const started = await triggerInsights();
    if (started) {
      startInsightsPolling();
    }
  }, [triggerInsights, startInsightsPolling]);

  useEffect(() => {
    if (!reportData || reportData.aiAnalysis || !isOwner) return;
    if (isInsightsLoading) return;

    triggerInsights().then((started) => {
      if (started) {
        startInsightsPolling();
      }
    });
  }, [reportData, isOwner, isInsightsLoading, triggerInsights, startInsightsPolling]);

  useEffect(() => {
    if (reportData?.aiAnalysis) {
      if (insightsPollTimeoutRef.current) {
        clearTimeout(insightsPollTimeoutRef.current);
      }
      setIsInsightsLoading(false);
      setInsightsError(null);
    }
  }, [reportData?.aiAnalysis]);

  useEffect(() => {
    return () => {
      if (insightsPollTimeoutRef.current) {
        clearTimeout(insightsPollTimeoutRef.current);
      }
    };
  }, []);

  // Sync tab state with URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam === "social-posts") {
      setActiveTab("social-posts");
    }
  }, []);

  // Handle tab change with URL persistence
  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

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
                  {/* Share Button - only show for owner */}
                  {isOwner && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Share report"
                      title="Share report"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    </button>
                  )}
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

          {/* Tab Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <DashboardTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {/* Dashboard Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Overview Tab Content */}
            {activeTab === "overview" && (
              <>
                {/* AI Summary - Full Width */}
                {reportData.aiAnalysis && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Summary</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {renderSummaryWithHighlights(reportData.aiAnalysis.interpretation)}
                    </p>

                    {/* Sentiment Commentary */}
                    {reportData.aiAnalysis.sentimentBreakdown && (
                      <div className="mt-4 rounded-lg bg-gray-50 p-3">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Sentiment: </span>
                          <span className={`capitalize ${
                            reportData.aiAnalysis.sentimentBreakdown.overall === "positive" ? "text-green-600" :
                            reportData.aiAnalysis.sentimentBreakdown.overall === "negative" ? "text-red-600" :
                            reportData.aiAnalysis.sentimentBreakdown.overall === "mixed" ? "text-yellow-600" :
                            "text-gray-600"
                          }`}>
                            {reportData.aiAnalysis.sentimentBreakdown.overall}
                          </span>
                          {" - "}{reportData.aiAnalysis.sentimentBreakdown.summary}
                        </p>
                      </div>
                    )}
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
                      intentions={reportData.aiAnalysis.intentionsBreakdown}
                      formats={generateFormatData(reportData.posts)}
                    />
                  )}
                </div>

                {/* Topics Table - Full Width */}
                {reportData.aiAnalysis?.keyThemes && (
                  <TopicsTable
                    topics={generateTopicsFromThemes(
                      reportData.aiAnalysis.keyThemes,
                      reportData.metrics.totalEngagement * 15,
                      reportData.metrics.totalEngagement,
                      reportData.aiAnalysis.topicAnalysis,
                      reportData.posts
                    )}
                  />
                )}

                {/* Top Posts - Full Width */}
                <TopPosts posts={reportData.topPosts} limit={5} />
              </>
            )}

            {/* Social Posts Tab Content */}
            {activeTab === "social-posts" && (
              <>
                {/* Social Posts Grid */}
                <SocialPostGrid posts={reportData.posts} />
              </>
            )}
          </main>
        </div>
      )}

      {/* Share Modal */}
      {reportData && (
        <ShareModal
          isOpen={showShareModal}
          reportId={reportData.report.id}
          reportQuery={reportData.report.query}
          onClose={() => setShowShareModal(false)}
          getAccessToken={getAccessToken}
        />
      )}
    </div>
  );
}
