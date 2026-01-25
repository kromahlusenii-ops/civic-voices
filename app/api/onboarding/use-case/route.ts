import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const VALID_USE_CASES = ["civic", "brand", "policy", "general"]

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { useCase } = body as { useCase: string }

    if (!useCase || !VALID_USE_CASES.includes(useCase)) {
      return NextResponse.json(
        { error: `Invalid use case. Must be one of: ${VALID_USE_CASES.join(", ")}` },
        { status: 400 }
      )
    }

    await prisma.user.updateMany({
      where: { supabaseUid: authUser.id },
      data: { useCase },
    })

    return NextResponse.json({ success: true, useCase })
  } catch (error) {
    console.error("Use case update error:", error)
    return NextResponse.json(
      { error: "Failed to update use case" },
      { status: 500 }
    )
  }
}
