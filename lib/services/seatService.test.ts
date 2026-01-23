import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getSeatInfo,
  getSeatInfoForUser,
  canAddMember,
  addSeats,
  removeSeats,
} from "./seatService"

// Mock Prisma
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    organizationMember: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}))

// Mock Stripe
const mockSubscriptionItemsCreate = vi.fn()
const mockSubscriptionItemsUpdate = vi.fn()
const mockSubscriptionItemsDel = vi.fn()

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptionItems: {
      create: (...args: unknown[]) => mockSubscriptionItemsCreate(...args),
      update: (...args: unknown[]) => mockSubscriptionItemsUpdate(...args),
      del: (...args: unknown[]) => mockSubscriptionItemsDel(...args),
    },
  },
}))

// Mock stripe-config
vi.mock("@/lib/stripe-config", () => ({
  canTierAddSeats: (tier: string) => tier === "agency" || tier === "business",
  getSeatPricePerMonth: () => 4900, // $49
  getSeatPriceIdForTier: (tier: string) => {
    switch (tier) {
      case "agency": return "price_seat_agency"
      case "business": return "price_seat_business"
      default: return null
    }
  },
}))

// Mock environment
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_SEAT_PRICE_AGENT_ID: "price_seat_agency",
    STRIPE_SEAT_PRICE_BUSINESS_ID: "price_seat_business",
  }
})

