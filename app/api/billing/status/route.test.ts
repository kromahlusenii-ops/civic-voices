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
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    creditTransaction: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

// Mock Stripe
const mockStripeSubscriptionsRetrieve = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: (...args: unknown[]) => mockStripeSubscriptionsRetrieve(...args),
    },
  },
}))

// Mock credit service
const mockGetUserBillingStatus = vi.fn()
const mockGetCreditTransactions = vi.fn()
vi.mock("@/lib/services/creditService", () => ({
  getUserBillingStatus: (...args: unknown[]) => mockGetUserBillingStatus(...args),
  getCreditTransactions: (...args: unknown[]) => mockGetCreditTransactions(...args),
}))

// Mock feature service
const mockGetFeatureLimits = vi.fn()
vi.mock("@/lib/services/featureService", () => ({
  getFeatureLimits: (...args: unknown[]) => mockGetFeatureLimits(...args),
}))

// Mock Stripe config
vi.mock("@/lib/stripe-config", () => ({
  STRIPE_CONFIG: {
    monthlyCredits: 200,
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

  it("returns 404 if user is not found", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("User not found")
  })

  it("returns billing status for user without subscription", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: null,
      subscriptionStatus: "free",
    })
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "free",
      subscriptionPlan: null,
      credits: { monthly: 0, bonus: 0, total: 0, resetDate: null },
      currentPeriodEnd: null,
      trialEndDate: null,
    })
    mockGetFeatureLimits.mockResolvedValue({ limits: {} })
    mockGetCreditTransactions.mockResolvedValue([])

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
    expect(data.credits.total).toBe(0)
  })

  it("returns billing status for active subscriber", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    })
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "active",
      subscriptionPlan: "pro",
      credits: { monthly: 200, bonus: 0, total: 200, resetDate: new Date() },
      currentPeriodEnd: new Date("2025-02-01"),
      trialEndDate: null,
    })
    mockGetFeatureLimits.mockResolvedValue({ limits: { searches: 100 } })
    mockGetCreditTransactions.mockResolvedValue([
      { id: "tx-1", amount: -5, type: "search_usage", description: "Search", createdAt: new Date() },
    ])

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
    expect(data.credits.total).toBe(200)
    expect(data.recentTransactions).toHaveLength(1)
  })

  it("returns billing status for trialing user", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "trialing",
    })
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "trialing",
      subscriptionPlan: "pro",
      credits: { monthly: 200, bonus: 0, total: 200, resetDate: new Date() },
      currentPeriodEnd: new Date("2025-02-01"),
      trialEndDate: new Date("2025-01-25"),
    })
    mockGetFeatureLimits.mockResolvedValue({ limits: {} })
    mockGetCreditTransactions.mockResolvedValue([])

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

  it("syncs subscription from Stripe when status is free but subscription exists", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    // First call returns user with subscription but free status
    mockFindFirst.mockResolvedValueOnce({
      id: "user-123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "free",
    })
    // Stripe returns trialing status
    mockStripeSubscriptionsRetrieve.mockResolvedValue({
      status: "trialing",
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      trial_start: Math.floor(Date.now() / 1000),
      trial_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
    mockUpdate.mockResolvedValue({})
    // After sync, billing status returns updated data
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "trialing",
      subscriptionPlan: "pro",
      credits: { monthly: 200, bonus: 0, total: 200, resetDate: new Date() },
      currentPeriodEnd: new Date("2025-02-01"),
      trialEndDate: new Date("2025-01-25"),
    })
    mockGetFeatureLimits.mockResolvedValue({ limits: {} })
    mockGetCreditTransactions.mockResolvedValue([])

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockStripeSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123")
    expect(mockUpdate).toHaveBeenCalled()
    expect(data.subscription.status).toBe("trialing")
  })

  it("does not sync from Stripe when status is already set correctly", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active", // Already correct
    })
    mockGetUserBillingStatus.mockResolvedValue({
      subscriptionStatus: "active",
      subscriptionPlan: "pro",
      credits: { monthly: 200, bonus: 0, total: 200, resetDate: new Date() },
      currentPeriodEnd: new Date("2025-02-01"),
      trialEndDate: null,
    })
    mockGetFeatureLimits.mockResolvedValue({ limits: {} })
    mockGetCreditTransactions.mockResolvedValue([])

    const request = new NextRequest("http://localhost:3000/api/billing/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled()
  })

  it("returns 404 if billing status is not found", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      stripeSubscriptionId: null,
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
