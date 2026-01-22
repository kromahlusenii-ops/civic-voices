import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLoopsClient, isLoopsEnabled, LOOPS_TEMPLATES } from "@/lib/loops"
import type { AlertFrequency } from "@prisma/client"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes max for cron

// Verify cron secret (Vercel sends this header)
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // In development, allow without secret
  if (process.env.NODE_ENV === "development") {
    return true
  }

  // If no secret configured, allow (not recommended for production)
  if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not configured - cron endpoint is unprotected")
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

// Calculate next scheduled time based on frequency
function calculateNextScheduled(
  frequency: AlertFrequency,
  preferredTime: string,
  preferredDay?: number | null
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

// Run search and get summary (simplified version for alerts)
async function runAlertSearch(
  searchQuery: string,
  platforms: string[]
): Promise<{ totalPosts: number; topPosts: EmailPost[] }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const response = await fetch(`${appUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery,
        sources: platforms,
        timeFilter: "24h", // Last 24 hours for alerts
        sort: "relevance",
      }),
    })

    if (!response.ok) {
      console.error(`[Cron] Search failed for "${searchQuery}": ${response.status}`)
      return { totalPosts: 0, topPosts: [] }
    }

    const data = await response.json()

    // Extract top 20 posts for the digest (like Octolens)
    const topPosts: EmailPost[] = (data.posts || []).slice(0, 20).map((post: {
      text: string
      url: string
      platform: string
      author: string
      authorHandle: string
      createdAt: string
      sentiment?: string
    }) => {
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

    return {
      totalPosts: data.summary?.totalPosts || 0,
      topPosts,
    }
  } catch (error) {
    console.error(`[Cron] Error running search for "${searchQuery}":`, error)
    return { totalPosts: 0, topPosts: [] }
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

// Format posts as HTML for email (Octolens-style cards)
function formatPostsForEmail(posts: EmailPost[], searchQuery: string): string {
  if (posts.length === 0) return "<p>No new posts found.</p>"

  return posts
    .map(
      (post) => `
<div style="border-bottom: 1px solid #E5E7EB; padding: 16px 0;">
  <div style="margin-bottom: 8px;">
    <a href="${post.url}" style="color: #2563EB; font-weight: 600; text-decoration: none;">${searchQuery}</a>
    <span style="color: #6B7280;"> in ${post.platformCapitalized}</span>
    <span style="color: #9CA3AF;"> · by ${post.authorHandle} on ${post.date}</span>
  </div>
  <p style="color: #374151; margin: 8px 0; line-height: 1.5;">${post.content}</p>
  <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
    <span style="color: ${post.sentimentColor}; font-size: 14px; font-weight: 500;">${post.sentiment}</span>
  </div>
  <a href="${post.url}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; border: 1px solid #E5E7EB; border-radius: 6px; color: #374151; text-decoration: none; font-size: 14px;">View post</a>
</div>`
    )
    .join("")
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log("[Cron] Alert processing started")

  // Verify cron authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if Loops is configured
  if (!isLoopsEnabled() || !LOOPS_TEMPLATES.alertDigest) {
    console.warn("[Cron] Loops not configured or alertDigest template missing")
    return NextResponse.json({
      success: true,
      message: "Loops not configured",
      processed: 0,
    })
  }

  try {
    const now = new Date()

    // Find alerts that are due
    const dueAlerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        nextScheduledAt: { lte: now },
      },
      include: {
        recipients: {
          where: { verified: true }, // Only send to verified recipients
        },
        user: {
          select: { email: true, name: true },
        },
      },
    })

    console.log(`[Cron] Found ${dueAlerts.length} due alerts`)

    const loops = getLoopsClient()
    let processed = 0
    let errors = 0

    for (const alert of dueAlerts) {
      try {
        // Skip if no verified recipients
        if (alert.recipients.length === 0) {
          console.log(`[Cron] Alert ${alert.id}: No verified recipients, skipping`)

          // Still update nextScheduledAt so we don't reprocess
          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              nextScheduledAt: calculateNextScheduled(
                alert.frequency,
                alert.preferredTime,
                alert.preferredDay
              ),
            },
          })
          continue
        }

        // Run search
        const searchResult = await runAlertSearch(alert.searchQuery, alert.platforms)

        console.log(
          `[Cron] Alert ${alert.id}: Found ${searchResult.totalPosts} posts for "${alert.searchQuery}"`
        )

        // Only send if there are results
        if (searchResult.totalPosts > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          const searchUrl = `${appUrl}/search?q=${encodeURIComponent(alert.searchQuery)}`
          const postsIncluded = Math.min(searchResult.topPosts.length, 20)

          // Send to each verified recipient
          for (const recipient of alert.recipients) {
            try {
              await loops.sendTransactionalEmail({
                transactionalId: LOOPS_TEMPLATES.alertDigest,
                email: recipient.email,
                dataVariables: {
                  // Header info
                  searchQuery: alert.searchQuery,
                  totalPosts: searchResult.totalPosts,
                  postIncluded: postsIncluded,
                  // Formatted HTML posts (Octolens-style)
                  postsHtml: formatPostsForEmail(searchResult.topPosts, alert.searchQuery),
                  // Links
                  searchUrl,
                  unsubscribeUrl: `${appUrl}/alerts/manage`,
                  // Meta
                  frequency: alert.frequency.toLowerCase(),
                },
              })
              console.log(`[Cron] Sent digest to ${recipient.email} for alert ${alert.id}`)
            } catch (emailError) {
              console.error(
                `[Cron] Failed to send email to ${recipient.email}:`,
                emailError
              )
            }
          }
        } else {
          console.log(`[Cron] Alert ${alert.id}: No results, skipping email`)
        }

        // Update alert timestamps
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            lastSentAt: now,
            nextScheduledAt: calculateNextScheduled(
              alert.frequency,
              alert.preferredTime,
              alert.preferredDay
            ),
          },
        })

        processed++
      } catch (alertError) {
        console.error(`[Cron] Error processing alert ${alert.id}:`, alertError)
        errors++

        // Still update nextScheduledAt to avoid infinite retry
        try {
          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              nextScheduledAt: calculateNextScheduled(
                alert.frequency,
                alert.preferredTime,
                alert.preferredDay
              ),
            },
          })
        } catch (updateError) {
          console.error(`[Cron] Failed to update nextScheduledAt for alert ${alert.id}:`, updateError)
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(
      `[Cron] Alert processing completed: ${processed} processed, ${errors} errors, ${duration}ms`
    )

    return NextResponse.json({
      success: true,
      processed,
      errors,
      duration,
      total: dueAlerts.length,
    })
  } catch (error) {
    console.error("[Cron] Fatal error in alert processing:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
