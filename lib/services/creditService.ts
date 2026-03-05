import { prisma } from "@/lib/prisma"

/**
 * Get user's subscription and billing status
 */
export async function getUserBillingStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      currentPeriodEnd: true,
      trialEndDate: true,
    },
  })

  if (!user) {
    return null
  }

  return {
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    currentPeriodEnd: user.currentPeriodEnd,
    trialEndDate: user.trialEndDate,
  }
}
