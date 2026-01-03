import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Source } from "@prisma/client";

interface SaveSearchRequest {
  queryText: string;
  name?: string;
  sources: string[];
  filters: {
    timeFilter: string;
    locationFilter: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body: SaveSearchRequest = await request.json();
    const { queryText, name, sources, filters } = body;

    // Validate required fields
    if (!queryText || !sources || sources.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: queryText and sources" },
        { status: 400 }
      );
    }

    // Convert sources to Prisma enum type
    const validSources = sources.filter((source) =>
      ["X", "TIKTOK", "REDDIT", "INSTAGRAM", "YOUTUBE", "LINKEDIN"].includes(
        source.toUpperCase()
      )
    );

    if (validSources.length === 0) {
      return NextResponse.json(
        { error: "No valid sources provided" },
        { status: 400 }
      );
    }

    // Map source names to Prisma enum values
    const enumSources: Source[] = validSources.map((source) => {
      const upperSource = source.toUpperCase();
      return upperSource === "X" ? Source.X : (upperSource as Source);
    });

    // Create search record
    const search = await prisma.search.create({
      data: {
        userId: user.id,
        queryText,
        name: name || queryText, // Default to queryText if no custom name
        sources: enumSources,
        filtersJson: filters,
      },
    });

    return NextResponse.json(
      {
        success: true,
        searchId: search.id,
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
