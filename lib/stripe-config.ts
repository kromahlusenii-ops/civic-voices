// Stripe configuration for Civic Voices
// Note: STRIPE_PRICE_ID should be created in Stripe Dashboard and set in .env

export const STRIPE_CONFIG = {
  // Subscription pricing
  subscription: {
    monthlyPrice: 4900, // $49.00 in cents
    trialDays: 1,
    trialPrice: 100, // $1.00 trial in cents
  },

  // Monthly credits included with subscription
  monthlyCredits: 200,

  // Overage pricing
  overage: {
    pricePerCredit: 25, // $0.25 in cents
    // Common credit pack sizes
    packs: [
      { credits: 10, price: 250 },   // $2.50
      { credits: 50, price: 1250 },  // $12.50
      { credits: 100, price: 2500 }, // $25.00
    ],
  },

  // Credit costs per action
  creditCosts: {
    search: 1,
    reportGeneration: 5,
  },

  // Free tier limits
  freeTier: {
    // Allowed time filters for free users
    allowedTimeFilters: ["7d", "1y"],
    // Features disabled for free users
    disabledFeatures: ["report_generation", "export", "advanced_filters"],
  },

  // Subscription status values
  status: {
    FREE: "free",
    TRIALING: "trialing",
    ACTIVE: "active",
    CANCELED: "canceled",
    PAST_DUE: "past_due",
  },
} as const

export type SubscriptionStatus = typeof STRIPE_CONFIG.status[keyof typeof STRIPE_CONFIG.status]

// Helper to check if user has active subscription
export function hasActiveSubscription(status: string): boolean {
  return status === STRIPE_CONFIG.status.ACTIVE || status === STRIPE_CONFIG.status.TRIALING
}

// Helper to check if user is on free tier
export function isFreeTier(status: string): boolean {
  return status === STRIPE_CONFIG.status.FREE
}

// Helper to check if time filter is allowed for free tier
export function isTimeFilterAllowedForFree(timeFilter: string): boolean {
  return (STRIPE_CONFIG.freeTier.allowedTimeFilters as readonly string[]).includes(timeFilter)
}

// Helper to get credit cost for an action
export function getCreditCost(action: keyof typeof STRIPE_CONFIG.creditCosts): number {
  return STRIPE_CONFIG.creditCosts[action]
}
