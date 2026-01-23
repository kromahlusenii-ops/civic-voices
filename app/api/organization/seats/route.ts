import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { getUserOrganization } from "@/lib/services/organizationService"
import { getSeatInfo, addSeats, removeSeats } from "@/lib/services/seatService"

export const dynamic = "force-dynamic"

// GET /api/organization/seats - Get seat information
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

    return NextResponse.json({ seatInfo })
  } catch (error) {
    console.error("Get seats error:", error)
    return NextResponse.json(
      { error: "Failed to get seat information" },
      { status: 500 }
    )
  }
}

// POST /api/organization/seats - Add additional seats
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

    // Check if user is the owner (only owner can purchase seats)
    if (organization.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the organization owner can purchase seats" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { quantity } = body

    if (!quantity || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      )
    }

    if (quantity > 100) {
      return NextResponse.json(
        { error: "Cannot add more than 100 seats at once" },
        { status: 400 }
      )
    }

    const result = await addSeats(organization.id, quantity)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const seatInfo = await getSeatInfo(organization.id)

    return NextResponse.json({
      success: true,
      message: `Added ${quantity} seat(s)`,
      seatInfo,
    })
  } catch (error) {
    console.error("Add seats error:", error)
    return NextResponse.json(
      { error: "Failed to add seats" },
      { status: 500 }
    )
  }
}

// DELETE /api/organization/seats - Remove additional seats
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

    // Check if user is the owner
    if (organization.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the organization owner can remove seats" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const quantityStr = searchParams.get("quantity")
    const quantity = quantityStr ? parseInt(quantityStr, 10) : 1

    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      )
    }

    const result = await removeSeats(organization.id, quantity)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const seatInfo = await getSeatInfo(organization.id)

    return NextResponse.json({
      success: true,
      message: `Removed ${quantity} seat(s)`,
      seatInfo,
    })
  } catch (error) {
    console.error("Remove seats error:", error)
    return NextResponse.json(
      { error: "Failed to remove seats" },
      { status: 500 }
    )
  }
}
