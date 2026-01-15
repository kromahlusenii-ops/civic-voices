import { NextRequest } from "next/server"
import { XProvider } from "@/lib/providers/XProvider"
import { XRapidApiProvider } from "@/lib/providers/XRapidApiProvider"
import { YouTubeProvider } from "@/lib/providers/YouTubeProvider"
import { BlueskyProvider } from "@/lib/providers/BlueskyProvider"
import { TruthSocialProvider } from "@/lib/providers/TruthSocialProvider"
import TikTokApiService from "@/lib/services/tiktokApi"
import AIAnalysisService from "@/lib/services/aiAnalysis"
import { config } from "@/lib/config"
import type { Post, AIAnalysis, SortOption } from "@/lib/types/api"
import {
  processPostsCredibility,
  sortByRelevance,
  sortByRecent,
  sortByEngaged,
  filterVerifiedOnly,
  isTier1Source,
} from "@/lib/credibility"

// SSE Event Types
type SSEEventType =
  | "connected"
  | "platform_started"
  | "platform_complete"
  | "platform_error"
  | "stats"
  | "ai_analysis_started"
  | "ai_analysis_complete"
  | "ai_analysis_error"
  | "complete"

interface SSEEvent {
  type: SSEEventType
  data: Record<string, unknown>
}

// Timeout wrapper for API calls
async function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
  )
  return Promise.race([promise, timeout])
}

