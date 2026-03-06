import { NextRequest, NextResponse } from "next/server"
import { extractApiKey } from "@/lib/auth/extractApiKey"
import { resolveApiKey } from "@/lib/auth/resolveApiKey"
import { prisma } from "@/lib/prisma"
import type { SyncSessionPayload } from "@/lib/team-types"

// Energy: ~0.6 Wh per 1000 tokens (GPU inference estimate)
const ENERGY_WH_PER_TOKEN = 0.0006
// US grid average: ~0.39 kgCO2/kWh = 0.39 gCO2/Wh
const GRID_CARBON_INTENSITY_GCO2_PER_WH = 0.39

export async function POST(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  // --- Auth ---
  const apiKey = extractApiKey(request)
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { repoId } = params
  const valid = await resolveApiKey(apiKey, repoId)
  if (!valid) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
  }

  // --- Parse body ---
  let body: SyncSessionPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body.sessions)) {
    return NextResponse.json(
      { error: "Missing sessions array" },
      { status: 400 },
    )
  }

  // --- Engineer lookup ---
  let engineerId: string | null = null

  if (body.engineer_email) {
    const user = await prisma.user.findUnique({
      where: { email: body.engineer_email },
      select: { id: true },
    })

    if (user) {
      engineerId = user.id
    }
  }

  // --- Upsert sessions ---
  const results = await Promise.all(
    body.sessions.map((session) => {
      const totalTokens = session.tokens_input + session.tokens_output
      const energyWh = totalTokens * ENERGY_WH_PER_TOKEN
      const emissionsGco2e = energyWh * GRID_CARBON_INTENSITY_GCO2_PER_WH

      const data = {
        repoId,
        engineerId,
        agent: body.agent ?? null,
        model: session.model,
        tokensInput: session.tokens_input,
        tokensOutput: session.tokens_output,
        cost: session.cost,
        duration: session.duration,
        messageCount: session.message_count,
        hamActive: session.ham_active,
        energyWh,
        emissionsGco2e,
      }

      return prisma.sessionSummary.upsert({
        where: { sessionId: session.session_id },
        create: { sessionId: session.session_id, ...data },
        update: data,
      })
    }),
  )

  return NextResponse.json({ synced: results.length })
}
