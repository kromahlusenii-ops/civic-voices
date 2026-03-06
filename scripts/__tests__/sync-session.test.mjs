import { describe, it, expect } from "vitest"
import {
  parseMcpJson,
  parseTranscript,
  calculateCost,
  detectHamActive,
} from "../sync-session.mjs"

// --- parseMcpJson ---

describe("parseMcpJson", () => {
  it("parses .mcp.json correctly (extracts repoId, API key, base URL)", () => {
    const content = JSON.stringify({
      mcpServers: {
        "ham-memory": {
          type: "streamable-http",
          url: "https://goham.dev/api/mcp/9d4081b6-2e17-4b6b-a087-9c329e0e5b82",
          headers: {
            Authorization: "Bearer ham_bf9eb223f8913eb7ed011a0fec7b57a9",
          },
        },
      },
    })

    const result = parseMcpJson(content)
    expect(result).toEqual({
      repoId: "9d4081b6-2e17-4b6b-a087-9c329e0e5b82",
      apiKey: "ham_bf9eb223f8913eb7ed011a0fec7b57a9",
      baseUrl: "https://goham.dev",
    })
  })

  it("returns null when no .mcp.json content (exits silently)", () => {
    expect(parseMcpJson("")).toBeNull()
    expect(parseMcpJson("not json")).toBeNull()
  })

  it("returns null when .mcp.json has no ham-memory entry", () => {
    const content = JSON.stringify({
      mcpServers: {
        "other-server": {
          url: "https://example.com/api",
          headers: { Authorization: "Bearer sk_123" },
        },
      },
    })
    expect(parseMcpJson(content)).toBeNull()
  })

  it("returns null when ham-memory URL has no repo UUID", () => {
    const content = JSON.stringify({
      mcpServers: {
        "ham-memory": {
          url: "https://goham.dev/api/mcp/",
          headers: { Authorization: "Bearer ham_abc" },
        },
      },
    })
    expect(parseMcpJson(content)).toBeNull()
  })
})

// --- parseTranscript ---

describe("parseTranscript", () => {
  it("correctly parses JSONL transcript (model, tokens, duration, message count)", () => {
    const lines = [
      JSON.stringify({
        role: "user",
        timestamp: "2025-01-01T10:00:00Z",
      }),
      JSON.stringify({
        role: "assistant",
        model: "claude-sonnet-4-6",
        usage: { input_tokens: 500, output_tokens: 200 },
        timestamp: "2025-01-01T10:01:00Z",
      }),
      JSON.stringify({
        role: "user",
        timestamp: "2025-01-01T10:02:00Z",
      }),
      JSON.stringify({
        role: "assistant",
        model: "claude-sonnet-4-6",
        usage: { input_tokens: 800, output_tokens: 300 },
        timestamp: "2025-01-01T10:03:00Z",
      }),
    ]

    const result = parseTranscript(lines)
    expect(result.model).toBe("claude-sonnet-4-6")
    expect(result.tokens_input).toBe(1300)
    expect(result.tokens_output).toBe(500)
    expect(result.duration).toBe(180) // 3 minutes = 180 seconds
    expect(result.message_count).toBe(2) // 2 assistant messages
  })

  it("handles empty lines and invalid JSON", () => {
    const lines = [
      "",
      "not json",
      JSON.stringify({
        role: "assistant",
        model: "claude-haiku-4-5",
        usage: { input_tokens: 100, output_tokens: 50 },
        timestamp: "2025-01-01T10:00:00Z",
      }),
      "",
    ]

    const result = parseTranscript(lines)
    expect(result.tokens_input).toBe(100)
    expect(result.tokens_output).toBe(50)
    expect(result.message_count).toBe(1)
  })

  it("tracks file reads for HAM detection", () => {
    const lines = [
      JSON.stringify({
        type: "tool_use",
        content: [{ name: "Read", input: { file_path: "/project/CLAUDE.md" } }],
      }),
      JSON.stringify({
        type: "tool_use",
        content: [
          { name: "Read", input: { file_path: "/project/.ham/decisions.md" } },
        ],
      }),
    ]

    const result = parseTranscript(lines)
    expect(result.fileReads.has("/project/CLAUDE.md")).toBe(true)
    expect(result.fileReads.has("/project/.ham/decisions.md")).toBe(true)
  })
})

// --- calculateCost ---

describe("calculateCost", () => {
  it("calculates cost correctly for claude-sonnet-4-6", () => {
    // 1000 input * $3/MTok + 500 output * $15/MTok
    // = 0.003 + 0.0075 = $0.0105
    const cost = calculateCost("claude-sonnet-4-6", 1000, 500)
    expect(cost).toBeCloseTo(0.0105, 6)
  })

  it("calculates cost correctly for claude-opus-4-6", () => {
    // 1000 input * $15/MTok + 500 output * $75/MTok
    // = 0.015 + 0.0375 = $0.0525
    const cost = calculateCost("claude-opus-4-6", 1000, 500)
    expect(cost).toBeCloseTo(0.0525, 6)
  })

  it("calculates cost correctly for claude-haiku-4-5", () => {
    // 1000 input * $0.80/MTok + 500 output * $4/MTok
    // = 0.0008 + 0.002 = $0.0028
    const cost = calculateCost("claude-haiku-4-5", 1000, 500)
    expect(cost).toBeCloseTo(0.0028, 6)
  })

  it("falls back to sonnet pricing for unknown models", () => {
    const cost = calculateCost("some-unknown-model", 1000, 500)
    expect(cost).toBeCloseTo(0.0105, 6) // same as sonnet
  })

  it("handles zero tokens", () => {
    expect(calculateCost("claude-sonnet-4-6", 0, 0)).toBe(0)
  })
})

// --- detectHamActive ---

describe("detectHamActive", () => {
  it("returns true when .ham/ exists and CLAUDE.md was read", () => {
    const fileReads = new Set(["/project/CLAUDE.md", "/project/src/index.ts"])
    // Mock existsSync — we test the logic, not the filesystem
    // detectHamActive checks existsSync(join(cwd, '.ham'))
    // We need the .ham directory to exist for this test
    // Since we can't mock fs in .mjs easily, we test the fileReads logic
    // by passing a cwd that has .ham/
    const cwd = process.cwd() // civic-voices has .ham/
    const result = detectHamActive(fileReads, cwd)
    expect(result).toBe(true)
  })

  it("returns true when .ham/ exists and .ham/ files were read", () => {
    const fileReads = new Set(["/project/.ham/patterns.md"])
    const cwd = process.cwd()
    const result = detectHamActive(fileReads, cwd)
    expect(result).toBe(true)
  })

  it("returns false when no CLAUDE.md or .ham/ files were read", () => {
    const fileReads = new Set(["/project/src/index.ts"])
    const cwd = process.cwd()
    const result = detectHamActive(fileReads, cwd)
    expect(result).toBe(false)
  })

  it("returns false when .ham/ directory does not exist", () => {
    const fileReads = new Set(["/project/CLAUDE.md"])
    const result = detectHamActive(fileReads, "/tmp/no-ham-here")
    expect(result).toBe(false)
  })
})
