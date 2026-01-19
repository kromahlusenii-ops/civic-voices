import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { STRIPE_CONFIG } from "@/lib/stripe-config"
import { resetMonthlyCredits } from "@/lib/services/creditService"
import Stripe from "stripe"

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic"

// Extended subscription type to include period dates that exist at runtime
interface SubscriptionWithPeriod extends Stripe.Subscription {
  current_period_start: number
  current_period_end: number
}

// Extended invoice type
interface InvoiceWithSubscription extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!customerId || !subscriptionId) {
    console.error("Missing customer or subscription ID in checkout session")
    return
  }

  // Get the subscription to get dates
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
  const subscription = subscriptionResponse as unknown as SubscriptionWithPeriod

  // Find user by Stripe customer ID or create/update based on customer email
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    console.error("Customer was deleted")
    return
  }

  const email = customer.email
  if (!email) {
    console.error("No email found for customer")
    return
  }

  // Update user with subscription info
  await prisma.user.updateMany({
    where: { email },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: subscription.status === "trialing" ? "trialing" : "active",
      subscriptionPlan: "pro",
      trialStartDate: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEndDate: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      monthlyCredits: STRIPE_CONFIG.monthlyCredits,
      creditsResetDate: new Date(),
    },
  })

  console.log(`Subscription activated for ${email}`)
}

async function handleSubscriptionUpdated(subscriptionEvent: Stripe.Subscription) {
  const subscription = subscriptionEvent as unknown as SubscriptionWithPeriod
  const customerId = subscription.customer as string

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
      status = "past_due"
      break
    case "unpaid":
      status = "past_due"
      break
    default:
      status = "free"
  }

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndDate: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    },
  })

  console.log(`Subscription updated for customer ${customerId}: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: "free",
      subscriptionPlan: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      monthlyCredits: 0,
    },
  })

  console.log(`Subscription canceled for customer ${customerId}`)
}

async function handleInvoicePaid(invoiceEvent: Stripe.Invoice) {
  const invoice = invoiceEvent as unknown as InvoiceWithSubscription
  const customerId = invoice.customer as string
  // subscription can be string | Stripe.Subscription | null
  const subscriptionData = invoice.subscription
  const subscriptionId = typeof subscriptionData === "string"
    ? subscriptionData
    : subscriptionData?.id

  if (!subscriptionId) {
    // This might be a one-time payment for credits
    return
  }

  // Find user and reset monthly credits
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (user) {
    // Get subscription for period dates
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
    const subscription = subscriptionResponse as unknown as SubscriptionWithPeriod

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "active",
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })

    // Reset monthly credits on renewal
    await resetMonthlyCredits(user.id, new Date(subscription.current_period_start * 1000))

    console.log(`Monthly credits reset for user ${user.id}`)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: "past_due",
    },
  })

  console.log(`Payment failed for customer ${customerId}`)
}

async function handleCheckoutSessionCompletedForCredits(session: Stripe.Checkout.Session) {
  // Handle one-time credit purchases
  if (session.mode !== "payment") return

  const customerId = session.customer as string
  const metadata = session.metadata

  if (!metadata?.credits) return

  const creditsToAdd = parseInt(metadata.credits, 10)
  if (isNaN(creditsToAdd)) return

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (user) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          bonusCredits: { increment: creditsToAdd },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: creditsToAdd,
          type: "overage_purchase",
          description: `Purchased ${creditsToAdd} credits`,
        },
      }),
    ])

    console.log(`Added ${creditsToAdd} credits to user ${user.id}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === "subscription") {
          await handleCheckoutSessionCompleted(session)
        } else if (session.mode === "payment") {
          await handleCheckoutSessionCompletedForCredits(session)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
