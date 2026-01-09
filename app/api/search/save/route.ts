import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { saveSearch, SearchPost } from "@/lib/services/searchStorage";

// Mark route as dynamic since it uses request.headers
export const dynamic = "force-dynamic";

interface SaveSearchRequest {
  queryText: string;
  name?: string;
  sources: string[];
  filters: {
    timeFilter: string;
    language?: string;
  };
  totalResults?: number;
  posts?: SearchPost[];
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: SaveSearchRequest = await request.json();
    const { queryText, name, sources, filters, totalResults, posts } = body;

    // Validate required fields
    if (!queryText || !sources || sources.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: queryText and sources" },
        { status: 400 }
      );
    }

    // Validate sources
    const validSourceNames = ["X", "TIKTOK", "REDDIT", "INSTAGRAM", "YOUTUBE", "LINKEDIN"];
    const validSources = sources.filter((source) =>
      validSourceNames.includes(source.toUpperCase())
    );

    if (validSources.length === 0) {
      return NextResponse.json(
        { error: "No valid sources provided" },
        { status: 400 }
      );
    }

    // Save to PostgreSQL
    const { searchId } = await saveSearch(userId, {
      queryText,
      name,
      sources: validSources,
      filters,
      totalResults,
      posts,
    });

    return NextResponse.json(
      {
        success: true,
        searchId,
        message: "Search saved successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving search:", error);
    return NextResponse.json(
      {
        error: "Failed to save search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
