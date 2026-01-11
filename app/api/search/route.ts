import { NextRequest, NextResponse } from "next/server";
import { XProvider } from "@/lib/providers/XProvider";
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider";
import { BlueskyProvider } from "@/lib/providers/BlueskyProvider";
import TikTokApiService from "@/lib/services/tiktokApi";
import AIAnalysisService from "@/lib/services/aiAnalysis";
import { config } from "@/lib/config";
import type { SearchParams, SearchResponse, Post, AIAnalysis } from "@/lib/types/api";

interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
}

/**
 * Calculate sentiment distribution from AI analysis or use defaults
 */
function calculateSentimentCounts(
  aiAnalysis: AIAnalysis | undefined,
  totalPosts: number
): SentimentCounts {
  if (!aiAnalysis?.sentimentBreakdown) {
    return {
      positive: Math.floor(totalPosts * 0.4),
      neutral: Math.floor(totalPosts * 0.4),
      negative: Math.floor(totalPosts * 0.2),
    };
  }

  const overall = aiAnalysis.sentimentBreakdown.overall;
  const majorityCount = Math.ceil(totalPosts * 0.6);
  const minorityCount = Math.floor(totalPosts * 0.3);
  const smallCount = Math.floor(totalPosts * 0.2);

  switch (overall) {
    case "positive":
      return { positive: majorityCount, neutral: minorityCount, negative: smallCount };
    case "negative":
      return { positive: minorityCount, neutral: minorityCount, negative: majorityCount };
    case "neutral":
      return { positive: minorityCount, neutral: majorityCount, negative: smallCount };
    default:
      return { positive: minorityCount, neutral: minorityCount, negative: minorityCount };
  }
}

