import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { getLoopsClient, isLoopsEnabled, LOOPS_TEMPLATES } from "@/lib/loops"
import { randomBytes } from "crypto"
import type { AlertFrequency } from "@prisma/client"
import { maskEmail } from "@/lib/utils/logging"
import { anthropicFetch } from "@/lib/services/anthropicClient"

export const dynamic = "force-dynamic"

interface CreateAlertRequest {
  searchQuery: string
  platforms: string[]
  recipients: string[]
  frequency: AlertFrequency
  preferredTime: string
  preferredDay?: number
  timezone?: string
  sendImmediately?: boolean // Send first alert immediately for instant feedback
}

interface UpdateAlertRequest extends CreateAlertRequest {
  id: string
  isActive?: boolean
}

// Post data structure for email template
interface EmailPost {
  platform: string
  platformCapitalized: string
  author: string
  authorHandle: string
  date: string
  content: string
  sentiment: string
  sentimentColor: string
  url: string
}

// Raw post from search API
interface RawPost {
  id: string
  text: string
  url: string
  platform: string
  author: string
  authorHandle: string
  authorAvatar?: string
  createdAt: string
  sentiment?: string
  thumbnail?: string
  engagement?: {
    likes: number
    comments: number
    shares: number
    views?: number
  }
}

// Format date for email display
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return "Unknown date"
  }
}

// Generate AI-powered summary of what's being discussed
async function generateSummary(posts: RawPost[], searchQuery: string): Promise<string> {
  if (posts.length === 0) return ""

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return generateBasicSummary(posts, searchQuery)
  }

  try {
    const samplePosts = posts.slice(0, 15).map((post, i) =>
      `${i + 1}. [${post.platform}] ${post.text.substring(0, 200)}${post.text.length > 200 ? "..." : ""}`
    ).join("\n")

    const response = await anthropicFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `You are writing a brief email summary. Based on these ${posts.length} social media posts about "${searchQuery}", write a 2-3 sentence summary of what people are discussing. Be specific about the topics, events, or opinions being shared. Don't mention sentiment or platform counts.

Sample posts:
${samplePosts}

Write the summary now (2-3 sentences only, no intro):`,
        }],
      }),
    })

    if (!response.ok) {
      return generateBasicSummary(posts, searchQuery)
    }

    const data = await response.json()
    const summary = data.content?.[0]?.text?.trim()
    return summary || generateBasicSummary(posts, searchQuery)
  } catch {
    return generateBasicSummary(posts, searchQuery)
  }
}

// Fallback basic summary without AI
function generateBasicSummary(posts: RawPost[], searchQuery: string): string {
  const platformCounts: Record<string, number> = {}
  for (const post of posts) {
    const platform = post.platform.toLowerCase()
    platformCounts[platform] = (platformCounts[platform] || 0) + 1
  }

  const platformParts = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => `${count} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`)

  return `We found ${posts.length} mentions of "${searchQuery}" across ${platformParts.join(", ")}.`
}

// Format posts as HTML for email
function formatPostsForEmail(posts: EmailPost[], searchQuery: string): string {
  if (posts.length === 0) return "<p style=\"text-align: left;\">No new posts found.</p>"

  return posts
    .map((post) => [
      `<div style="border-bottom: 1px solid #E5E7EB; padding: 16px 0; text-align: left;">`,
      `<a href="${post.url}" style="color: #2563EB; font-weight: 600; text-decoration: none;">${searchQuery}</a>`,
      `<span style="color: #374151; font-weight: 600;"> in ${post.platformCapitalized}</span>`,
      `<span style="color: #9CA3AF;"> · by ${post.authorHandle} on ${post.date}</span>`,
      `<p style="color: #374151; margin: 12px 0; line-height: 1.5;">${post.content}</p>`,
      `<span style="color: ${post.sentimentColor}; font-weight: 500;">${post.sentiment}</span>`,
      `<br>`,
      `<a href="${post.url}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; border: 1px solid #E5E7EB; border-radius: 6px; color: #374151; text-decoration: none; font-size: 14px;">View post</a>`,
      `</div>`,
    ].join(""))
    .join("")
}

