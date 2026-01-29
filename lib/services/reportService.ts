/**
 * Report Service
 *
 * Orchestrates report generation, sentiment classification, and data aggregation.
 * Manages the lifecycle of research jobs and provides report data for the dashboard.
 */

import { prisma } from "@/lib/prisma";
import { JobStatus, Prisma, Source } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { getSendGridClient, isSendGridEnabled, buildReportReadyEmail } from "@/lib/sendgrid";
import {
  SentimentClassificationService,
  type Sentiment,
} from "./sentimentClassification";
import AIAnalysisService from "./aiAnalysis";
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider";
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider";
import SociaVaultApiService from "@/lib/services/sociaVaultApi";
import { config } from "@/lib/config";
import { maskEmail } from "@/lib/utils/logging";
import type { Post, AIAnalysis } from "@/lib/types/api";

// Comment data structure for multi-platform support
export interface PostComments {
  parentId: string;
  platform: string;
  comments: Post[];
}

// Progress event types for streaming report generation
export type ReportProgressStep =
  | "initializing"
  | "fetching_data"
  | "sentiment_analysis"
  | "fetching_comments"
  | "calculating_metrics"
  | "ai_analysis";

export interface ReportProgressEvent {
  type: "connected" | "progress" | "complete" | "error";
  step?: ReportProgressStep;
  message: string;
  reportId?: string;
}

export type ProgressCallback = (event: ReportProgressEvent) => void;

const TRANSACTION_TIMEOUT_MS = Number(
  process.env.PRISMA_TRANSACTION_TIMEOUT_MS ?? 30000
);
const SENTIMENT_BATCH_SIZE = Number(
  process.env.PRISMA_SENTIMENT_BATCH_SIZE ?? 200
);
const SENTIMENT_API_BATCH_SIZE = Number(
  process.env.SENTIMENT_API_BATCH_SIZE ?? 30
);
const SENTIMENT_API_MAX_CONCURRENT = Number(
  process.env.SENTIMENT_API_MAX_CONCURRENT ?? 10
);
const SENTIMENT_MAX_POSTS = Number(
  process.env.SENTIMENT_MAX_POSTS ?? 150
);
// Default to NOT deferring insights - AI analysis runs during report generation
const DEFER_REPORT_INSIGHTS = process.env.REPORT_DEFER_INSIGHTS === "true";
const REPORT_AI_MAX_POSTS = Number(process.env.REPORT_AI_MAX_POSTS ?? 100);
const REPORT_AI_MAX_COMMENT_POSTS = Number(
  process.env.REPORT_AI_MAX_COMMENT_POSTS ?? 25
);
const REPORT_AI_MAX_COMMENTS_PER_POST = Number(
  process.env.REPORT_AI_MAX_COMMENTS_PER_POST ?? 30
);

/**
 * Get the base URL for share links
 * Priority: NEXT_PUBLIC_APP_URL > production default > localhost
 * Note: We avoid VERCEL_URL as it returns deployment-specific URLs that may redirect
 * and lose query parameters like the share token
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Production default - use the official domain
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://civicvoices.ai";
  }
  // For preview deployments, use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

type PrismaClientLike = Prisma.TransactionClient | PrismaClient;

/**
 * Send "Report Ready" email notification to user
 */
async function sendReportReadyEmail(
  userEmail: string,
  reportId: string,
  searchQuery: string,
  totalPosts: number,
  topInsight?: string
): Promise<void> {
  if (!isSendGridEnabled()) {
    console.log("[Report] SendGrid not configured for report ready emails, skipping");
    return;
  }

  try {
    const sendgrid = getSendGridClient();
    const appUrl = getBaseUrl();

    // Generate a share token so the email link works without authentication
    // (e.g., in Gmail's in-app browser which has no Supabase session)
    let shareToken: string | null = null;
    try {
      const job = await prisma.researchJob.findUnique({
        where: { id: reportId },
        select: { shareToken: true },
      });

      if (job?.shareToken) {
        shareToken = job.shareToken;
      } else {
        shareToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await prisma.researchJob.update({
          where: { id: reportId },
          data: {
            shareToken,
            shareTokenCreatedAt: new Date(),
            shareTokenExpiresAt: expiresAt,
          },
        });
      }
    } catch (tokenError) {
      console.error("[Report] Failed to generate share token for email:", tokenError);
    }

    const reportUrl = shareToken
      ? `${appUrl}/report/${reportId}?token=${shareToken}`
      : `${appUrl}/report/${reportId}`;

    const { subject, html } = buildReportReadyEmail({
      searchQuery,
      totalPosts,
      reportUrl,
      topInsight: topInsight || `Analysis of ${totalPosts} social media posts about "${searchQuery}"`,
    });

    const response = await sendgrid.send({ to: userEmail, subject, html });

    if (response.success) {
      console.log(`[Report] Report ready email sent to ${maskEmail(userEmail)} for report ${reportId}`);
    } else {
      console.error(`[Report] Failed to send report ready email: ${response.error}`);
    }
  } catch (error) {
    console.error("[Report] Error sending report ready email:", error);
    // Don't throw - email failure shouldn't fail the report
  }
}

export function getEngagementScore(post: {
  engagement: Post["engagement"];
}): number {
  return (
    (post.engagement.likes || 0) +
    (post.engagement.comments || 0) +
    (post.engagement.shares || 0) +
    (post.engagement.views || 0)
  );
}

export function getTopSentimentPosts<T extends { engagement: Post["engagement"] }>(
  posts: T[],
  limit: number
): T[] {
  if (limit <= 0 || posts.length <= limit) {
    return posts;
  }

  return [...posts]
    .sort((a, b) => getEngagementScore(b) - getEngagementScore(a))
    .slice(0, limit);
}

function getTopAnalysisPosts(posts: Post[], limit: number): Post[] {
  if (limit <= 0 || posts.length <= limit) {
    return posts;
  }

  return [...posts]
    .sort((a, b) => getEngagementScore(b) - getEngagementScore(a))
    .slice(0, limit);
}

