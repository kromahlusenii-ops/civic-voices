import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// DELETE - Delete an alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication
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

    // Get user from database
    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify user owns this alert
    const alert = await prisma.alert.findFirst({
      where: { id, userId: user.id },
    })

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    // Delete the alert (cascade will delete recipients)
    await prisma.alert.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Alerts API] Error deleting alert:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - Get a single alert
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication
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

    // Get user from database
    const user = await prisma.user.findFirst({
      where: { supabaseUid: authUser.id },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get the alert
    const alert = await prisma.alert.findFirst({
      where: { id, userId: user.id },
      include: { recipients: true },
    })

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error("[Alerts API] Error getting alert:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
