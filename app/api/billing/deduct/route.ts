import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { deductCredits } from "@/lib/services/creditService"
import { STRIPE_CONFIG } from "@/lib/stripe-config"

export const dynamic = "force-dynamic"

interface DeductCreditsRequest {
  action: "search" | "report_generation"
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      )
    }

    // Get user from database
    let user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        subscriptionStatus: true,
        monthlyCredits: true,
        bonusCredits: true,
      },
    })

    // Auto-create user if they don't exist in the database
    if (!user) {
      console.log(`Auto-creating user for credit deduction: ${authUser.id}`)
      const newUser = await prisma.user.create({
        data: {
          supabaseUid: authUser.id,
          email: authUser.email || `${authUser.id}@unknown.com`,
          subscriptionStatus: "free",
          monthlyCredits: 0,
          bonusCredits: 0,
        },
        select: {
          id: true,
          subscriptionStatus: true,
          monthlyCredits: true,
          bonusCredits: true,
        },
      })
      user = newUser
    }

    // Only deduct credits for active subscriptions
    if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
      // Free tier users don't use credits
      return NextResponse.json({
        success: true,
        creditsDeducted: 0,
        remainingCredits: 0,
        message: "Free tier - no credits deducted",
      })
    }

    const body: DeductCreditsRequest = await request.json()
    const { action, description } = body

    // Validate action
    if (!action || !["search", "report_generation"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      )
    }

    // Get credit cost
    const creditCost = action === "search"
      ? STRIPE_CONFIG.creditCosts.search
      : STRIPE_CONFIG.creditCosts.reportGeneration

    // Deduct credits
    const result = await deductCredits(
      user.id,
      creditCost,
      action === "search" ? "search_usage" : "report_generation",
      description || `${action} credit deduction`
    )

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: creditCost,
          available: result.remainingCredits,
        },
        { status: 402 }
      )
    }

    return NextResponse.json({
      success: true,
      creditsDeducted: creditCost,
      remainingCredits: result.remainingCredits,
    })
  } catch (error) {
    console.error("Credit deduction error:", error)
    return NextResponse.json(
      {
        error: "Failed to deduct credits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