describe("seatService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getSeatInfo", () => {
    it("returns null for non-existent organization", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await getSeatInfo("org-123")

      expect(result).toBeNull()
    })

    it("calculates seat info correctly", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 2,
        owner: { subscriptionPlan: "agency" },
        _count: { members: 4 },
      })

      const result = await getSeatInfo("org-123")

      expect(result).toEqual({
        includedSeats: 3,
        additionalSeats: 2,
        totalSeats: 5,
        usedSeats: 4,
        availableSeats: 1,
        canAddSeats: true,
        pricePerSeat: 4900,
      })
    })

    it("returns canAddSeats false for pro tier", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 1,
        additionalSeats: 0,
        owner: { subscriptionPlan: "pro" },
        _count: { members: 1 },
      })

      const result = await getSeatInfo("org-123")

      expect(result?.canAddSeats).toBe(false)
    })
  })

  describe("getSeatInfoForUser", () => {
    it("returns seat info for organization owner", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "org-123" }) // ownedOrg
      mockFindUnique.mockResolvedValueOnce({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 0,
        owner: { subscriptionPlan: "agency" },
        _count: { members: 2 },
      })

      const result = await getSeatInfoForUser("user-123")

      expect(result).toBeDefined()
      expect(result?.totalSeats).toBe(3)
    })

    it("returns seat info for organization member", async () => {
      mockFindUnique.mockResolvedValueOnce(null) // Not owner
      mockFindFirst.mockResolvedValue({ organizationId: "org-123" }) // Member
      mockFindUnique.mockResolvedValueOnce({
        id: "org-123",
        includedSeats: 5,
        additionalSeats: 1,
        owner: { subscriptionPlan: "business" },
        _count: { members: 3 },
      })

      const result = await getSeatInfoForUser("user-123")

      expect(result).toBeDefined()
      expect(result?.totalSeats).toBe(6)
    })

    it("returns null when user has no organization", async () => {
      mockFindUnique.mockResolvedValue(null)
      mockFindFirst.mockResolvedValue(null)

      const result = await getSeatInfoForUser("user-123")

      expect(result).toBeNull()
    })
  })

  describe("canAddMember", () => {
    it("returns true when seats are available", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 0,
        owner: { subscriptionPlan: "agency" },
        _count: { members: 2 },
      })

      const result = await canAddMember("org-123")

      expect(result).toBe(true)
    })

    it("returns false when no seats available", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 0,
        owner: { subscriptionPlan: "agency" },
        _count: { members: 3 },
      })

      const result = await canAddMember("org-123")

      expect(result).toBe(false)
    })
  })

  describe("addSeats", () => {
    it("returns error when organization not found", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await addSeats("org-123", 1)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Organization not found")
    })

    it("returns error when plan does not support additional seats", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        additionalSeats: 0,
        owner: { subscriptionPlan: "pro", stripeSubscriptionId: "sub_123" },
      })

      const result = await addSeats("org-123", 1)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Your plan does not support additional seats")
    })

    it("returns error when no active subscription", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        additionalSeats: 0,
        owner: { subscriptionPlan: "agency", stripeSubscriptionId: null },
      })

      const result = await addSeats("org-123", 1)

      expect(result.success).toBe(false)
      expect(result.error).toBe("No active subscription")
    })

    it("creates new subscription item when no existing seat item", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 0,
        stripeSeatItemId: null,
        owner: {
          id: "user-123",
          subscriptionPlan: "agency",
          stripeSubscriptionId: "sub_123",
        },
      })
      mockSubscriptionItemsCreate.mockResolvedValue({ id: "si_new123" })
      mockUpdate.mockResolvedValue({})

      const result = await addSeats("org-123", 2)

      expect(result.success).toBe(true)
      expect(result.newTotal).toBe(5) // 3 included + 2 additional
      expect(mockSubscriptionItemsCreate).toHaveBeenCalledWith({
        subscription: "sub_123",
        price: "price_seat_agency",
        quantity: 2,
      })
    })

    it("updates existing subscription item when seat item exists", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 1,
        stripeSeatItemId: "si_existing123",
        owner: {
          id: "user-123",
          subscriptionPlan: "agency",
          stripeSubscriptionId: "sub_123",
        },
      })
      mockSubscriptionItemsUpdate.mockResolvedValue({})
      mockUpdate.mockResolvedValue({})

      const result = await addSeats("org-123", 2)

      expect(result.success).toBe(true)
      expect(result.newTotal).toBe(6) // 3 included + 3 additional (1 existing + 2 new)
      expect(mockSubscriptionItemsUpdate).toHaveBeenCalledWith("si_existing123", {
        quantity: 3, // 1 existing + 2 new
      })
    })
  })

  describe("removeSeats", () => {
    it("returns error when organization not found", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await removeSeats("org-123", 1)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Organization not found")
    })

    it("returns error when trying to remove more seats than purchased", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        additionalSeats: 1,
        _count: { members: 2 },
      })

      const result = await removeSeats("org-123", 2)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Cannot remove more seats than you have purchased")
    })

    it("returns error when removal would leave insufficient seats for members", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 2,
        _count: { members: 5 }, // All 5 seats used
      })

      const result = await removeSeats("org-123", 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain("Cannot remove seats")
    })

    it("deletes subscription item when removing all additional seats", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 1,
        stripeSeatItemId: "si_123",
        owner: { stripeSubscriptionId: "sub_123" },
        _count: { members: 3 }, // Only using included seats
      })
      mockSubscriptionItemsDel.mockResolvedValue({})
      mockUpdate.mockResolvedValue({})

      const result = await removeSeats("org-123", 1)

      expect(result.success).toBe(true)
      expect(result.newTotal).toBe(3) // Only included seats
      expect(mockSubscriptionItemsDel).toHaveBeenCalledWith("si_123")
    })

    it("updates subscription item quantity when partial removal", async () => {
      mockFindUnique.mockResolvedValue({
        id: "org-123",
        includedSeats: 3,
        additionalSeats: 3,
        stripeSeatItemId: "si_123",
        owner: { stripeSubscriptionId: "sub_123" },
        _count: { members: 4 }, // Using 4 seats
      })
      mockSubscriptionItemsUpdate.mockResolvedValue({})
      mockUpdate.mockResolvedValue({})

      const result = await removeSeats("org-123", 1)

      expect(result.success).toBe(true)
      expect(result.newTotal).toBe(5) // 3 included + 2 additional
      expect(mockSubscriptionItemsUpdate).toHaveBeenCalledWith("si_123", {
        quantity: 2,
      })
    })
  })
})
