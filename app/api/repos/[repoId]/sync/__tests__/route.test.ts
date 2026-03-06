import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// --- Mocks ---

const mockUpsert = vi.fn()
const mockFindUnique = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sessionSummary: { upsert: (...args: unknown[]) => mockUpsert(...args) },
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}))

const mockResolveApiKey = vi.fn()
vi.mock("@/lib/auth/resolveApiKey", () => ({
  resolveApiKey: (...args: unknown[]) => mockResolveApiKey(...args),
}))

// Import after mocks
import { POST } from "../route"

// --- Helpers ---

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return new NextRequest("http://localhost:3000/api/repos/test-repo-id/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const validSession = {
  session_id: "sess-001",
  model: "claude-sonnet-4-6",
  tokens_input: 1000,
  tokens_output: 500,
  cost: 0.0105,
  duration: 120,
  message_count: 5,
  ham_active: true,
}

const routeContext = { params: { repoId: "test-repo-id" } }

// --- Tests ---

describe("POST /api/repos/[repoId]/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveApiKey.mockResolvedValue(true)
    mockUpsert.mockImplementation(({ create }) =>
      Promise.resolve({ id: "cuid-1", ...create }),
    )
  })

  it("rejects request without API key (401)", async () => {
    const req = makeRequest({ agent: "claude-code", sessions: [validSession] })
    const res = await POST(req, routeContext)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("rejects request with non-HAM bearer token (401)", async () => {
    const req = makeRequest(
      { agent: "claude-code", sessions: [validSession] },
      { Authorization: "Bearer sk_regular_key" },
    )
    const res = await POST(req, routeContext)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("rejects invalid API key (401)", async () => {
    mockResolveApiKey.mockResolvedValue(false)
    const req = makeRequest(
      { agent: "claude-code", sessions: [validSession] },
      { Authorization: "Bearer ham_invalid_key" },
    )
    const res = await POST(req, routeContext)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Invalid API key" })
  })

  it("rejects missing sessions array (400)", async () => {
    const req = makeRequest(
      { agent: "claude-code" },
      { Authorization: "Bearer ham_valid_key" },
    )
    const res = await POST(req, routeContext)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Missing sessions array" })
  })

  it("successfully syncs sessions with correct enrichment", async () => {
    mockFindUnique.mockResolvedValue({ id: "user-1" })

    const req = makeRequest(
      {
        agent: "claude-code",
        engineer_email: "dev@example.com",
        sessions: [validSession],
      },
      { Authorization: "Bearer ham_valid_key" },
    )
    const res = await POST(req, routeContext)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toEqual({ synced: 1 })

    // Verify upsert was called with enriched data
    expect(mockUpsert).toHaveBeenCalledOnce()
    const call = mockUpsert.mock.calls[0][0]

    expect(call.where).toEqual({ sessionId: "sess-001" })
    expect(call.create.engineerId).toBe("user-1")
    expect(call.create.agent).toBe("claude-code")
    expect(call.create.hamActive).toBe(true)

    // Energy: (1000 + 500) * 0.0006 = 0.9 Wh
    expect(call.create.energyWh).toBeCloseTo(0.9, 4)
    // Emissions: 0.9 * 0.39 = 0.351 gCO2e
    expect(call.create.emissionsGco2e).toBeCloseTo(0.351, 4)
  })

  it("idempotent upsert — same session_id does not create duplicates", async () => {
    const req1 = makeRequest(
      { agent: "claude-code", sessions: [validSession] },
      { Authorization: "Bearer ham_valid_key" },
    )
    const req2 = makeRequest(
      { agent: "claude-code", sessions: [validSession] },
      { Authorization: "Bearer ham_valid_key" },
    )

    await POST(req1, routeContext)
    await POST(req2, routeContext)

    // Both calls use upsert with the same sessionId
    expect(mockUpsert).toHaveBeenCalledTimes(2)
    expect(mockUpsert.mock.calls[0][0].where.sessionId).toBe("sess-001")
    expect(mockUpsert.mock.calls[1][0].where.sessionId).toBe("sess-001")
  })

  it("validates agent field is passed through", async () => {
    const req = makeRequest(
      { agent: "cursor", sessions: [validSession] },
      { Authorization: "Bearer ham_valid_key" },
    )
    await POST(req, routeContext)

    const call = mockUpsert.mock.calls[0][0]
    expect(call.create.agent).toBe("cursor")
    expect(call.update.agent).toBe("cursor")
  })

  it("accepts request without engineer_email (no team check)", async () => {
    const req = makeRequest(
      { agent: "claude-code", sessions: [validSession] },
      { Authorization: "Bearer ham_valid_key" },
    )
    const res = await POST(req, routeContext)
    expect(res.status).toBe(200)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("accepts request when engineer is unknown (not in DB)", async () => {
    mockFindUnique.mockResolvedValue(null)

    const req = makeRequest(
      {
        agent: "claude-code",
        engineer_email: "new@example.com",
        sessions: [validSession],
      },
      { Authorization: "Bearer ham_valid_key" },
    )
    const res = await POST(req, routeContext)
    expect(res.status).toBe(200)

    const call = mockUpsert.mock.calls[0][0]
    expect(call.create.engineerId).toBeNull()
  })
})
