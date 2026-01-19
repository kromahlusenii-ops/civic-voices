import { prisma } from "@/lib/prisma"
import {
  STRIPE_CONFIG,
  hasActiveSubscription,
  isFreeTier,
  isTimeFilterAllowedForFree,
  getCreditCost,
} from "@/lib/stripe-config"
import { hasEnoughCredits } from "./creditService"

export type FeatureAction = "search" | "report_generation" | "export" | "advanced_filters"

export interface FeatureCheckResult {
  allowed: boolean
  reason?: "not_authenticated" | "subscription_required" | "insufficient_credits" | "free_tier_limit"
  requiredCredits?: number
  currentCredits?: number
  upgradeRequired?: boolean
}

/**
 * Get user's subscription status
 */
export async function getUserSubscriptionStatus(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  })
  return user?.subscriptionStatus || STRIPE_CONFIG.status.FREE
}

/**
 * Check if user can perform a search with given time filter
 */
export async function canPerformSearch(
  userId: string,
  timeFilter: string
): Promise<FeatureCheckResult> {
  const status = await getUserSubscriptionStatus(userId)

  // Free tier users can only use specific time filters
  if (isFreeTier(status)) {
    if (!isTimeFilterAllowedForFree(timeFilter)) {
      return {
        allowed: false,
        reason: "subscription_required",
        upgradeRequired: true,
      }
    }
    // Free tier users don't use credits for allowed searches
    return { allowed: true }
  }

  // Paid users need credits
  const creditCost = getCreditCost("search")
  const hasCredits = await hasEnoughCredits(userId, creditCost)

  if (!hasCredits) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyCredits: true, bonusCredits: true },
    })
    return {
      allowed: false,
      reason: "insufficient_credits",
      requiredCredits: creditCost,
      currentCredits: (user?.monthlyCredits || 0) + (user?.bonusCredits || 0),
    }
  }

  return { allowed: true, requiredCredits: creditCost }
}

/**
 * Check if user can generate a report
 */
export async function canGenerateReport(userId: string): Promise<FeatureCheckResult> {
  const status = await getUserSubscriptionStatus(userId)

  // Free tier users cannot generate reports
  if (isFreeTier(status)) {
    return {
      allowed: false,
      reason: "subscription_required",
      upgradeRequired: true,
    }
  }

  // Paid users need credits
  const creditCost = getCreditCost("reportGeneration")
  const hasCredits = await hasEnoughCredits(userId, creditCost)

  if (!hasCredits) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyCredits: true, bonusCredits: true },
    })
    return {
      allowed: false,
      reason: "insufficient_credits",
      requiredCredits: creditCost,
      currentCredits: (user?.monthlyCredits || 0) + (user?.bonusCredits || 0),
    }
  }

  return { allowed: true, requiredCredits: creditCost }
}

/**
 * Check if user can access a feature
 */
export async function canAccessFeature(
  userId: string,
  feature: FeatureAction
): Promise<FeatureCheckResult> {
  const status = await getUserSubscriptionStatus(userId)

  // Check if feature is disabled for free tier
  if (isFreeTier(status)) {
    const disabledFeatures = STRIPE_CONFIG.freeTier.disabledFeatures as readonly string[]
    if (disabledFeatures.includes(feature)) {
      return {
        allowed: false,
        reason: "subscription_required",
        upgradeRequired: true,
      }
    }
  }

  return { allowed: true }
}

/**
 * Get feature limits based on subscription status
 */
export async function getFeatureLimits(userId: string) {
  const status = await getUserSubscriptionStatus(userId)
  const isPaid = hasActiveSubscription(status)

  return {
    subscriptionStatus: status,
    isPaid,
    limits: {
      allowedTimeFilters: isPaid
        ? ["24h", "7d", "30d", "90d", "1y", "all"]
        : STRIPE_CONFIG.freeTier.allowedTimeFilters,
      canGenerateReports: isPaid,
      canExport: isPaid,
      canUseAdvancedFilters: isPaid,
      creditsPerSearch: isPaid ? STRIPE_CONFIG.creditCosts.search : 0,
      creditsPerReport: isPaid ? STRIPE_CONFIG.creditCosts.reportGeneration : 0,
    },
  }
}
