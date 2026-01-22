import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST - Verify an external recipient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
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
