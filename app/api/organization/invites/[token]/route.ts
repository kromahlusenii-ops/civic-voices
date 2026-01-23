import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { getInviteByToken, acceptInvite } from "@/lib/services/organizationService"

export const dynamic = "force-dynamic"

// GET /api/organization/invites/[token] - Get invite details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await getInviteByToken(token)

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 400 })
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        organization: {
          name: invite.organization.name,
          ownerName: invite.organization.owner.name,
          ownerEmail: invite.organization.owner.email,
        },
      },
    })
  } catch (error) {
    console.error("Get invite error:", error)
    return NextResponse.json(
      { error: "Failed to get invite" },
      { status: 500 }
    )
  }
}

// POST /api/organization/invites/[token] - Accept invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const authUser = await verifySupabaseToken(accessToken)

    if (!authUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { token } = await params

    // Verify the invite is for this user's email
    const invite = await getInviteByToken(token)
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      )
    }

    const result = await acceptInvite(token, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Successfully joined the organization",
    })
  } catch (error) {
    console.error("Accept invite error:", error)
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    )
  }
}
