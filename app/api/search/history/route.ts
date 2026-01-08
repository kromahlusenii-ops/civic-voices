import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { getSearchHistory } from "@/lib/services/searchStorage";

export async function GET(request: NextRequest) {
  try {
    // Get Supabase access token from Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split("Bearer ")[1];

    // Verify Supabase access token
    const user = await verifySupabaseToken(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const userId = user.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in token" },
        { status: 400 }
      );
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const noCache = searchParams.get("nocache") === "true";

    // Fetch user's saved searches from PostgreSQL with caching
    const { searches, total, fromCache } = await getSearchHistory(userId, {
      query,
      limit,
      useCache: !noCache,
    });

    // Transform searches for response (add reportId as search id for compatibility)
    const formattedSearches = searches.map((search) => ({
      id: search.id,
      name: search.name,
      queryText: search.queryText,
      sources: search.sources,
      filters: search.filters,
      createdAt: search.createdAt,
      reportId: search.id, // Use search id as report id for navigation
      totalResults: search.totalResults,
    }));

    return NextResponse.json({
      searches: formattedSearches,
      total,
      fromCache,
    });
  } catch (error) {
    console.error("Error fetching search history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch search history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
