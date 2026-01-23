import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { getUserOrganization, createOrganization } from "@/lib/services/organizationService"
import { getSeatInfoForUser } from "@/lib/services/seatService"

export const dynamic = "force-dynamic"

// GET /api/organization - Get user's organization
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const organization = await getUserOrganization(user.id)
    const seatInfo = await getSeatInfoForUser(user.id)

    if (!organization) {
      return NextResponse.json({
        organization: null,
        seatInfo: null,
        message: "No organization found",
      })
    }

    return NextResponse.json({
      organization,
      seatInfo,
    })
  } catch (error) {
    console.error("Get organization error:", error)
    return NextResponse.json(
      { error: "Failed to get organization" },
      { status: 500 }
    )
  }
}

// POST /api/organization - Create organization (for Agency/Business subscribers)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has Agency or Business plan
    if (!user.subscriptionPlan || !["agency", "business"].includes(user.subscriptionPlan)) {
      return NextResponse.json(
        { error: "Organizations require Agency or Business plan" },
        { status: 403 }
      )
    }

    // Check if user already has an organization
    const existingOrg = await getUserOrganization(user.id)
    if (existingOrg) {
      return NextResponse.json(
        { error: "User already has an organization" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      )
    }

    const organization = await createOrganization(user.id, name.trim(), user.subscriptionPlan)
    const seatInfo = await getSeatInfoForUser(user.id)

    return NextResponse.json({
      organization,
      seatInfo,
    })
  } catch (error) {
    console.error("Create organization error:", error)
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    )
  }
}
