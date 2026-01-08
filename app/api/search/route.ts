import { NextRequest, NextResponse } from "next/server";
import { XProvider } from "@/lib/providers/XProvider";
import TikTokApiService from "@/lib/services/tiktokApi";
import AIAnalysisService from "@/lib/services/aiAnalysis";
import { config } from "@/lib/config";
import type { SearchParams, SearchResponse, Post, AIAnalysis } from "@/lib/types/api";

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

    // Fetch from X if selected
    if (sources.includes("x")) {
      try {
        if (!config.x.bearerToken) {
          console.warn("X API: Bearer token not configured");
          platformCounts.x = 0;
        } else {
          const xProvider = new XProvider({
            bearerToken: config.x.bearerToken,
          });

          const timeRange = XProvider.getTimeRange(timeFilter);
          const xResult = await xProvider.searchWithWarning(query, {
            maxResults: 20,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            language: language, // Pass language filter to X API
          });

          allPosts.push(...xResult.posts);
          platformCounts.x = xResult.posts.length;

          // Collect warnings (e.g., time range clamped)
          if (xResult.warning) {
            warnings.push(xResult.warning);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("X API error:", errorMessage);
        platformCounts.x = 0;
        // Add warning so user knows X failed
        warnings.push(`X/Twitter search failed: ${errorMessage}`);
      }
    }

    // Fetch from TikTok if selected
    if (sources.includes("tiktok")) {
      try {
        const tiktokService = new TikTokApiService(
          config.tiktok.apiKey || "",
          config.tiktok.apiUrl
        );

        // TikTok doesn't support Boolean operators - extract base query for API
        const tiktokQuery = TikTokApiService.getBaseQuery(query);
        const tiktokResults = await tiktokService.searchVideos(tiktokQuery, {
          count: 20,
        });

        console.log("TikTok raw results:", JSON.stringify(tiktokResults, null, 2));

        let tiktokPosts = tiktokService.transformToPosts(tiktokResults);
        console.log("TikTok transformed posts count:", tiktokPosts.length);

        // Filter by time range (TikTok API doesn't support time filtering directly)
        tiktokPosts = TikTokApiService.filterByTimeRange(
          tiktokPosts,
          timeFilter
        );

        // Apply Boolean query filtering if query has AND/OR operators
        if (TikTokApiService.hasBooleanQuery(query)) {
          tiktokPosts = TikTokApiService.filterByBooleanQuery(tiktokPosts, query);
          console.log("TikTok posts after Boolean filter:", tiktokPosts.length);
        }

        allPosts.push(...tiktokPosts);
        platformCounts.tiktok = tiktokPosts.length;
      } catch (error) {
        console.error("TikTok API error:", error);
        platformCounts.tiktok = 0;
      }
    }

    // Sort by creation date (newest first)
    allPosts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Generate AI analysis using Claude
    let aiAnalysis: AIAnalysis | undefined;
    if (config.llm.anthropic.apiKey) {
      try {
        const aiService = new AIAnalysisService(config.llm.anthropic.apiKey);
        aiAnalysis = await aiService.generateAnalysis(query, allPosts, {
          timeRange: timeFilter,
          language: language || "all",
          sources,
        });
      } catch (error) {
        console.error("AI analysis error:", error);
        // Continue without AI analysis if it fails
      }
    }

    // Calculate sentiment from AI analysis or use defaults
    const sentiment = aiAnalysis?.sentimentBreakdown
      ? {
          positive: aiAnalysis.sentimentBreakdown.overall === "positive" ? Math.ceil(allPosts.length * 0.6) : Math.floor(allPosts.length * 0.3),
          neutral: aiAnalysis.sentimentBreakdown.overall === "neutral" ? Math.ceil(allPosts.length * 0.6) : Math.floor(allPosts.length * 0.3),
          negative: aiAnalysis.sentimentBreakdown.overall === "negative" ? Math.ceil(allPosts.length * 0.6) : Math.floor(allPosts.length * 0.2),
        }
      : {
          positive: Math.floor(allPosts.length * 0.4),
          neutral: Math.floor(allPosts.length * 0.4),
          negative: Math.floor(allPosts.length * 0.2),
        };

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
