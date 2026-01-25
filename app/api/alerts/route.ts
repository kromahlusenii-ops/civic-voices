import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { getLoopsClient, isLoopsEnabled, LOOPS_TEMPLATES } from "@/lib/loops"
import { randomBytes } from "crypto"
import type { AlertFrequency } from "@prisma/client"
import { maskEmail } from "@/lib/utils/logging"

export const dynamic = "force-dynamic"

interface CreateAlertRequest {
  searchQuery: string
  platforms: string[]
  recipients: string[]
  frequency: AlertFrequency
  preferredTime: string
  preferredDay?: number
  timezone?: string
}

interface UpdateAlertRequest extends CreateAlertRequest {
  id: string
  isActive?: boolean
}

// Calculate next scheduled time based on frequency
// Note: timezone is stored but not yet used in calculation (uses server timezone)
function calculateNextScheduled(
  frequency: AlertFrequency,
  preferredTime: string,
  preferredDay?: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timezone?: string
): Date {
  const now = new Date()
  const [hours, minutes] = preferredTime.split(":").map(Number)

  switch (frequency) {
    case "INSTANTLY":
      return new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes
    case "HOURLY":
      return new Date(now.getTime() + 60 * 60 * 1000) // 1 hour
    case "DAILY": {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return next
    }
    case "WEEKLY": {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      const daysUntil = ((preferredDay ?? 1) - next.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysUntil)
      return next
    }
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

// POST - Create new alert
export async function POST(request: NextRequest) {
  try {
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
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body: CreateAlertRequest = await request.json()
    const {
      searchQuery,
      platforms,
      recipients,
      frequency,
      preferredTime,
      preferredDay,
      timezone,
    } = body

    // Validate required fields
    if (!searchQuery || !platforms?.length || !recipients?.length) {
      return NextResponse.json(
        { error: "searchQuery, platforms, and recipients are required" },
        { status: 400 }
      )
    }

    // Validate recipients (max 5)
    if (recipients.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 recipients allowed" },
        { status: 400 }
      )
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Invalid email format: ${email}` },
          { status: 400 }
        )
      }
    }

    // Create alert with recipients
    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        searchQuery,
        platforms,
        frequency: frequency || "DAILY",
        preferredTime: preferredTime || "09:00",
        timezone: timezone || "America/New_York",
        preferredDay: frequency === "WEEKLY" ? preferredDay : null,
        nextScheduledAt: calculateNextScheduled(
          frequency || "DAILY",
          preferredTime || "09:00",
          preferredDay
        ),
        recipients: {
          create: recipients.map((email) => ({
            email: email.toLowerCase(),
            isOwner: email.toLowerCase() === user.email.toLowerCase(),
            verified: email.toLowerCase() === user.email.toLowerCase(), // Auto-verify owner
            verifyToken:
              email.toLowerCase() === user.email.toLowerCase()
                ? null
                : randomBytes(32).toString("hex"),
          })),
        },
      },
      include: {
        recipients: true,
      },
    })

    // Send verification emails to non-owner recipients
    if (isLoopsEnabled() && LOOPS_TEMPLATES.verifyRecipient) {
      const loops = getLoopsClient()
      const nonOwnerRecipients = alert.recipients.filter((r) => !r.isOwner)

      for (const recipient of nonOwnerRecipients) {
        try {
          await loops.sendTransactionalEmail({
            transactionalId: LOOPS_TEMPLATES.verifyRecipient,
            email: recipient.email,
            dataVariables: {
              ownerName: user.name || user.email.split("@")[0],
              ownerEmail: user.email,
              searchQuery: alert.searchQuery,
              verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/verify?token=${recipient.verifyToken}`,
            },
          })
        } catch (err) {
          console.error(`Failed to send verification email to ${maskEmail(recipient.email)}:`, err)
        }
      }
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error("[Alerts API] Error creating alert:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update existing alert
export async function PUT(request: NextRequest) {
  try {
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
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body: UpdateAlertRequest = await request.json()
    const {
      id,
      searchQuery,
      platforms,
      recipients,
      frequency,
      preferredTime,
      preferredDay,
      timezone,
      isActive,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      )
    }

    // Verify user owns this alert
    const existingAlert = await prisma.alert.findFirst({
      where: { id, userId: user.id },
      include: { recipients: true },
    })

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    // Validate recipients (max 5)
    if (recipients && recipients.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 recipients allowed" },
        { status: 400 }
      )
    }

    // Get existing recipients to determine which are new
    const existingEmails = existingAlert.recipients.map((r) => r.email.toLowerCase())
    const newEmails = recipients
      ? recipients.filter((e) => !existingEmails.includes(e.toLowerCase()))
      : []

    // Update alert
    const updatedAlert = await prisma.$transaction(async (tx) => {
      // Delete removed recipients
      if (recipients) {
        await tx.alertRecipient.deleteMany({
          where: {
            alertId: id,
            email: { notIn: recipients.map((e) => e.toLowerCase()) },
            isOwner: false, // Never delete owner
          },
        })
      }

      // Add new recipients
      for (const email of newEmails) {
        await tx.alertRecipient.create({
          data: {
            alertId: id,
            email: email.toLowerCase(),
            isOwner: email.toLowerCase() === user.email.toLowerCase(),
            verified: email.toLowerCase() === user.email.toLowerCase(),
            verifyToken:
              email.toLowerCase() === user.email.toLowerCase()
                ? null
                : randomBytes(32).toString("hex"),
          },
        })
      }

      // Update alert settings
      return tx.alert.update({
        where: { id },
        data: {
          searchQuery: searchQuery ?? existingAlert.searchQuery,
          platforms: platforms ?? existingAlert.platforms,
          frequency: frequency ?? existingAlert.frequency,
          preferredTime: preferredTime ?? existingAlert.preferredTime,
          timezone: timezone ?? existingAlert.timezone,
          preferredDay: frequency === "WEEKLY" ? preferredDay : null,
          isActive: isActive ?? existingAlert.isActive,
          nextScheduledAt: calculateNextScheduled(
            frequency ?? existingAlert.frequency,
            preferredTime ?? existingAlert.preferredTime,
            preferredDay ?? existingAlert.preferredDay ?? undefined
          ),
        },
        include: { recipients: true },
      })
    })

    // Send verification emails to new non-owner recipients
    if (isLoopsEnabled() && LOOPS_TEMPLATES.verifyRecipient && newEmails.length > 0) {
      const loops = getLoopsClient()
      const newRecipients = updatedAlert.recipients.filter(
        (r) => newEmails.includes(r.email.toLowerCase()) && !r.isOwner
      )

      for (const recipient of newRecipients) {
        try {
          await loops.sendTransactionalEmail({
            transactionalId: LOOPS_TEMPLATES.verifyRecipient,
            email: recipient.email,
            dataVariables: {
              ownerName: user.name || user.email.split("@")[0],
              ownerEmail: user.email,
              searchQuery: updatedAlert.searchQuery,
              verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts/verify?token=${recipient.verifyToken}`,
            },
          })
        } catch (err) {
          console.error(`Failed to send verification email to ${maskEmail(recipient.email)}:`, err)
        }
      }
    }

    return NextResponse.json(updatedAlert)
  } catch (error) {
    console.error("[Alerts API] Error updating alert:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - List user's alerts
export async function GET(request: NextRequest) {
  try {
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

    // Get all alerts for user
    const alerts = await prisma.alert.findMany({
      where: { userId: user.id },
      include: { recipients: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("[Alerts API] Error listing alerts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
