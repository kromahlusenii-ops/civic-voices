import { NextRequest } from "next/server"

/**
 * Extract HAM API key from Authorization header.
 * Expects: Authorization: Bearer ham_...
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const key = authHeader.slice(7)
  if (!key.startsWith("ham_")) {
    return null
  }
  return key
}
