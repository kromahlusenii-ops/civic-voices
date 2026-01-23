import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { STRIPE_CONFIG, getCreditPack } from "@/lib/stripe-config"

export const dynamic = "force-dynamic"

interface BuyCreditsRequest {
  credits: number
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
    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only allow credit purchases for active subscribers
    if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
      return NextResponse.json(
        { error: "Active subscription required to purchase credits" },
        { status: 400 }
      )
    }

    const body: BuyCreditsRequest = await request.json()
    const { credits } = body

    // Validate credit amount - must be one of the predefined packs
    const validPack = getCreditPack(credits)
    if (!validPack) {
      const validAmounts = STRIPE_CONFIG.creditPacks.map(p => p.credits).join(", ")
      return NextResponse.json(
        { error: `Invalid credit amount. Valid packs: ${validAmounts}` },
        { status: 400 }
      )
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

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Determine the base URL from request headers or environment
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (
      process.env.NODE_ENV === "production" ? "https://civicvoices.ai" : `${protocol}://${host}`
    )

    // Create checkout session for one-time payment using the credit pack
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} Credits`,
              description: `Add ${credits} credits to your Civic Voices account`,
            },
            unit_amount: validPack.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/search?credits=purchased`,
      cancel_url: `${baseUrl}/search?credits=canceled`,
      metadata: {
        userId: user.id,
        credits: credits.toString(),
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Credit purchase error:", error)
    return NextResponse.json(
      {
        error: "Failed to create credit purchase session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
