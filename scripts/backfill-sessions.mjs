#!/usr/bin/env node

/**
 * backfill-sessions.mjs — Batch-sync all past Claude Code sessions
 * for the current project to the HAM Pro dashboard.
 *
 * Usage: node scripts/backfill-sessions.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { join, basename } from "node:path"
import { execSync } from "node:child_process"
import { homedir } from "node:os"
import {
  parseMcpJson,
  parseTranscript,
  calculateCost,
  detectHamActive,
} from "./sync-session.mjs"

const BATCH_SIZE = 20

function getGitEmail() {
  try {
    return execSync("git config user.email", { encoding: "utf-8" }).trim()
  } catch {
    return null
  }
}

function findAllTranscripts(cwd) {
  const projectsDir = join(homedir(), ".claude", "projects")
  if (!existsSync(projectsDir)) return []

  const encodedPath = cwd.replace(/\//g, "-").replace(/^-/, "")
  const sessionDir = join(projectsDir, encodedPath)

  if (!existsSync(sessionDir)) return []

  return readdirSync(sessionDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(sessionDir, f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
}

async function main() {
  const cwd = process.cwd()

  // Read .mcp.json
  const mcpPath = join(cwd, ".mcp.json")
  if (!existsSync(mcpPath)) {
    console.error("[backfill] No .mcp.json found — not a HAM project")
    process.exit(1)
  }

  const mcpContent = readFileSync(mcpPath, "utf-8")
  const creds = parseMcpJson(mcpContent)
  if (!creds) {
    console.error("[backfill] No ham-memory entry in .mcp.json")
    process.exit(1)
  }

  const transcripts = findAllTranscripts(cwd)
  if (transcripts.length === 0) {
    console.log("[backfill] No transcripts found")
    return
  }

  console.log(`[backfill] Found ${transcripts.length} transcripts`)

  const engineerEmail = getGitEmail()
  let synced = 0
  let skipped = 0

  // Process in batches
  for (let i = 0; i < transcripts.length; i += BATCH_SIZE) {
    const batch = transcripts.slice(i, i + BATCH_SIZE)
    const sessions = []

    for (const transcriptPath of batch) {
      try {
        const lines = readFileSync(transcriptPath, "utf-8").split("\n")
        const parsed = parseTranscript(lines)

        if (parsed.tokens_input === 0 && parsed.tokens_output === 0) {
          skipped++
          continue
        }

        const cost = calculateCost(parsed.model, parsed.tokens_input, parsed.tokens_output)
        const hamActive = detectHamActive(parsed.fileReads, cwd)
        const sessionId = basename(transcriptPath, ".jsonl")

        sessions.push({
          session_id: sessionId,
          model: parsed.model,
          tokens_input: parsed.tokens_input,
          tokens_output: parsed.tokens_output,
          cost,
          duration: parsed.duration,
          message_count: parsed.message_count,
          ham_active: hamActive,
        })
      } catch (err) {
        console.error(`[backfill] Error parsing ${basename(transcriptPath)}: ${err.message}`)
        skipped++
      }
    }

    if (sessions.length === 0) continue

    const payload = {
      agent: "claude-code",
      ...(engineerEmail && { engineer_email: engineerEmail }),
      sessions,
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

      if (res.ok) {
        const result = await res.json()
        synced += result.synced || 0
        console.log(`[backfill] Batch ${Math.floor(i / BATCH_SIZE) + 1}: synced ${result.synced}`)
      } else {
        const text = await res.text()
        console.error(`[backfill] Batch failed: ${res.status} ${text}`)
      }
    } catch (err) {
      console.error(`[backfill] Batch request failed: ${err.message}`)
    }
  }

  console.log(`[backfill] Done: ${synced} synced, ${skipped} skipped`)
}

main().catch((err) => {
  console.error(`[backfill] Fatal: ${err.message}`)
  process.exit(1)
})
