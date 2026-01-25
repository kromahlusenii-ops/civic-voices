import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Connection pool configuration for serverless environments
const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn']
  : ['error', 'warn']

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Prevent connection pool exhaustion in serverless environments
// by reusing the client instance across requests
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// In production, always reuse the client
globalForPrisma.prisma = prisma

// Connection monitoring - log connection issues
prisma.$on('query' as never, (e: { duration: number; query: string }) => {
  // Log slow queries (>1000ms) in production for monitoring
  if (process.env.NODE_ENV === 'production' && e.duration > 1000) {
    console.warn(`[Prisma] Slow query (${e.duration}ms):`, e.query.slice(0, 100))
  }
})

// Graceful shutdown - disconnect on process termination
// This prevents connection leaks when the server restarts
async function gracefulShutdown() {
  console.log('[Prisma] Disconnecting database client...')
  await prisma.$disconnect()
  console.log('[Prisma] Database client disconnected')
}

// Handle various termination signals
if (typeof process !== 'undefined') {
  process.on('beforeExit', gracefulShutdown)
  process.on('SIGINT', async () => {
    await gracefulShutdown()
    process.exit(0)
  })
  process.on('SIGTERM', async () => {
    await gracefulShutdown()
    process.exit(0)
  })
}

/**
 * Health check function to verify database connectivity
 * Use this to monitor connection status
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean
  latencyMs: number
  error?: string
}> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      connected: true,
      latencyMs: Date.now() - start,
    }
  } catch (error) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get current connection pool statistics (approximate)
 * Note: Prisma doesn't expose direct pool metrics, this uses heuristics
 */
export function getConnectionInfo(): {
  usingPooler: boolean
  connectionLimit: number
  poolTimeout: number
} {
  const url = process.env.DATABASE_URL || ''
  const params = new URLSearchParams(url.split('?')[1] || '')

  return {
    usingPooler: url.includes('pgbouncer=true') || url.includes(':6543'),
    connectionLimit: parseInt(params.get('connection_limit') || '1', 10),
    poolTimeout: parseInt(params.get('pool_timeout') || '10', 10),
  }
}
