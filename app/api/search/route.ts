import { NextRequest, NextResponse } from "next/server";
import { XProvider } from "@/lib/providers/XProvider";
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider";
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider";
import { BlueskyProvider } from "@/lib/providers/BlueskyProvider";
import { TruthSocialProvider } from "@/lib/providers/TruthSocialProvider";
import TikTokApiService from "@/lib/services/tiktokApi";
import SociaVaultApiService from "@/lib/services/sociaVaultApi";
import AIAnalysisService from "@/lib/services/aiAnalysis";
import { generateMockAIAnalysis } from "@/lib/services/mockAiAnalysis";
import { config } from "@/lib/config";
import type { SearchParams, SearchResponse, Post, AIAnalysis, SortOption } from "@/lib/types/api";
import { getSubredditsForLocation } from "@/lib/utils/subredditLookup"
import { resolveCityNameToId } from "@/lib/utils/cityResolver"
import {
  processPostsCredibility,
  sortByRelevance,
  sortByRecent,
  sortByEngaged,
  filterVerifiedOnly,
  isTier1Source,
} from "@/lib/credibility";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { buildPlatformGeoQuery, determineGeoScope } from "@/lib/utils/geoQueryBuilder";
import { getCached, buildSearchCacheKey, isCacheAvailable } from "@/lib/cache/redis";
import { circuitBreakers, CircuitBreakerOpenError } from "@/lib/utils/circuitBreaker";

