import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Use Supabase auth (not NextAuth)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      topics, 
      skipped, 
      useCase,
      // Phase 1: Topic Selection Onboarding fields
      selectedTopics,
      geoScope,
      geoState,
      geoCity,
    } = body as { 
      topics?: string[]; 
      skipped?: boolean; 
      useCase?: string;
      selectedTopics?: string[];
      geoScope?: string;
      geoState?: string;
      geoCity?: string;
    };

    // Check if user exists, create if not (handles Supabase-only signups)
    let user = await prisma.user.findUnique({
      where: { supabaseUid: supabaseUser.id },
      select: { id: true },
    });

    if (!user) {
      // Try to find by email in case user was created without supabaseUid
      user = await prisma.user.findUnique({
        where: { email: supabaseUser.email || `${supabaseUser.id}@unknown.com` },
        select: { id: true },
      });

      if (user) {
        // User exists by email but missing supabaseUid - update it
        console.log(`Linking existing user (email: ${supabaseUser.email}) to Supabase UID: ${supabaseUser.id}`);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            supabaseUid: supabaseUser.id,
            onboardingCompletedAt: new Date(),
            ...(useCase && { useCase }),
            ...(selectedTopics && { selectedTopics }),
            ...(geoScope && { geoScope }),
            ...(geoState && { geoState }),
            ...(geoCity && { geoCity }),
          },
        });
      } else {
        // User doesn't exist at all - create new
        console.log(`Auto-creating user record for Supabase UID: ${supabaseUser.id}`);
        user = await prisma.user.create({
          data: {
            supabaseUid: supabaseUser.id,
            email: supabaseUser.email || `${supabaseUser.id}@unknown.com`,
            name: supabaseUser.user_metadata?.name || null,
            onboardingCompletedAt: new Date(),
            ...(useCase && { useCase }),
            ...(selectedTopics && { selectedTopics }),
            ...(geoScope && { geoScope }),
            ...(geoState && { geoState }),
            ...(geoCity && { geoCity }),
          },
          select: { id: true },
        });
      }
    } else {
      // Update existing user's onboarding status with Phase 1 data
      await prisma.user.update({
        where: { supabaseUid: supabaseUser.id },
        data: {
          onboardingCompletedAt: new Date(),
          ...(useCase && { useCase }),
          // Phase 1: Save topic selections
          ...(selectedTopics && { selectedTopics }),
          ...(geoScope && { geoScope }),
          ...(geoState && { geoState }),
          ...(geoCity && { geoCity }),
        },
      });
    }

    // Legacy: Add tracked topics if any were selected (old flow)
    if (topics && topics.length > 0 && !skipped && user) {
      const topicData = topics.map((query: string) => ({
        userId: user.id,
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
