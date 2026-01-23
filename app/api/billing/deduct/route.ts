import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { deductCredits } from "@/lib/services/creditService"
import { consumeFreeAction } from "@/lib/services/featureService"
import { getSearchCreditCost, getReportCreditCost, SearchType } from "@/lib/stripe-config"

export const dynamic = "force-dynamic"

interface DeductCreditsRequest {
  action: "search" | "report_generation"
  searchType?: SearchType // "national" | "state" | "city" - only for search action
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
        freeSearchUsed: true,
        freeReportUsed: true,
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
          freeSearchUsed: false,
          freeReportUsed: false,
        },
        select: {
          id: true,
          subscriptionStatus: true,
          monthlyCredits: true,
          bonusCredits: true,
          freeSearchUsed: true,
          freeReportUsed: true,
        },
      })
      user = newUser
    }

    const body: DeductCreditsRequest = await request.json()
    const { action, searchType = "national", description } = body

    // Validate action
    if (!action || !["search", "report_generation"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      )
    }

    // Validate searchType if action is search
    if (action === "search" && searchType && !["national", "state", "city"].includes(searchType)) {
      return NextResponse.json(
        { error: "Invalid search type. Must be: national, state, or city" },
        { status: 400 }
      )
    }

    // Handle free tier users
    if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
      if (action === "search") {
        // Check if free search is available
        if (user.freeSearchUsed) {
          return NextResponse.json(
            {
              error: "Free search already used",
              message: "Upgrade to a paid plan to continue searching",
              upgradeRequired: true,
            },
            { status: 402 }
          )
        }
        // Consume the free search
        await consumeFreeAction(user.id, "search")
        return NextResponse.json({
          success: true,
          creditsDeducted: 0,
          remainingCredits: 0,
          message: "Free search used - upgrade to continue",
          freeActionUsed: true,
        })
      } else if (action === "report_generation") {
        // Check if free report is available
        if (user.freeReportUsed) {
          return NextResponse.json(
            {
              error: "Free report already used",
              message: "Upgrade to a paid plan to continue generating reports",
              upgradeRequired: true,
            },
            { status: 402 }
          )
        }
        // Consume the free report
        await consumeFreeAction(user.id, "report")
        return NextResponse.json({
          success: true,
          creditsDeducted: 0,
          remainingCredits: 0,
          message: "Free report used - upgrade to continue",
          freeActionUsed: true,
        })
      }
    }

    // Calculate credit cost based on action and search type
    const creditCost = action === "search"
      ? getSearchCreditCost(searchType)
      : getReportCreditCost()

    // Deduct credits for paid users
    const result = await deductCredits(
      user.id,
      creditCost,
      action === "search" ? "search_usage" : "report_generation",
      description || `${action} (${action === "search" ? searchType : ""}) - ${creditCost} credits`
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
