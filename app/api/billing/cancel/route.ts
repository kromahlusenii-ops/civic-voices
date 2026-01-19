import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

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
    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      )
    }

    // Check if subscription is already canceled
    if (user.subscriptionStatus === "canceled") {
      return NextResponse.json(
        { error: "Subscription is already canceled" },
        { status: 400 }
      )
    }

    // Cancel subscription at period end (user keeps access until then)
    const canceledSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true }
    )

    // Extract period end from the subscription response
    // Using type assertion due to Stripe SDK type limitations with newer API versions
    const subscriptionData = canceledSubscription as unknown as {
      cancel_at?: number | null
      current_period_end?: number | null
    }

    // Update user's subscription status to indicate cancellation pending
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "canceled",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully",
      cancelAt: subscriptionData.cancel_at
        ? new Date(subscriptionData.cancel_at * 1000).toISOString()
        : null,
      currentPeriodEnd: subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000).toISOString()
        : null,
    })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
