import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getUserOrganization,
  createOrganization,
  createInvite,
  getInviteByToken,
  acceptInvite,
  removeMember,
  updateMemberRole,
  cancelInvite,
  isUserOrgAdmin,
} from "./organizationService"

// Mock Prisma
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockTransaction = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    organizationMember: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    organizationInvite: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

// Mock stripe-config
vi.mock("@/lib/stripe-config", () => ({
  getIncludedSeatsForTier: (tier: string) => {
    switch (tier) {
      case "agency": return 3
      case "business": return 5
      default: return 1
    }
  },
}))

describe("organizationService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getUserOrganization", () => {
    it("returns null when user has no organization", async () => {
      mockFindUnique.mockResolvedValue(null)
      mockFindFirst.mockResolvedValue(null)

      const result = await getUserOrganization("user-123")

      expect(result).toBeNull()
    })

    it("returns organization when user is owner", async () => {
      const mockOrg = {
        id: "org-123",
        name: "Test Org",
        ownerId: "user-123",
        includedSeats: 3,
        additionalSeats: 0,
        stripeSeatItemId: null,
        members: [],
        invites: [],
      }
      mockFindUnique.mockResolvedValue(mockOrg)

      const result = await getUserOrganization("user-123")

      expect(result).toEqual(mockOrg)
    })

    it("returns organization when user is member", async () => {
      mockFindUnique.mockResolvedValue(null) // Not owner

      const mockMembership = {
        organization: {
          id: "org-123",
          name: "Test Org",
          ownerId: "other-user",
          members: [],
          invites: [],
        },
      }
      mockFindFirst.mockResolvedValue(mockMembership)

      const result = await getUserOrganization("user-123")

      expect(result).toEqual(mockMembership.organization)
    })
  })

  describe("createOrganization", () => {
    it("creates organization with correct included seats for agency", async () => {
      const mockOrg = {
        id: "org-123",
        name: "Test Team",
        ownerId: "user-123",
        includedSeats: 3,
        additionalSeats: 0,
        members: [],
        invites: [],
      }

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          organization: {
            create: vi.fn().mockResolvedValue(mockOrg),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              ...mockOrg,
              members: [{ id: "member-1", userId: "user-123", role: "admin" }],
            }),
          },
          organizationMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        }
        return callback(tx)
      })

      const result = await createOrganization("user-123", "Test Team", "agency")

      expect(result).toBeDefined()
      expect(result.members).toHaveLength(1)
    })
  })

  describe("createInvite", () => {
    it("creates invite with 7-day expiration", async () => {
      const mockInvite = {
        id: "invite-123",
        token: "random-token",
        email: "test@example.com",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
      mockCreate.mockResolvedValue(mockInvite)

      const result = await createInvite("org-123", "test@example.com", "member")

      expect(result).toBeDefined()
      expect(result.email).toBe("test@example.com")
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-123",
            email: "test@example.com",
            role: "member",
          }),
        })
      )
    })
  })

  describe("getInviteByToken", () => {
    it("returns invite with organization details", async () => {
      const mockInvite = {
        id: "invite-123",
        token: "abc123",
        email: "test@example.com",
        organization: {
          id: "org-123",
          name: "Test Org",
          owner: {
            name: "Owner",
            email: "owner@example.com",
          },
        },
      }
      mockFindUnique.mockResolvedValue(mockInvite)

      const result = await getInviteByToken("abc123")

      expect(result).toEqual(mockInvite)
    })

    it("returns null for invalid token", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await getInviteByToken("invalid")

      expect(result).toBeNull()
    })
  })

  describe("acceptInvite", () => {
    it("returns error for non-existent invite", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await acceptInvite("invalid-token", "user-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invite not found")
    })

    it("returns error for already accepted invite", async () => {
      mockFindUnique.mockResolvedValue({
        id: "invite-123",
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
        organization: { includedSeats: 3, additionalSeats: 0 },
      })

      const result = await acceptInvite("token", "user-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invite already accepted")
    })

    it("returns error for expired invite", async () => {
      mockFindUnique.mockResolvedValue({
        id: "invite-123",
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 100000), // Expired
        organization: { includedSeats: 3, additionalSeats: 0 },
      })

      const result = await acceptInvite("token", "user-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invite expired")
    })
  })

  describe("removeMember", () => {
    it("returns error when organization not found", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await removeMember("org-123", "member-123", "admin-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Organization not found")
    })

    it("returns error when non-admin tries to remove", async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: "org-123", ownerId: "owner-123" }) // org
        .mockResolvedValueOnce({ role: "member" }) // requesting user's membership

      const result = await removeMember("org-123", "member-123", "non-admin")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Only admins can remove members")
    })

    it("returns error when trying to remove owner", async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: "org-123", ownerId: "owner-123" }) // org
        .mockResolvedValueOnce({ role: "admin" }) // admin's membership

      const result = await removeMember("org-123", "owner-123", "admin-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Cannot remove organization owner")
    })

    it("successfully removes member when admin", async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: "org-123", ownerId: "owner-123" }) // org
        .mockResolvedValueOnce({ role: "admin" }) // admin's membership
      mockDelete.mockResolvedValue({})

      const result = await removeMember("org-123", "member-123", "admin-123")

      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe("updateMemberRole", () => {
    it("only allows owner to change roles", async () => {
      mockFindUnique.mockResolvedValue({ id: "org-123", ownerId: "owner-123" })

      const result = await updateMemberRole("org-123", "member-123", "admin", "not-owner")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Only the owner can change member roles")
    })

    it("prevents changing owner's role", async () => {
      mockFindUnique.mockResolvedValue({ id: "org-123", ownerId: "owner-123" })

      const result = await updateMemberRole("org-123", "owner-123", "member", "owner-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Cannot change owner's role")
    })
  })

  describe("cancelInvite", () => {
    it("returns error when invite not found", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await cancelInvite("invite-123", "user-123")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invite not found")
    })

    it("returns error when non-admin tries to cancel", async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: "invite-123", organizationId: "org-123", organization: {} })
        .mockResolvedValueOnce({ role: "member" }) // non-admin membership

      const result = await cancelInvite("invite-123", "non-admin")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Only admins can cancel invites")
    })
  })

  describe("isUserOrgAdmin", () => {
    it("returns true for admin users", async () => {
      mockFindFirst.mockResolvedValue({ role: "admin" })

      const result = await isUserOrgAdmin("user-123")

      expect(result).toBe(true)
    })

    it("returns false for non-admin users", async () => {
      mockFindFirst.mockResolvedValue({ role: "member" })

      const result = await isUserOrgAdmin("user-123")

      expect(result).toBe(false)
    })

    it("returns false when user has no membership", async () => {
      mockFindFirst.mockResolvedValue(null)

      const result = await isUserOrgAdmin("user-123")

      expect(result).toBe(false)
    })
  })
})
