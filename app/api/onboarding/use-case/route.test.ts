import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

// Mock Supabase Server
const mockVerifySupabaseToken = vi.fn()
vi.mock("@/lib/supabase-server", () => ({
  verifySupabaseToken: (...args: unknown[]) => mockVerifySupabaseToken(...args),
}))

// Mock Prisma
const mockUpdateMany = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))

describe("POST /api/onboarding/use-case", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no Authorization header is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      body: JSON.stringify({ useCase: "civic" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Authorization header does not start with Bearer", async () => {
    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Invalid token" },
      body: JSON.stringify({ useCase: "civic" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - No token provided")
  })

  it("returns 401 if Supabase token is invalid", async () => {
    mockVerifySupabaseToken.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token" },
      body: JSON.stringify({ useCase: "civic" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized - Invalid token")
  })

  it("returns 400 if useCase is missing", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("Invalid use case")
  })

  it("returns 400 if useCase is not a valid option", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ useCase: "invalid" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("Invalid use case")
    expect(data.error).toContain("civic, brand, policy, general")
  })

  it("successfully saves civic use case", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ useCase: "civic" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.useCase).toBe("civic")
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { supabaseUid: "supabase-uid-123" },
      data: { useCase: "civic" },
    })
  })

  it("successfully saves brand use case", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ useCase: "brand" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.useCase).toBe("brand")
  })

  it("successfully saves policy use case", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ useCase: "policy" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.useCase).toBe("policy")
  })

  it("successfully saves general use case", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ useCase: "general" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.useCase).toBe("general")
  })

  it("returns 500 if database update fails", async () => {
    mockVerifySupabaseToken.mockResolvedValue({ id: "supabase-uid-123" })
    mockUpdateMany.mockRejectedValue(new Error("Database error"))

    const request = new NextRequest("http://localhost:3000/api/onboarding/use-case", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ useCase: "civic" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to update use case")
  })
})
