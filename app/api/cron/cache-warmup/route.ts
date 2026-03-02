/**
 * Cache Warmup Cron Job
 * 
 * Purpose: Pre-populate Redis cache for popular topic/location combinations
 * to improve user experience and reduce API rate limit pressure.
 * 
 * **Deployment:**
 * - Vercel Cron: Add to vercel.json with schedule "0 * /6 * * *" (every 6 hours)
 * - Manual: GET /api/cron/cache-warmup?authorization=CRON_SECRET
 * 
 * **Strategy:**
 * 1. Warm top 50 topic/state/city combinations based on user preferences
 * 2. Run every 6 hours (cache TTL is 4 hours for signals)
 * 3. Stagger requests to avoid overwhelming APIs
 * 4. Respect circuit breakers - skip if service is down
 * 
 * **Environment:**
 * - CRON_SECRET: Authorization token for manual triggers
 */

import { NextRequest, NextResponse } from 'next/server'
import { cache, buildSignalsCacheKey } from '@/lib/cache/redis'
import { getAllCircuitBreakerStatus } from '@/lib/utils/circuitBreaker'
import { prisma } from '@/lib/prisma'
import { USE_CASE_SUBCATEGORY_IDS } from '@/lib/search-suggestions'
import { getSubcategoryById } from '@/lib/data/taxonomy'

interface WarmupCombo {
  subcategoryId: string
  state: string | undefined
  city: string | undefined
}

/**
 * Build warmup combos dynamically from user preferences in the DB.
 * - selectedTopics takes priority over useCase role mapping
 * - Deduplicates by subcategoryId+state+city to avoid redundant fetches
 * - Falls back to a small default set if DB is unavailable
 */
async function buildWarmupCombos(): Promise<WarmupCombo[]> {
  const fallback: WarmupCombo[] = [
    { subcategoryId: 'affordable-housing', state: undefined, city: undefined },
    { subcategoryId: 'healthcare-access', state: undefined, city: undefined },
    { subcategoryId: 'policing-reform', state: undefined, city: undefined },
    { subcategoryId: 'cost-of-living', state: undefined, city: undefined },
  ]

  try {
    const users = await prisma.user.findMany({
      where: { onboardingCompletedAt: { not: null } },
      select: { useCase: true, geoState: true, geoCity: true, geoScope: true, selectedTopics: true },
    })

    const seen = new Set<string>()
    const combos: WarmupCombo[] = []

    const addCombo = (subcategoryId: string, state: string | undefined, city: string | undefined) => {
      // Validate the subcategory exists in taxonomy
      if (!getSubcategoryById(subcategoryId)) return
      const key = `${subcategoryId}:${state ?? 'n'}:${city ?? 'n'}`
      if (seen.has(key)) return
      seen.add(key)
      combos.push({ subcategoryId, state, city })
    }

    for (const user of users) {
      // Resolve subcategory IDs: selectedTopics wins over useCase mapping
      let subIds: string[] = []
      if (Array.isArray(user.selectedTopics) && user.selectedTopics.length > 0) {
        subIds = user.selectedTopics as string[]
      } else if (user.useCase) {
        const key = user.useCase as keyof typeof USE_CASE_SUBCATEGORY_IDS
        subIds = USE_CASE_SUBCATEGORY_IDS[key] ?? USE_CASE_SUBCATEGORY_IDS.default
      }

      const state = user.geoState ?? undefined
      const city = user.geoScope === 'city' ? (user.geoCity ?? undefined) : undefined

      for (const subId of subIds) {
        addCombo(subId, state, city)
        // Always warm national version too
        addCombo(subId, undefined, undefined)
      }
    }

    return combos.length > 0 ? combos : fallback
  } catch (err) {
    console.error('[Cache Warmup] Failed to load user combos from DB, using fallback:', err)
    return fallback
  }
}

const DEFAULT_SOURCES = ['reddit', 'x']
const DEFAULT_TIME_FILTER = '7d'
const DEFAULT_LANGUAGE = 'all'

// Stagger delay between requests (ms)
const STAGGER_DELAY_MS = 2000 // 2 seconds