// Rate limit: 15 requests per minute per IP
const SEARCH_RATE_LIMIT = { windowMs: 60000, maxRequests: 15 };
// Max query length to prevent abuse
const MAX_QUERY_LENGTH = 500;
// Max sources to prevent resource exhaustion
const MAX_SOURCES = 6;

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
    // Rate limiting by IP
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(`search:${clientIp}`, SEARCH_RATE_LIMIT);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          },
        }
      );
    }

    console.log('[Search API] Anthropic API key configured:', !!config.llm.anthropic.apiKey);
    
    const body: SearchParams = await request.json();
    const { query, sources, timeFilter, language, sort = 'relevance', state, city, queryVariants } = body;
    
    // **Multi-Query Parallel Search (Phase 2)**
    // If queryVariants provided, run parallel searches and merge results
    if (queryVariants && Array.isArray(queryVariants) && queryVariants.length > 0) {
      console.log('[Multi-Query Search] Running', queryVariants.length, 'variant queries:', queryVariants);
      
      // Run each variant as a separate search (recursive API calls)
      const variantPromises = queryVariants.map(async (variantQuery) => {
        try {
          const variantBody = { ...body, query: variantQuery, queryVariants: undefined }; // Remove queryVariants to prevent infinite recursion
          const response = await POST(new NextRequest(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify(variantBody),
          }));
          
          if (!response.ok) {
            console.warn(`[Multi-Query] Variant query "${variantQuery}" failed:`, response.status);
            return null;
          }
          
          const data: SearchResponse = await response.json();
          return data;
        } catch (error) {
          console.error(`[Multi-Query] Error with variant query "${variantQuery}":`, error);
          return null;
        }
      });
      
      const variantResults = await Promise.all(variantPromises);
      const validResults = variantResults.filter((r): r is SearchResponse => r !== null);
      
      if (validResults.length === 0) {
        return NextResponse.json(
          { error: "All variant queries failed" },
          { status: 500 }
        );
      }
      
      // Merge posts from all variants and deduplicate by post URL
      const mergedPosts: Post[] = [];
      const seenUrls = new Set<string>();
      const mergedWarnings: string[] = [];
      const mergedPlatforms: Record<string, number> = {};
      
      for (const result of validResults) {
        for (const post of result.posts) {
          if (!seenUrls.has(post.url)) {
            seenUrls.add(post.url);
            mergedPosts.push(post);
          }
        }
        
        // Merge warnings
        if (result.warnings) {
          mergedWarnings.push(...result.warnings);
        }
        
        // Sum platform counts
        if (result.summary?.platforms) {
          for (const [platform, count] of Object.entries(result.summary.platforms)) {
            mergedPlatforms[platform] = (mergedPlatforms[platform] || 0) + count;
          }
        }
      }
      
      console.log(`[Multi-Query] Merged ${mergedPosts.length} unique posts from ${validResults.length} queries`);
      
      // Reprocess credibility and sort merged posts
      const mergedPostsWithCredibility = processPostsCredibility(mergedPosts);
      let sortedMergedPosts: Post[];
      switch (sort as SortOption) {
        case 'recent':
          sortedMergedPosts = sortByRecent(mergedPostsWithCredibility);
          break;
        case 'engaged':
          sortedMergedPosts = sortByEngaged(mergedPostsWithCredibility);
          break;
        case 'verified':
          sortedMergedPosts = filterVerifiedOnly(mergedPostsWithCredibility);
          break;
        case 'relevance':
        default:
          sortedMergedPosts = sortByRelevance(mergedPostsWithCredibility as (Post & { _finalScore?: number })[]);
          break;
      }
      
      // Generate AI analysis on merged results
      let aiAnalysis: AIAnalysis | undefined;
      
      if (config.llm.anthropic.apiKey && sortedMergedPosts.length > 0) {
        try {
          const aiService = new AIAnalysisService(config.llm.anthropic.apiKey);
          aiAnalysis = await withTimeout(
            aiService.generateAnalysis(query, sortedMergedPosts, {
              timeRange: timeFilter,
              language: language || "all",
              sources,
            }),
            60000, // 60 second timeout
            "AI Analysis (Multi-Query)"
          );
        } catch (error) {
          console.error('[Multi-Query] AI analysis error:', error);
          mergedWarnings.push('AI analysis failed, showing posts only');
          // Fall back to mock only on error
          aiAnalysis = generateMockAIAnalysis(query, sortedMergedPosts);
        }
      } else if (sortedMergedPosts.length > 0) {
        // No API key - use mock analysis
        console.log('[Multi-Query] Using mock AI analysis (no API key configured)');
        aiAnalysis = generateMockAIAnalysis(query, sortedMergedPosts);
      }
      
      const credibilitySummary = calculateCredibilitySummary(sortedMergedPosts);
      const sentimentCounts = calculateSentimentCounts(aiAnalysis, sortedMergedPosts.length);
      
      const mergedResponse: SearchResponse = {
        query,
        posts: sortedMergedPosts,
        aiAnalysis,
        summary: {
          totalPosts: sortedMergedPosts.length,
          platforms: mergedPlatforms,
          sentiment: sentimentCounts,
          timeRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          credibility: credibilitySummary,
        },
        warnings: mergedWarnings.length > 0 ? mergedWarnings : undefined,
      };
      
      return NextResponse.json(mergedResponse);
    }
    
    // **Single Query Search (existing logic below)**

    const isLocalSearch = !!(state || city);
    const geoScope = determineGeoScope(state, city);
    const geoContext = { state, city, geoScope };
    console.log('[Search API] Request:', { query, sources, timeFilter, language, sort, state, city, geoScope, isLocalSearch });

    // Input validation
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Validate query length to prevent abuse
    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Query too long. Maximum ${MAX_QUERY_LENGTH} characters allowed.` },
        { status: 400 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: "At least one source must be selected" },
        { status: 400 }
      );
    }

    // Validate number of sources
    if (sources.length > MAX_SOURCES) {
      return NextResponse.json(
        { error: `Too many sources. Maximum ${MAX_SOURCES} allowed.` },
        { status: 400 }
      );
    }

    // **Phase 0: Redis Cache Layer for Search Results**
    // Check cache first (shared across all users with same search parameters)
    const searchCacheKey = buildSearchCacheKey(query, sources, timeFilter, language, state, city);
    const SEARCH_CACHE_TTL = 3600; // 1 hour (search results change more frequently than signals)
    
    // If cache is available and we have a hit, return cached result
    if (isCacheAvailable()) {
      try {
        const cachedResult = await getCached<SearchResponse>(
          searchCacheKey,
          async () => {
            // Cache miss - execute search and return result
            // This function will be called only on cache miss
            return await executeSearch();
          },
          SEARCH_CACHE_TTL
        );
        
        // Return cached or freshly executed result
        return NextResponse.json(cachedResult);
      } catch (error) {
        console.error('[Search Cache] Error, falling back to live search:', error);
        // Fall through to execute search without cache
      }
    }
    
    // Execute search (called either on cache miss or when cache unavailable)
    async function executeSearch(): Promise<SearchResponse> {
      const allPosts: Post[] = [];
    const platformCounts: Record<string, number> = {};
    const warnings: string[] = [];

    // Create promises for parallel execution
    const searchPromises: Promise<void>[] = [];

    // X search promise - prefer RapidAPI (The Old Bird V2) over official API
    if (sources.includes("x")) {
      const xSearch = async () => {
        try {
          // **Phase 3: Apply platform-specific geo query builder**
          const xGeoQuery = buildPlatformGeoQuery('x', query, geoContext);
          const xSearchQuery = xGeoQuery.query;
          console.log('[X] Geo query:', xSearchQuery, 'Params:', xGeoQuery.params);
          
          // Try RapidAPI (The Old Bird V2) first - cheaper and more generous limits
          if (config.x.rapidApiKey) {
            // **Phase 0: Circuit Breaker Protection**
            const xResult = await circuitBreakers.x_rapidapi.execute(async () => {
              const rapidApiProvider = new XRapidApiProvider({
                apiKey: config.x.rapidApiKey!, // Non-null assertion (checked above)
              });

              // Wrap with retry-on-empty to handle flaky API responses
              return await withRetryOnEmpty(
              () => withRetry(
                () => withTimeout(
                  rapidApiProvider.searchLatest(xSearchQuery, {
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
            }); // End circuit breaker

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

          // **Phase 0: Circuit Breaker Protection**
          const xResult = await circuitBreakers.x_official.execute(async () => {
            const xProvider = new XProvider({
              bearerToken: config.x.bearerToken!, // Non-null assertion (checked above)
            });

            const timeRange = XProvider.getTimeRange(timeFilter);
            return await withRetry(
              () => withTimeout(
                xProvider.searchWithWarning(xSearchQuery, {
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
          });

          allPosts.push(...xResult.posts);
          platformCounts.x = xResult.posts.length;

          if (xResult.warning) {
            warnings.push(xResult.warning);
          }
        } catch (error) {
          // Handle circuit breaker open state gracefully
          if (error instanceof CircuitBreakerOpenError) {
            console.warn(`[X] Circuit breaker open, skipping X search`);
            platformCounts.x = 0;
            warnings.push(`X/Twitter temporarily unavailable due to rate limiting. Results from other platforms shown.`);
            return;
          }
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("X API error:", errorMessage);
          platformCounts.x = 0;
          warnings.push(`X search failed: ${errorMessage}`);
        }
      };
      searchPromises.push(xSearch());
    }

    // TikTok search promise - try SociaVault first, fallback to TikAPI if needed
    if (sources.includes("tiktok")) {
      const tiktokSearch = async () => {
        let mergedPosts: Post[] = [];
        const tiktokWarnings: string[] = [];
        let totalRawCount = 0;

        // Try SociaVault first (preferred API)
        if (config.sociaVault.apiKey) {
          try {
            const sociaVaultService = new SociaVaultApiService(config.sociaVault.apiKey!);
            const baseTikTokQuery = TikTokApiService.getTikTokOptimizedQuery(query);

            // **Phase 3: Apply platform-specific geo query builder**
            const tiktokGeoQuery = buildPlatformGeoQuery('tiktok', baseTikTokQuery, geoContext);
            const tiktokQuery = tiktokGeoQuery.query;
            console.log('[TikTok SociaVault] Geo query:', tiktokQuery);

            // **Phase 0: Circuit Breaker Protection**
            const tiktokResults = await circuitBreakers.tiktok_sociavault.execute(async () => {
              return await withRetryOnEmpty(
                () => withRetry(
                  () => withTimeout(
                    sociaVaultService.searchTikTokVideos(tiktokQuery, { timeFilter, maxPages: 3 }),
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
            }); // End circuit breaker

            let posts = sociaVaultService.transformTikTokToPosts(tiktokResults);
            posts = SociaVaultApiService.filterByTimeRange(posts, timeFilter);

            if (SociaVaultApiService.hasBooleanQuery(query)) {
              posts = SociaVaultApiService.filterByBooleanQuery(posts, query);
            }

            const rawCount = tiktokResults.data?.length || 0;
            totalRawCount = rawCount;
            console.log('[TikTok SociaVault] Raw:', rawCount, 'Filtered:', posts.length, 'TimeFilter:', timeFilter);

            mergedPosts = posts;
          } catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
              console.warn(`[TikTok SociaVault] Circuit breaker open, skipping`);
              tiktokWarnings.push(`TikTok temporarily unavailable due to rate limiting.`);
            } else {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error("TikTok SociaVault error:", errorMessage);
              tiktokWarnings.push(`SociaVault: ${errorMessage}`);
            }
          }
        }

        // Fallback to TikAPI only if SociaVault failed or returned few results
        if (mergedPosts.length < 5 && config.tiktok.apiKey && config.tiktok.accountKey) {
          try {
            const tiktokService = new TikTokApiService(
              config.tiktok.apiKey!,
              config.tiktok.apiUrl,
              config.tiktok.accountKey
            );

            const baseTikTokQuery = TikTokApiService.getTikTokOptimizedQuery(query);

            // **Phase 3: Apply platform-specific geo query builder**
            const tiktokGeoQuery = buildPlatformGeoQuery('tiktok', baseTikTokQuery, geoContext);
            const tiktokQuery = tiktokGeoQuery.query;
            console.log('[TikTok TikAPI] Geo query:', tiktokQuery);

            // **Phase 0: Circuit Breaker Protection**
            const tiktokResults = await circuitBreakers.tiktok_tikapi.execute(async () => {
              return await withRetryOnEmpty(
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
            }); // End circuit breaker

            let posts = tiktokService.transformToPosts(tiktokResults);
            posts = TikTokApiService.filterByTimeRange(posts, timeFilter);

            if (TikTokApiService.hasBooleanQuery(query)) {
              posts = TikTokApiService.filterByBooleanQuery(posts, query);
            }

            totalRawCount += tiktokResults.videos?.length || 0;
            console.log('[TikTok TikAPI] Raw:', tiktokResults.videos?.length, 'Filtered:', posts.length, 'TimeFilter:', timeFilter);
            console.log('[TikTok Fallback] SociaVault returned < 5, using TikAPI as fallback');

            // Merge and deduplicate with SociaVault results
            const seenIds = new Set(mergedPosts.map(p => p.id));
            for (const post of posts) {
              if (!seenIds.has(post.id)) {
                mergedPosts.push(post);
              }
            }
          } catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
              console.warn(`[TikTok TikAPI] Circuit breaker open, skipping fallback`);
            } else {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error("TikTok TikAPI error:", errorMessage);
              tiktokWarnings.push(`TikAPI: ${errorMessage}`);
            }
          }
        }

        // If no TikTok APIs configured
        if (!config.sociaVault.apiKey && (!config.tiktok.apiKey || !config.tiktok.accountKey)) {
          console.warn("TikTok API: Neither SociaVault nor TikAPI (with account key) configured");
          platformCounts.tiktok = 0;
          return;
        }

        console.log('[TikTok Combined] Total unique posts:', mergedPosts.length);

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

          let redditPosts: Post[];

          // Use local search if state/city is provided
          if (isLocalSearch && state) {
            const cityId = city ? resolveCityNameToId(state, city) : null
            if (city && !cityId) {
              console.warn(`[Reddit Local] Could not resolve city "${city}" for state ${state}; falling back to state-level subreddits`)
            }
            const subreddits = getSubredditsForLocation(state, cityId ?? undefined)
            console.log(`[Reddit Local] Searching subreddits for ${city || state}:`, subreddits)

            if (subreddits.length === 0) {
              console.warn(`[Reddit Local] No subreddits found for ${city || state}`)
              platformCounts.reddit = 0;
              warnings.push(`No local subreddits found for the selected location. Try a national search instead.`);
              return;
            }

            redditPosts = await withTimeout(
              sociaVaultService.searchRedditInSubreddits(redditQuery, subreddits, {
                limit: 500,
                timeFilter,
              }),
              120000, // 2 minutes for extensive local search
              "Reddit Local Search"
            );

            console.log(`[Reddit Local] Found ${redditPosts.length} posts from ${subreddits.length} subreddits`);
          } else {
            // Standard global Reddit search with pagination for more results
            const time = SociaVaultApiService.getRedditTimeValue(timeFilter);

            const paginatedResult = await withRetryOnEmpty(
              () => withRetry(
                () => withTimeout(
                  sociaVaultService.searchRedditPaginated(redditQuery, {
                    maxPages: 2, // Fetch up to 2 pages (~200 posts)
                    time,
                    sort: "relevance",
                  }),
                  60000, // 60 second timeout for paginated search
                  "Reddit SociaVault Paginated"
                ),
                { retries: 2, delay: 1500, name: "Reddit SociaVault Paginated" }
              ),
              {
                isEmpty: (result) => result.posts.length === 0,
                maxEmptyRetries: 2,
                emptyRetryDelay: 2000,
                name: "Reddit SociaVault Paginated",
              }
            );

            // Transform paginated posts to Post format
            redditPosts = sociaVaultService.transformRedditToPosts({ data: { posts: paginatedResult.posts } });
            redditPosts = SociaVaultApiService.filterByTimeRange(redditPosts, timeFilter);

            console.log('[Reddit SociaVault] Paginated raw:', paginatedResult.posts.length, 'Filtered:', redditPosts.length, 'TimeFilter:', timeFilter);
          }

          if (SociaVaultApiService.hasBooleanQuery(query)) {
            redditPosts = SociaVaultApiService.filterByBooleanQuery(redditPosts, query);
          }

          // Deduplicate by id (handles cross-posts across subreddits, pagination edge cases)
          const seenRedditIds = new Set<string>();
          redditPosts = redditPosts.filter((p) => {
            if (seenRedditIds.has(p.id)) return false;
            seenRedditIds.add(p.id);
            return true;
          });

          allPosts.push(...redditPosts);
          platformCounts.reddit = redditPosts.length;

          if (redditPosts.length === 0) {
            warnings.push(isLocalSearch
              ? "No local Reddit posts found. The topic may have limited local coverage."
              : "Reddit returned no results after multiple attempts. The topic may have limited coverage or API is rate limited."
            );
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

    // YouTube search promise - with pagination for more results
    if (sources.includes("youtube")) {
      const youtubeSearch = async () => {
        try {
          if (!config.providers.youtube?.apiKey) {
            console.warn("YouTube API: API key not configured");
            platformCounts.youtube = 0;
            return;
          }

          // **Phase 0: Circuit Breaker Protection**
          const youtubeResult = await circuitBreakers.youtube.execute(async () => {
            const youtubeProvider = new YouTubeProvider({
              apiKey: config.providers.youtube!.apiKey!, // Non-null assertion (checked above)
            });

            // **Phase 3: Apply platform-specific geo query builder**
            const youtubeGeoQuery = buildPlatformGeoQuery('youtube', query, geoContext);
            const youtubeSearchQuery = youtubeGeoQuery.query;
            console.log('[YouTube] Geo query:', youtubeSearchQuery);

            const timeRange = YouTubeProvider.getTimeRange(timeFilter);
            return await withTimeout(
              youtubeProvider.searchWithStatsPaginated(youtubeSearchQuery, {
                maxPages: 2, // Fetch up to 2 pages = ~100 videos
                maxResults: 50,
                publishedAfter: timeRange.publishedAfter,
                publishedBefore: timeRange.publishedBefore,
                relevanceLanguage: language,
                order: "relevance",
              }),
              60000, // 60 second timeout for paginated search
              "YouTube API Paginated"
            );
          });

          allPosts.push(...youtubeResult.posts);
          platformCounts.youtube = youtubeResult.posts.length;
          console.log('[YouTube] Paginated search complete:', youtubeResult.posts.length, 'videos');
        } catch (error) {
          if (error instanceof CircuitBreakerOpenError) {
            console.warn(`[YouTube] Circuit breaker open, skipping YouTube search`);
            platformCounts.youtube = 0;
            warnings.push(`YouTube temporarily unavailable due to rate limiting. Results from other platforms shown.`);
            return;
          }
          
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

    // Fetch comments for top posts to include in AI analysis
    interface PostCommentData {
      parentId: string;
      platform: string;
      comments: Post[];
    }
    const commentsData: PostCommentData[] = [];
    
    // Comments integration - disabled by default to reduce API load
    // Enable with ?includeComments=true query parameter for deep analysis
    const enableComments = body.includeComments === true;

    // Only fetch comments if explicitly enabled, we have posts, and an API key for the AI analysis
    if (enableComments && config.llm.anthropic.apiKey && cleanedPosts.length > 0) {
      // Fetch comments for top posts per platform for richer AI analysis
      // Reddit is a strong platform - maximize comment data for better insights
      const MAX_POSTS_FOR_COMMENTS = isLocalSearch ? 20 : 10; // Reduced from 100 to 20/10
      const MAX_COMMENTS_PER_POST = isLocalSearch ? 30 : 20; // Reduced from 50/30 to 30/20

      // Group posts by platform and take top N from each
      const postsByPlatform: Record<string, Post[]> = {};
      for (const post of cleanedPosts) {
        if (!postsByPlatform[post.platform]) {
          postsByPlatform[post.platform] = [];
        }
        if (postsByPlatform[post.platform].length < MAX_POSTS_FOR_COMMENTS) {
          postsByPlatform[post.platform].push(post);
        }
      }

      // Fetch comments in parallel for all platforms
      const commentPromises: Promise<void>[] = [];

      // X/Twitter comments
      if (postsByPlatform.x && config.x.rapidApiKey) {
        const xProvider = new XRapidApiProvider({ apiKey: config.x.rapidApiKey });
        for (const post of postsByPlatform.x) {
          commentPromises.push(
            (async () => {
              try {
                const comments = await xProvider.getTweetReplies(post.id, MAX_COMMENTS_PER_POST);
                if (comments.length > 0) {
                  commentsData.push({ parentId: post.id, platform: "x", comments });
                }
              } catch (e) {
                console.error(`[Comments] Failed to fetch X comments for ${post.id}:`, e);
              }
            })()
          );
        }
      }

      // YouTube comments
      if (postsByPlatform.youtube && config.providers.youtube?.apiKey) {
        const youtubeProvider = new YouTubeProvider({ apiKey: config.providers.youtube.apiKey });
        for (const post of postsByPlatform.youtube) {
          commentPromises.push(
            (async () => {
              try {
                const comments = await youtubeProvider.getVideoComments(post.id, MAX_COMMENTS_PER_POST);
                if (comments.length > 0) {
                  commentsData.push({ parentId: post.id, platform: "youtube", comments });
                }
              } catch (e) {
                console.error(`[Comments] Failed to fetch YouTube comments for ${post.id}:`, e);
              }
            })()
          );
        }
      }

      // TikTok comments (via SociaVault)
      if (postsByPlatform.tiktok && config.sociaVault.apiKey) {
        const sociaVaultService = new SociaVaultApiService(config.sociaVault.apiKey);
        for (const post of postsByPlatform.tiktok) {
          commentPromises.push(
            (async () => {
              try {
                const comments = await sociaVaultService.getTikTokComments(post.url, MAX_COMMENTS_PER_POST);
                if (comments.length > 0) {
                  commentsData.push({ parentId: post.id, platform: "tiktok", comments });
                }
              } catch (e) {
                console.error(`[Comments] Failed to fetch TikTok comments for ${post.id}:`, e);
              }
            })()
          );
        }
      }

      // Reddit comments (via SociaVault)
      if (postsByPlatform.reddit && config.sociaVault.apiKey) {
        const sociaVaultService = new SociaVaultApiService(config.sociaVault.apiKey);
        for (const post of postsByPlatform.reddit) {
          commentPromises.push(
            (async () => {
              try {
                const comments = await sociaVaultService.getRedditComments(post.url, MAX_COMMENTS_PER_POST);
                if (comments.length > 0) {
                  commentsData.push({ parentId: post.id, platform: "reddit", comments });
                }
              } catch (e) {
                console.error(`[Comments] Failed to fetch Reddit comments for ${post.id}:`, e);
              }
            })()
          );
        }
      }

      // Wait for all comment fetches with a timeout (longer for local search)
      const commentTimeout = isLocalSearch ? 90000 : 75000;
      try {
        await withTimeout(Promise.all(commentPromises), commentTimeout, "Comment fetching");
      } catch (e) {
        console.error("[Comments] Comment fetching timed out or failed:", e);
      }

      console.log(`[Comments] Fetched comments for ${commentsData.length} posts (enabled=${enableComments}, maxPosts=${MAX_POSTS_FOR_COMMENTS}, maxComments=${MAX_COMMENTS_PER_POST})`);
    } else if (!enableComments) {
      console.log(`[Comments] Comment fetching disabled (set includeComments=true to enable)`);
    }

    let aiAnalysis: AIAnalysis | undefined;
    if (config.llm.anthropic.apiKey && cleanedPosts.length > 0) {
      try {
        const aiService = new AIAnalysisService(config.llm.anthropic.apiKey);
        aiAnalysis = await withTimeout(
          aiService.generateAnalysis(query, cleanedPosts, {
            timeRange: timeFilter,
            language: language || "all",
            sources,
          }, commentsData.length > 0 ? commentsData : undefined),
          90000,
          "AI Analysis"
        );
      } catch (error) {
        console.error("AI analysis error:", error);
        // Fall back to mock only on error
        aiAnalysis = generateMockAIAnalysis(query, cleanedPosts);
      }
    } else if (cleanedPosts.length > 0) {
      // No API key - use mock analysis
      console.log('[Single-provider] Using mock AI analysis (no API key configured)');
      aiAnalysis = generateMockAIAnalysis(query, cleanedPosts);
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

      return response; // Return SearchResponse for caching
    } // End of executeSearch function
    
    // If cache is not available, execute search directly
    const searchResult = await executeSearch();
    return NextResponse.json(searchResult);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
