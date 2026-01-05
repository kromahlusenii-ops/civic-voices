import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { Source, JobStatus } from "@prisma/client";

interface SaveSearchRequest {
  queryText: string;
  name?: string;
  sources: string[];
  filters: {
    timeFilter: string;
    language?: string;
  };
  totalResults?: number;
  posts?: Array<{
    id: string;
    text: string;
    author: string;
    platform: string;
    url: string;
    createdAt?: string;
    engagement?: {
      likes: number;
      comments: number;
      shares: number;
      views?: number;
    };
  }>;
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

    // Map source names to Prisma enum values
    const enumSources: Source[] = validSources.map((source) => {
      const upperSource = source.toUpperCase();
      return upperSource === "X" ? Source.X : (upperSource as Source);
    });

    // Create ResearchJob first
    const researchJob = await prisma.researchJob.create({
      data: {
        userId: user.id,
        queryJson: {
          query: queryText,
          sources: validSources,
          filters,
        },
        status: JobStatus.COMPLETED,
        totalResults: body.totalResults || body.posts?.length || 0,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Create Search record linked to ResearchJob
    const search = await prisma.search.create({
      data: {
        userId: user.id,
        queryText,
        name: name || queryText,
        sources: enumSources,
        filtersJson: filters,
        reportId: researchJob.id,
      },
    });

    // Create SourceResult records for posts if provided
    if (body.posts && body.posts.length > 0) {
      const sourceResultsData = body.posts.map((post) => {
        const upperPlatform = post.platform.toUpperCase();
        const source = upperPlatform === "X" ? Source.X : (upperPlatform as Source);
        return {
          jobId: researchJob.id,
          source,
          externalId: post.id,
          url: post.url,
          title: post.text.slice(0, 100),
          text: post.text,
          rawJson: post,
          createdAtExternal: post.createdAt ? new Date(post.createdAt) : null,
          score: post.engagement?.likes || 0,
        };
      });

      await prisma.sourceResult.createMany({
        data: sourceResultsData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        searchId: search.id,
        researchJobId: researchJob.id,
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
