import { prisma } from "@/lib/prisma"
import { STRIPE_CONFIG } from "@/lib/stripe-config"

export interface CreditBalance {
  monthlyCredits: number
  bonusCredits: number
  totalCredits: number
  creditsResetDate: Date | null
}

export interface CreditTransactionData {
  userId: string
  amount: number
  type: "monthly_reset" | "overage_purchase" | "search_usage" | "report_generation"
  description?: string
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<CreditBalance> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      monthlyCredits: true,
      bonusCredits: true,
      creditsResetDate: true,
    },
  })

  if (!user) {
    return {
      monthlyCredits: 0,
      bonusCredits: 0,
      totalCredits: 0,
      creditsResetDate: null,
    }
  }

  return {
    monthlyCredits: user.monthlyCredits,
    bonusCredits: user.bonusCredits,
    totalCredits: user.monthlyCredits + user.bonusCredits,
    creditsResetDate: user.creditsResetDate,
  }
}

/**
 * Check if user has enough credits for an action
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
  const balance = await getUserCredits(userId)
  return balance.totalCredits >= requiredCredits
}

/**
 * Deduct credits from user's balance
 * Returns true if successful, false if insufficient credits
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: CreditTransactionData["type"],
  description?: string
): Promise<{ success: boolean; remainingCredits: number }> {
  const balance = await getUserCredits(userId)

  if (balance.totalCredits < amount) {
    return { success: false, remainingCredits: balance.totalCredits }
  }

  // Deduct from bonus credits first, then monthly
  let remainingDeduction = amount
  let newBonusCredits = balance.bonusCredits
  let newMonthlyCredits = balance.monthlyCredits

  if (remainingDeduction > 0 && newBonusCredits > 0) {
    const bonusDeduction = Math.min(remainingDeduction, newBonusCredits)
    newBonusCredits -= bonusDeduction
    remainingDeduction -= bonusDeduction
  }

  if (remainingDeduction > 0) {
    newMonthlyCredits -= remainingDeduction
  }

  // Update user and create transaction in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        monthlyCredits: newMonthlyCredits,
        bonusCredits: newBonusCredits,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: -amount, // Negative for deductions
        type,
        description: description || `${type} - ${amount} credits`,
      },
    }),
  ])

  return {
    success: true,
    remainingCredits: newMonthlyCredits + newBonusCredits,
  }
}

/**
 * Add credits to user's balance (for purchases)
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: CreditTransactionData["type"],
  description?: string
): Promise<{ success: boolean; newBalance: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        bonusCredits: { increment: amount },
      },
      select: {
        monthlyCredits: true,
        bonusCredits: true,
      },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount, // Positive for additions
        type,
        description: description || `${type} - ${amount} credits added`,
      },
    })

    return user.monthlyCredits + user.bonusCredits
  })

  return { success: true, newBalance: result }
}

/**
 * Reset monthly credits for a user (called on subscription renewal)
 */
export async function resetMonthlyCredits(
  userId: string,
  creditsResetDate?: Date
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        monthlyCredits: STRIPE_CONFIG.monthlyCredits,
        creditsResetDate: creditsResetDate || new Date(),
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: STRIPE_CONFIG.monthlyCredits,
        type: "monthly_reset",
        description: `Monthly credit reset - ${STRIPE_CONFIG.monthlyCredits} credits`,
      },
    }),
  ])
}

/**
 * Get recent credit transactions for a user
 */
export async function getCreditTransactions(
  userId: string,
  limit: number = 20
): Promise<Array<{
  id: string
  amount: number
  type: string
  description: string | null
  createdAt: Date
}>> {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      amount: true,
      type: true,
      description: true,
      createdAt: true,
    },
  })
}

/**
 * Get user's subscription and credit status
 */
export async function getUserBillingStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      monthlyCredits: true,
      bonusCredits: true,
      creditsResetDate: true,
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
    credits: {
      monthly: user.monthlyCredits,
      bonus: user.bonusCredits,
      total: user.monthlyCredits + user.bonusCredits,
      resetDate: user.creditsResetDate,
    },
    currentPeriodEnd: user.currentPeriodEnd,
    trialEndDate: user.trialEndDate,
  }
}
