import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { topics, skipped, useCase } = body as { topics?: string[]; skipped?: boolean; useCase?: string };

    // Update user's onboarding status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompletedAt: new Date(),
        ...(useCase && { useCase }),
      },
    });

    // Add tracked topics if any were selected
    if (topics && topics.length > 0 && !skipped) {
      const topicData = topics.map((query: string) => ({
        userId: session.user.id,
        query: query.toLowerCase().trim(),
        name: query.trim(),
      }));

      // Use createMany with skipDuplicates to handle any existing topics
      await prisma.trackedTopic.createMany({
        data: topicData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
