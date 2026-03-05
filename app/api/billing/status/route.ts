import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { getUserBillingStatus } from "@/lib/services/creditService"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

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

    // Get plan from subscription metadata (set during checkout)
    const plan = subscription.metadata?.plan || "pro"

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
        subscriptionPlan: status !== "free" ? plan : null,
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
      },
    })

    console.log(`Synced subscription status for user ${userId}: ${status} (${plan})`)
    return status
  } catch (error) {
    console.error("Failed to sync subscription from Stripe:", error)
    return null
  }
}

// Sync subscription by customer ID (fallback when webhook hasn't processed yet)
async function syncSubscriptionByCustomerId(userId: string, stripeCustomerId: string) {
  try {
    // Fetch active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      console.log(`No subscriptions found for customer ${stripeCustomerId}`)
      return null
    }

    const subscription = subscriptions.data[0]

    // Only sync if subscription is active or trialing
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      console.log(`Subscription status is ${subscription.status}, not syncing`)
      return null
    }

    // Map Stripe status to our status
    const status = subscription.status === "trialing" ? "trialing" : "active"

    // Get plan from subscription metadata (set during checkout)
    const plan = subscription.metadata?.plan || "pro"

    // Get period dates using type assertion
    const subscriptionData = subscription as unknown as {
      current_period_start?: number
      current_period_end?: number
      trial_start?: number | null
      trial_end?: number | null
    }

    // Update the user with subscription data
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionPlan: plan,
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
      },
    })

    console.log(`Synced subscription by customer ID for user ${userId}: ${status} (${plan})`)
    return status
  } catch (error) {
    console.error("Failed to sync subscription by customer ID:", error)
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
    let user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })

    // Auto-create user if they don't exist in the database
    // This handles cases where user signed up via Supabase but record wasn't created
    if (!user) {
      // Try to find by email in case user was created without supabaseUid
      user = await prisma.user.findFirst({
        where: { email: authUser.email || `${authUser.id}@unknown.com` },
        select: {
          id: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
        },
      })

      if (user) {
        // User exists by email but missing supabaseUid - link it
        console.log(`Linking existing user (email: ${authUser.email}) to Supabase UID: ${authUser.id}`)
        await prisma.user.update({
          where: { id: user.id },
          data: { supabaseUid: authUser.id },
        })
      } else {
        // User doesn't exist at all - create new
        console.log(`Auto-creating user for Supabase UID: ${authUser.id}`)
        const newUser = await prisma.user.create({
          data: {
            supabaseUid: authUser.id,
            email: authUser.email || `${authUser.id}@unknown.com`,
            subscriptionStatus: "free",
          },
          select: {
            id: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            subscriptionStatus: true,
          },
        })
        user = newUser
      }
    }

    // Sync subscription from Stripe if status needs verification
    // This handles cases where webhook didn't process yet OR trial status needs updating to active
    const needsSync =
      user.subscriptionStatus === "free" ||
      user.subscriptionStatus === "trialing" ||
      !user.subscriptionStatus

    if (needsSync) {
      if (user.stripeSubscriptionId) {
        // Sync by subscription ID
        await syncSubscriptionFromStripe(user.id, user.stripeSubscriptionId)
      } else if (user.stripeCustomerId) {
        // Fallback: sync by customer ID (for when webhook hasn't set subscription ID yet)
        await syncSubscriptionByCustomerId(user.id, user.stripeCustomerId)
      }
    }

    // Get billing status
    const billingStatus = await getUserBillingStatus(user.id)

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