async function updatePostSentiments(
  client: PrismaClientLike,
  sentiments: Map<string, Sentiment>
) {
  if (sentiments.size === 0) {
    return;
  }

  const entries = Array.from(sentiments.entries());
  for (let i = 0; i < entries.length; i += SENTIMENT_BATCH_SIZE) {
    const batch = entries.slice(i, i + SENTIMENT_BATCH_SIZE);
    const caseFragments = batch.map(([id, sentiment]) =>
      Prisma.sql`WHEN ${id} THEN ${sentiment}`
    );
    const idFragments = batch.map(([id]) => Prisma.sql`${id}`);

    // Use a CASE update to reduce per-row updates inside the transaction.
    await client.$executeRaw(
      Prisma.sql`UPDATE "search_posts"
        SET "sentiment" = CASE "id"
          ${Prisma.join(caseFragments, " ")}
          ELSE "sentiment"
        END
        WHERE "id" IN (${Prisma.join(idFragments, ", ")})`
    );
  }
}

// Types for report data
export interface ReportMetrics {
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

export interface ActivityDataPoint {
  date: string;
  count: number;
  engagement: number;
}

export interface ReportData {
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
  posts: Array<Post & { sentiment: Sentiment | null }>;
  aiAnalysis: AIAnalysis | null;
  topPosts: Array<Post & { sentiment: Sentiment | null }>;
  topPostComments?: PostComments[];
}

export interface ShareSettings {
  shareToken: string | null;
  shareUrl: string | null;
}

export interface UpdateShareSettingsInput {
  generateToken?: boolean;
  revokeToken?: boolean;
}

/**
 * Fetch comments/replies for top engaging posts across platforms
 * Currently supports: X/Twitter and YouTube
 */
async function fetchTopPostComments(
  posts: Post[],
  maxPostsPerPlatform: number = 25,
  maxCommentsPerPost: number = 30
): Promise<PostComments[]> {
  const results: PostComments[] = [];
  // X/Twitter has stricter API limits - cap at 10 posts, 20 comments each
  const xMaxPosts = Math.min(maxPostsPerPlatform, 10);
  const xMaxComments = Math.min(maxCommentsPerPost, 20);

  // Sort posts by engagement helper
  const sortByEngagement = (a: Post, b: Post) => {
    const engA = (a.engagement.likes || 0) + (a.engagement.comments || 0) * 2;
    const engB = (b.engagement.likes || 0) + (b.engagement.comments || 0) * 2;
    return engB - engA;
  };

  // Fetch X/Twitter replies
  if (config.x.rapidApiKey) {
    const xProvider = new XRapidApiProvider({ apiKey: config.x.rapidApiKey });
    const xPosts = posts
      .filter(p => p.platform === "x")
      .sort(sortByEngagement)
      .slice(0, xMaxPosts);

    if (xPosts.length > 0) {
      console.log(`[Report] Fetching replies for ${xPosts.length} top X posts`);

      const xPromises = xPosts.map(async (post) => {
        try {
          const replies = await xProvider.getTweetReplies(post.id, xMaxComments);
          return { parentId: post.id, platform: "x", comments: replies };
        } catch (error) {
          console.error(`[Report] Failed to fetch X replies for ${post.id}:`, error);
          return { parentId: post.id, platform: "x", comments: [] };
        }
      });

      const xSettled = await Promise.allSettled(xPromises);
      for (const result of xSettled) {
        if (result.status === "fulfilled" && result.value.comments.length > 0) {
          results.push(result.value);
        }
      }
    }
  }

  // Fetch YouTube comments
  if (config.providers.youtube?.apiKey) {
    const youtubeProvider = new YouTubeProvider({ apiKey: config.providers.youtube.apiKey });
    const youtubePosts = posts
      .filter(p => p.platform === "youtube")
      .sort(sortByEngagement)
      .slice(0, maxPostsPerPlatform);

    if (youtubePosts.length > 0) {
      console.log(`[Report] Fetching comments for ${youtubePosts.length} top YouTube videos`);

      const ytPromises = youtubePosts.map(async (post) => {
        try {
          const comments = await youtubeProvider.getVideoComments(post.id, maxCommentsPerPost);
          return { parentId: post.id, platform: "youtube", comments };
        } catch (error) {
          console.error(`[Report] Failed to fetch YouTube comments for ${post.id}:`, error);
          return { parentId: post.id, platform: "youtube", comments: [] };
        }
      });

      const ytSettled = await Promise.allSettled(ytPromises);
      for (const result of ytSettled) {
        if (result.status === "fulfilled" && result.value.comments.length > 0) {
          results.push(result.value);
        }
      }
    }
  }

  // Fetch Reddit and TikTok comments via SociaVault
  if (config.sociaVault?.apiKey) {
    const sociaVaultService = new SociaVaultApiService(config.sociaVault.apiKey);

    // Fetch Reddit comments
    const redditPosts = posts
      .filter(p => p.platform === "reddit")
      .sort(sortByEngagement)
      .slice(0, maxPostsPerPlatform);

    if (redditPosts.length > 0) {
      console.log(`[Report] Fetching comments for ${redditPosts.length} top Reddit posts`);

      const redditPromises = redditPosts.map(async (post) => {
        try {
          const comments = await sociaVaultService.getRedditComments(post.url, maxCommentsPerPost);
          return { parentId: post.id, platform: "reddit", comments };
        } catch (error) {
          console.error(`[Report] Failed to fetch Reddit comments for ${post.id}:`, error);
          return { parentId: post.id, platform: "reddit", comments: [] };
        }
      });

      const redditSettled = await Promise.allSettled(redditPromises);
      for (const result of redditSettled) {
        if (result.status === "fulfilled" && result.value.comments.length > 0) {
          results.push(result.value);
        }
      }
    }

    // Fetch TikTok comments
    const tiktokPosts = posts
      .filter(p => p.platform === "tiktok")
      .sort(sortByEngagement)
      .slice(0, maxPostsPerPlatform);

    if (tiktokPosts.length > 0) {
      console.log(`[Report] Fetching comments for ${tiktokPosts.length} top TikTok videos`);

      const tiktokPromises = tiktokPosts.map(async (post) => {
        try {
          const comments = await sociaVaultService.getTikTokComments(post.url, maxCommentsPerPost);
          return { parentId: post.id, platform: "tiktok", comments };
        } catch (error) {
          console.error(`[Report] Failed to fetch TikTok comments for ${post.id}:`, error);
          return { parentId: post.id, platform: "tiktok", comments: [] };
        }
      });

      const tiktokSettled = await Promise.allSettled(tiktokPromises);
      for (const result of tiktokSettled) {
        if (result.status === "fulfilled" && result.value.comments.length > 0) {
          results.push(result.value);
        }
      }
    }
  }

  const totalComments = results.reduce((sum, r) => sum + r.comments.length, 0);
  const platforms = [...new Set(results.map(r => r.platform))];
  console.log(`[Report] Fetched ${totalComments} total comments from ${results.length} posts (${platforms.join(", ")})`);

  return results;
}

/**
 * Get or create user ID from Supabase UID
 * Handles migration from Firebase to Supabase
 */
async function getUserIdFromSupabaseUid(supabaseUid: string): Promise<string> {
  // First try supabaseUid
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (user) {
    console.log(`[getUserIdFromSupabaseUid] Found user by supabaseUid: ${supabaseUid.slice(0, 8)}... -> ${user.id.slice(0, 8)}...`);
    return user.id;
  }

  // Fall back to firebaseUid (legacy)
  const legacyUser = await prisma.user.findUnique({
    where: { firebaseUid: supabaseUid },
    select: { id: true, supabaseUid: true },
  });

  if (legacyUser) {
    console.log(`[getUserIdFromSupabaseUid] Found user by firebaseUid (legacy): ${supabaseUid.slice(0, 8)}... -> ${legacyUser.id.slice(0, 8)}...`);
    // Migrate: set supabaseUid if not already set
    if (!legacyUser.supabaseUid) {
      console.log(`[getUserIdFromSupabaseUid] Migrating user: setting supabaseUid to ${supabaseUid.slice(0, 8)}...`);
      await prisma.user.update({
        where: { id: legacyUser.id },
        data: { supabaseUid },
      });
    }
    return legacyUser.id;
  }

  // Create new user with supabaseUid
  console.log(`[getUserIdFromSupabaseUid] Creating NEW user for supabaseUid: ${supabaseUid.slice(0, 8)}...`);
  user = await prisma.user.create({
    data: {
      supabaseUid,
      firebaseUid: supabaseUid, // Also set firebaseUid for compatibility
      email: `${supabaseUid}@placeholder.local`,
    },
    select: { id: true },
  });

  console.log(`[getUserIdFromSupabaseUid] Created user: ${user.id.slice(0, 8)}...`);
  return user.id;
}

/**
 * Start a report generation job from a saved search
 *
 * Uses "Read Fast, Process Slow, Write Fast" pattern to prevent
 * connection pool exhaustion during long-running external API calls.
 */
export async function startReport(
  searchId: string,
  supabaseUid: string
): Promise<{ reportId: string }> {
  // ============================================
  // PHASE 1: Quick DB reads - get all data needed
  // ============================================
  const userId = await getUserIdFromSupabaseUid(supabaseUid);

  // Get user email for notification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const userEmail = user?.email;

  const search = await prisma.search.findFirst({
    where: {
      id: searchId,
      userId,
    },
    include: {
      posts: true,
    },
  });

  if (!search) {
    throw new Error("Search not found or access denied");
  }

  // Check if search already has a report (prevents duplicate generation from double-clicks)
  if (search.reportId) {
    console.log(`[Report] Search ${searchId} already has report ${search.reportId}, returning existing`);
    return { reportId: search.reportId };
  }

  // Check for an already-running job for this search (prevents duplicate from re-triggered requests)
  const existingRunningJob = await prisma.researchJob.findFirst({
    where: {
      userId,
      status: JobStatus.RUNNING,
      queryJson: {
        path: ["query"],
        equals: search.queryText,
      },
      startedAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000), // within last 10 minutes
      },
    },
    select: { id: true },
  });

  if (existingRunningJob) {
    console.log(`[Report] Found running job ${existingRunningJob.id} for search ${searchId}, skipping duplicate`);
    throw new Error("Report generation already in progress for this search");
  }

  const job = await prisma.researchJob.create({
    data: {
      userId,
      queryJson: {
        query: search.queryText,
        sources: search.sources,
        filters: search.filtersJson,
      } as Prisma.InputJsonValue,
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      totalResults: search.posts.length,
    },
  });

  // Store all data we need in local variables - DB connections now released
  const searchData = {
    id: search.id,
    queryText: search.queryText,
    sources: search.sources as string[],
    filtersJson: search.filtersJson as { timeFilter?: string; language?: string },
    posts: search.posts.map((post) => ({
      id: post.id,  // Internal DB ID for updates
      postId: post.postId,
      text: post.text,
      author: post.author,
      authorHandle: post.authorHandle,
      authorAvatar: post.authorAvatar,
      createdAt: post.createdAt,
      platform: post.platform,
      engagement: post.engagement as Post["engagement"],
      url: post.url,
      thumbnail: post.thumbnail,
    })),
  };

  const jobId = job.id;

  try {
    // ============================================
    // PHASE 2: External API calls (no DB connections held)
    // ============================================

    // Sentiment classification - results stored in memory
    let sentiments: Map<string, Sentiment> = new Map();
    if (searchData.posts.length > 0 && process.env.GOOGLE_GEMINI_API_KEY) {
      const sentimentService = new SentimentClassificationService(
        process.env.GOOGLE_GEMINI_API_KEY,
        {
          batchSize: SENTIMENT_API_BATCH_SIZE,
          maxConcurrent: SENTIMENT_API_MAX_CONCURRENT,
        }
      );

      const sentimentCandidates = getTopSentimentPosts(
        searchData.posts,
        SENTIMENT_MAX_POSTS
      );
      const postsToClassify = sentimentCandidates.map((post) => ({
        id: post.id,
        text: post.text,
      }));

      sentiments = await sentimentService.classifyAll(postsToClassify);
    }

    // Convert posts to the format expected by AI service
    const postsForAnalysis: Post[] = searchData.posts.map((post) => ({
      id: post.postId,
      text: post.text,
      author: post.author,
      authorHandle: post.authorHandle,
      authorAvatar: post.authorAvatar || undefined,
      createdAt: post.createdAt.toISOString(),
      platform: post.platform.toLowerCase() as Post["platform"],
      engagement: post.engagement as Post["engagement"],
      url: post.url,
      thumbnail: post.thumbnail || undefined,
    }));

    const limitedPostsForAnalysis = getTopAnalysisPosts(
      postsForAnalysis,
      REPORT_AI_MAX_POSTS
    );

    // Optionally defer comments + AI analysis to speed up report generation.
    let topPostComments: PostComments[] = [];
    let commentsFetched = false;
    let aiAnalysis: AIAnalysis | null = null;

    if (!DEFER_REPORT_INSIGHTS) {
      // Fetch comments from X/YouTube - results stored in memory
      try {
        topPostComments = await fetchTopPostComments(
          limitedPostsForAnalysis,
          REPORT_AI_MAX_COMMENT_POSTS,
          REPORT_AI_MAX_COMMENTS_PER_POST
        );
        commentsFetched = true;
      } catch (error) {
        console.error("[Report] Failed to fetch top post comments:", error);
      }

      // AI analysis - results stored in memory
      if (process.env.GOOGLE_GEMINI_API_KEY) {
        const aiService = new AIAnalysisService(process.env.GOOGLE_GEMINI_API_KEY);

        const totalCommentsCount = topPostComments.reduce(
          (sum, r) => sum + r.comments.length,
          0
        );
        console.log(
          `[Report] AI analysis with ${limitedPostsForAnalysis.length} posts + ${totalCommentsCount} comments`
        );

        aiAnalysis = await aiService.generateAnalysis(
          searchData.queryText,
          limitedPostsForAnalysis,
          {
            timeRange: searchData.filtersJson?.timeFilter,
            language: searchData.filtersJson?.language,
            sources: searchData.sources,
          },
          topPostComments
        );
      }
    }

    // ============================================
    // PHASE 3: Single batched DB write
    // ============================================
    await updatePostSentiments(prisma, sentiments);

    await prisma.$transaction(
      async (tx) => {
        // Store AI insights
        if (aiAnalysis) {
          await tx.insight.create({
            data: {
              jobId,
              outputJson: aiAnalysis as unknown as Prisma.InputJsonValue,
              model: "gemini-2.5-flash",
            },
          });
        }

        // Link the search to this report
        console.log(`[Report] Linking search ${searchData.id} to job ${jobId}`);
        const updatedSearch = await tx.search.update({
          where: { id: searchData.id },
          data: { reportId: jobId },
        });
        console.log(`[Report] Search linked: reportId=${updatedSearch.reportId}`);

        // Mark job as completed
        const jobUpdateData: Prisma.ResearchJobUpdateInput = {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        };
        if (commentsFetched) {
          jobUpdateData.topPostCommentsJson =
            topPostComments as unknown as Prisma.InputJsonValue;
        }

        await tx.researchJob.update({
          where: { id: jobId },
          data: jobUpdateData,
        });
        console.log(`[Report] Job ${jobId} marked as COMPLETED`);
      },
      { timeout: TRANSACTION_TIMEOUT_MS }
    );

    // Send report ready email notification (atomic to prevent duplicates)
    if (userEmail) {
      // Atomically mark email as sent - only succeeds if emailSentAt was null
      const emailUpdateResult = await prisma.researchJob.updateMany({
        where: { id: jobId, emailSentAt: null },
        data: { emailSentAt: new Date() },
      });

      // Only send email if we successfully marked it (prevents race condition duplicates)
      if (emailUpdateResult.count > 0) {
        const topInsight = aiAnalysis?.interpretation || undefined;
        await sendReportReadyEmail(
          userEmail,
          jobId,
          searchData.queryText,
          searchData.posts.length,
          topInsight
        );
      } else {
        console.log(`[Report] Email already sent for job ${jobId}, skipping duplicate`);
      }
    }

    return { reportId: jobId };
  } catch (error) {
    console.error(`[Report] Error in startReport for job ${jobId}:`, error);
    // Mark job as failed (separate transaction since main one failed)
    await prisma.researchJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

/**
 * Start report generation with progress callbacks for streaming UI
 *
 * Uses "Read Fast, Process Slow, Write Fast" pattern to prevent
 * connection pool exhaustion during long-running external API calls.
 */
export async function startReportWithProgress(
  searchId: string,
  supabaseUid: string,
  onProgress: ProgressCallback
): Promise<{ reportId: string }> {
  // ============================================
  // PHASE 1: Quick DB reads - get all data needed
  // ============================================
  console.log(`[Report] Phase 1: Starting for searchId=${searchId}, supabaseUid=${supabaseUid}`);

  onProgress({
    type: "progress",
    step: "initializing",
    message: "Firing up the engines",
  });

  console.log(`[Report] Getting userId from supabaseUid...`);
  const userId = await getUserIdFromSupabaseUid(supabaseUid);
  console.log(`[Report] Got userId: ${userId}`);

  // Get user email for notification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const userEmail = user?.email;

  const search = await prisma.search.findFirst({
    where: {
      id: searchId,
      userId,
    },
    include: {
      posts: true,
    },
  });

  if (!search) {
    throw new Error("Search not found or access denied");
  }

  // Check if search already has a report (prevents duplicate generation from double-clicks)
  if (search.reportId) {
    console.log(`[Report] Search ${searchId} already has report ${search.reportId}, returning existing`);
    onProgress({
      type: "complete",
      message: "Report already generated",
      reportId: search.reportId,
    });
    return { reportId: search.reportId };
  }

  // Check for an already-running job for this search (prevents duplicate from re-triggered streams)
  const existingRunningJob = await prisma.researchJob.findFirst({
    where: {
      userId,
      status: JobStatus.RUNNING,
      queryJson: {
        path: ["query"],
        equals: search.queryText,
      },
      startedAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000), // within last 10 minutes
      },
    },
    select: { id: true },
  });

  if (existingRunningJob) {
    console.log(`[Report] Found running job ${existingRunningJob.id} for search ${searchId}, skipping duplicate`);
    // Wait for the existing job to complete and return it
    // For now, throw to prevent double generation - the first stream will complete
    throw new Error("Report generation already in progress for this search");
  }

  const job = await prisma.researchJob.create({
    data: {
      userId,
      queryJson: {
        query: search.queryText,
        sources: search.sources,
        filters: search.filtersJson,
      } as Prisma.InputJsonValue,
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      totalResults: search.posts.length,
    },
  });

  // Store all data we need in local variables - DB connections now released
  const searchData = {
    id: search.id,
    queryText: search.queryText,
    sources: search.sources as string[],
    filtersJson: search.filtersJson as { timeFilter?: string; language?: string },
    posts: search.posts.map((post) => ({
      id: post.id,  // Internal DB ID for updates
      postId: post.postId,
      text: post.text,
      author: post.author,
      authorHandle: post.authorHandle,
      authorAvatar: post.authorAvatar,
      createdAt: post.createdAt,
      platform: post.platform,
      engagement: post.engagement as Post["engagement"],
      url: post.url,
      thumbnail: post.thumbnail,
    })),
  };

  const jobId = job.id;

  try {
    // ============================================
    // PHASE 2: External API calls (no DB connections held)
    // ============================================

    onProgress({
      type: "progress",
      step: "fetching_data",
      message: "Gathering the juicy data",
    });

    // Convert posts to the format expected by AI service
    const postsForAnalysis: Post[] = searchData.posts.map((post) => ({
      id: post.postId,
      text: post.text,
      author: post.author,
      authorHandle: post.authorHandle,
      authorAvatar: post.authorAvatar || undefined,
      createdAt: post.createdAt.toISOString(),
      platform: post.platform.toLowerCase() as Post["platform"],
      engagement: post.engagement as Post["engagement"],
      url: post.url,
      thumbnail: post.thumbnail || undefined,
    }));

    const limitedPostsForAnalysis = getTopAnalysisPosts(
      postsForAnalysis,
      REPORT_AI_MAX_POSTS
    );

    // Sentiment classification - results stored in memory
    onProgress({
      type: "progress",
      step: "sentiment_analysis",
      message: "Picking out the hot takes",
    });

    let sentiments: Map<string, Sentiment> = new Map();
    if (searchData.posts.length > 0 && process.env.GOOGLE_GEMINI_API_KEY) {
      const sentimentService = new SentimentClassificationService(
        process.env.GOOGLE_GEMINI_API_KEY,
        {
          batchSize: SENTIMENT_API_BATCH_SIZE,
          maxConcurrent: SENTIMENT_API_MAX_CONCURRENT,
        }
      );

      const sentimentCandidates = getTopSentimentPosts(
        searchData.posts,
        SENTIMENT_MAX_POSTS
      );
      const postsToClassify = sentimentCandidates.map((post) => ({
        id: post.id,
        text: post.text,
      }));

      sentiments = await sentimentService.classifyAll(postsToClassify);
    }

    let topPostComments: PostComments[] = [];
    let commentsFetched = false;
    let aiAnalysis: AIAnalysis | null = null;

    if (!DEFER_REPORT_INSIGHTS) {
      // Fetch comments from X/YouTube - results stored in memory
      onProgress({
        type: "progress",
        step: "fetching_comments",
        message: "Connecting the dots",
      });

      try {
        topPostComments = await fetchTopPostComments(
          limitedPostsForAnalysis,
          REPORT_AI_MAX_COMMENT_POSTS,
          REPORT_AI_MAX_COMMENTS_PER_POST
        );
        commentsFetched = true;
      } catch (error) {
        console.error("[Report] Failed to fetch top post comments:", error);
      }
    }

    onProgress({
      type: "progress",
      step: "calculating_metrics",
      message: "Calculating the numbers",
    });

    if (!DEFER_REPORT_INSIGHTS) {
      // AI analysis - results stored in memory
      onProgress({
        type: "progress",
        step: "ai_analysis",
        message: "Packaging your insights",
      });

      if (process.env.GOOGLE_GEMINI_API_KEY) {
        const aiService = new AIAnalysisService(process.env.GOOGLE_GEMINI_API_KEY);

        const totalCommentsCount = topPostComments.reduce(
          (sum, r) => sum + r.comments.length,
          0
        );
        console.log(
          `[Report] AI analysis with ${limitedPostsForAnalysis.length} posts + ${totalCommentsCount} comments`
        );

        aiAnalysis = await aiService.generateAnalysis(
          searchData.queryText,
          limitedPostsForAnalysis,
          {
            timeRange: searchData.filtersJson?.timeFilter,
            language: searchData.filtersJson?.language,
            sources: searchData.sources,
          },
          topPostComments
        );
      }
    }

    // ============================================
    // PHASE 3: Single batched DB write
    // ============================================
    await updatePostSentiments(prisma, sentiments);

    await prisma.$transaction(
      async (tx) => {
        // Store AI insights
        if (aiAnalysis) {
          await tx.insight.create({
            data: {
              jobId,
              outputJson: aiAnalysis as unknown as Prisma.InputJsonValue,
              model: "gemini-2.5-flash",
            },
          });
        }

        // Link the search to this report
        console.log(`[Report] Linking search ${searchData.id} to job ${jobId}`);
        const updatedSearch = await tx.search.update({
          where: { id: searchData.id },
          data: { reportId: jobId },
        });
        console.log(`[Report] Search linked: reportId=${updatedSearch.reportId}`);

        // Mark job as completed
        const jobUpdateData: Prisma.ResearchJobUpdateInput = {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        };
        if (commentsFetched) {
          jobUpdateData.topPostCommentsJson =
            topPostComments as unknown as Prisma.InputJsonValue;
        }

        await tx.researchJob.update({
          where: { id: jobId },
          data: jobUpdateData,
        });
        console.log(`[Report] Job ${jobId} marked as COMPLETED`);
      },
      { timeout: TRANSACTION_TIMEOUT_MS }
    );

    // Send report ready email notification (atomic to prevent duplicates)
    if (userEmail) {
      // Atomically mark email as sent - only succeeds if emailSentAt was null
      const emailUpdateResult = await prisma.researchJob.updateMany({
        where: { id: jobId, emailSentAt: null },
        data: { emailSentAt: new Date() },
      });

      // Only send email if we successfully marked it (prevents race condition duplicates)
      if (emailUpdateResult.count > 0) {
        const topInsight = aiAnalysis?.interpretation || undefined;
        await sendReportReadyEmail(
          userEmail,
          jobId,
          searchData.queryText,
          searchData.posts.length,
          topInsight
        );
      } else {
        console.log(`[Report] Email already sent for job ${jobId}, skipping duplicate`);
      }
    }

    return { reportId: jobId };
  } catch (error) {
    console.error(`[Report] Error in startReportWithProgress for job ${jobId}:`, error);
    // Mark job as failed (separate transaction since main one failed)
    await prisma.researchJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

/**
 * Generate AI insights for an existing report (async)
 */
export async function generateReportInsights(
  reportId: string,
  supabaseUid: string
): Promise<{ status: "created" | "exists" }> {
  const userId = await getUserIdFromSupabaseUid(supabaseUid);

  const job = await prisma.researchJob.findFirst({
    where: {
      id: reportId,
      userId,
    },
    include: {
      insights: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      searches: {
        include: {
          posts: true,
        },
        take: 1,
      },
    },
  });

  if (!job) {
    throw new Error("Report not found or access denied");
  }

  if (job.insights.length > 0) {
    return { status: "exists" };
  }

  const search = job.searches[0];
  if (!search) {
    throw new Error("Report search not found");
  }

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const queryJson = job.queryJson as {
    query: string;
    sources: string[];
    filters?: { timeFilter?: string; language?: string };
  };

  const posts: Post[] = search.posts.map((post) => ({
    id: post.postId,
    text: post.text,
    author: post.author,
    authorHandle: post.authorHandle,
    authorAvatar: post.authorAvatar || undefined,
    createdAt: post.createdAt.toISOString(),
    platform: post.platform.toLowerCase() as Post["platform"],
    engagement: post.engagement as Post["engagement"],
    url: post.url,
    thumbnail: post.thumbnail || undefined,
  }));

  const limitedPosts = getTopAnalysisPosts(posts, REPORT_AI_MAX_POSTS);

  let topPostComments: PostComments[] =
    (job.topPostCommentsJson as unknown as PostComments[]) || [];

  if (topPostComments.length === 0) {
    try {
      topPostComments = await fetchTopPostComments(
        limitedPosts,
        REPORT_AI_MAX_COMMENT_POSTS,
        REPORT_AI_MAX_COMMENTS_PER_POST
      );
      if (topPostComments.length > 0) {
        await prisma.researchJob.update({
          where: { id: reportId },
          data: {
            topPostCommentsJson:
              topPostComments as unknown as Prisma.InputJsonValue,
          },
        });
      }
    } catch (error) {
      console.error("[Report] Failed to fetch comments for AI analysis:", error);
    }
  }

  const aiService = new AIAnalysisService(process.env.GOOGLE_GEMINI_API_KEY);
  const aiAnalysis = await aiService.generateAnalysis(
    queryJson.query,
    limitedPosts,
    {
      timeRange: queryJson.filters?.timeFilter,
      language: queryJson.filters?.language,
      sources: queryJson.sources,
    },
    topPostComments
  );

  await prisma.insight.create({
    data: {
      jobId: reportId,
      outputJson: aiAnalysis as unknown as Prisma.InputJsonValue,
      model: "gemini-2.5-flash",
    },
  });

  return { status: "created" };
}

/**
 * Get complete report data by report ID
 */
export async function getReport(
  reportId: string,
  supabaseUid: string
): Promise<ReportData | null> {
  // Get internal user ID
  const userId = await getUserIdFromSupabaseUid(supabaseUid);
  console.log(`[getReport] supabaseUid: ${supabaseUid.slice(0, 8)}..., resolved userId: ${userId.slice(0, 8)}...`);

  // First, check who actually owns this report (for debugging)
  const reportOwner = await prisma.researchJob.findUnique({
    where: { id: reportId },
    select: { userId: true },
  });
  if (reportOwner) {
    console.log(`[getReport] Report ${reportId} owned by userId: ${reportOwner.userId.slice(0, 8)}..., match: ${reportOwner.userId === userId}`);
  } else {
    console.log(`[getReport] Report ${reportId} not found in database`);
  }

  // Fetch the research job
  const job = await prisma.researchJob.findFirst({
    where: {
      id: reportId,
      userId,
    },
    include: {
      insights: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      searches: {
        include: {
          posts: {
            orderBy: { createdAt: "desc" },
          },
        },
        take: 1,
      },
    },
  });

  if (!job) {
    console.log(`[getReport] findFirst returned null for reportId: ${reportId}, userId: ${userId.slice(0, 8)}... - this is unexpected if match was true`);
    return null;
  }

  console.log(`[getReport] Job found, searches count: ${job.searches.length}, insights count: ${job.insights.length}`);

  const search = job.searches[0];
  if (!search) {
    console.log(`[getReport] No search record found for job ${reportId}`);
    return null;
  }

  const queryJson = job.queryJson as { query: string; sources: string[] };

  // Convert posts to the expected format
  const posts: Array<Post & { sentiment: Sentiment | null }> = search.posts.map(
    (post) => ({
      id: post.postId,
      text: post.text,
      author: post.author,
      authorHandle: post.authorHandle,
      authorAvatar: post.authorAvatar || undefined,
      createdAt: post.createdAt.toISOString(),
      platform: post.platform.toLowerCase() as Post["platform"],
      engagement: post.engagement as Post["engagement"],
      url: post.url,
      thumbnail: post.thumbnail || undefined,
      sentiment: (post.sentiment as Sentiment) || null,
    })
  );

  // Calculate metrics
  const metrics = aggregateMetrics(posts);

  // Calculate activity over time
  const activityOverTime = calculateActivityOverTime(posts);

  // Get AI analysis from insights
  const aiAnalysis = job.insights[0]
    ? (job.insights[0].outputJson as unknown as AIAnalysis)
    : null;

  // Get top posts by engagement
  const topPosts = getTopPosts(posts, 5);

  // Fetch comments for top posts (for display in report)
  let topPostComments: PostComments[] =
    (job.topPostCommentsJson as unknown as PostComments[]) || [];
  if (topPostComments.length === 0) {
    try {
      topPostComments = await fetchTopPostComments(posts, 5, 10);
      await prisma.researchJob.update({
        where: { id: reportId },
        data: {
          topPostCommentsJson:
            topPostComments as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error("[Report] Failed to fetch comments for report view:", error);
    }
  }

  return {
    report: {
      id: job.id,
      query: queryJson.query,
      sources: queryJson.sources || [],
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() || null,
    },
    metrics,
    activityOverTime,
    posts,
    aiAnalysis,
    topPosts,
    topPostComments,
  };
}

/**
 * Aggregate metrics from posts
 */
function aggregateMetrics(
  posts: Array<Post & { sentiment: Sentiment | null }>
): ReportMetrics {
  const totalMentions = posts.length;

  let totalEngagement = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  const platformBreakdown: Record<string, number> = {};

  posts.forEach((post) => {
    // Calculate engagement
    const engagement =
      (post.engagement.likes || 0) +
      (post.engagement.comments || 0) +
      (post.engagement.shares || 0) +
      (post.engagement.views || 0);
    totalEngagement += engagement;

    // Count sentiment
    switch (post.sentiment) {
      case "positive":
        positive++;
        break;
      case "negative":
        negative++;
        break;
      case "neutral":
      default:
        neutral++;
        break;
    }

    // Count platform
    const platform = post.platform.toLowerCase();
    platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
  });

  return {
    totalMentions,
    totalEngagement,
    avgEngagement: totalMentions > 0 ? Math.round(totalEngagement / totalMentions) : 0,
    sentimentBreakdown: {
      positive,
      negative,
      neutral,
    },
    platformBreakdown,
  };
}

/**
 * Calculate activity over time (posts grouped by day)
 */
function calculateActivityOverTime(
  posts: Array<Post & { sentiment: Sentiment | null }>
): ActivityDataPoint[] {
  const dateMap = new Map<
    string,
    { count: number; engagement: number }
  >();

  posts.forEach((post) => {
    // Get date string (YYYY-MM-DD)
    const date = post.createdAt.split("T")[0];

    const existing = dateMap.get(date) || { count: 0, engagement: 0 };
    const engagement =
      (post.engagement.likes || 0) +
      (post.engagement.comments || 0) +
      (post.engagement.shares || 0);

    dateMap.set(date, {
      count: existing.count + 1,
      engagement: existing.engagement + engagement,
    });
  });

  // Convert to array and sort by date
  const result: ActivityDataPoint[] = [];
  dateMap.forEach((value, date) => {
    result.push({
      date,
      count: value.count,
      engagement: value.engagement,
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get top posts by total engagement
 */
function getTopPosts(
  posts: Array<Post & { sentiment: Sentiment | null }>,
  limit: number
): Array<Post & { sentiment: Sentiment | null }> {
  return [...posts]
    .sort((a, b) => {
      const engagementA =
        (a.engagement.likes || 0) +
        (a.engagement.comments || 0) +
        (a.engagement.shares || 0);
      const engagementB =
        (b.engagement.likes || 0) +
        (b.engagement.comments || 0) +
        (b.engagement.shares || 0);
      return engagementB - engagementA;
    })
    .slice(0, limit);
}

/**
 * Get report status (for polling)
 */
export async function getReportStatus(
  reportId: string,
  supabaseUid: string
): Promise<{ status: JobStatus; completedAt: string | null } | null> {
  // Get internal user ID
  const userId = await getUserIdFromSupabaseUid(supabaseUid);

  const job = await prisma.researchJob.findFirst({
    where: {
      id: reportId,
      userId,
    },
    select: {
      status: true,
      completedAt: true,
    },
  });

  if (!job) {
    return null;
  }

  return {
    status: job.status,
    completedAt: job.completedAt?.toISOString() || null,
  };
}

/**
 * Get report data for shared access (no auth required)
 * Validates share token
 */
export async function getReportForSharing(
  reportId: string,
  shareToken?: string
): Promise<ReportData | null> {
  // Find report by ID (no userId filter)
  const job = await prisma.researchJob.findUnique({
    where: { id: reportId },
    include: {
      insights: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      searches: {
        include: {
          posts: {
            orderBy: { createdAt: "desc" },
          },
        },
        take: 1,
      },
    },
  });

  if (!job) {
    return null;
  }

  // Validate access - must have valid share token that hasn't expired
  const hasValidToken = shareToken && job.shareToken === shareToken;
  const isTokenExpired = job.shareTokenExpiresAt && new Date(job.shareTokenExpiresAt) < new Date();

  if (!hasValidToken || isTokenExpired) {
    return null;
  }

  // Get search and posts (same logic as getReport)
  const search = job.searches[0];
  if (!search) {
    return null;
  }

  const queryJson = job.queryJson as { query: string; sources: string[] };

  // Convert posts to the expected format
  const posts: Array<Post & { sentiment: Sentiment | null }> = search.posts.map(
    (post) => ({
      id: post.postId,
      text: post.text,
      author: post.author,
      authorHandle: post.authorHandle,
      authorAvatar: post.authorAvatar || undefined,
      createdAt: post.createdAt.toISOString(),
      platform: post.platform.toLowerCase() as Post["platform"],
      engagement: post.engagement as Post["engagement"],
      url: post.url,
      thumbnail: post.thumbnail || undefined,
      sentiment: (post.sentiment as Sentiment) || null,
    })
  );

  const metrics = aggregateMetrics(posts);
  const activityOverTime = calculateActivityOverTime(posts);
  const aiAnalysis = job.insights[0]
    ? (job.insights[0].outputJson as unknown as AIAnalysis)
    : null;
  const topPosts = getTopPosts(posts, 5);
  const topPostComments: PostComments[] =
    (job.topPostCommentsJson as unknown as PostComments[]) || [];

  return {
    report: {
      id: job.id,
      query: queryJson.query,
      sources: queryJson.sources || [],
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() || null,
    },
    metrics,
    activityOverTime,
    posts,
    aiAnalysis,
    topPosts,
    topPostComments,
  };
}

/**
 * Get current sharing settings for a report (owner only)
 */
export async function getShareSettings(
  reportId: string,
  supabaseUid: string
): Promise<ShareSettings | null> {
  const userId = await getUserIdFromSupabaseUid(supabaseUid);

  const job = await prisma.researchJob.findFirst({
    where: { id: reportId, userId },
    select: {
      id: true,
      shareToken: true,
    },
  });

  if (!job) return null;

  const baseUrl = getBaseUrl();

  return {
    shareToken: job.shareToken,
    shareUrl: job.shareToken
      ? `${baseUrl}/report/${job.id}?token=${job.shareToken}`
      : null,
  };
}

/**
 * Update sharing settings for a report (owner only)
 */
export async function updateShareSettings(
  reportId: string,
  supabaseUid: string,
  settings: UpdateShareSettingsInput
): Promise<ShareSettings> {
  const userId = await getUserIdFromSupabaseUid(supabaseUid);

  // Verify ownership
  const job = await prisma.researchJob.findFirst({
    where: { id: reportId, userId },
    select: {
      id: true,
      shareToken: true,
    },
  });

  if (!job) {
    throw new Error("Report not found or access denied");
  }

  const updateData: Prisma.ResearchJobUpdateInput = {};

  // Handle token generation (30-day expiration for security)
  if (settings.generateToken) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    updateData.shareToken = crypto.randomUUID();
    updateData.shareTokenCreatedAt = now;
    updateData.shareTokenExpiresAt = expiresAt;
  }

  // Handle token revocation
  if (settings.revokeToken) {
    updateData.shareToken = null;
    updateData.shareTokenCreatedAt = null;
    updateData.shareTokenExpiresAt = null;
  }

  const updated = await prisma.researchJob.update({
    where: { id: reportId },
    data: updateData,
    select: {
      id: true,
      shareToken: true,
    },
  });

  const baseUrl = getBaseUrl();

  return {
    shareToken: updated.shareToken,
    shareUrl: updated.shareToken
      ? `${baseUrl}/report/${updated.id}?token=${updated.shareToken}`
      : null,
  };
}

// ============================================
// Alert Report Generation
// ============================================

export interface AlertReportPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  platform: string;
  url: string;
  thumbnail?: string;
  createdAt: string;
  sentiment?: string;
  engagement?: { likes: number; comments: number; shares: number; views?: number };
}

const SOURCE_MAP: Record<string, Source> = {
  x: Source.X,
  tiktok: Source.TIKTOK,
  reddit: Source.REDDIT,
  youtube: Source.YOUTUBE,
  instagram: Source.INSTAGRAM,
  linkedin: Source.LINKEDIN,
};

/**
 * Background processing for alert reports: sentiment classification + AI analysis
 */
async function processAlertReportInBackground(
  jobId: string,
  searchId: string,
  searchQuery: string,
  platforms: string[],
  timeRange: string,
  rawPosts: AlertReportPost[]
): Promise<void> {
  try {
    console.log(`[Alert Report] Starting background processing for job ${jobId} (${rawPosts.length} posts)`);

    // Sentiment classification using internal SearchPost IDs
    let sentiments: Map<string, Sentiment> = new Map();
    if (rawPosts.length > 0 && process.env.GOOGLE_GEMINI_API_KEY) {
      const sentimentService = new SentimentClassificationService(
        process.env.GOOGLE_GEMINI_API_KEY,
        { batchSize: SENTIMENT_API_BATCH_SIZE, maxConcurrent: SENTIMENT_API_MAX_CONCURRENT }
      );

      const searchPosts = await prisma.searchPost.findMany({
        where: { searchId },
        select: { id: true, text: true },
      });

      const candidates = searchPosts.slice(0, SENTIMENT_MAX_POSTS);
      sentiments = await sentimentService.classifyAll(
        candidates.map(p => ({ id: p.id, text: p.text }))
      );
    }

    // AI analysis
    let aiAnalysis: AIAnalysis | null = null;
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      const postsForAnalysis: Post[] = rawPosts.slice(0, REPORT_AI_MAX_POSTS).map(post => ({
        id: post.id,
        text: post.text,
        author: post.author,
        authorHandle: post.authorHandle,
        authorAvatar: post.authorAvatar,
        createdAt: post.createdAt,
        platform: post.platform.toLowerCase() as Post["platform"],
        engagement: (post.engagement || { likes: 0, comments: 0, shares: 0 }) as Post["engagement"],
        url: post.url,
        thumbnail: post.thumbnail,
      }));

      const aiService = new AIAnalysisService(process.env.GOOGLE_GEMINI_API_KEY);
      aiAnalysis = await aiService.generateAnalysis(searchQuery, postsForAnalysis, {
        timeRange,
        sources: platforms,
      });
    }

    // Write results to DB
    await updatePostSentiments(prisma, sentiments);

    await prisma.$transaction(async (tx) => {
      if (aiAnalysis) {
        await tx.insight.create({
          data: {
            jobId,
            outputJson: aiAnalysis as unknown as Prisma.InputJsonValue,
            model: "gemini-2.5-flash",
          },
        });
      }

      await tx.researchJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }, { timeout: TRANSACTION_TIMEOUT_MS });

    console.log(`[Alert Report] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[Alert Report] Error processing job ${jobId}:`, error);
    await prisma.researchJob.update({
      where: { id: jobId },
      data: { status: JobStatus.FAILED, completedAt: new Date() },
    });
  }
}

/**
 * Create a report from alert search results.
 * Returns the report URL immediately; heavy processing runs in background.
 */
export async function startAlertReport(params: {
  userId: string;
  searchQuery: string;
  platforms: string[];
  timeRange: string;
  posts: AlertReportPost[];
}): Promise<{ reportId: string; reportUrl: string }> {
  const { userId, searchQuery, platforms, timeRange, posts } = params;

  const validSources = platforms
    .map(p => SOURCE_MAP[p.toLowerCase()])
    .filter((s): s is Source => s !== undefined);

  // Create Search record with all posts
  const search = await prisma.search.create({
    data: {
      userId,
      queryText: searchQuery,
      name: `Alert: ${searchQuery}`,
      sources: validSources,
      filtersJson: { timeFilter: timeRange } as unknown as Prisma.InputJsonValue,
      totalResults: posts.length,
      posts: posts.length > 0 ? {
        create: posts.map(post => ({
          postId: post.id,
          text: post.text,
          author: post.author,
          authorHandle: post.authorHandle || post.author,
          authorAvatar: post.authorAvatar,
          platform: post.platform.toUpperCase(),
          url: post.url,
          thumbnail: post.thumbnail,
          engagement: (post.engagement || { likes: 0, comments: 0, shares: 0 }) as Prisma.InputJsonValue,
          createdAt: post.createdAt ? new Date(post.createdAt) : new Date(),
        })),
      } : undefined,
    },
    select: { id: true },
  });

  // Create ResearchJob with share token
  const shareToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const job = await prisma.researchJob.create({
    data: {
      userId,
      queryJson: {
        query: searchQuery,
        sources: platforms.map(p => p.toLowerCase()),
        filters: { timeFilter: timeRange },
      } as Prisma.InputJsonValue,
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      totalResults: posts.length,
      shareToken,
      shareTokenCreatedAt: new Date(),
      shareTokenExpiresAt: expiresAt,
    },
  });

  // Link search to job
  await prisma.search.update({
    where: { id: search.id },
    data: { reportId: job.id },
  });

  const appUrl = getBaseUrl();
  const reportUrl = `${appUrl}/report/${job.id}?token=${shareToken}&tab=social-posts`;

  console.log(`[Alert Report] Created job ${job.id} for "${searchQuery}" with ${posts.length} posts`);

  // Fire off background processing (sentiment + AI analysis)
  processAlertReportInBackground(job.id, search.id, searchQuery, platforms, timeRange, posts).catch(err => {
    console.error(`[Alert Report] Background processing failed for job ${job.id}:`, err);
  });

  return { reportId: job.id, reportUrl };
}

const reportService = {
  startReport,
  startAlertReport,
  generateReportInsights,
  getReport,
  getReportForSharing,
  getReportStatus,
  getShareSettings,
  updateShareSettings,
};

export default reportService;
