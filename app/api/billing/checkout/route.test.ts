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
const mockCustomersCreate = vi.fn()
const mockCheckoutSessionsCreate = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCheckoutSessionsCreate(...args),
      },
    },
  },
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

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    STRIPE_PRICE_ID: "price_test123",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  }
})

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no Authorization header is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Authorization header does not start with Bearer", async () => {
    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
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

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
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

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
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

  it("returns 400 if user already has an active subscription", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "active",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("User already has an active subscription")
  })

  it("returns 400 if user is already trialing", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "trialing",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("User already has an active subscription")
  })

  it("creates Stripe customer if not exists and returns checkout URL", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: null,
      subscriptionStatus: "free",
    })
    mockCustomersCreate.mockResolvedValue({ id: "cus_new123" })
    mockUpdate.mockResolvedValue({})
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session123",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe("https://checkout.stripe.com/session123")
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "test@example.com",
      metadata: { userId: "user-123" },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { stripeCustomerId: "cus_new123" },
    })
  })

  it("uses existing Stripe customer ID if already set", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_existing123",
      subscriptionStatus: "free",
    })
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session123",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe("https://checkout.stripe.com/session123")
    expect(mockCustomersCreate).not.toHaveBeenCalled()
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing123",
        mode: "subscription",
      })
    )
  })

  it("creates checkout session with trial days", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "free",
    })
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session123",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    await POST(request)

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: {
          trial_period_days: 7,
        },
        success_url: expect.stringContaining("/search?subscription=success"),
        cancel_url: expect.stringContaining("/search?subscription=canceled"),
      })
    )
  })

  it("allows checkout for canceled users (resubscribe)", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "canceled",
    })
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session123",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe("https://checkout.stripe.com/session123")
  })

  it("returns 500 if STRIPE_PRICE_ID is not configured", async () => {
    delete process.env.STRIPE_PRICE_ID

    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "free",
    })

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain("Stripe price not configured")
  })

  it("returns 500 if Stripe checkout creation fails", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockFindFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "free",
    })
    mockCheckoutSessionsCreate.mockRejectedValue(new Error("Stripe API error"))

    const request = new NextRequest("http://localhost:3000/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to create checkout session")
    expect(data.details).toBe("Stripe API error")
  })
})
