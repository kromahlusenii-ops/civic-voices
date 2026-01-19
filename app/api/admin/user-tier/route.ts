import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { STRIPE_CONFIG } from "@/lib/stripe-config"

export const dynamic = "force-dynamic"

// Admin emails that can update user tiers
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL,
  // Add more admin emails here
].filter(Boolean)

interface UpdateTierRequest {
  userId?: string
  email?: string
  tier: "free" | "trialing" | "active" | "canceled"
  monthlyCredits?: number
  bonusCredits?: number
}

/**
 * GET /api/admin/user-tier?email=user@example.com
 * Get a user's current subscription tier
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser || !ADMIN_EMAILS.includes(authUser.email || "")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const email = url.searchParams.get("email")
    const userId = url.searchParams.get("userId")

    if (!email && !userId) {
      return NextResponse.json(
        { error: "email or userId query parameter required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { id: userId! },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        monthlyCredits: true,
        bonusCredits: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialStartDate: true,
        trialEndDate: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Admin get tier error:", error)
    return NextResponse.json(
      { error: "Failed to get user tier" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/user-tier
 * Update a user's subscription tier
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser || !ADMIN_EMAILS.includes(authUser.email || "")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const body: UpdateTierRequest = await request.json()
    const { userId, email, tier, monthlyCredits, bonusCredits } = body

    if (!userId && !email) {
      return NextResponse.json(
        { error: "userId or email required" },
        { status: 400 }
      )
    }

    if (!tier || !["free", "trialing", "active", "canceled"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: free, trialing, active, or canceled" },
        { status: 400 }
      )
    }

    // Find the user
    const existingUser = await prisma.user.findFirst({
      where: email ? { email } : { id: userId! },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      subscriptionStatus: tier,
    }

    // Set plan based on tier
    if (tier === "active" || tier === "trialing") {
      updateData.subscriptionPlan = "pro"
      // Set default credits if upgrading to paid tier
      if (monthlyCredits !== undefined) {
        updateData.monthlyCredits = monthlyCredits
      } else if (existingUser.subscriptionStatus === "free") {
        updateData.monthlyCredits = STRIPE_CONFIG.monthlyCredits
      }
      // Set period dates if not already set
      if (!existingUser.currentPeriodStart) {
        const now = new Date()
        const endDate = new Date(now)
        endDate.setMonth(endDate.getMonth() + 1)
        updateData.currentPeriodStart = now
        updateData.currentPeriodEnd = endDate
        updateData.creditsResetDate = now
      }
      if (tier === "trialing" && !existingUser.trialStartDate) {
        const now = new Date()
        const trialEnd = new Date(now)
        trialEnd.setDate(trialEnd.getDate() + 1) // 1-day trial
        updateData.trialStartDate = now
        updateData.trialEndDate = trialEnd
      }
    } else if (tier === "free" || tier === "canceled") {
      updateData.subscriptionPlan = null
      if (tier === "free") {
        updateData.monthlyCredits = 0
      }
    }

    // Allow explicit credit overrides
    if (monthlyCredits !== undefined) {
      updateData.monthlyCredits = monthlyCredits
    }
    if (bonusCredits !== undefined) {
      updateData.bonusCredits = bonusCredits
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        monthlyCredits: true,
        bonusCredits: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    })

    // Log the admin action
    console.log(`Admin ${authUser.email} updated user ${existingUser.email} tier to ${tier}`)

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User tier updated to ${tier}`,
    })
  } catch (error) {
    console.error("Admin update tier error:", error)
    return NextResponse.json(
      {
        error: "Failed to update user tier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
