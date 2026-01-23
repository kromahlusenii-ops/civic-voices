import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { STRIPE_CONFIG, SubscriptionTier } from "@/lib/stripe-config"

export const dynamic = "force-dynamic"

interface CheckoutRequest {
  plan?: SubscriptionTier // "pro" | "agency" | "business"
}

// Map of tier to environment variable names for price IDs
const PRICE_ID_ENV_MAP: Record<SubscriptionTier, string> = {
  pro: "STRIPE_PRO_PRICE_ID",
  agency: "STRIPE_AGENCY_PRICE_ID",
  business: "STRIPE_BUSINESS_PRICE_ID",
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

    // Parse request body
    let body: CheckoutRequest = {}
    try {
      body = await request.json()
    } catch {
      // Body is optional, default to pro plan
    }

    // Default to pro plan if not specified
    const plan: SubscriptionTier = body.plan || "pro"

    // Validate plan
    if (!STRIPE_CONFIG.tiers[plan]) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Must be one of: pro, agency, business` },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Handle upgrade/downgrade for existing subscribers
    const isSubscribed = user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing"
    if (isSubscribed && user.stripeSubscriptionId) {
      // If user already has the same plan, return error
      if (user.subscriptionPlan === plan) {
        return NextResponse.json(
          { error: "You are already subscribed to this plan" },
          { status: 400 }
        )
      }

      // Get the new price ID for the requested plan
      const newPriceIdEnvVar = PRICE_ID_ENV_MAP[plan]
      const newPriceId = process.env[newPriceIdEnvVar] || process.env.STRIPE_PRICE_ID
      if (!newPriceId) {
        return NextResponse.json(
          { error: `Stripe price not configured for ${plan} plan` },
          { status: 500 }
        )
      }

      try {
        // Get current subscription to find the subscription item ID
        const currentSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        const subscriptionItemId = currentSubscription.items.data[0]?.id

        if (!subscriptionItemId) {
          return NextResponse.json(
            { error: "Could not find subscription item to update" },
            { status: 500 }
          )
        }

        // Update the subscription to the new plan
        const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: [
            {
              id: subscriptionItemId,
              price: newPriceId,
            },
          ],
          metadata: {
            plan,
          },
          proration_behavior: "create_prorations",
        })

        // Update user in database
        const { getMonthlyCreditsForTier } = await import("@/lib/stripe-config")
        const monthlyCredits = getMonthlyCreditsForTier(plan)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: plan,
            monthlyCredits,
          },
        })

        console.log(`Upgraded user ${user.id} from ${user.subscriptionPlan} to ${plan}`)

        return NextResponse.json({
          success: true,
          message: `Successfully ${plan > (user.subscriptionPlan || "") ? "upgraded" : "changed"} to ${plan} plan`,
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
            plan,
          },
        })
      } catch (upgradeError) {
        console.error("Subscription upgrade error:", upgradeError)
        return NextResponse.json(
          {
            error: "Failed to upgrade subscription",
            details: upgradeError instanceof Error ? upgradeError.message : "Unknown error",
          },
          { status: 500 }
        )
      }
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to user
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Get the subscription price ID for the selected plan
    const priceIdEnvVar = PRICE_ID_ENV_MAP[plan]
    const priceId = process.env[priceIdEnvVar] || process.env.STRIPE_PRICE_ID
    if (!priceId) {
      console.error(`${priceIdEnvVar} is not set in environment variables`)
      return NextResponse.json(
        { error: `Stripe price not configured for ${plan} plan. Please set ${priceIdEnvVar} in your environment variables.` },
        { status: 500 }
      )
    }

    // Log the price ID being used (first 10 chars for security)
    console.log(`Creating checkout session for ${plan} plan with price: ${priceId.substring(0, 10)}...`)

    // Determine the base URL from request headers or environment
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (
      process.env.NODE_ENV === "production" ? "https://civicvoices.ai" : `${protocol}://${host}`
    )

    // Create checkout session with 3-day free trial
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trial.days,
        metadata: {
          plan, // Store plan in subscription metadata for webhook handling
        },
      },
      success_url: `${baseUrl}/search?subscription=success`,
      cancel_url: `${baseUrl}/search?subscription=canceled`,
      metadata: {
        userId: user.id,
        plan,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Checkout session error:", error)

    // Extract Stripe-specific error details if available
    let errorMessage = "Unknown error"
    let errorCode = undefined

    if (error instanceof Error) {
      errorMessage = error.message
      // Check for Stripe error properties
      const stripeError = error as { code?: string; type?: string }
      errorCode = stripeError.code || stripeError.type
    }

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    )
  }
}
