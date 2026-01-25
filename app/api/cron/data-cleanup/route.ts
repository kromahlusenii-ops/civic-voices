import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (process.env.NODE_ENV === "development") {
    return true
  }

  if (!cronSecret) {
    console.error("[Data Cleanup] CRON_SECRET not configured")
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// Retention periods in days
const RETENTION = {
  POSTS: 90,
  SEARCHES: 90,
  SHARE_TOKENS: 30,
  REPORTS: 365,
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log("[Data Cleanup] Starting automated data retention cleanup")

  if (!verifyCronSecret(request)) {
    console.error("[Data Cleanup] Authorization failed")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    postsDeleted: 0,
    searchesDeleted: 0,
    tokensCleared: 0,
    reportsDeleted: 0,
    errors: [] as string[],
  }

  try {
    // 1. Delete old posts (90 days)
    const postCutoff = new Date()
    postCutoff.setDate(postCutoff.getDate() - RETENTION.POSTS)

    try {
      const deletedPosts = await prisma.searchPost.deleteMany({
        where: {
          savedAt: { lt: postCutoff },
        },
      })
      results.postsDeleted = deletedPosts.count
      console.log(`[Data Cleanup] Deleted ${deletedPosts.count} posts older than ${RETENTION.POSTS} days`)
    } catch (error) {
      const msg = `Failed to delete old posts: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(`[Data Cleanup] ${msg}`)
      results.errors.push(msg)
    }

    // 2. Delete orphaned searches (no report, older than 90 days)
    const searchCutoff = new Date()
    searchCutoff.setDate(searchCutoff.getDate() - RETENTION.SEARCHES)

    try {
      const deletedSearches = await prisma.search.deleteMany({
        where: {
          reportId: null,
          createdAt: { lt: searchCutoff },
        },
      })
      results.searchesDeleted = deletedSearches.count
      console.log(`[Data Cleanup] Deleted ${deletedSearches.count} orphaned searches older than ${RETENTION.SEARCHES} days`)
    } catch (error) {
      const msg = `Failed to delete old searches: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(`[Data Cleanup] ${msg}`)
      results.errors.push(msg)
    }

    // 3. Clear expired share tokens
    try {
      const clearedTokens = await prisma.researchJob.updateMany({
        where: {
          shareTokenExpiresAt: { lt: new Date() },
          shareToken: { not: null },
        },
        data: {
          shareToken: null,
          shareTokenExpiresAt: null,
        },
      })
      results.tokensCleared = clearedTokens.count
      console.log(`[Data Cleanup] Cleared ${clearedTokens.count} expired share tokens`)
    } catch (error) {
      const msg = `Failed to clear expired tokens: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(`[Data Cleanup] ${msg}`)
      results.errors.push(msg)
    }

    // 4. Delete old reports (1 year) - optional, uncomment if needed
    // const reportCutoff = new Date()
    // reportCutoff.setDate(reportCutoff.getDate() - RETENTION.REPORTS)
    //
    // try {
    //   const deletedReports = await prisma.researchJob.deleteMany({
    //     where: {
    //       createdAt: { lt: reportCutoff },
    //     },
    //   })
    //   results.reportsDeleted = deletedReports.count
    //   console.log(`[Data Cleanup] Deleted ${deletedReports.count} reports older than ${RETENTION.REPORTS} days`)
    // } catch (error) {
    //   const msg = `Failed to delete old reports: ${error instanceof Error ? error.message : "Unknown error"}`
    //   console.error(`[Data Cleanup] ${msg}`)
    //   results.errors.push(msg)
    // }

    const duration = Date.now() - startTime
    console.log(
      `[Data Cleanup] Completed in ${duration}ms: ${results.postsDeleted} posts, ${results.searchesDeleted} searches, ${results.tokensCleared} tokens`
    )

    return NextResponse.json({
      success: true,
      duration,
      results,
      retentionDays: RETENTION,
    })
  } catch (error) {
    console.error("[Data Cleanup] Fatal error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
