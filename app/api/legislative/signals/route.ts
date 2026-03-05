/**
 * Legislative signals API — fetches real social posts + AI analysis for a subcategory.
 * Used by IssueDetailView and SubcategoryView to replace mock data.
 *
 * - Server-side cache: 1h TTL per subcategoryId+state+city+timeFilter
 * - Rate limit: 20 req/min per IP to protect search API
 */

import { NextRequest, NextResponse } from "next/server"
import { getSubcategoryById, getKeywordVariants } from "@/lib/data/taxonomy"
import type { SearchResponse } from "@/lib/types/api"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"
import { getCached, buildSignalsCacheKey } from "@/lib/cache/redis"

const DEFAULT_SOURCES = ["reddit", "x"]
const DEFAULT_LANGUAGE = "all"
const DEFAULT_TIME_FILTER = "7d"
const VALID_TIME_FILTERS = ["7d", "3m", "12m"]
const VALID_SOURCES = ["reddit", "x", "tiktok", "youtube", "bluesky", "truthsocial"]
const CACHE_TTL_SECONDS = 14400 // 4 hours
const LEGISLATIVE_RATE_LIMIT = { windowMs: 60000, maxRequests: 20 }
async function fetchSignalsInternal(
  subcategoryId: string,
  state: string | undefined,
  city: string | undefined,
  timeFilter: string,
  sources: string[],
  language: string,
  baseUrl: string,
  keywordOverride?: string
) {
  const subcategory = getSubcategoryById(subcategoryId)
  if (!subcategory) throw new Error(`Subcategory '${subcategoryId}' not found`)

  // When a specific keyword is provided, use it directly.
  // Otherwise use only the first (broadest) social keyword as the base query.
  // Space-joining multiple keywords is treated as AND by most APIs, which
  // makes the query too restrictive and returns very few posts.
  // Geo context (city/state) is appended per-platform downstream in geoQueryBuilder.
  const query = keywordOverride ?? (getKeywordVariants(subcategoryId, 1)[0] ?? subcategory.name)

  console.log(`[Legislative signals] Query for ${subcategory.name}: "${query}"`)

  const searchRes = await fetch(`${baseUrl}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      sources,
      timeFilter: VALID_TIME_FILTERS.includes(timeFilter) ? timeFilter : DEFAULT_TIME_FILTER,
      language,
      sort: "relevance",
      ...(state && { state }),
      ...(city && { city }),
    }),
  })
  if (!searchRes.ok) {
    const err = await searchRes.text()
    console.error("[Legislative signals] Search API error:", searchRes.status, err)
    throw new Error(`Search failed: ${searchRes.status}`)
  }
  const data: SearchResponse = await searchRes.json()
  
  console.log(`[Legislative signals] Response from search API:`, {
    subcategory: subcategory.name,
    postsCount: data.posts?.length || 0,
    hasAiAnalysis: !!data.aiAnalysis,
    aiAnalysisKeys: data.aiAnalysis ? Object.keys(data.aiAnalysis) : [],
  })
  
  return {
    subcategoryId,
    subcategoryName: subcategory.name,
    query,
    posts: data.posts,
    aiAnalysis: data.aiAnalysis ?? null,
    summary: data.summary,
    credibility: data.summary?.credibility,
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateResult = checkRateLimit(`legislative:${ip}`, LEGISLATIVE_RATE_LIMIT)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    const { searchParams } = new URL(request.url)
    const subcategoryId = searchParams.get("subcategoryId")
    const state = searchParams.get("state") || undefined
    const city = searchParams.get("city") || undefined
    const timeFilter = VALID_TIME_FILTERS.includes(searchParams.get("timeFilter") || "")
      ? searchParams.get("timeFilter")!
      : DEFAULT_TIME_FILTER
    
    // Parse sources parameter (comma-separated string, e.g. "reddit,x,tiktok")
    const sourcesParam = searchParams.get("sources")
    const sources = sourcesParam
      ? sourcesParam.split(",").filter((s) => VALID_SOURCES.includes(s))
      : DEFAULT_SOURCES
    
    // Fallback to default if no valid sources
    const finalSources = sources.length > 0 ? sources : DEFAULT_SOURCES
    
    const language = searchParams.get("language") || DEFAULT_LANGUAGE
    const keywordParam = searchParams.get("keyword") || undefined

    if (!subcategoryId?.trim()) {
      return NextResponse.json(
        { error: "subcategoryId is required" },
        { status: 400 }
      )
    }

    const subcategory = getSubcategoryById(subcategoryId.trim())
    if (!subcategory) {
      return NextResponse.json(
        { error: `Subcategory '${subcategoryId}' not found` },
        { status: 404 }
      )
    }

    // Use the request origin (custom domain) — NOT VERCEL_URL which resolves
    // to the deployment URL that sits behind Vercel Deployment Protection.
    const baseUrl = request.nextUrl.origin

    // Redis Cache Layer — shared across all users with same parameters
    // When a specific keyword is provided, append it to the subcategoryId segment
    // so each keyword gets its own cache entry.
    const cacheSubId = keywordParam ? `${subcategoryId}:kw:${keywordParam}` : subcategoryId
    const cacheKey = buildSignalsCacheKey(
      cacheSubId,
      state,
      city,
      timeFilter,
      finalSources,
      language,
      false,
      0
    )

    const data = await getCached(
      cacheKey,
      () => fetchSignalsInternal(
        subcategoryId.trim(),
        state,
        city,
        timeFilter,
        finalSources,
        language,
        baseUrl,
        keywordParam
      ),
      CACHE_TTL_SECONDS
    )
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Legislative signals] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