export async function GET(request: NextRequest) {
  try {
    // Authorization check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.warn('[Cache Warmup] CRON_SECRET not configured, allowing execution (dev mode)')
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('[Cache Warmup] Starting cache warmup job...')

    // Check circuit breaker status first
    const breakerStatus = getAllCircuitBreakerStatus()
    const openBreakers = breakerStatus.filter(b => b.state === 'OPEN')
    if (openBreakers.length > 0) {
      console.warn('[Cache Warmup] Some circuit breakers are open:', openBreakers.map(b => b.name).join(', '))
    }

    // Build warmup list dynamically from user preferences
    const WARMUP_COMBOS = await buildWarmupCombos()
    console.log(`[Cache Warmup] Warming ${WARMUP_COMBOS.length} combos from user preferences`)

    const results = {
      total: WARMUP_COMBOS.length,
      warmed: 0,
      cached: 0,
      errors: 0,
      skipped: 0,
      details: [] as Array<{
        combo: typeof WARMUP_COMBOS[0]
        status: 'warmed' | 'cached' | 'error' | 'skipped'
        message?: string
        durationMs?: number
      }>,
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    // Warm cache for each combination with staggered requests
    for (const combo of WARMUP_COMBOS) {
      const startTime = Date.now()
      const cacheKey = buildSignalsCacheKey(
        combo.subcategoryId,
        combo.state,
        combo.city,
        DEFAULT_TIME_FILTER,
        DEFAULT_SOURCES,
        DEFAULT_LANGUAGE,
        false,
        0
      )
      
      try {
        // Check if already cached
        const cached = await cache.get(cacheKey)
        if (cached) {
          console.log(`[Cache Warmup] Cache hit: ${cacheKey}`)
          results.cached++
          results.details.push({
            combo,
            status: 'cached',
            message: 'Already in cache',
          })
          continue
        }
        
        // Fetch fresh data (will be cached automatically by getCached)
        const signalsUrl = new URL('/api/legislative/signals', baseUrl)
        signalsUrl.searchParams.set('subcategoryId', combo.subcategoryId)
        if (combo.state) signalsUrl.searchParams.set('state', combo.state)
        if (combo.city) signalsUrl.searchParams.set('city', combo.city)
        signalsUrl.searchParams.set('timeFilter', DEFAULT_TIME_FILTER)
        signalsUrl.searchParams.set('sources', DEFAULT_SOURCES.join(','))
        signalsUrl.searchParams.set('language', DEFAULT_LANGUAGE)
        
        console.log(`[Cache Warmup] Fetching: ${signalsUrl.pathname}${signalsUrl.search}`)
        
        const response = await fetch(signalsUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        const durationMs = Date.now() - startTime
        
        console.log(`[Cache Warmup] Warmed: ${cacheKey} (${durationMs}ms, ${data.posts?.length || 0} posts)`)
        results.warmed++
        results.details.push({
          combo,
          status: 'warmed',
          message: `Fetched ${data.posts?.length || 0} posts`,
          durationMs,
        })
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Cache Warmup] Error warming ${cacheKey}:`, errorMessage)
        
        // Check if error is due to circuit breaker
        if (errorMessage.includes('Circuit breaker OPEN')) {
          results.skipped++
          results.details.push({
            combo,
            status: 'skipped',
            message: `Circuit breaker open: ${errorMessage}`,
          })
        } else {
          results.errors++
          results.details.push({
            combo,
            status: 'error',
            message: errorMessage,
          })
        }
      }
      
      // Stagger requests to avoid overwhelming APIs
      if (combo !== WARMUP_COMBOS[WARMUP_COMBOS.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS))
      }
    }
    
    console.log('[Cache Warmup] Job complete:', results)
    
    return NextResponse.json({
      success: true,
      results,
      breakerStatus: getAllCircuitBreakerStatus(),
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Cache Warmup] Job failed:', errorMessage)
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        breakerStatus: getAllCircuitBreakerStatus(),
      },
      { status: 500 }
    )
  }
}
