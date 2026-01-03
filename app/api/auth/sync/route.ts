import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SyncUserRequest {
  firebaseUid: string;
  email: string | null;
  name: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncUserRequest = await request.json();
    const { firebaseUid, email, name } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { error: "Firebase UID and email are required" },
        { status: 400 }
      );
    }

    // Check if user already exists by firebaseUid
    let user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { firebaseUid },
        data: {
          email,
          name: name || user.name, // Keep existing name if new name is null
          updatedAt: new Date(),
        },
      });
    } else {
      // Check if email already exists (user might have been created via old NextAuth)
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Link Firebase UID to existing user
        user = await prisma.user.update({
          where: { email },
          data: {
            firebaseUid,
            name: name || existingUser.name,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            firebaseUid,
            email,
            name: name || email.split("@")[0], // Use email prefix as default name
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      {
        error: "Failed to sync user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
