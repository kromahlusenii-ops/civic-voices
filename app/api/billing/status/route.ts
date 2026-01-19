import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { getUserBillingStatus, getCreditTransactions } from "@/lib/services/creditService"
import { getFeatureLimits } from "@/lib/services/featureService"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { STRIPE_CONFIG } from "@/lib/stripe-config"

export const dynamic = "force-dynamic"

// Sync subscription status from Stripe if there's a mismatch
async function syncSubscriptionFromStripe(userId: string, stripeSubscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    // Map Stripe status to our status
    let status: string
    switch (subscription.status) {
      case "trialing":
        status = "trialing"
        break
      case "active":
        status = "active"
        break
      case "canceled":
        status = "canceled"
        break
      case "past_due":
      case "unpaid":
        status = "past_due"
        break
      default:
        status = "free"
    }

    // Get period dates using type assertion
    const subscriptionData = subscription as unknown as {
      current_period_start?: number
      current_period_end?: number
      trial_start?: number | null
      trial_end?: number | null
    }

    // Update the user with correct subscription data
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status,
        subscriptionPlan: status !== "free" ? "pro" : null,
        currentPeriodStart: subscriptionData.current_period_start
          ? new Date(subscriptionData.current_period_start * 1000)
          : null,
        currentPeriodEnd: subscriptionData.current_period_end
          ? new Date(subscriptionData.current_period_end * 1000)
          : null,
        trialStartDate: subscriptionData.trial_start
          ? new Date(subscriptionData.trial_start * 1000)
          : null,
        trialEndDate: subscriptionData.trial_end
          ? new Date(subscriptionData.trial_end * 1000)
          : null,
        // Give credits if they don't have any yet
        monthlyCredits: STRIPE_CONFIG.monthlyCredits,
      },
    })

    console.log(`Synced subscription status for user ${userId}: ${status}`)
    return status
  } catch (error) {
    console.error("Failed to sync subscription from Stripe:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
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

    // Get user from database with subscription info
    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user has a subscription ID but status is "free", sync from Stripe
    // This handles cases where the webhook didn't process
    if (user.stripeSubscriptionId && user.subscriptionStatus === "free") {
      await syncSubscriptionFromStripe(user.id, user.stripeSubscriptionId)
    }

    // Get billing status and feature limits
    const [billingStatus, featureLimits, recentTransactions] = await Promise.all([
      getUserBillingStatus(user.id),
      getFeatureLimits(user.id),
      getCreditTransactions(user.id, 10),
    ])

    if (!billingStatus) {
      return NextResponse.json({ error: "Billing status not found" }, { status: 404 })
    }

    return NextResponse.json({
      subscription: {
        status: billingStatus.subscriptionStatus,
        plan: billingStatus.subscriptionPlan,
        currentPeriodEnd: billingStatus.currentPeriodEnd,
        trialEndDate: billingStatus.trialEndDate,
      },
      credits: billingStatus.credits,
      limits: featureLimits.limits,
      recentTransactions,
    })
  } catch (error) {
    console.error("Billing status error:", error)
    return NextResponse.json(
      {
        error: "Failed to get billing status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