// Timeout wrapper for API calls
async function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchParams = await request.json();
    const { query, sources, timeFilter, language } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: "At least one source must be selected" },
        { status: 400 }
      );
    }

    const allPosts: Post[] = [];
    const platformCounts: Record<string, number> = {};
    const warnings: string[] = [];

    // Create promises for parallel execution
    const searchPromises: Promise<void>[] = [];

    // X search promise
    if (sources.includes("x")) {
      const xSearch = async () => {
        try {
          if (!config.x.bearerToken) {
            console.warn("X API: Bearer token not configured");
            platformCounts.x = 0;
            return;
          }

          const xProvider = new XProvider({
            bearerToken: config.x.bearerToken,
          });

          const timeRange = XProvider.getTimeRange(timeFilter);
          const xResult = await withTimeout(
            xProvider.searchWithWarning(query, {
              maxResults: 100,
              startTime: timeRange.startTime,
              endTime: timeRange.endTime,
              language: language,
            }),
            30000, // 30 second timeout for more data
            "X API"
          );

          allPosts.push(...xResult.posts);
          platformCounts.x = xResult.posts.length;

          if (xResult.warning) {
            warnings.push(xResult.warning);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("X API error:", errorMessage);
          platformCounts.x = 0;
          warnings.push(`X search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(xSearch());
    }

    // TikTok search promise
    if (sources.includes("tiktok")) {
      const tiktokSearch = async () => {
        try {
          const tiktokService = new TikTokApiService(
            config.tiktok.apiKey || "",
            config.tiktok.apiUrl
          );

          const tiktokQuery = TikTokApiService.getBaseQuery(query);
          const tiktokResults = await withTimeout(
            tiktokService.searchVideos(tiktokQuery, { count: 50 }),
            30000, // 30 second timeout for more data
            "TikTok API"
          );

          let tiktokPosts = tiktokService.transformToPosts(tiktokResults);

          tiktokPosts = TikTokApiService.filterByTimeRange(tiktokPosts, timeFilter);

          if (TikTokApiService.hasBooleanQuery(query)) {
            tiktokPosts = TikTokApiService.filterByBooleanQuery(tiktokPosts, query);
          }

          allPosts.push(...tiktokPosts);
          platformCounts.tiktok = tiktokPosts.length;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("TikTok API error:", errorMessage);
          platformCounts.tiktok = 0;
          warnings.push(`TikTok search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(tiktokSearch());
    }

    // YouTube search promise
    if (sources.includes("youtube")) {
      const youtubeSearch = async () => {
        try {
          if (!config.providers.youtube?.apiKey) {
            console.warn("YouTube API: API key not configured");
            platformCounts.youtube = 0;
            return;
          }

          const youtubeProvider = new YouTubeProvider({
            apiKey: config.providers.youtube.apiKey,
          });

          const timeRange = YouTubeProvider.getTimeRange(timeFilter);
          const youtubeResult = await withTimeout(
            youtubeProvider.searchWithStats(query, {
              maxResults: 50,
              publishedAfter: timeRange.publishedAfter,
              publishedBefore: timeRange.publishedBefore,
              relevanceLanguage: language,
              order: "relevance",
            }),
            30000, // 30 second timeout for more data
            "YouTube API"
          );

          allPosts.push(...youtubeResult.posts);
          platformCounts.youtube = youtubeResult.posts.length;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("YouTube API error:", errorMessage);
          platformCounts.youtube = 0;
          warnings.push(`YouTube search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(youtubeSearch());
    }

    // Bluesky search promise
    if (sources.includes("bluesky")) {
      const blueskySearch = async () => {
        try {
          if (!config.bluesky.identifier || !config.bluesky.appPassword) {
            console.warn("Bluesky API: Credentials not configured");
            platformCounts.bluesky = 0;
            return;
          }

          const blueskyProvider = new BlueskyProvider({
            identifier: config.bluesky.identifier,
            appPassword: config.bluesky.appPassword,
          });

          const timeRange = BlueskyProvider.getTimeRange(timeFilter);
          const blueskyResult = await withTimeout(
            blueskyProvider.search(query, {
              limit: 100,
              sort: "latest",
              since: timeRange.since,
              until: timeRange.until,
              lang: language,
            }),
            30000, // 30 second timeout for more data
            "Bluesky API"
          );

          allPosts.push(...blueskyResult.posts);
          platformCounts.bluesky = blueskyResult.posts.length;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Bluesky API error:", errorMessage);
          platformCounts.bluesky = 0;
          warnings.push(`Bluesky search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(blueskySearch());
    }

    // Wait for all platform searches to complete in parallel
    await Promise.all(searchPromises);

    // Sort by engagement (likes + comments), highest first
    allPosts.sort((a, b) => {
      const engagementA = (a.engagement.likes || 0) + (a.engagement.comments || 0);
      const engagementB = (b.engagement.likes || 0) + (b.engagement.comments || 0);
      return engagementB - engagementA;
    });

    // Generate AI analysis using Claude (only if we have posts)
    let aiAnalysis: AIAnalysis | undefined;
    if (config.llm.anthropic.apiKey && allPosts.length > 0) {
      try {
        const aiService = new AIAnalysisService(config.llm.anthropic.apiKey);
        aiAnalysis = await withTimeout(
          aiService.generateAnalysis(query, allPosts, {
            timeRange: timeFilter,
            language: language || "all",
            sources,
          }),
          45000, // 45 second timeout for AI with more posts
          "AI Analysis"
        );
      } catch (error) {
        console.error("AI analysis error:", error);
        // Continue without AI analysis if it fails or times out
      }
    }

    // Calculate sentiment from AI analysis or use defaults
    const sentiment = calculateSentimentCounts(aiAnalysis, allPosts.length);

    // Build response
    const timeRange = XProvider.getTimeRange(timeFilter);
    const response: SearchResponse = {
      posts: allPosts,
      summary: {
        totalPosts: allPosts.length,
        platforms: platformCounts,
        sentiment,
        timeRange: {
          start: timeRange.startTime,
          end: timeRange.endTime,
        },
      },
      query,
      aiAnalysis,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
