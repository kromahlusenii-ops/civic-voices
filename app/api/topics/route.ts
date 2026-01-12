import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List user's tracked topics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const topics = await prisma.trackedTopic.findMany({
      where: { userId: session.user.id },
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
          userId: session.user.id,
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
        userId: session.user.id,
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
        userId: session.user.id,
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
