/**
 * Report Service
 *
 * Orchestrates report generation, sentiment classification, and data aggregation.
 * Manages the lifecycle of research jobs and provides report data for the dashboard.
 */

import { prisma } from "@/lib/prisma";
import { JobStatus, Prisma } from "@prisma/client";
import {
  SentimentClassificationService,
  type Sentiment,
} from "./sentimentClassification";
import AIAnalysisService from "./aiAnalysis";
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider";
import { config } from "@/lib/config";
import type { Post, AIAnalysis } from "@/lib/types/api";

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
  topPostReplies?: Array<{ parentId: string; replies: Post[] }>;
}

/**
 * Fetch replies for top engaging X posts to enrich report analysis
 */
async function fetchTopPostReplies(
  posts: Post[],
  maxPosts: number = 5,
  maxRepliesPerPost: number = 20
): Promise<Array<{ parentId: string; replies: Post[] }>> {
  if (!config.x.rapidApiKey) {
    return [];
  }

  const xProvider = new XRapidApiProvider({ apiKey: config.x.rapidApiKey });

  // Get top X posts by engagement
  const xPosts = posts
    .filter(p => p.platform === "x")
    .sort((a, b) => {
      const engA = (a.engagement.likes || 0) + (a.engagement.comments || 0) * 2;
      const engB = (b.engagement.likes || 0) + (b.engagement.comments || 0) * 2;
      return engB - engA;
    })
    .slice(0, maxPosts);

  if (xPosts.length === 0) return [];

  console.log(`[Report] Fetching replies for ${xPosts.length} top X posts`);

  const results: Array<{ parentId: string; replies: Post[] }> = [];

  // Fetch replies in parallel with a limit
  const replyPromises = xPosts.map(async (post) => {
    try {
      const replies = await xProvider.getTweetReplies(post.id, maxRepliesPerPost);
      return { parentId: post.id, replies };
    } catch (error) {
      console.error(`[Report] Failed to fetch replies for ${post.id}:`, error);
      return { parentId: post.id, replies: [] };
    }
  });

  const settled = await Promise.allSettled(replyPromises);
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value.replies.length > 0) {
      results.push(result.value);
    }
  }

  const totalReplies = results.reduce((sum, r) => sum + r.replies.length, 0);
  console.log(`[Report] Fetched ${totalReplies} total replies from ${results.length} posts`);

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
 */
export async function startReport(
  searchId: string,
  supabaseUid: string
): Promise<{ reportId: string }> {
  // Get internal user ID
  const userId = await getUserIdFromSupabaseUid(supabaseUid);

  // Fetch the search with its posts
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

  // Create a new ResearchJob
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

  try {
    // Run sentiment classification if we have posts and API key
    if (search.posts.length > 0 && process.env.ANTHROPIC_API_KEY) {
      const sentimentService = new SentimentClassificationService(
        process.env.ANTHROPIC_API_KEY
      );

      // Prepare posts for classification
      const postsToClassify = search.posts.map((post) => ({
        id: post.id,
        text: post.text,
      }));

      // Classify all posts
      const sentiments = await sentimentService.classifyAll(postsToClassify);

      // Update posts with sentiment using a transaction (single connection)
      await prisma.$transaction(
        Array.from(sentiments.entries()).map(([postId, sentiment]) =>
          prisma.searchPost.update({
            where: { id: postId },
            data: { sentiment },
          })
        )
      );
    }

    // Convert posts to the format expected by AI service
    const postsForAnalysis: Post[] = search.posts.map((post) => ({
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

    // Fetch replies for top posts to enrich analysis
    let topPostReplies: Array<{ parentId: string; replies: Post[] }> = [];
    try {
      topPostReplies = await fetchTopPostReplies(postsForAnalysis, 5, 20);
    } catch (error) {
      console.error("[Report] Failed to fetch top post replies:", error);
    }

    // Generate AI analysis
    let aiAnalysis: AIAnalysis | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
      const aiService = new AIAnalysisService(process.env.ANTHROPIC_API_KEY);

      // Combine main posts with replies for richer analysis
      const allReplies = topPostReplies.flatMap(r => r.replies);
      const enrichedPosts = [...postsForAnalysis, ...allReplies];

      console.log(`[Report] AI analysis with ${postsForAnalysis.length} posts + ${allReplies.length} replies`);

      aiAnalysis = await aiService.generateAnalysis(
        search.queryText,
        enrichedPosts,
        {
          timeRange: (search.filtersJson as { timeFilter?: string })?.timeFilter,
          language: (search.filtersJson as { language?: string })?.language,
          sources: search.sources as string[],
        }
      );
    }

    // Store AI insights
    if (aiAnalysis) {
      await prisma.insight.create({
        data: {
          jobId: job.id,
          outputJson: aiAnalysis as unknown as Prisma.InputJsonValue,
          model: "claude-3-haiku-20240307",
        },
      });
    }

    // Link the search to this report
    await prisma.search.update({
      where: { id: searchId },
      data: { reportId: job.id },
    });

    // Mark job as completed
    await prisma.researchJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return { reportId: job.id };
  } catch (error) {
    // Mark job as failed
    await prisma.researchJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
      },
    });
    throw error;
  }
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

  // Fetch replies for top posts (for display in report)
  let topPostReplies: Array<{ parentId: string; replies: Post[] }> = [];
  try {
    topPostReplies = await fetchTopPostReplies(posts, 5, 10);
  } catch (error) {
    console.error("[Report] Failed to fetch replies for report view:", error);
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
    topPostReplies,
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

const reportService = {
  startReport,
  getReport,
  getReportStatus,
};

export default reportService;
