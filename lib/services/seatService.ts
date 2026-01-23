import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { canTierAddSeats, getSeatPricePerMonth, getSeatPriceIdForTier } from "@/lib/stripe-config"

export interface SeatInfo {
  includedSeats: number
  additionalSeats: number
  totalSeats: number
  usedSeats: number
  availableSeats: number
  canAddSeats: boolean
  pricePerSeat: number
}

/**
 * Get seat information for an organization
 */
export async function getSeatInfo(organizationId: string): Promise<SeatInfo | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      owner: {
        select: { subscriptionPlan: true },
      },
      _count: {
        select: { members: true },
      },
    },
  })

  if (!org) return null

  const totalSeats = org.includedSeats + org.additionalSeats
  const usedSeats = org._count.members
  const canAdd = canTierAddSeats(org.owner.subscriptionPlan)

  return {
    includedSeats: org.includedSeats,
    additionalSeats: org.additionalSeats,
    totalSeats,
    usedSeats,
    availableSeats: totalSeats - usedSeats,
    canAddSeats: canAdd,
    pricePerSeat: getSeatPricePerMonth(),
  }
}

/**
 * Get seat info for a user's organization
 */
export async function getSeatInfoForUser(userId: string): Promise<SeatInfo | null> {
  // Find organization where user is owner or member
  const ownedOrg = await prisma.organization.findUnique({
    where: { ownerId: userId },
  })

  if (ownedOrg) {
    return getSeatInfo(ownedOrg.id)
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  })

  if (membership) {
    return getSeatInfo(membership.organizationId)
  }

  return null
}

/**
 * Check if organization can add a new member
 */
export async function canAddMember(organizationId: string): Promise<boolean> {
  const seatInfo = await getSeatInfo(organizationId)
  if (!seatInfo) return false
  return seatInfo.availableSeats > 0
}

/**
 * Add additional seats to an organization via Stripe
 */
export async function addSeats(
  organizationId: string,
  seatsToAdd: number
): Promise<{ success: boolean; error?: string; newTotal?: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      owner: {
        select: {
          id: true,
          subscriptionPlan: true,
          stripeSubscriptionId: true,
        },
      },
    },
  })

  if (!org) {
    return { success: false, error: "Organization not found" }
  }

  if (!canTierAddSeats(org.owner.subscriptionPlan)) {
    return { success: false, error: "Your plan does not support additional seats" }
  }

  if (!org.owner.stripeSubscriptionId) {
    return { success: false, error: "No active subscription" }
  }

  const seatPriceId = getSeatPriceIdForTier(org.owner.subscriptionPlan)
  if (!seatPriceId) {
    return { success: false, error: "Seat pricing not configured for your plan" }
  }

  try {
    const newAdditionalSeats = org.additionalSeats + seatsToAdd

    if (org.stripeSeatItemId) {
      // Update existing subscription item quantity
      await stripe.subscriptionItems.update(org.stripeSeatItemId, {
        quantity: newAdditionalSeats,
      })
    } else {
      // Create new subscription item for seats
      const subscriptionItem = await stripe.subscriptionItems.create({
        subscription: org.owner.stripeSubscriptionId,
        price: seatPriceId,
        quantity: seatsToAdd,
      })

      // Store the subscription item ID
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeSeatItemId: subscriptionItem.id },
      })
    }

    // Update organization's additional seats count
    await prisma.organization.update({
      where: { id: organizationId },
      data: { additionalSeats: newAdditionalSeats },
    })

    return {
      success: true,
      newTotal: org.includedSeats + newAdditionalSeats,
    }
  } catch (error) {
    console.error("Failed to add seats:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add seats",
    }
  }
}

/**
 * Remove additional seats from an organization
 */
export async function removeSeats(
  organizationId: string,
  seatsToRemove: number
): Promise<{ success: boolean; error?: string; newTotal?: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      owner: {
        select: {
          stripeSubscriptionId: true,
        },
      },
      _count: {
        select: { members: true },
      },
    },
  })

  if (!org) {
    return { success: false, error: "Organization not found" }
  }

  if (org.additionalSeats < seatsToRemove) {
    return { success: false, error: "Cannot remove more seats than you have purchased" }
  }

  const newAdditionalSeats = org.additionalSeats - seatsToRemove
  const newTotalSeats = org.includedSeats + newAdditionalSeats

  // Check if we have enough seats for current members
  if (org._count.members > newTotalSeats) {
    return {
      success: false,
      error: `Cannot remove seats: ${org._count.members} members require at least ${org._count.members} seats`,
    }
  }

  try {
    if (org.stripeSeatItemId) {
      if (newAdditionalSeats === 0) {
        // Remove the subscription item entirely
        await stripe.subscriptionItems.del(org.stripeSeatItemId)
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            additionalSeats: 0,
            stripeSeatItemId: null,
          },
        })
      } else {
        // Update quantity
        await stripe.subscriptionItems.update(org.stripeSeatItemId, {
          quantity: newAdditionalSeats,
        })
        await prisma.organization.update({
          where: { id: organizationId },
          data: { additionalSeats: newAdditionalSeats },
        })
      }
    }

    return {
      success: true,
      newTotal: newTotalSeats,
    }
  } catch (error) {
    console.error("Failed to remove seats:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove seats",
    }
  }
}

/**
 * Sync seat subscription item from Stripe (for webhook handling)
 */
export async function syncSeatItem(
  stripeSubscriptionId: string,
  seatItemId: string,
  quantity: number
): Promise<void> {
  // Find organization by owner's subscription
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId },
    select: { id: true },
  })

  if (!user) return

  const org = await prisma.organization.findUnique({
    where: { ownerId: user.id },
  })

  if (!org) return

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeSeatItemId: seatItemId,
      additionalSeats: quantity,
    },
  })
}

/**
 * Clear seat subscription item (when subscription is canceled)
 */
export async function clearSeatItem(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeSeatItemId: null,
      additionalSeats: 0,
    },
  })
}
