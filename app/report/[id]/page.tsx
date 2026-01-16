"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useToast } from "@/app/contexts/ToastContext";
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
  MobileBottomNav,
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

// Platform display names for sentiment component
const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  bluesky: "Bluesky",
  truthsocial: "Truth Social",
  reddit: "Reddit",
  linkedin: "LinkedIn",
};

// Platform sentiment type
interface PlatformSentimentData {
  platform: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

// Calculate sentiment breakdown per platform
function calculatePlatformSentiment(
  posts: Array<Post & { sentiment: "positive" | "negative" | "neutral" | null }>
): PlatformSentimentData[] {
  const platformMap = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();

  posts.forEach((post) => {
    if (!platformMap.has(post.platform)) {
      platformMap.set(post.platform, { positive: 0, negative: 0, neutral: 0, total: 0 });
    }
    const data = platformMap.get(post.platform)!;
    data.total++;
    if (post.sentiment === "positive") data.positive++;
    else if (post.sentiment === "negative") data.negative++;
    else data.neutral++;
  });

  return Array.from(platformMap.entries())
    .map(([platform, data]) => ({ platform, ...data }))
    .sort((a, b) => b.total - a.total);
}

// Platform Sentiment component
function PlatformSentiment({
  posts,
}: {
  posts: Array<Post & { sentiment: "positive" | "negative" | "neutral" | null }>;
}) {
  const platformData = calculatePlatformSentiment(posts);

  if (platformData.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 sm:mb-4">Platform Sentiment</h3>
      <div className="space-y-3 sm:space-y-4">
        {platformData.map(({ platform, positive, negative, neutral, total }) => {
          const positivePercent = total > 0 ? Math.round((positive / total) * 100) : 0;
          const negativePercent = total > 0 ? Math.round((negative / total) * 100) : 0;
          const neutralPercent = total > 0 ? Math.round((neutral / total) * 100) : 0;

          return (
            <div key={platform} className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-800">
                  {PLATFORM_LABELS[platform] || platform}
                </span>
              </div>
              {/* Sentiment bar */}
              <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                {positivePercent > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${positivePercent}%` }}
                    title={`Positive: ${positivePercent}%`}
                  />
                )}
                {neutralPercent > 0 && (
                  <div
                    className="bg-gray-400 transition-all"
                    style={{ width: `${neutralPercent}%` }}
                    title={`Neutral: ${neutralPercent}%`}
                  />
                )}
                {negativePercent > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${negativePercent}%` }}
                    title={`Negative: ${negativePercent}%`}
                  />
                )}
              </div>
              {/* Percentages - wrap on mobile */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-4 text-[10px] sm:text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {positivePercent}% pos
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                  {neutralPercent}% neu
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  {negativePercent}% neg
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const { showToast } = useToast();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
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
          setError("Share link is invalid or has been revoked");
          setIsLoading(false);
          return;
        }
        if (response.status === 404) {
          setError(shareToken ? "Share link is invalid or has been revoked" : "Report not found");
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

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (isDownloadingPDF || !reportData) return;

    setIsDownloadingPDF(true);
    showToast({ message: "Generating PDF report...", duration: 30000 });

    try {
      const token = await getAccessToken();
      const searchParams = new URLSearchParams(window.location.search);
      const shareToken = searchParams.get("token");

      console.log("[PDF Download] Starting download:", {
        reportId: params.id,
        hasToken: !!token,
        hasShareToken: !!shareToken,
        isOwner,
      });

      let url = `/api/report/${params.id}/pdf`;
      if (shareToken) {
        url += `?token=${shareToken}`;
      }

      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[PDF Download] Error response:", errorData);
        const debugInfo = errorData.debug ? ` (auth: ${errorData.debug.hasAuth}, token: ${errorData.debug.hasShareToken})` : "";
        throw new Error((errorData.error || "Failed to generate PDF") + debugInfo);
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${reportData.report.query.replace(/[^a-z0-9]/gi, "_")}_report.pdf`;

      // Download the PDF
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      showToast({ message: "PDF downloaded successfully!", duration: 3000 });
    } catch (err) {
      console.error("PDF download failed:", err);
      showToast({
        message: err instanceof Error ? err.message : "Failed to download PDF",
        duration: 5000,
      });
    } finally {
      setIsDownloadingPDF(false);
    }
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              {/* Mobile: Stack vertically, Desktop: Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Left side: Back + Title */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => router.push("/search")}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="hidden sm:inline">Back to Search</span>
                    <span className="sm:hidden">Back</span>
                  </button>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 line-clamp-2" data-testid="report-query">
                    {reportData.report.query}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Generated on {formatDate(reportData.report.createdAt)}
                  </p>
                </div>

                {/* Right side: Sources + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Sources - horizontal scroll on mobile */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
                    {reportData.report.sources.map((source) => (
                      <span
                        key={source}
                        className="flex-shrink-0 flex items-center gap-1 text-gray-600 bg-gray-100 rounded-full px-3 py-1 text-sm"
                      >
                        {SOURCE_ICONS[source]}
                        <span className="capitalize">{source === "x" ? "X" : source}</span>
                      </span>
                    ))}
                    {/* Status Badge - inline with sources on mobile */}
                    <span
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
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

                  {/* Desktop-only action buttons (moved to bottom nav on mobile) */}
                  <div className="hidden sm:flex items-center gap-2">
                    {/* Download PDF Button */}
                    {reportData.report.status === "COMPLETED" && (
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloadingPDF}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Download PDF report"
                        title="Download PDF report"
                      >
                        {isDownloadingPDF ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        )}
                      </button>
                    )}
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
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Tab Bar - hidden on mobile (moved to bottom nav) */}
          <div className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <DashboardTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {/* Dashboard Content - extra bottom padding on mobile for bottom nav */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6 space-y-4 sm:space-y-6">
            {/* Overview Tab Content */}
            {activeTab === "overview" && (
              <>
                {/* AI Summary - Full Width */}
                {reportData.aiAnalysis && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 sm:mb-3">Summary</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {renderSummaryWithHighlights(reportData.aiAnalysis.interpretation)}
                    </p>

                    {/* Sentiment Commentary */}
                    {reportData.aiAnalysis.sentimentBreakdown && (
                      <div className="mt-3 sm:mt-4 rounded-lg bg-gray-50 p-3">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

                {/* Platform Sentiment - Full Width */}
                {reportData.posts.length > 0 && (
                  <PlatformSentiment posts={reportData.posts} />
                )}

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
                    onViewMore={() => handleTabChange("social-posts")}
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

      {/* Mobile Bottom Navigation */}
      {reportData && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onShare={() => setShowShareModal(true)}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
