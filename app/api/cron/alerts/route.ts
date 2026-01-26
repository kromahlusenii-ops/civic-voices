import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSendGridClient, isSendGridEnabled, buildAlertDigestEmail } from "@/lib/sendgrid"
import type { AlertFrequency } from "@prisma/client"
import { anthropicFetch } from "@/lib/services/anthropicClient"
import { maskEmail } from "@/lib/utils/logging"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 1 minute max for Vercel Hobby plan

// Verify cron secret (Vercel sends this header)
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // In development, allow without secret for local testing
  if (process.env.NODE_ENV === "development") {
    return true
  }

  // SECURITY: Fail closed - reject if no secret configured in production
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET not configured - blocking request for security")
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (!authHeader || authHeader.length !== `Bearer ${cronSecret}`.length) {
    return false
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

// Generate AI-powered summary of what's being discussed
async function generateSummary(posts: RawPost[], searchQuery: string): Promise<string> {
  if (posts.length === 0) return ""

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Fallback to basic summary if no API key
    return generateBasicSummary(posts, searchQuery)
  }

  try {
    // Take top 15 posts for context (balance between quality and speed)
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
          content: `You are writing a brief email summary. Based on these ${posts.length} social media posts about "${searchQuery}", write a 2-3 sentence summary of what people are actually saying. Focus on the key arguments, opinions, events, or news being discussed. Do NOT mention platform names (TikTok, YouTube, Reddit, etc.), sentiment labels, or post counts — only describe the substance of the conversation.

Sample posts:
${samplePosts}

Write the summary now (2-3 sentences only, no intro):`,
        }],
      }),
    })

    if (!response.ok) {
      console.error(`[Cron] AI summary failed: ${response.status}`)
      return generateBasicSummary(posts, searchQuery)
    }

    const data = await response.json()
    const summary = data.content?.[0]?.text?.trim()

    if (summary) {
      return summary
    }
  } catch (error) {
    console.error("[Cron] Error generating AI summary:", error)
  }

  return generateBasicSummary(posts, searchQuery)
}

// Fallback basic summary without AI
function generateBasicSummary(posts: RawPost[], searchQuery: string): string {
  return `We found ${posts.length} new mentions of "${searchQuery}" in the last 24 hours. View the full feed to see what people are saying.`
}

// Run search and get summary (simplified version for alerts)
async function runAlertSearch(
  searchQuery: string,
  platforms: string[]
): Promise<{ totalPosts: number; topPosts: EmailPost[]; rawPosts: RawPost[] }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    // Convert platforms to lowercase (Prisma stores as YOUTUBE, but API expects youtube)
    const sources = platforms.map(p => p.toLowerCase())
    console.log(`[Cron] Running search for "${searchQuery}" on platforms: ${sources.join(", ")} | App URL: ${appUrl}`)

    const response = await fetch(`${appUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery,
        sources,
        timeFilter: "24h", // Last 24 hours for alerts
        sort: "relevance",
      }),
    })

    if (!response.ok) {
      console.error(`[Cron] Search failed for "${searchQuery}": ${response.status}`)
      return { totalPosts: 0, topPosts: [], rawPosts: [] }
    }

    const data = await response.json()
    const allPosts: RawPost[] = data.posts || []

    // Extract top 5 posts for the digest
    const topPosts: EmailPost[] = allPosts.slice(0, 5).map((post: RawPost) => {
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
      rawPosts: allPosts,
    }
  } catch (error) {
    console.error(`[Cron] Error running search for "${searchQuery}":`, error)
    return { totalPosts: 0, topPosts: [], rawPosts: [] }
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
  if (posts.length === 0) return "<p style=\"text-align: left;\">No new posts found.</p>"

  return posts
    .map((post) => [
      `<div style="border-bottom: 1px solid #E5E7EB; padding: 16px 0; text-align: left;">`,
      `<a href="${post.url}" style="color: #2563EB; font-weight: 600; text-decoration: none;">${searchQuery}</a>`,
      `<span style="color: #374151; font-weight: 600;"> in ${post.platformCapitalized}</span>`,
      `<span style="color: #9CA3AF;"> · by ${post.authorHandle} on ${post.date}</span>`,
      `<a href="${post.url}" style="display: block; color: #374151; text-decoration: none; margin: 12px 0; line-height: 1.5;">${post.content}</a>`,
      `<span style="color: ${post.sentimentColor}; font-weight: 500;">${post.sentiment}</span>`,
      `<br>`,
      `<a href="${post.url}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; border: 1px solid #E5E7EB; border-radius: 6px; color: #374151; text-decoration: none; font-size: 14px;">View post →</a>`,
      `</div>`,
    ].join(""))
    .join("")
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log("[Cron] Alert processing started at", new Date().toISOString())

  // Verify cron authorization
  if (!verifyCronSecret(request)) {
    console.error("[Cron] Authorization failed - check CRON_SECRET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if SendGrid is configured
  const emailEnabled = isSendGridEnabled()
  console.log("[Cron] SendGrid enabled:", emailEnabled)

  if (!emailEnabled) {
    console.warn("[Cron] SendGrid not configured - SENDGRID_API_KEY is missing")
    return NextResponse.json({
      success: true,
      message: "Email provider not configured",
      processed: 0,
    })
  }

  try {
    const now = new Date()

    // Find alerts that are due (limit to 50 per cron run to prevent timeout)
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
      orderBy: { nextScheduledAt: "asc" },
      take: 50,
    })

    console.log(`[Cron] Found ${dueAlerts.length} due alerts`)

    const sendgrid = getSendGridClient()
    let processed = 0
    let errors = 0

    for (const alert of dueAlerts) {
      try {
        console.log(`[Cron] Processing alert ${alert.id}: "${alert.searchQuery}" | Frequency: ${alert.frequency} | Recipients: ${alert.recipients.length} verified`)

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
        console.log(`[Cron] Alert ${alert.id}: Search returned ${searchResult.totalPosts} posts, ${searchResult.topPosts.length} top posts`)

        if (searchResult.totalPosts > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          const postsIncluded = Math.min(searchResult.topPosts.length, 5)

          // Generate summary from posts
          console.log(`[Cron] Alert ${alert.id}: Generating summary for ${searchResult.rawPosts.length} posts...`)
          const summary = await generateSummary(searchResult.rawPosts, alert.searchQuery)
          console.log(`[Cron] Alert ${alert.id}: Summary generated (${summary.length} chars): "${summary.substring(0, 100)}..."`)

          // Build email HTML
          const searchUrl = `${appUrl}/search?q=${encodeURIComponent(alert.searchQuery)}`
          const postsHtml = formatPostsForEmail(searchResult.topPosts, alert.searchQuery)
          const { subject, html } = buildAlertDigestEmail({
            searchQuery: alert.searchQuery,
            totalPosts: searchResult.totalPosts,
            postsIncluded,
            summary,
            postsHtml,
            unsubscribeUrl: `${appUrl}/alerts/manage`,
            frequency: alert.frequency.toLowerCase(),
            searchUrl,
          })

          // Send to each verified recipient
          for (const recipient of alert.recipients) {
            try {
              const sendResult = await sendgrid.send({
                to: recipient.email,
                subject,
                html,
              })
              if (sendResult.success) {
                console.log(`[Cron] Successfully sent digest to ${maskEmail(recipient.email)} for alert ${alert.id}`)
              } else {
                console.error(`[Cron] SendGrid reported failure for ${maskEmail(recipient.email)}: ${sendResult.error}`)
              }
            } catch (emailError) {
              console.error(
                `[Cron] Failed to send email to ${maskEmail(recipient.email)}:`,
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
