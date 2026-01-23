import { prisma } from "@/lib/prisma"
import { getIncludedSeatsForTier } from "@/lib/stripe-config"
import crypto from "crypto"

export interface OrganizationWithMembers {
  id: string
  name: string
  ownerId: string
  includedSeats: number
  additionalSeats: number
  stripeSeatItemId: string | null
  members: Array<{
    id: string
    userId: string
    role: string
    joinedAt: Date | null
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }>
  invites: Array<{
    id: string
    email: string
    role: string
    expiresAt: Date
    createdAt: Date
  }>
}

/**
 * Get user's organization (as owner or member)
 */
export async function getUserOrganization(userId: string): Promise<OrganizationWithMembers | null> {
  // First check if user owns an organization
  const ownedOrg = await prisma.organization.findUnique({
    where: { ownerId: userId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      invites: {
        where: {
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  })

  if (ownedOrg) {
    return ownedOrg
  }

  // Check if user is a member of any organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          invites: {
            where: {
              acceptedAt: null,
              expiresAt: { gt: new Date() },
            },
            select: {
              id: true,
              email: true,
              role: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  return membership?.organization || null
}

/**
 * Create an organization for a user (typically when subscribing to Agency/Business)
 */
export async function createOrganization(
  ownerId: string,
  name: string,
  plan: string
): Promise<OrganizationWithMembers> {
  const includedSeats = getIncludedSeatsForTier(plan)

  return await prisma.$transaction(async (tx) => {
    // Create the organization
    const organization = await tx.organization.create({
      data: {
        name,
        ownerId,
        includedSeats,
        additionalSeats: 0,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        invites: {
          where: {
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    })

    // Add owner as first member with admin role
    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: ownerId,
        role: "admin",
        joinedAt: new Date(),
      },
    })

    // Refetch with the new member
    return await tx.organization.findUniqueOrThrow({
      where: { id: organization.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        invites: {
          where: {
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    })
  })
}

/**
 * Create an invite for a new member
 */
export async function createInvite(
  organizationId: string,
  email: string,
  role: "admin" | "member" = "member"
): Promise<{ id: string; token: string; email: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId,
      email: email.toLowerCase(),
      role,
      token,
      expiresAt,
    },
  })

  return {
    id: invite.id,
    token: invite.token,
    email: invite.email,
    expiresAt: invite.expiresAt,
  }
}

/**
 * Get invite by token
 */
export async function getInviteByToken(token: string) {
  return await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Accept an invite and add user to organization
 */
export async function acceptInvite(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: true,
    },
  })

  if (!invite) {
    return { success: false, error: "Invite not found" }
  }

  if (invite.acceptedAt) {
    return { success: false, error: "Invite already accepted" }
  }

  if (invite.expiresAt < new Date()) {
    return { success: false, error: "Invite expired" }
  }

  // Check if user is already a member
  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId,
      },
    },
  })

  if (existingMember) {
    return { success: false, error: "Already a member of this organization" }
  }

  // Check seat availability
  const org = invite.organization
  const memberCount = await prisma.organizationMember.count({
    where: { organizationId: org.id },
  })
  const totalSeats = org.includedSeats + org.additionalSeats

  if (memberCount >= totalSeats) {
    return { success: false, error: "No available seats" }
  }

  // Accept invite and add member
  await prisma.$transaction([
    prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
    prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
        joinedAt: new Date(),
      },
    }),
  ])

  return { success: true }
}

/**
 * Remove a member from organization
 */
export async function removeMember(
  organizationId: string,
  memberUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Get organization to check ownership
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!org) {
    return { success: false, error: "Organization not found" }
  }

  // Check if requesting user is admin
  const requestingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: requestingUserId,
      },
    },
  })

  if (!requestingMember || requestingMember.role !== "admin") {
    return { success: false, error: "Only admins can remove members" }
  }

  // Cannot remove the owner
  if (memberUserId === org.ownerId) {
    return { success: false, error: "Cannot remove organization owner" }
  }

  // Remove the member
  await prisma.organizationMember.delete({
    where: {
      organizationId_userId: {
        organizationId,
        userId: memberUserId,
      },
    },
  })

  return { success: true }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  organizationId: string,
  memberUserId: string,
  newRole: "admin" | "member",
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Get organization to check ownership
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!org) {
    return { success: false, error: "Organization not found" }
  }

  // Only owner can change roles
  if (requestingUserId !== org.ownerId) {
    return { success: false, error: "Only the owner can change member roles" }
  }

  // Cannot change owner's role
  if (memberUserId === org.ownerId) {
    return { success: false, error: "Cannot change owner's role" }
  }

  await prisma.organizationMember.update({
    where: {
      organizationId_userId: {
        organizationId,
        userId: memberUserId,
      },
    },
    data: { role: newRole },
  })

  return { success: true }
}

/**
 * Cancel a pending invite
 */
export async function cancelInvite(
  inviteId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  const invite = await prisma.organizationInvite.findUnique({
    where: { id: inviteId },
    include: { organization: true },
  })

  if (!invite) {
    return { success: false, error: "Invite not found" }
  }

  // Check if requesting user is admin
  const requestingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId: requestingUserId,
      },
    },
  })

  if (!requestingMember || requestingMember.role !== "admin") {
    return { success: false, error: "Only admins can cancel invites" }
  }

  await prisma.organizationInvite.delete({
    where: { id: inviteId },
  })

  return { success: true }
}

/**
 * Update organization's included seats (called when plan changes)
 */
export async function updateOrganizationSeats(
  organizationId: string,
  includedSeats: number
): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { includedSeats },
  })
}

/**
 * Check if user is an admin of their organization
 */
export async function isUserOrgAdmin(userId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
  })
  return membership?.role === "admin"
}
