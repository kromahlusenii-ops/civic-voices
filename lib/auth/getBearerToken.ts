import type { NextRequest } from "next/server"

/**
 * Extract Bearer token from Authorization header.
 * @param request - Next.js request
 * @returns Token string or null if missing/invalid format
 */
export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7) // "Bearer ".length
}
