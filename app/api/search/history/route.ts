import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Fetch user's saved searches
    const searches = await prisma.search.findMany({
      where: {
        userId: user.id,
        ...(query && {
          OR: [
            { queryText: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        report: {
          select: {
            id: true,
            totalResults: true,
            status: true,
          },
        },
      },
    });

    // Transform searches for response
    const formattedSearches = searches.map((search) => ({
      id: search.id,
      name: search.name || search.queryText,
      queryText: search.queryText,
      sources: search.sources,
      filters: search.filtersJson,
      createdAt: search.createdAt.toISOString(),
      reportId: search.reportId,
      totalResults: search.report?.totalResults || 0,
    }));

    return NextResponse.json({
      searches: formattedSearches,
      total: formattedSearches.length,
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
