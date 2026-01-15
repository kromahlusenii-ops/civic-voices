import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// Mark route as dynamic since it uses request.headers
export const dynamic = "force-dynamic";

/**
 * Get or create user by Supabase UID
 */
async function getUserBySupabaseUid(supabaseUid: string, email?: string): Promise<string | null> {
  // First try to find by supabaseUid
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  // If not found by supabaseUid, try by email and update supabaseUid
  if (email) {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      // Update user with supabaseUid
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseUid },
      });
      return user.id;
    }

    // Create new user if not found
    const newUser = await prisma.user.create({
      data: {
        supabaseUid,
        email,
      },
      select: { id: true },
    });
    return newUser.id;
  }

  return null;
}

// GET - List user's tracked topics
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
    const supabaseUser = await verifySupabaseToken(accessToken);

    if (!supabaseUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const userId = await getUserBySupabaseUid(supabaseUser.id, supabaseUser.email);

    if (!userId) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const topics = await prisma.trackedTopic.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Get topics error:", error);
    return NextResponse.json(
      { error: "Failed to get topics" },
      { status: 500 }
    );
  }
}

// POST - Add a new tracked topic
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
    const supabaseUser = await verifySupabaseToken(accessToken);

    if (!supabaseUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const userId = await getUserBySupabaseUid(supabaseUser.id, supabaseUser.email);

    if (!userId) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { query, name } = body as { query: string; name?: string };

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Check if topic already exists
    const existing = await prisma.trackedTopic.findUnique({
      where: {
        userId_query: {
          userId,
          query: normalizedQuery,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Topic already tracked" },
        { status: 409 }
      );
    }

    const topic = await prisma.trackedTopic.create({
      data: {
        userId,
        query: normalizedQuery,
        name: name?.trim() || query.trim(),
      },
    });

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error("Add topic error:", error);
    return NextResponse.json(
      { error: "Failed to add topic" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a tracked topic
export async function DELETE(request: NextRequest) {
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
    const supabaseUser = await verifySupabaseToken(accessToken);

    if (!supabaseUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const userId = await getUserBySupabaseUid(supabaseUser.id, supabaseUser.email);

    if (!userId) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("id");

    if (!topicId) {
      return NextResponse.json(
        { error: "Topic ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const topic = await prisma.trackedTopic.findFirst({
      where: {
        id: topicId,
        userId,
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    await prisma.trackedTopic.delete({
      where: { id: topicId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete topic error:", error);
    return NextResponse.json(
      { error: "Failed to delete topic" },
      { status: 500 }
    );
  }
}
