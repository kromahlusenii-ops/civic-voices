import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"
import { NextRequest } from "next/server"

// Mock Supabase Server
const mockVerifySupabaseToken = vi.fn()
vi.mock("@/lib/supabase-server", () => ({
  verifySupabaseToken: (...args: unknown[]) => mockVerifySupabaseToken(...args),
}))

// Mock Prisma
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockCreate = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

// Mock Stripe
const mockStripeSubscriptionsRetrieve = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: (...args: unknown[]) => mockStripeSubscriptionsRetrieve(...args),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}))

// Mock credit service
const mockGetUserBillingStatus = vi.fn()
vi.mock("@/lib/services/creditService", () => ({
  getUserBillingStatus: (...args: unknown[]) => mockGetUserBillingStatus(...args),
}))

// Mock Stripe config
vi.mock("@/lib/stripe-config", () => ({
  STRIPE_CONFIG: {
    subscription: {
      trialDays: 7,
    },
  },
}))

describe("GET /api/billing/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no Authorization header is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Authorization header does not start with Bearer", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Invalid token-format",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Supabase token is invalid", async () => {
    mockVerifySupabaseToken.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - Invalid token")
  })

  it("returns billing status for user without subscription", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      subscriptionStatus: "free",
    })
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "free",
      subscriptionPlan: null,
      currentPeriodEnd: null,
      trialEndDate: null,
    })

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.subscription.status).toBe("free")
    expect(data.subscription.plan).toBeNull()
  })

  it("returns billing status for active subscriber", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "active",
    })
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "active",
      subscriptionPlan: "pro",
      currentPeriodEnd: new Date("2025-02-01"),
      trialEndDate: null,
    })

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.subscription.status).toBe("active")
    expect(data.subscription.plan).toBe("pro")
  })

  it("returns billing status for trialing user", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "trialing",
    })
    mockStripeSubscriptionsRetrieve.mockResolvedValue({
      status: "trialing",
      metadata: { plan: "pro" },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      trial_start: Math.floor(Date.now() / 1000),
      trial_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
    mockUpdate.mockResolvedValue({})
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "trialing",
      subscriptionPlan: "pro",
      currentPeriodEnd: new Date("2025-02-01"),
      trialEndDate: new Date("2025-01-25"),
    })

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.subscription.status).toBe("trialing")
    expect(data.subscription.trialEndDate).toBeDefined()
  })

  it("returns 404 if billing status is not found", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      subscriptionStatus: "free",
    })
    mockGetUserBillingStatus.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Billing status not found")
  })

  it("returns 500 if an error occurs", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockRejectedValue(new Error("Database error"))

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to get billing status")
    expect(data.details).toBe("Database error")
  })
})