// Retry wrapper for flaky API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    backoff?: number
    name?: string
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    retries = 2,
    delay = 1000,
    backoff = 2,
    name = "API",
    shouldRetry = (error) => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
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
        )
      }
      return false
    },
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < retries && shouldRetry(error)) {
        const waitTime = delay * Math.pow(backoff, attempt)
        console.log(`[${name}] Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      } else if (attempt < retries) {
        throw error
      }
    }
  }

  throw lastError
}

// Calculate credibility summary
function calculateCredibilitySummary(posts: Post[]): {
  averageScore: number
  tier1Count: number
  verifiedCount: number
} {
  if (posts.length === 0) {
    return { averageScore: 0, tier1Count: 0, verifiedCount: 0 }
  }

  let totalScore = 0
  let tier1Count = 0
  let verifiedCount = 0

  for (const post of posts) {
    totalScore += post.credibilityScore || 0.3
    if (isTier1Source(post.platform, post.authorHandle.replace("@", ""))) {
      tier1Count++
    }
    if (post.authorMetadata?.isVerified || (post.credibilityScore && post.credibilityScore >= 0.7)) {
      verifiedCount++
    }
  }

  return {
    averageScore: Math.round((totalScore / posts.length) * 100) / 100,
    tier1Count,
    verifiedCount,
  }
}

// Calculate sentiment counts
function calculateSentimentCounts(
  aiAnalysis: AIAnalysis | undefined,
  totalPosts: number
): { positive: number; neutral: number; negative: number } {
  if (!aiAnalysis?.sentimentBreakdown) {
    return {
      positive: Math.floor(totalPosts * 0.4),
      neutral: Math.floor(totalPosts * 0.4),
      negative: Math.floor(totalPosts * 0.2),
    }
  }

  const overall = aiAnalysis.sentimentBreakdown.overall
  const majorityCount = Math.ceil(totalPosts * 0.6)
  const minorityCount = Math.floor(totalPosts * 0.3)
  const smallCount = Math.floor(totalPosts * 0.2)

  switch (overall) {
    case "positive":
      return { positive: majorityCount, neutral: minorityCount, negative: smallCount }
    case "negative":
      return { positive: minorityCount, neutral: minorityCount, negative: majorityCount }
    case "neutral":
      return { positive: minorityCount, neutral: majorityCount, negative: smallCount }
    default:
      return { positive: minorityCount, neutral: minorityCount, negative: minorityCount }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query")
  const sources = searchParams.getAll("sources")
  const timeFilter = searchParams.get("timeFilter") || "week"
  const language = searchParams.get("language") || undefined
  const sort = (searchParams.get("sort") || "relevance") as SortOption

  console.log("[Search Stream API] Request:", { query, sources, timeFilter, language, sort })

  if (!query || !query.trim()) {
    return new Response(JSON.stringify({ error: "Query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!sources || sources.length === 0) {
    return new Response(JSON.stringify({ error: "At least one source must be selected" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  const allPosts: Post[] = []
  const platformCounts: Record<string, number> = {}
  const warnings: string[] = []

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const sendEvent = (event: SSEEvent) => {
        const sseMessage = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
        controller.enqueue(encoder.encode(sseMessage))
      }

      // Send initial connection event
      sendEvent({
        type: "connected",
        data: { query, sources, timeFilter, language, sort },
      })

      // Create platform search functions
      const platformSearches: Promise<void>[] = []

      // X search
      if (sources.includes("x")) {
        sendEvent({ type: "platform_started", data: { platform: "x" } })

        const xSearch = async () => {
          try {
            if (config.x.rapidApiKey) {
              const rapidApiProvider = new XRapidApiProvider({
                apiKey: config.x.rapidApiKey,
              })

              const xResult = await withRetry(
                () =>
                  withTimeout(
                    rapidApiProvider.searchLatest(query, { maxResults: 100 }),
                    30000,
                    "X RapidAPI"
                  ),
                { retries: 2, delay: 1500, name: "X RapidAPI" }
              )

              const filteredPosts = XRapidApiProvider.filterByTimeRange(xResult.posts, timeFilter)
              console.log(
                "[X RapidAPI] Raw:",
                xResult.posts.length,
                "Filtered:",
                filteredPosts.length,
                "TimeFilter:",
                timeFilter
              )

              allPosts.push(...filteredPosts)
              platformCounts.x = filteredPosts.length

              sendEvent({
                type: "platform_complete",
                data: { platform: "x", posts: filteredPosts, count: filteredPosts.length },
              })

              if (filteredPosts.length === 0 && xResult.posts.length === 0) {
                warnings.push(
                  "X/Twitter returned no results. This may be due to API rate limiting - try again shortly."
                )
              }
              return
            }

            if (!config.x.bearerToken) {
              console.warn("X API: Neither RapidAPI key nor Bearer token configured")
              platformCounts.x = 0
              sendEvent({
                type: "platform_complete",
                data: { platform: "x", posts: [], count: 0 },
              })
              return
            }

            const xProvider = new XProvider({
              bearerToken: config.x.bearerToken,
            })

            const timeRange = XProvider.getTimeRange(timeFilter)
            const xResult = await withRetry(
              () =>
                withTimeout(
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
            )

            allPosts.push(...xResult.posts)
            platformCounts.x = xResult.posts.length

            if (xResult.warning) {
              warnings.push(xResult.warning)
            }

            sendEvent({
              type: "platform_complete",
              data: { platform: "x", posts: xResult.posts, count: xResult.posts.length },
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("X API error:", errorMessage)
            platformCounts.x = 0
            warnings.push(`X search failed: ${errorMessage}`)
            sendEvent({
              type: "platform_error",
              data: { platform: "x", error: errorMessage },
            })
          }
        }
        platformSearches.push(xSearch())
      }

      // TikTok search
      if (sources.includes("tiktok")) {
        sendEvent({ type: "platform_started", data: { platform: "tiktok" } })

        const tiktokSearch = async () => {
          try {
            const tiktokService = new TikTokApiService(
              config.tiktok.apiKey || "",
              config.tiktok.apiUrl
            )

            const tiktokQuery = TikTokApiService.getBaseQuery(query)
            const tiktokResults = await withRetry(
              () =>
                withTimeout(
                  tiktokService.searchVideos(tiktokQuery, { count: 50 }),
                  30000,
                  "TikTok API"
                ),
              { retries: 2, delay: 1500, name: "TikTok API" }
            )

            let tiktokPosts = tiktokService.transformToPosts(tiktokResults)
            tiktokPosts = TikTokApiService.filterByTimeRange(tiktokPosts, timeFilter)

            if (TikTokApiService.hasBooleanQuery(query)) {
              tiktokPosts = TikTokApiService.filterByBooleanQuery(tiktokPosts, query)
            }

            allPosts.push(...tiktokPosts)
            platformCounts.tiktok = tiktokPosts.length

            sendEvent({
              type: "platform_complete",
              data: { platform: "tiktok", posts: tiktokPosts, count: tiktokPosts.length },
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("TikTok API error:", errorMessage)
            platformCounts.tiktok = 0
            warnings.push(`TikTok search failed: ${errorMessage}`)
            sendEvent({
              type: "platform_error",
              data: { platform: "tiktok", error: errorMessage },
            })
          }
        }
        platformSearches.push(tiktokSearch())
      }

      // YouTube search
      if (sources.includes("youtube")) {
        sendEvent({ type: "platform_started", data: { platform: "youtube" } })

        const youtubeSearch = async () => {
          try {
            if (!config.providers.youtube?.apiKey) {
              console.warn("YouTube API: API key not configured")
              platformCounts.youtube = 0
              sendEvent({
                type: "platform_complete",
                data: { platform: "youtube", posts: [], count: 0 },
              })
              return
            }

            const youtubeProvider = new YouTubeProvider({
              apiKey: config.providers.youtube.apiKey,
            })

            const timeRange = YouTubeProvider.getTimeRange(timeFilter)
            const youtubeResult = await withTimeout(
              youtubeProvider.searchWithStats(query, {
                maxResults: 50,
                publishedAfter: timeRange.publishedAfter,
                publishedBefore: timeRange.publishedBefore,
                relevanceLanguage: language,
                order: "relevance",
              }),
              30000,
              "YouTube API"
            )

            allPosts.push(...youtubeResult.posts)
            platformCounts.youtube = youtubeResult.posts.length

            sendEvent({
              type: "platform_complete",
              data: {
                platform: "youtube",
                posts: youtubeResult.posts,
                count: youtubeResult.posts.length,
              },
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("YouTube API error:", errorMessage)
            platformCounts.youtube = 0
            warnings.push(`YouTube search failed: ${errorMessage}`)
            sendEvent({
              type: "platform_error",
              data: { platform: "youtube", error: errorMessage },
            })
          }
        }
        platformSearches.push(youtubeSearch())
      }

      // Bluesky search
      if (sources.includes("bluesky")) {
        sendEvent({ type: "platform_started", data: { platform: "bluesky" } })

        const blueskySearch = async () => {
          try {
            if (!config.bluesky.identifier || !config.bluesky.appPassword) {
              console.warn("Bluesky API: Credentials not configured")
              platformCounts.bluesky = 0
              sendEvent({
                type: "platform_complete",
                data: { platform: "bluesky", posts: [], count: 0 },
              })
              return
            }

            const blueskyProvider = new BlueskyProvider({
              identifier: config.bluesky.identifier,
              appPassword: config.bluesky.appPassword,
            })

            const timeRange = BlueskyProvider.getTimeRange(timeFilter)
            const blueskyResult = await withTimeout(
              blueskyProvider.search(query, {
                limit: 100,
                sort: "latest",
                since: timeRange.since,
                until: timeRange.until,
                lang: language,
              }),
              30000,
              "Bluesky API"
            )

            allPosts.push(...blueskyResult.posts)
            platformCounts.bluesky = blueskyResult.posts.length

            sendEvent({
              type: "platform_complete",
              data: {
                platform: "bluesky",
                posts: blueskyResult.posts,
                count: blueskyResult.posts.length,
              },
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("Bluesky API error:", errorMessage)
            platformCounts.bluesky = 0
            warnings.push(`Bluesky search failed: ${errorMessage}`)
            sendEvent({
              type: "platform_error",
              data: { platform: "bluesky", error: errorMessage },
            })
          }
        }
        platformSearches.push(blueskySearch())
      }

      // Truth Social search
      if (sources.includes("truthsocial")) {
        sendEvent({ type: "platform_started", data: { platform: "truthsocial" } })

        const truthSocialSearch = async () => {
          try {
            if (!config.truthSocial.username || !config.truthSocial.password) {
              console.warn("Truth Social API: Credentials not configured")
              platformCounts.truthsocial = 0
              sendEvent({
                type: "platform_complete",
                data: { platform: "truthsocial", posts: [], count: 0 },
              })
              return
            }

            const truthSocialProvider = new TruthSocialProvider({
              username: config.truthSocial.username,
              password: config.truthSocial.password,
            })

            const truthSocialResult = await withTimeout(
              truthSocialProvider.search(query, {
                limit: 100,
              }),
              30000,
              "Truth Social API"
            )

            const filteredPosts = TruthSocialProvider.filterByTimeRange(
              truthSocialResult.posts,
              timeFilter
            )

            allPosts.push(...filteredPosts)
            platformCounts.truthsocial = filteredPosts.length

            sendEvent({
              type: "platform_complete",
              data: {
                platform: "truthsocial",
                posts: filteredPosts,
                count: filteredPosts.length,
              },
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error("Truth Social API error:", errorMessage)
            platformCounts.truthsocial = 0
            warnings.push(`Truth Social search failed: ${errorMessage}`)
            sendEvent({
              type: "platform_error",
              data: { platform: "truthsocial", error: errorMessage },
            })
          }
        }
        platformSearches.push(truthSocialSearch())
      }

      // Wait for all platform searches to complete
      await Promise.allSettled(platformSearches)

      // Process credibility for all posts
      const postsWithCredibility = processPostsCredibility(allPosts)

      // Sort posts
      let sortedPosts: Post[]
      switch (sort) {
        case "recent":
          sortedPosts = sortByRecent(postsWithCredibility)
          break
        case "engaged":
          sortedPosts = sortByEngaged(postsWithCredibility)
          break
        case "verified":
          sortedPosts = filterVerifiedOnly(postsWithCredibility)
          break
        case "relevance":
        default:
          sortedPosts = sortByRelevance(
            postsWithCredibility as (Post & { _finalScore?: number })[]
          )
          break
      }

      // Clean up internal scoring fields
      const cleanedPosts = sortedPosts.map((post) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _finalScore, ...cleanPost } = post as Post & { _finalScore?: number }
        return cleanPost
      })

      // Send stats update
      const credibilitySummary = calculateCredibilitySummary(cleanedPosts)
      const timeRange = XProvider.getTimeRange(timeFilter)

      sendEvent({
        type: "stats",
        data: {
          totalPosts: cleanedPosts.length,
          platforms: platformCounts,
          credibility: credibilitySummary,
          timeRange: {
            start: timeRange.startTime,
            end: timeRange.endTime,
          },
        },
      })

      // Run AI analysis if configured and we have posts
      let aiAnalysis: AIAnalysis | undefined
      if (config.llm.anthropic.apiKey && cleanedPosts.length > 0) {
        sendEvent({ type: "ai_analysis_started", data: {} })

        try {
          const aiService = new AIAnalysisService(config.llm.anthropic.apiKey)
          aiAnalysis = await withTimeout(
            aiService.generateAnalysis(query, cleanedPosts, {
              timeRange: timeFilter,
              language: language || "all",
              sources,
            }),
            45000,
            "AI Analysis"
          )

          sendEvent({
            type: "ai_analysis_complete",
            data: { analysis: aiAnalysis },
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error("AI analysis error:", errorMessage)
          sendEvent({
            type: "ai_analysis_error",
            data: { error: errorMessage },
          })
        }
      }

      // Calculate final sentiment
      const sentiment = calculateSentimentCounts(aiAnalysis, cleanedPosts.length)

      // Send completion event with final summary
      sendEvent({
        type: "complete",
        data: {
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
          sort,
          aiAnalysis,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
