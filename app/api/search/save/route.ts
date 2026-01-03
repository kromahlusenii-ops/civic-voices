import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
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
    // Get Firebase ID token from Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);

    if (!decodedToken) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json(
        { error: "Email not found in token" },
        { status: 400 }
      );
    }

    // Get user from database by Firebase UID
    let user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    // If user not found by Firebase UID, try by email (for backwards compatibility)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email },
      });
    }

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
