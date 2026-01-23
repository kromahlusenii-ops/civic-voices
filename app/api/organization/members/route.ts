import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import {
  getUserOrganization,
  createInvite,
  removeMember,
  updateMemberRole,
  cancelInvite,
} from "@/lib/services/organizationService"
import { getSeatInfo } from "@/lib/services/seatService"

export const dynamic = "force-dynamic"

// GET /api/organization/members - Get organization members and invites
export async function GET(request: NextRequest) {
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
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const organization = await getUserOrganization(user.id)

    if (!organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const seatInfo = await getSeatInfo(organization.id)

    return NextResponse.json({
      members: organization.members,
      invites: organization.invites,
      seatInfo,
    })
  } catch (error) {
    console.error("Get members error:", error)
    return NextResponse.json(
      { error: "Failed to get members" },
      { status: 500 }
    )
  }
}

// POST /api/organization/members - Invite a new member
export async function POST(request: NextRequest) {
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
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const organization = await getUserOrganization(user.id)

    if (!organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Check if user is admin
    const membership = organization.members.find(m => m.userId === user.id)
    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 })
    }

    // Check seat availability (including pending invites)
    const pendingInvitesCount = organization.invites.length
    const membersCount = organization.members.length
    const seatInfo = await getSeatInfo(organization.id)

    if (!seatInfo || (membersCount + pendingInvitesCount) >= seatInfo.totalSeats) {
      return NextResponse.json(
        { error: "No available seats. Please purchase additional seats." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { email, role = "member" } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is already a member
    const existingMember = organization.members.find(
      m => m.user.email.toLowerCase() === email.toLowerCase()
    )
    if (existingMember) {
      return NextResponse.json({ error: "This user is already a member" }, { status: 400 })
    }

    // Check if there's already a pending invite
    const existingInvite = organization.invites.find(
      i => i.email.toLowerCase() === email.toLowerCase()
    )
    if (existingInvite) {
      return NextResponse.json({ error: "An invite is already pending for this email" }, { status: 400 })
    }

    const invite = await createInvite(organization.id, email, role as "admin" | "member")

    // TODO: Send invite email
    // await sendInviteEmail(email, invite.token, organization.name)

    return NextResponse.json({
      invite,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${invite.token}`,
    })
  } catch (error) {
    console.error("Invite member error:", error)
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    )
  }
}

// DELETE /api/organization/members - Remove a member or cancel an invite
export async function DELETE(request: NextRequest) {
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
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const organization = await getUserOrganization(user.id)

    if (!organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")
    const inviteId = searchParams.get("inviteId")

    if (inviteId) {
      // Cancel an invite
      const result = await cancelInvite(inviteId, user.id)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: "Invite canceled" })
    }

    if (memberId) {
      // Remove a member
      const result = await removeMember(organization.id, memberId, user.id)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: "Member removed" })
    }

    return NextResponse.json(
      { error: "Either memberId or inviteId is required" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Delete member/invite error:", error)
    return NextResponse.json(
      { error: "Failed to remove member or cancel invite" },
      { status: 500 }
    )
  }
}

// PATCH /api/organization/members - Update member role
export async function PATCH(request: NextRequest) {
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
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const organization = await getUserOrganization(user.id)

    if (!organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const body = await request.json()
    const { memberId, role } = body

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "memberId and role are required" },
        { status: 400 }
      )
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'member'" },
        { status: 400 }
      )
    }

    const result = await updateMemberRole(organization.id, memberId, role, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Role updated" })
  } catch (error) {
    console.error("Update member role error:", error)
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    )
  }
}