// Run search and send immediate alert email
async function sendImmediateAlert(
  alertId: string,
  searchQuery: string,
  platforms: string[],
  recipientEmail: string,
  frequency: string
): Promise<{ success: boolean; totalPosts: number; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const sources = platforms.map(p => p.toLowerCase())

    console.log(`[Alert] Running immediate search for "${searchQuery}" on platforms: ${sources.join(", ")}`)

    const response = await fetch(`${appUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery,
        sources,
        timeFilter: "24h",
        sort: "relevance",
      }),
    })

    if (!response.ok) {
      console.error(`[Alert] Immediate search failed: ${response.status}`)
      return { success: false, totalPosts: 0, error: `Search failed: ${response.status}` }
    }

    const data = await response.json()
    const allPosts: RawPost[] = data.posts || []
    const totalPosts = data.summary?.totalPosts || allPosts.length

    console.log(`[Alert] Found ${totalPosts} posts for immediate alert`)

    if (totalPosts === 0) {
      return { success: true, totalPosts: 0, error: "No posts found in the last 24 hours" }
    }

    // Format posts for email
    const topPosts: EmailPost[] = allPosts.slice(0, 20).map((post: RawPost) => {
      const sentiment = post.sentiment || "neutral"
      return {
        platform: post.platform,
        platformCapitalized: post.platform.charAt(0).toUpperCase() + post.platform.slice(1),
        author: post.author || "Unknown Author",
        authorHandle: post.authorHandle || "@unknown",
        date: formatDate(post.createdAt),
        content: post.text.substring(0, 300) + (post.text.length > 300 ? "..." : ""),
        sentiment: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
        sentimentColor: sentiment === "positive" ? "#10B981" : sentiment === "negative" ? "#EF4444" : "#6B7280",
        url: post.url,
      }
    })

    // Generate summary
    const summary = await generateSummary(allPosts, searchQuery)

    // Send email
    const loops = getLoopsClient()
    const loopsResponse = await loops.sendTransactionalEmail({
      transactionalId: LOOPS_TEMPLATES.alertDigest,
      email: recipientEmail,
      dataVariables: {
        searchQuery,
        totalPosts,
        postIncluded: Math.min(topPosts.length, 20),
        summary,
        postsHtml: formatPostsForEmail(topPosts, searchQuery),
        unsubscribeUrl: `${appUrl}/alerts/manage`,
        frequency: frequency.toLowerCase(),
      },
    })

    if (loopsResponse.success) {
      console.log(`[Alert] Immediate alert sent to ${maskEmail(recipientEmail)}`)

      // Update lastSentAt for the alert
      await prisma.alert.update({
        where: { id: alertId },
        data: { lastSentAt: new Date() },
      })

      return { success: true, totalPosts }
    } else {
      console.error(`[Alert] Failed to send immediate alert: ${loopsResponse.error}`)
      return { success: false, totalPosts, error: loopsResponse.error }
    }
  } catch (error) {
    console.error("[Alert] Error sending immediate alert:", error)
    return { success: false, totalPosts: 0, error: String(error) }
  }
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
      sendImmediately,
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

    // Send immediate alert if requested (for instant feedback)
    let immediateResult: { success: boolean; totalPosts: number; error?: string } | undefined
    if (sendImmediately && isLoopsEnabled() && LOOPS_TEMPLATES.alertDigest) {
      console.log(`[Alert] Sending immediate alert for "${searchQuery}" to ${maskEmail(user.email)}`)
      immediateResult = await sendImmediateAlert(
        alert.id,
        searchQuery,
        platforms,
        user.email,
        frequency || "DAILY"
      )
    }

    return NextResponse.json({
      ...alert,
      immediateResult,
    })
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
