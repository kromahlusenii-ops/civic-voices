import { prisma } from "@/lib/prisma"
import {
  STRIPE_CONFIG,
  hasActiveSubscription,
  isFreeTier,
  isTimeFilterAllowedForFree,
  getSearchCreditCost,
  getReportCreditCost,
  SearchType,
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
 * Check if user can perform a search with given time filter and search type
 */
export async function canPerformSearch(
  userId: string,
  timeFilter: string,
  searchType: SearchType = "national"
): Promise<FeatureCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      monthlyCredits: true,
      bonusCredits: true,
      freeSearchUsed: true,
    },
  })

  const status = user?.subscriptionStatus || STRIPE_CONFIG.status.FREE

  // Free tier logic
  if (isFreeTier(status)) {
    // Check if time filter is allowed for free tier
    if (!isTimeFilterAllowedForFree(timeFilter)) {
      return {
        allowed: false,
        reason: "subscription_required",
        upgradeRequired: true,
      }
    }

    // Check if user has used their free search
    if (user?.freeSearchUsed) {
      return {
        allowed: false,
        reason: "free_tier_limit",
        upgradeRequired: true,
      }
    }

    // Free search available (one-time allowance)
    return { allowed: true, requiredCredits: 0 }
  }

  // Paid users need credits based on search type
  const creditCost = getSearchCreditCost(searchType)
  const hasCredits = await hasEnoughCredits(userId, creditCost)

  if (!hasCredits) {
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      monthlyCredits: true,
      bonusCredits: true,
      freeReportUsed: true,
    },
  })

  const status = user?.subscriptionStatus || STRIPE_CONFIG.status.FREE

  // Free tier logic
  if (isFreeTier(status)) {
    // Check if user has used their free report
    if (user?.freeReportUsed) {
      return {
        allowed: false,
        reason: "free_tier_limit",
        upgradeRequired: true,
      }
    }

    // Free report available (one-time allowance)
    return { allowed: true, requiredCredits: 0 }
  }

  // Paid users need credits (10 credits for report)
  const creditCost = getReportCreditCost()
  const hasCredits = await hasEnoughCredits(userId, creditCost)

  if (!hasCredits) {
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      freeSearchUsed: true,
      freeReportUsed: true,
    },
  })

  const status = user?.subscriptionStatus || STRIPE_CONFIG.status.FREE
  const isPaid = hasActiveSubscription(status)

  return {
    subscriptionStatus: status,
    subscriptionPlan: user?.subscriptionPlan || null,
    isPaid,
    freeTier: {
      freeSearchUsed: user?.freeSearchUsed || false,
      freeReportUsed: user?.freeReportUsed || false,
      freeSearchRemaining: user?.freeSearchUsed ? 0 : 1,
      freeReportRemaining: user?.freeReportUsed ? 0 : 1,
    },
    limits: {
      allowedTimeFilters: isPaid
        ? ["24h", "7d", "30d", "90d", "1y", "all"]
        : STRIPE_CONFIG.freeTier.allowedTimeFilters,
      canGenerateReports: isPaid || !user?.freeReportUsed,
      canExport: isPaid,
      canUseAdvancedFilters: isPaid,
      creditCosts: {
        nationalSearch: STRIPE_CONFIG.creditCosts.nationalSearch,
        stateSearch: STRIPE_CONFIG.creditCosts.stateSearch,
        citySearch: STRIPE_CONFIG.creditCosts.citySearch,
        reportGeneration: STRIPE_CONFIG.creditCosts.reportGeneration,
      },
    },
  }
}

/**
 * Mark a free action as used (search or report)
 */
export async function consumeFreeAction(
  userId: string,
  action: "search" | "report"
): Promise<void> {
  if (action === "search") {
    await prisma.user.update({
      where: { id: userId },
      data: { freeSearchUsed: true },
    })
  } else if (action === "report") {
    await prisma.user.update({
      where: { id: userId },
      data: { freeReportUsed: true },
    })
  }
}

/**
 * Check if user has remaining free actions
 */
export async function getFreeActionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      freeSearchUsed: true,
      freeReportUsed: true,
    },
  })

  return {
    freeSearchAvailable: !user?.freeSearchUsed,
    freeReportAvailable: !user?.freeReportUsed,
  }
}
