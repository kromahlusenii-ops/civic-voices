/**
 * Simple in-memory rate limiter using sliding window algorithm
 * For production with multiple instances, use Redis-based solution (e.g., @upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

// In-memory store - cleared on server restart
// For production, consider using Redis
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., userId, IP address)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = store.get(key)

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  // Check if over limit
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment counter
  entry.count++
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

// Pre-configured rate limiters for common use cases

/**
 * Rate limiter for search API (10 requests per minute per user)
 */
export function checkSearchRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`search:${userId}`, {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  })
}

/**
 * Rate limiter for token verification (5 attempts per minute per IP)
 */
export function checkVerifyRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`verify:${ip}`, {
    windowMs: 60000, // 1 minute
    maxRequests: 5,
  })
}

/**
 * Rate limiter for credit deduction (1 per 100ms per user to prevent rapid-fire)
 */
export function checkCreditRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`credit:${userId}`, {
    windowMs: 1000, // 1 second
    maxRequests: 10, // 10 per second max
  })
}

/**
 * Rate limiter for report access (20 per minute per IP to prevent enumeration)
 */
export function checkReportAccessRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`report:${ip}`, {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
  })
}

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and standard proxies
 */
export function getClientIp(request: Request): string {
  // Vercel
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Real IP header
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback
  return "unknown"
}
