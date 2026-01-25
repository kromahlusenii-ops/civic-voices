import { NextResponse } from "next/server"
import { checkDatabaseConnection, getConnectionInfo } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Health check endpoint for monitoring database connectivity
 * GET /api/health
 *
 * Returns:
 * - status: "healthy" | "unhealthy"
 * - database: connection status and latency
 * - pool: connection pool configuration
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Check database connectivity
    const dbHealth = await checkDatabaseConnection()
    const poolInfo = getConnectionInfo()

    const isHealthy = dbHealth.connected && dbHealth.latencyMs < 5000

    const response = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbHealth.connected,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error,
      },
      pool: {
        usingPooler: poolInfo.usingPooler,
        connectionLimit: poolInfo.connectionLimit,
        poolTimeoutSeconds: poolInfo.poolTimeout,
      },
      responseTimeMs: Date.now() - startTime,
    }

    // Return 503 if unhealthy for load balancer detection
    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTimeMs: Date.now() - startTime,
      },
      { status: 503 }
    )
  }
}
