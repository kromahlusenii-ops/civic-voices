import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkVerifyRateLimit, getClientIp } from "@/lib/rateLimit"

export const dynamic = "force-dynamic"

// POST - Verify an external recipient
export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP to prevent token brute-force
    const clientIp = getClientIp(request)
    const rateLimitResult = checkVerifyRateLimit(clientIp)

    if (!rateLimitResult.success) {
      console.warn(`[Alerts API] Rate limit exceeded for IP: ${clientIp}`)
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Validate token format (should be 64-char hex string)
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      )
    }

    // Find the recipient by token
    const recipient = await prisma.alertRecipient.findUnique({
      where: { verifyToken: token },
      include: { alert: true },
    })

    if (!recipient) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 404 }
      )
    }

    if (recipient.verified) {
      return NextResponse.json(
        { success: true, alertId: recipient.alertId, message: "Already verified" }
      )
    }

    // Mark as verified and clear the token
    await prisma.alertRecipient.update({
      where: { id: recipient.id },
      data: {
        verified: true,
        verifyToken: null,
      },
    })

    return NextResponse.json({
      success: true,
      alertId: recipient.alertId,
      searchQuery: recipient.alert.searchQuery,
    })
  } catch (error) {
    console.error("[Alerts API] Error verifying recipient:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
