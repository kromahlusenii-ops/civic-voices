"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { Post, AIAnalysis, SearchParams } from "@/lib/types/api"

export type PlatformStatus = "pending" | "loading" | "complete" | "error"

export interface StreamingSearchState {
  isConnected: boolean
  isSearching: boolean
  posts: Post[]
  platformStatus: Record<string, PlatformStatus>
  platformCounts: Record<string, number>
  platformErrors: Record<string, string>
  aiAnalysis: AIAnalysis | null
  aiAnalysisStatus: "idle" | "loading" | "complete" | "error"
  error: string | null
  isComplete: boolean
  warnings: string[]
  summary: {
    totalPosts: number
    platforms: Record<string, number>
    sentiment: {
      positive: number
      negative: number
      neutral: number
    }
    timeRange: {
      start: string
      end: string
    }
    credibility?: {
      averageScore: number
      tier1Count: number
      verifiedCount: number
    }
  } | null
}

const initialState: StreamingSearchState = {
  isConnected: false,
  isSearching: false,
  posts: [],
  platformStatus: {},
  platformCounts: {},
  platformErrors: {},
  aiAnalysis: null,
  aiAnalysisStatus: "idle",
  error: null,
  isComplete: false,
  warnings: [],
  summary: null,
}

export interface UseStreamingSearchReturn extends StreamingSearchState {
  startSearch: (params: SearchParams) => void
  cancelSearch: () => void
  reset: () => void
}

export function useStreamingSearch(): UseStreamingSearchReturn {
  const [state, setState] = useState<StreamingSearchState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)

  const reset = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setState(initialState)
  }, [])

  const cancelSearch = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setState((prev) => ({
      ...prev,
      isSearching: false,
      isConnected: false,
    }))
  }, [])

  const startSearch = useCallback((params: SearchParams) => {
    // Close existing connection
    eventSourceRef.current?.close()

    // Build URL with search params
    const url = new URL("/api/search/stream", window.location.origin)
    url.searchParams.set("query", params.query)
    params.sources.forEach((s) => url.searchParams.append("sources", s))
    url.searchParams.set("timeFilter", params.timeFilter)
    if (params.language) {
      url.searchParams.set("language", params.language)
    }
    if (params.sort) {
      url.searchParams.set("sort", params.sort)
    }

    // Initialize all platforms as pending
    const platformStatus: Record<string, PlatformStatus> = {}
    params.sources.forEach((s) => {
      platformStatus[s] = "pending"
    })

    // Reset state for new search
    setState({
      ...initialState,
      platformStatus,
      isSearching: true,
    })

    // Create EventSource
    const eventSource = new EventSource(url.toString())
    eventSourceRef.current = eventSource

    // Handle connection open
    eventSource.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }))
    }

    // Handle connected event
    eventSource.addEventListener("connected", () => {
      setState((prev) => ({ ...prev, isConnected: true }))
    })

    // Handle platform started
    eventSource.addEventListener("platform_started", (e) => {
      const { platform } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        platformStatus: { ...prev.platformStatus, [platform]: "loading" },
      }))
    })

    // Handle platform complete
    eventSource.addEventListener("platform_complete", (e) => {
      const { platform, posts, count } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        posts: [...prev.posts, ...posts],
        platformStatus: { ...prev.platformStatus, [platform]: "complete" },
        platformCounts: { ...prev.platformCounts, [platform]: count },
      }))
    })

    // Handle platform error
    eventSource.addEventListener("platform_error", (e) => {
      const { platform, error } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        platformStatus: { ...prev.platformStatus, [platform]: "error" },
        platformErrors: { ...prev.platformErrors, [platform]: error },
      }))
    })

    // Handle stats update
    eventSource.addEventListener("stats", (e) => {
      const { totalPosts, platforms, credibility, timeRange } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        summary: prev.summary
          ? { ...prev.summary, totalPosts, platforms, credibility, timeRange }
          : {
              totalPosts,
              platforms,
              credibility,
              timeRange,
              sentiment: { positive: 0, neutral: 0, negative: 0 },
            },
      }))
    })

    // Handle AI analysis started
    eventSource.addEventListener("ai_analysis_started", () => {
      setState((prev) => ({ ...prev, aiAnalysisStatus: "loading" }))
    })

    // Handle AI analysis complete
    eventSource.addEventListener("ai_analysis_complete", (e) => {
      const { analysis } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        aiAnalysis: analysis,
        aiAnalysisStatus: "complete",
      }))
    })

    // Handle AI analysis error
    eventSource.addEventListener("ai_analysis_error", (e) => {
      const { error } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        aiAnalysisStatus: "error",
        warnings: [...prev.warnings, `AI analysis failed: ${error}`],
      }))
    })

    // Handle complete event
    eventSource.addEventListener("complete", (e) => {
      const { posts, summary, aiAnalysis, warnings } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        posts,
        summary,
        aiAnalysis: aiAnalysis || prev.aiAnalysis,
        warnings: warnings || [],
        isComplete: true,
        isSearching: false,
      }))
      eventSource.close()
    })

    // Handle connection error
    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      setState((prev) => ({
        ...prev,
        error: "Connection lost. Please try again.",
        isSearching: false,
        isConnected: false,
      }))
      eventSource.close()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  return {
    ...state,
    startSearch,
    cancelSearch,
    reset,
  }
}
