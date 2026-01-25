/**
 * Utility functions for secure logging
 * Prevents PII from being exposed in production logs
 */

/**
 * Mask email for logging (e.g., "user@example.com" -> "u***@e***.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***"
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  const domainParts = domain.split(".")
  const maskedLocal = local.charAt(0) + "***"
  const maskedDomain = domainParts[0].charAt(0) + "***." + domainParts.slice(1).join(".")
  return `${maskedLocal}@${maskedDomain}`
}

/**
 * Mask IP address for logging (e.g., "192.168.1.100" -> "192.168.*.*")
 */
export function maskIp(ip: string): string {
  if (!ip) return "***"
  const parts = ip.split(".")
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`
  }
  // IPv6 or other formats - just show first segment
  return ip.split(":")[0] + ":***"
}
