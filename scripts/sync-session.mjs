#!/usr/bin/env node

/**
 * sync-session.mjs — Zero-dependency script that syncs a Claude Code session
 * to the HAM Pro dashboard.
 *
 * Reads .mcp.json from cwd for credentials, parses the most recent Claude Code
 * JSONL transcript, and POSTs to /api/repos/{repoId}/sync.
 *
 * Install: Copy to ~/.ham/, add SessionEnd hook to ~/.claude/settings.json:
 *   "hooks": { "SessionEnd": [{ "command": "node ~/.ham/sync-session.mjs" }] }
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { join, basename } from "node:path"
import { execSync } from "node:child_process"
import { homedir } from "node:os"

// ── Model pricing (USD per million tokens) ──────────────────────────

const MODEL_PRICING = {
  "claude-opus-4-6":   { input: 15,   output: 75 },
  "claude-sonnet-4-6": { input: 3,    output: 15 },
  "claude-haiku-4-5":  { input: 0.80, output: 4 },
  // Older models
  "claude-3-5-sonnet": { input: 3,    output: 15 },
  "claude-3-5-haiku":  { input: 0.80, output: 4 },
  "claude-3-opus":     { input: 15,   output: 75 },
}

const DEFAULT_PRICING = { input: 3, output: 15 }

// ── Exported helpers (testable) ─────────────────────────────────────

/**
 * Parse .mcp.json and extract HAM credentials.
 * Returns { repoId, apiKey, baseUrl } or null if not found.
 */
export function parseMcpJson(content) {
  try {
    const config = JSON.parse(content)
    const ham = config?.mcpServers?.["ham-memory"]
    if (!ham?.url || !ham?.headers?.Authorization) return null

    const urlMatch = ham.url.match(/\/api\/mcp\/([a-f0-9-]+)/)
    if (!urlMatch) return null

    const repoId = urlMatch[1]
    const apiKey = ham.headers.Authorization.replace("Bearer ", "")

    // Derive base URL: everything before /api/mcp/
    const baseUrl = ham.url.split("/api/mcp/")[0]

    return { repoId, apiKey, baseUrl }
  } catch {
    return null
  }
}

/**
 * Parse a Claude Code JSONL transcript.
 * Returns { model, tokens_input, tokens_output, duration, message_count, fileReads }.
 */
export function parseTranscript(lines) {
  let tokensInput = 0
  let tokensOutput = 0
  let messageCount = 0
  let model = "unknown"
  let firstTimestamp = null
  let lastTimestamp = null
  const fileReads = new Set()

  for (const line of lines) {
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    // Track timestamps for duration
    if (entry.timestamp) {
      const ts = new Date(entry.timestamp).getTime()
      if (!isNaN(ts)) {
        if (firstTimestamp === null || ts < firstTimestamp) firstTimestamp = ts
        if (lastTimestamp === null || ts > lastTimestamp) lastTimestamp = ts
      }
    }

    // Count assistant messages
    if (entry.role === "assistant") {
      messageCount++
    }

    // Extract model
    if (entry.model && model === "unknown") {
      model = entry.model
    }

    // Sum token usage
    if (entry.usage) {
      tokensInput += entry.usage.input_tokens || 0
      tokensOutput += entry.usage.output_tokens || 0
    }

    // Track file reads (for HAM active detection)
    if (entry.type === "tool_use" || entry.type === "tool_result") {
      const content = Array.isArray(entry.content) ? entry.content : [entry.content]
      for (const block of content) {
        if (block?.name === "Read" || block?.name === "read_file") {
          const path = block?.input?.file_path || block?.input?.path || ""
          if (path) fileReads.add(path)
        }
      }
    }
  }

  const duration =
    firstTimestamp && lastTimestamp
      ? (lastTimestamp - firstTimestamp) / 1000
      : 0

  return { model, tokens_input: tokensInput, tokens_output: tokensOutput, duration, message_count: messageCount, fileReads }
}

/**
 * Calculate cost in USD from token counts and model.
 */
export function calculateCost(model, inputTokens, outputTokens) {
  // Match pricing by prefix (handles model ID variants)
  let pricing = DEFAULT_PRICING
  for (const [key, p] of Object.entries(MODEL_PRICING)) {
    if (model.includes(key) || model.startsWith(key)) {
      pricing = p
      break
    }
  }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

/**
 * Detect whether HAM was active during the session.
 * True if .ham/ directory exists AND the transcript read CLAUDE.md or .ham/ files.
 */
export function detectHamActive(fileReads, cwd) {
  const hamDirExists = existsSync(join(cwd, ".ham"))
  if (!hamDirExists) return false

  for (const path of fileReads) {
    if (path.includes("CLAUDE.md") || path.includes(".ham/")) {
      return true
    }
  }
  return false
}

// ── Internal helpers ────────────────────────────────────────────────

function getGitEmail() {
  try {
    return execSync("git config user.email", { encoding: "utf-8" }).trim()
  } catch {
    return null
  }
}

function findLatestTranscript() {
  const cwd = process.cwd()
  // Claude Code stores transcripts in ~/.claude/projects/{encoded-path}/
  const projectsDir = join(homedir(), ".claude", "projects")
  if (!existsSync(projectsDir)) return null

  // Encode the cwd path the same way Claude Code does (replace / with -)
  const encodedPath = cwd.replace(/\//g, "-").replace(/^-/, "")
  const sessionDir = join(projectsDir, encodedPath)

  if (!existsSync(sessionDir)) return null

  // Find the most recent .jsonl file
  const files = readdirSync(sessionDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({
      name: f,
      path: join(sessionDir, f),
      mtime: statSync(join(sessionDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  return files[0]?.path ?? null
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const cwd = process.cwd()

  // Read .mcp.json
  const mcpPath = join(cwd, ".mcp.json")
  if (!existsSync(mcpPath)) return // not a HAM project — exit silently

  const mcpContent = readFileSync(mcpPath, "utf-8")
  const creds = parseMcpJson(mcpContent)
  if (!creds) return // no ham-memory entry — exit silently

  // Find transcript
  const transcriptPath = process.argv[2] || findLatestTranscript()
  if (!transcriptPath || !existsSync(transcriptPath)) {
    // No transcript to sync
    return
  }

  const lines = readFileSync(transcriptPath, "utf-8").split("\n")
  const parsed = parseTranscript(lines)

  if (parsed.tokens_input === 0 && parsed.tokens_output === 0) {
    return // empty session
  }

  const cost = calculateCost(parsed.model, parsed.tokens_input, parsed.tokens_output)
  const hamActive = detectHamActive(parsed.fileReads, cwd)
  const sessionId = basename(transcriptPath, ".jsonl")
  const engineerEmail = getGitEmail()

  const payload = {
    agent: "claude-code",
    ...(engineerEmail && { engineer_email: engineerEmail }),
    sessions: [
      {
        session_id: sessionId,
        model: parsed.model,
        tokens_input: parsed.tokens_input,
        tokens_output: parsed.tokens_output,
        cost,
        duration: parsed.duration,
        message_count: parsed.message_count,
        ham_active: hamActive,
      },
    ],
  }

  const url = `${creds.baseUrl}/api/repos/${creds.repoId}/sync`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[ham-sync] ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error(`[ham-sync] Failed: ${err.message}`)
  }
}

// Run when invoked directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith("sync-session.mjs") ||
  process.argv[1] === new URL(import.meta.url).pathname
)

if (isMain) {
  main().catch((err) => {
    console.error(`[ham-sync] ${err.message}`)
    process.exit(1)
  })
}
