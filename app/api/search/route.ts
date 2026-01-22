import { NextRequest, NextResponse } from "next/server";
import { XProvider } from "@/lib/providers/XProvider";
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider";
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider";
import { BlueskyProvider } from "@/lib/providers/BlueskyProvider";
import { TruthSocialProvider } from "@/lib/providers/TruthSocialProvider";
import TikTokApiService from "@/lib/services/tiktokApi";
import SociaVaultApiService from "@/lib/services/sociaVaultApi";
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

// Retry wrapper for flaky API calls (X and TikTok)
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
    name?: string;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = 2,
    delay = 1000,
    backoff = 2,
    name = "API",
    shouldRetry = (error) => {
      // Retry on 400, 429, 500, 502, 503, 504 errors or network issues
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes("400") ||
          message.includes("429") ||
          message.includes("500") ||
          message.includes("502") ||
          message.includes("503") ||
          message.includes("504") ||
          message.includes("timeout") ||
          message.includes("network") ||
          message.includes("econnreset") ||
          message.includes("fetch failed")
        );
      }
      return false;
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < retries && shouldRetry(error)) {
        const waitTime = delay * Math.pow(backoff, attempt);
        console.log(`[${name}] Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else if (attempt < retries) {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

// Retry wrapper that retries on empty results (for flaky APIs like X and TikTok)
async function withRetryOnEmpty<T>(
  fn: () => Promise<T>,
  options: {
    isEmpty: (result: T) => boolean;
    maxEmptyRetries?: number;
    emptyRetryDelay?: number;
    name?: string;
  }
): Promise<T> {
  const {
    isEmpty,
    maxEmptyRetries = 3,
    emptyRetryDelay = 2000,
    name = "API",
  } = options;

  for (let attempt = 0; attempt <= maxEmptyRetries; attempt++) {
    const result = await fn();

    if (!isEmpty(result)) {
      if (attempt > 0) {
        console.log(`[${name}] Got results on attempt ${attempt + 1}`);
      }
      return result;
    }

    if (attempt < maxEmptyRetries) {
      console.log(`[${name}] Empty results on attempt ${attempt + 1}, retrying in ${emptyRetryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, emptyRetryDelay));
    }
  }

  // Return last (empty) result after all retries exhausted
  console.log(`[${name}] All ${maxEmptyRetries + 1} attempts returned empty results`);
  return fn();
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

            // Wrap with retry-on-empty to handle flaky API responses
            const xResult = await withRetryOnEmpty(
              () => withRetry(
                () => withTimeout(
                  rapidApiProvider.searchLatest(query, {
                    maxResults: 100,
                  }),
                  30000,
                  "X RapidAPI"
                ),
                { retries: 2, delay: 1500, name: "X RapidAPI" }
              ),
              {
                isEmpty: (result) => result.posts.length === 0,
                maxEmptyRetries: 3,
                emptyRetryDelay: 2000,
                name: "X RapidAPI",
              }
            );

            // Filter by time range (client-side for RapidAPI)
            const filteredPosts = XRapidApiProvider.filterByTimeRange(
              xResult.posts,
              timeFilter
            );

            console.log('[X RapidAPI] Raw:', xResult.posts.length, 'Filtered:', filteredPosts.length, 'TimeFilter:', timeFilter);

            allPosts.push(...filteredPosts);
            platformCounts.x = filteredPosts.length;

            // Warn if X returned no results after all retries
            if (filteredPosts.length === 0 && xResult.posts.length === 0) {
              warnings.push("X/Twitter returned no results after multiple attempts. The topic may have limited coverage or API is rate limited.");
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
          const xResult = await withRetry(
            () => withTimeout(
              xProvider.searchWithWarning(query, {
                maxResults: 100,
                startTime: timeRange.startTime,
                endTime: timeRange.endTime,
                language: language,
              }),
              30000,
              "X API"
            ),
            { retries: 2, delay: 1500, name: "X Official API" }
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

    // TikTok search promise - query both SociaVault and TikAPI in parallel
    if (sources.includes("tiktok")) {
      const tiktokSearch = async () => {
        const tiktokApiPromises: Promise<{ posts: Post[]; source: string; rawCount: number }>[] = [];

        // SociaVault TikTok search
        if (config.sociaVault.apiKey) {
          const sociaVaultPromise = (async () => {
            const sociaVaultService = new SociaVaultApiService(config.sociaVault.apiKey!);
            const tiktokQuery = SociaVaultApiService.getBaseQuery(query);

            const tiktokResults = await withRetryOnEmpty(
              () => withRetry(
                () => withTimeout(
                  sociaVaultService.searchTikTokVideos(tiktokQuery, { timeFilter }),
                  30000,
                  "TikTok SociaVault API"
                ),
                { retries: 2, delay: 1500, name: "TikTok SociaVault API" }
              ),
              {
                isEmpty: (result) => !result.data || result.data.length === 0,
                maxEmptyRetries: 3,
                emptyRetryDelay: 2000,
                name: "TikTok SociaVault API",
              }
            );

            let posts = sociaVaultService.transformTikTokToPosts(tiktokResults);
            posts = SociaVaultApiService.filterByTimeRange(posts, timeFilter);

            if (SociaVaultApiService.hasBooleanQuery(query)) {
              posts = SociaVaultApiService.filterByBooleanQuery(posts, query);
            }

            const rawCount = tiktokResults.data?.length || 0;
            console.log('[TikTok SociaVault] Raw:', rawCount, 'Filtered:', posts.length, 'TimeFilter:', timeFilter);

            return { posts, source: 'SociaVault', rawCount };
          })();
          tiktokApiPromises.push(sociaVaultPromise);
        }

        // TikAPI search (requires both apiKey and accountKey)
        if (config.tiktok.apiKey && config.tiktok.accountKey) {
          const tikApiPromise = (async () => {
            const tiktokService = new TikTokApiService(
              config.tiktok.apiKey!,
              config.tiktok.apiUrl,
              config.tiktok.accountKey
            );

            const tiktokQuery = TikTokApiService.getBaseQuery(query);

            const tiktokResults = await withRetryOnEmpty(
              () => withRetry(
                () => withTimeout(
                  tiktokService.searchVideos(tiktokQuery, { count: 50 }),
                  30000,
                  "TikTok TikAPI"
                ),
                { retries: 2, delay: 1500, name: "TikTok TikAPI" }
              ),
              {
                isEmpty: (result) => !result.videos || result.videos.length === 0,
                maxEmptyRetries: 3,
                emptyRetryDelay: 2000,
                name: "TikTok TikAPI",
              }
            );

            let posts = tiktokService.transformToPosts(tiktokResults);
            posts = TikTokApiService.filterByTimeRange(posts, timeFilter);

            if (TikTokApiService.hasBooleanQuery(query)) {
              posts = TikTokApiService.filterByBooleanQuery(posts, query);
            }

            const rawCount = tiktokResults.videos?.length || 0;
            console.log('[TikTok TikAPI] Raw:', rawCount, 'Filtered:', posts.length, 'TimeFilter:', timeFilter);

            return { posts, source: 'TikAPI', rawCount };
          })();
          tiktokApiPromises.push(tikApiPromise);
        }

        // If no TikTok APIs configured
        if (tiktokApiPromises.length === 0) {
          console.warn("TikTok API: Neither SociaVault nor TikAPI (with account key) configured");
          platformCounts.tiktok = 0;
          return;
        }

        // Run all TikTok API calls in parallel
        const results = await Promise.allSettled(tiktokApiPromises);

        // Merge and deduplicate results (prefer earlier results for duplicates)
        const seenIds = new Set<string>();
        const mergedPosts: Post[] = [];
        let totalRawCount = 0;
        const tiktokWarnings: string[] = [];

        for (const result of results) {
          if (result.status === 'fulfilled') {
            totalRawCount += result.value.rawCount;
            for (const post of result.value.posts) {
              if (!seenIds.has(post.id)) {
                seenIds.add(post.id);
                mergedPosts.push(post);
              }
            }
          } else {
            const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
            console.error("TikTok API error:", errorMessage);
            tiktokWarnings.push(`TikTok search failed: ${errorMessage}`);
          }
        }

        console.log('[TikTok Combined] Total unique posts:', mergedPosts.length, 'from', results.filter(r => r.status === 'fulfilled').length, 'APIs');

        allPosts.push(...mergedPosts);
        platformCounts.tiktok = mergedPosts.length;

        // Add warnings
        if (tiktokWarnings.length > 0 && mergedPosts.length === 0) {
          // Only show warnings if we got no results at all
          warnings.push(...tiktokWarnings);
        }

        if (mergedPosts.length === 0 && totalRawCount === 0 && tiktokWarnings.length === 0) {
          warnings.push("TikTok returned no results after multiple attempts. The topic may have limited coverage or API is rate limited.");
        }
      };
      searchPromises.push(tiktokSearch());
    }

    // Reddit search promise - using SociaVault API
    if (sources.includes("reddit")) {
      const redditSearch = async () => {
        try {
          if (!config.sociaVault.apiKey) {
            console.warn("Reddit API: SociaVault API key not configured");
            platformCounts.reddit = 0;
            return;
          }

          const sociaVaultService = new SociaVaultApiService(config.sociaVault.apiKey);
          const redditQuery = SociaVaultApiService.getBaseQuery(query);

          // Wrap with retry-on-empty to handle flaky API responses
          const redditResults = await withRetryOnEmpty(
            () => withRetry(
              () => withTimeout(
                sociaVaultService.searchReddit(redditQuery, { limit: 100 }),
                30000,
                "Reddit SociaVault API"
              ),
              { retries: 2, delay: 1500, name: "Reddit SociaVault API" }
            ),
            {
              // SociaVault Reddit returns { data: { posts: { "0": {...}, "1": {...} } } } - object with numeric keys
              isEmpty: (result) => {
                const posts = result.data?.posts;
                if (!posts) return true;
                return Array.isArray(posts) ? posts.length === 0 : Object.keys(posts).length === 0;
              },
              maxEmptyRetries: 3,
              emptyRetryDelay: 2000,
              name: "Reddit SociaVault API",
            }
          );

          let redditPosts = sociaVaultService.transformRedditToPosts(redditResults);
          redditPosts = SociaVaultApiService.filterByTimeRange(redditPosts, timeFilter);

          if (SociaVaultApiService.hasBooleanQuery(query)) {
            redditPosts = SociaVaultApiService.filterByBooleanQuery(redditPosts, query);
          }

          const postsData = redditResults.data?.posts;
          const rawPostCount = postsData ? (Array.isArray(postsData) ? postsData.length : Object.keys(postsData).length) : 0;
          console.log('[Reddit SociaVault] Raw:', rawPostCount, 'Filtered:', redditPosts.length, 'TimeFilter:', timeFilter);

          allPosts.push(...redditPosts);
          platformCounts.reddit = redditPosts.length;

          if (redditPosts.length === 0 && rawPostCount === 0) {
            warnings.push("Reddit returned no results after multiple attempts. The topic may have limited coverage or API is rate limited.");
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Reddit API error:", errorMessage);
          platformCounts.reddit = 0;
          warnings.push(`Reddit search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(redditSearch());
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
