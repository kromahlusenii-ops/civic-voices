import { NextRequest, NextResponse } from "next/server";
import { XProvider } from "@/lib/providers/XProvider";
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider";
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider";
import { BlueskyProvider } from "@/lib/providers/BlueskyProvider";
import { TruthSocialProvider } from "@/lib/providers/TruthSocialProvider";
import TikTokApiService from "@/lib/services/tiktokApi";
import AIAnalysisService from "@/lib/services/aiAnalysis";
import { config } from "@/lib/config";
import type { SearchParams, SearchResponse, Post, AIAnalysis, SortOption } from "@/lib/types/api";
import {
  processPostsCredibility,
  sortByRelevance,
  sortByRecent,
  sortByEngaged,
  filterVerifiedOnly,
  isTier1Source,
} from "@/lib/credibility";

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

/**
 * Calculate credibility summary statistics for the response
 */
function calculateCredibilitySummary(posts: Post[]): {
  averageScore: number;
  tier1Count: number;
  verifiedCount: number;
} {
  if (posts.length === 0) {
    return { averageScore: 0, tier1Count: 0, verifiedCount: 0 };
  }

  let totalScore = 0;
  let tier1Count = 0;
  let verifiedCount = 0;

  for (const post of posts) {
    // Sum credibility scores
    totalScore += post.credibilityScore || 0.3; // Default to 0.3 if not set

    // Count Tier 1 sources
    if (isTier1Source(post.platform, post.authorHandle.replace('@', ''))) {
      tier1Count++;
    }

    // Count verified sources (platform verified or high credibility)
    if (post.authorMetadata?.isVerified || (post.credibilityScore && post.credibilityScore >= 0.70)) {
      verifiedCount++;
    }
  }

  return {
    averageScore: Math.round((totalScore / posts.length) * 100) / 100, // Round to 2 decimals
    tier1Count,
    verifiedCount,
  };
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
    const { query, sources, timeFilter, language, sort = 'relevance' } = body;

    console.log('[Search API] Request:', { query, sources, timeFilter, language, sort });

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

    // X search promise - prefer RapidAPI (The Old Bird V2) over official API
    if (sources.includes("x")) {
      const xSearch = async () => {
        try {
          // Try RapidAPI (The Old Bird V2) first - cheaper and more generous limits
          if (config.x.rapidApiKey) {
            const rapidApiProvider = new XRapidApiProvider({
              apiKey: config.x.rapidApiKey,
            });

            const xResult = await withTimeout(
              rapidApiProvider.searchLatest(query, {
                maxResults: 100,
              }),
              30000,
              "X RapidAPI"
            );

            // Filter by time range (client-side for RapidAPI)
            const filteredPosts = XRapidApiProvider.filterByTimeRange(
              xResult.posts,
              timeFilter
            );

            console.log('[X RapidAPI] Raw:', xResult.posts.length, 'Filtered:', filteredPosts.length, 'TimeFilter:', timeFilter);

            allPosts.push(...filteredPosts);
            platformCounts.x = filteredPosts.length;

            // Warn if X returned no results (may indicate rate limiting)
            if (filteredPosts.length === 0 && xResult.posts.length === 0) {
              warnings.push("X/Twitter returned no results. This may be due to API rate limiting - try again shortly or add more sources.");
            }
            return;
          }

          // Fallback to official X API if RapidAPI not configured
          if (!config.x.bearerToken) {
            console.warn("X API: Neither RapidAPI key nor Bearer token configured");
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

    // Truth Social search promise
    if (sources.includes("truthsocial")) {
      const truthSocialSearch = async () => {
        try {
          if (!config.truthSocial.username || !config.truthSocial.password) {
            console.warn("Truth Social API: Credentials not configured");
            platformCounts.truthsocial = 0;
            return;
          }

          const truthSocialProvider = new TruthSocialProvider({
            username: config.truthSocial.username,
            password: config.truthSocial.password,
          });

          const truthSocialResult = await withTimeout(
            truthSocialProvider.search(query, {
              limit: 100,
            }),
            30000, // 30 second timeout
            "Truth Social API"
          );

          // Filter by time range (client-side)
          const filteredPosts = TruthSocialProvider.filterByTimeRange(
            truthSocialResult.posts,
            timeFilter
          );

          allPosts.push(...filteredPosts);
          platformCounts.truthsocial = filteredPosts.length;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Truth Social API error:", errorMessage);
          platformCounts.truthsocial = 0;
          warnings.push(`Truth Social search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(truthSocialSearch());
    }

    await Promise.all(searchPromises);

    const postsWithCredibility = processPostsCredibility(allPosts);

    let sortedPosts: Post[];
    switch (sort as SortOption) {
      case 'recent':
        sortedPosts = sortByRecent(postsWithCredibility);
        break;
      case 'engaged':
        sortedPosts = sortByEngaged(postsWithCredibility);
        break;
      case 'verified':
        sortedPosts = filterVerifiedOnly(postsWithCredibility);
        break;
      case 'relevance':
      default:
        sortedPosts = sortByRelevance(postsWithCredibility as (Post & { _finalScore?: number })[]);
        break;
    }

    const cleanedPosts = sortedPosts.map(post => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _finalScore, ...cleanPost } = post as Post & { _finalScore?: number };
      return cleanPost;
    });

    let aiAnalysis: AIAnalysis | undefined;
    if (config.llm.anthropic.apiKey && cleanedPosts.length > 0) {
      try {
        const aiService = new AIAnalysisService(config.llm.anthropic.apiKey);
        aiAnalysis = await withTimeout(
          aiService.generateAnalysis(query, cleanedPosts, {
            timeRange: timeFilter,
            language: language || "all",
            sources,
          }),
          45000,
          "AI Analysis"
        );
      } catch (error) {
        console.error("AI analysis error:", error);
      }
    }

    const sentiment = calculateSentimentCounts(aiAnalysis, cleanedPosts.length);
    const credibilitySummary = calculateCredibilitySummary(cleanedPosts);
    const timeRange = XProvider.getTimeRange(timeFilter);
    const response: SearchResponse = {
      posts: cleanedPosts,
      summary: {
        totalPosts: cleanedPosts.length,
        platforms: platformCounts,
        sentiment,
        timeRange: {
          start: timeRange.startTime,
          end: timeRange.endTime,
        },
        credibility: credibilitySummary,
      },
      query,
      sort: sort as SortOption,
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
