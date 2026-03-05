// Stripe configuration for Civic Voices
// Note: Price IDs should be created in Stripe Dashboard and set in .env

export const STRIPE_CONFIG = {
  // Subscription tiers
  tiers: {
    pro: {
      name: "Pro",
      monthlyPrice: 9900, // $99.00 in cents
      users: 1,
      productId: "prod_Tof3EP4wYT8mTx",
      includedSeats: 1,
      canAddSeats: false,
    },
    agency: {
      name: "Agency",
      monthlyPrice: 24900, // $249.00 in cents
      users: 3,
      productId: "prod_TqYVSWRcbvgi85",
      includedSeats: 3,
      canAddSeats: true,
    },
    business: {
      name: "Business",
      monthlyPrice: 49900, // $499.00 in cents
      users: 5,
      productId: "prod_TqYVhKSKtlcxMO",
      includedSeats: 5,
      canAddSeats: true,
    },
  },

  // Additional seat pricing
  seats: {
    pricePerSeat: 4900, // $49.00 per additional seat/month
    // Price ID should be set in env: STRIPE_SEAT_PRICE_ID
  },

  // Trial configuration
  trial: {
    days: 3, // 3-day free trial for all tiers
  },

  // Free tier configuration
  freeTier: {
    // One free search and one free report (one-time, ever)
    freeSearchCount: 1,
    freeReportCount: 1,
    // Features available to free users (limited)
    allowedTimeFilters: ["7d", "1y"],
    // Features disabled for free users after free allowance used
    disabledFeatures: ["export", "advanced_filters"],
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
export type SubscriptionTier = keyof typeof STRIPE_CONFIG.tiers

// Helper to check if user has active subscription
export function hasActiveSubscription(status: string, currentPeriodEnd?: string | Date | null): boolean {
  if (status === STRIPE_CONFIG.status.ACTIVE || status === STRIPE_CONFIG.status.TRIALING) return true
  if (status === STRIPE_CONFIG.status.CANCELED && currentPeriodEnd && new Date(currentPeriodEnd) > new Date()) return true
  return false
}

// Helper to check if user is on free tier
export function isFreeTier(status: string): boolean {
  return status === STRIPE_CONFIG.status.FREE
}

// Helper to check if time filter is allowed for free tier
export function isTimeFilterAllowedForFree(timeFilter: string): boolean {
  return (STRIPE_CONFIG.freeTier.allowedTimeFilters as readonly string[]).includes(timeFilter)
}

// Helper to get tier configuration
export function getTierConfig(tier: string | null) {
  if (!tier) return null
  return STRIPE_CONFIG.tiers[tier as SubscriptionTier] || null
}

// Helper to get included seats for a tier
export function getIncludedSeatsForTier(tier: string | null): number {
  if (!tier) return 1
  const tierConfig = STRIPE_CONFIG.tiers[tier as SubscriptionTier]
  return tierConfig?.includedSeats || 1
}

// Helper to check if tier can add additional seats
export function canTierAddSeats(tier: string | null): boolean {
  if (!tier) return false
  const tierConfig = STRIPE_CONFIG.tiers[tier as SubscriptionTier]
  return tierConfig?.canAddSeats || false
}

// Helper to get seat price per month
export function getSeatPricePerMonth(): number {
  return STRIPE_CONFIG.seats.pricePerSeat
}

// Helper to get Stripe seat price ID for a tier
export function getSeatPriceIdForTier(tier: string | null): string | null {
  if (!tier) return null

  switch (tier) {
    case "agency":
      return process.env.STRIPE_SEAT_PRICE_AGENT_ID || null
    case "business":
      return process.env.STRIPE_SEAT_PRICE_BUSINESS_ID || null
    default:
      return null
  }
}
