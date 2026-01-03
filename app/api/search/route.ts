import { NextRequest, NextResponse } from "next/server";
import XApiService from "@/lib/services/xApi";
import TikTokApiService from "@/lib/services/tiktokApi";
import type { SearchParams, SearchResponse, Post } from "@/lib/types/api";

export async function POST(request: NextRequest) {
  try {
    const body: SearchParams = await request.json();
    const { query, sources, timeFilter } = body;

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

    // Fetch from X if selected
    if (sources.includes("x")) {
      try {
        const xService = new XApiService(
          process.env.X_BEARER_TOKEN || ""
        );

        const timeRange = XApiService.getTimeRange(timeFilter);
        const xResults = await xService.searchTweets(query, {
          maxResults: 20,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
        });

        const xPosts = xService.transformToPosts(xResults);
        allPosts.push(...xPosts);
        platformCounts.x = xPosts.length;
      } catch (error) {
        console.error("X API error:", error);
        platformCounts.x = 0;
      }
    }

    // Fetch from TikTok if selected
    if (sources.includes("tiktok")) {
      try {
        const tiktokService = new TikTokApiService(
          process.env.TIKTOK_API_KEY || "",
          process.env.TIKTOK_API_URL
        );

        const tiktokResults = await tiktokService.searchVideos(query, {
          count: 20,
        });

        let tiktokPosts = tiktokService.transformToPosts(tiktokResults);

        // Filter by time range (TikTok API doesn't support time filtering directly)
        tiktokPosts = TikTokApiService.filterByTimeRange(
          tiktokPosts,
          timeFilter
        );

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

    // Calculate sentiment (placeholder - would use real sentiment analysis)
    const sentiment = {
      positive: Math.floor(allPosts.length * 0.4),
      neutral: Math.floor(allPosts.length * 0.4),
      negative: Math.floor(allPosts.length * 0.2),
    };

    // Build response
    const response: SearchResponse = {
      posts: allPosts,
      summary: {
        totalPosts: allPosts.length,
        platforms: platformCounts,
        sentiment,
        timeRange: {
          start: XApiService.getTimeRange(timeFilter).startTime,
          end: XApiService.getTimeRange(timeFilter).endTime,
        },
      },
      query,
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
