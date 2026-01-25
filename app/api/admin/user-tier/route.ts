import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { prisma } from "@/lib/prisma"
import { STRIPE_CONFIG, getMonthlyCreditsForTier } from "@/lib/stripe-config"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"

export const dynamic = "force-dynamic"

// Admin emails that can update user tiers
// SECURITY: Consider moving to database-based RBAC for production
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL,
  // Add more admin emails here
].filter(Boolean) as string[]

// Rate limit: 10 admin requests per minute per IP
const ADMIN_RATE_LIMIT = { windowMs: 60000, maxRequests: 10 }

/**
 * Verify admin access with multiple security checks
 * Returns the admin user if authorized, null otherwise
 */
async function verifyAdminAccess(
  accessToken: string,
  clientIp: string
): Promise<{ adminUser: { id: string; email: string } | null; error?: string; status?: number }> {
  // Verify Supabase token
  const authUser = await verifySupabaseToken(accessToken)
  if (!authUser || !authUser.email) {
    return { adminUser: null, error: "Invalid authentication token", status: 401 }
  }

  // Check if email is in admin list
  if (!ADMIN_EMAILS.includes(authUser.email)) {
    // Log unauthorized admin attempt
    console.warn(`[Admin Security] Unauthorized admin access attempt by ${authUser.email} from IP ${clientIp}`)
    return { adminUser: null, error: "Unauthorized - Admin access required", status: 403 }
  }

  // Verify the admin user exists in our database (additional security layer)
  const dbUser = await prisma.user.findFirst({
    where: {
      supabaseUid: authUser.id,
      email: authUser.email, // Must match the email in our DB
    },
    select: { id: true, email: true },
  })

  if (!dbUser) {
    console.warn(`[Admin Security] Admin email ${authUser.email} not found in database from IP ${clientIp}`)
    return { adminUser: null, error: "Admin account not properly configured", status: 403 }
  }

  return { adminUser: dbUser }
}

interface UpdateTierRequest {
  userId?: string
  email?: string
  tier: "free" | "trialing" | "active" | "canceled"
  monthlyCredits?: number
  bonusCredits?: number
}

/**
 * GET /api/admin/user-tier?email=user@example.com
 * Get a user's current subscription tier
 */
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request)

  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(`admin:${clientIp}`, ADMIN_RATE_LIMIT)
    if (!rateLimitResult.success) {
      console.warn(`[Admin Security] Rate limit exceeded for IP ${clientIp}`)
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }

    // Verify admin authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const { adminUser, error, status } = await verifyAdminAccess(accessToken, clientIp)

    if (!adminUser) {
      return NextResponse.json({ error }, { status: status || 403 })
    }

    const url = new URL(request.url)
    const email = url.searchParams.get("email")
    const userId = url.searchParams.get("userId")

    if (!email && !userId) {
      return NextResponse.json(
        { error: "email or userId query parameter required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { id: userId! },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        monthlyCredits: true,
        bonusCredits: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialStartDate: true,
        trialEndDate: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Admin get tier error:", error)
    return NextResponse.json(
      { error: "Failed to get user tier" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/user-tier
 * Update a user's subscription tier
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)

  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(`admin:${clientIp}`, ADMIN_RATE_LIMIT)
    if (!rateLimitResult.success) {
      console.warn(`[Admin Security] Rate limit exceeded for IP ${clientIp}`)
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }

    // Verify admin authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      )
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const { adminUser, error, status } = await verifyAdminAccess(accessToken, clientIp)

    if (!adminUser) {
      return NextResponse.json({ error }, { status: status || 403 })
    }

    const body: UpdateTierRequest = await request.json()
    const { userId, email, tier, monthlyCredits, bonusCredits } = body

    if (!userId && !email) {
      return NextResponse.json(
        { error: "userId or email required" },
        { status: 400 }
      )
    }

    if (!tier || !["free", "trialing", "active", "canceled"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: free, trialing, active, or canceled" },
        { status: 400 }
      )
    }

    // Find the user
    const existingUser = await prisma.user.findFirst({
      where: email ? { email } : { id: userId! },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // SECURITY: Prevent admins from modifying other admin accounts
    if (ADMIN_EMAILS.includes(existingUser.email) && existingUser.id !== adminUser.id) {
      console.warn(
        `[Admin Security] BLOCKED: Admin ${adminUser.email} attempted to modify another admin account ${existingUser.email} from IP ${clientIp}`
      )
      return NextResponse.json(
        { error: "Cannot modify other admin accounts" },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      subscriptionStatus: tier,
    }

    // Set plan based on tier
    if (tier === "active" || tier === "trialing") {
      updateData.subscriptionPlan = "pro"
      // Set default credits if upgrading to paid tier (default to pro tier credits)
      if (monthlyCredits !== undefined) {
        updateData.monthlyCredits = monthlyCredits
      } else if (existingUser.subscriptionStatus === "free") {
        updateData.monthlyCredits = getMonthlyCreditsForTier("pro")
      }
      // Set period dates if not already set
      if (!existingUser.currentPeriodStart) {
        const now = new Date()
        const endDate = new Date(now)
        endDate.setMonth(endDate.getMonth() + 1)
        updateData.currentPeriodStart = now
        updateData.currentPeriodEnd = endDate
        updateData.creditsResetDate = now
      }
      if (tier === "trialing" && !existingUser.trialStartDate) {
        const now = new Date()
        const trialEnd = new Date(now)
        trialEnd.setDate(trialEnd.getDate() + STRIPE_CONFIG.trial.days) // 3-day trial
        updateData.trialStartDate = now
        updateData.trialEndDate = trialEnd
      }
    } else if (tier === "free" || tier === "canceled") {
      updateData.subscriptionPlan = null
      if (tier === "free") {
        updateData.monthlyCredits = 0
      }
    }

    // Allow explicit credit overrides
    if (monthlyCredits !== undefined) {
      updateData.monthlyCredits = monthlyCredits
    }
    if (bonusCredits !== undefined) {
      updateData.bonusCredits = bonusCredits
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        monthlyCredits: true,
        bonusCredits: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    })

    // Audit log for admin action (include IP for security monitoring)
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: "USER_TIER_UPDATE",
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      clientIp,
      targetUserId: existingUser.id,
      targetEmail: existingUser.email,
      changes: {
        tier: { from: existingUser.subscriptionStatus, to: tier },
        monthlyCredits: { from: existingUser.monthlyCredits, to: updatedUser.monthlyCredits },
        bonusCredits: { from: existingUser.bonusCredits, to: updatedUser.bonusCredits },
      },
    }
    console.log(`[Admin Audit] ${JSON.stringify(auditLog)}`)

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User tier updated to ${tier}`,
    })
  } catch (error) {
    console.error("Admin update tier error:", error)
    return NextResponse.json(
      {
        error: "Failed to update user tier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
