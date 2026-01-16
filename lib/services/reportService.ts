/**
 * Report Service
 *
 * Orchestrates report generation, sentiment classification, and data aggregation.
 * Manages the lifecycle of research jobs and provides report data for the dashboard.
 */

import { prisma } from "@/lib/prisma";
import { JobStatus, Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  SentimentClassificationService,
  type Sentiment,
} from "./sentimentClassification";
import AIAnalysisService from "./aiAnalysis";
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider";
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider";
import { config } from "@/lib/config";
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
  process.env.REPORT_AI_MAX_COMMENT_POSTS ?? 8
);
const REPORT_AI_MAX_COMMENTS_PER_POST = Number(
  process.env.REPORT_AI_MAX_COMMENTS_PER_POST ?? 20
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
  // Production default - ensures share links always use the canonical domain
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://civicvoices.app";
  }
  // For preview deployments, use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

type PrismaClientLike = Prisma.TransactionClient | PrismaClient;

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
  maxPostsPerPlatform: number = 5,
  maxCommentsPerPost: number = 20
): Promise<PostComments[]> {
  const results: PostComments[] = [];
  const xMaxPosts = Math.min(maxPostsPerPlatform, 5);
  const xMaxComments = Math.min(maxCommentsPerPost, 15);

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
    return user.id;
  }

  // Fall back to firebaseUid (legacy)
  user = await prisma.user.findUnique({
    where: { firebaseUid: supabaseUid },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  // Create new user with supabaseUid
  user = await prisma.user.create({
    data: {
      supabaseUid,
      firebaseUid: supabaseUid, // Also set firebaseUid for compatibility
      email: `${supabaseUid}@placeholder.local`,
    },
    select: { id: true },
  });

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
    if (searchData.posts.length > 0 && process.env.ANTHROPIC_API_KEY) {
      const sentimentService = new SentimentClassificationService(
        process.env.ANTHROPIC_API_KEY,
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
      if (process.env.ANTHROPIC_API_KEY) {
        const aiService = new AIAnalysisService(process.env.ANTHROPIC_API_KEY);

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
              model: "claude-3-haiku-20240307",
            },
          });
        }

        // Link the search to this report
        await tx.search.update({
          where: { id: searchData.id },
          data: { reportId: jobId },
        });

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
      },
      { timeout: TRANSACTION_TIMEOUT_MS }
    );

    return { reportId: jobId };
  } catch (error) {
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
  onProgress({
    type: "progress",
    step: "initializing",
    message: "Firing up the engines",
  });

  const userId = await getUserIdFromSupabaseUid(supabaseUid);

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
    if (searchData.posts.length > 0 && process.env.ANTHROPIC_API_KEY) {
      const sentimentService = new SentimentClassificationService(
        process.env.ANTHROPIC_API_KEY,
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

      if (process.env.ANTHROPIC_API_KEY) {
        const aiService = new AIAnalysisService(process.env.ANTHROPIC_API_KEY);

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
              model: "claude-3-haiku-20240307",
            },
          });
        }

        // Link the search to this report
        await tx.search.update({
          where: { id: searchData.id },
          data: { reportId: jobId },
        });

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
      },
      { timeout: TRANSACTION_TIMEOUT_MS }
    );

    return { reportId: jobId };
  } catch (error) {
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

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
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

  const aiService = new AIAnalysisService(process.env.ANTHROPIC_API_KEY);
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
      model: "claude-3-haiku-20240307",
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
    return null;
  }

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

  // Validate access - must have valid share token
  const hasValidToken = shareToken && job.shareToken === shareToken;

  if (!hasValidToken) {
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

  // Handle token generation
  if (settings.generateToken) {
    updateData.shareToken = crypto.randomUUID();
    updateData.shareTokenCreatedAt = new Date();
    updateData.shareTokenExpiresAt = null; // No expiration
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

const reportService = {
  startReport,
  generateReportInsights,
  getReport,
  getReportForSharing,
  getReportStatus,
  getShareSettings,
  updateShareSettings,
};

export default reportService;
