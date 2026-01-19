import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

// Mock Supabase Server
const mockVerifySupabaseToken = vi.fn()
vi.mock("@/lib/supabase-server", () => ({
  verifySupabaseToken: (...args: unknown[]) => mockVerifySupabaseToken(...args),
}))

// Mock Prisma
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

// Mock Stripe
const mockSubscriptionsUpdate = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      update: (...args: unknown[]) => mockSubscriptionsUpdate(...args),
    },
  },
}))

describe("POST /api/billing/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no Authorization header is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Authorization header does not start with Bearer", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Invalid token-format",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Supabase token is invalid", async () => {
    mockVerifySupabaseToken.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - Invalid token")
  })

  it("returns 404 if user is not found", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("User not found")
  })

  it("returns 400 if user has no active subscription", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: null,
      subscriptionStatus: "free",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("No active subscription found")
  })

  it("returns 400 if subscription is already canceled", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "canceled",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Subscription is already canceled")
  })

  it("successfully cancels an active subscription at period end", async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now

    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    })
    mockSubscriptionsUpdate.mockResolvedValue({
      id: "sub_123",
      cancel_at: periodEnd,
      current_period_end: periodEnd,
    })
    mockUpdate.mockResolvedValue({})

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe("Subscription canceled successfully")
    expect(data.cancelAt).toBeDefined()
    expect(data.currentPeriodEnd).toBeDefined()

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: true,
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { subscriptionStatus: "canceled" },
    })
  })

  it("successfully cancels a trialing subscription", async () => {
    const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days from now

    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "trialing",
    })
    mockSubscriptionsUpdate.mockResolvedValue({
      id: "sub_123",
      cancel_at: trialEnd,
      current_period_end: trialEnd,
    })
    mockUpdate.mockResolvedValue({})

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: true,
    })
  })

  it("handles Stripe subscription without cancel_at date", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    })
    mockSubscriptionsUpdate.mockResolvedValue({
      id: "sub_123",
      cancel_at: null,
      current_period_end: null,
    })
    mockUpdate.mockResolvedValue({})

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cancelAt).toBeNull()
    expect(data.currentPeriodEnd).toBeNull()
  })

  it("returns 500 if Stripe subscription update fails", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    })
    mockSubscriptionsUpdate.mockRejectedValue(new Error("Stripe API error"))

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to cancel subscription")
    expect(data.details).toBe("Stripe API error")
  })

  it("returns 500 if database update fails after Stripe cancellation", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    })
    mockSubscriptionsUpdate.mockResolvedValue({
      id: "sub_123",
      cancel_at: Date.now() / 1000,
      current_period_end: Date.now() / 1000,
    })
    mockUpdate.mockRejectedValue(new Error("Database error"))

    const request = new NextRequest("http://localhost:3000/api/billing/cancel", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to cancel subscription")
    expect(data.details).toBe("Database error")
  })
})
