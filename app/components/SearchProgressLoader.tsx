"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Progress event types from the streaming API
export interface SearchProgressEvent {
  type:
    | "connected"
    | "platform_started"
    | "platform_complete"
    | "platform_error"
    | "stats"
    | "ai_analysis_started"
    | "ai_analysis_complete"
    | "ai_analysis_error"
    | "complete"
  data: Record<string, unknown>
}

// Platform display names
const PLATFORM_NAMES: Record<string, string> = {
  x: "X (Twitter)",
  tiktok: "TikTok",
  youtube: "YouTube",
  reddit: "Reddit",
  bluesky: "Bluesky",
  truthsocial: "Truth Social",
  instagram: "Instagram",
}

// Fact content for the carousel
const FACTS = [
  // E-commerce & Brand Stats
  {
    category: "stat",
    text: "93% of consumers say online reviews impact their purchasing decisions.",
  },
  {
    category: "stat",
    text: "User-generated content is 9.8x more impactful than influencer content for purchasing decisions.",
  },
  {
    category: "stat",
    text: "Brands that respond to social mentions see 20-40% more customer spending.",
  },
  {
    category: "stat",
    text: "64% of consumers want brands to connect with them on social media.",
  },
  {
    category: "stat",
    text: "TikTok users are 1.5x more likely to buy a product they discovered on the platform.",
  },
  // Platform Facts
  {
    category: "platform",
    text: "TikTok product reviews have driven 67% of users to make unplanned purchases.",
  },
  {
    category: "platform",
    text: "Instagram Reels get 22% more engagement than standard video posts.",
  },
  {
    category: "platform",
    text: "YouTube product reviews influence over 80% of shoppers in their purchase journey.",
  },
  {
    category: "platform",
    text: "Reddit's product recommendation threads often rank in top Google search results.",
  },
  {
    category: "platform",
    text: "X/Twitter is where 40% of users discover new brands and products.",
  },
  // Product Tips
  {
    category: "tip",
    text: "Use specific product names or SKUs for more targeted results.",
  },
  {
    category: "tip",
    text: "Try searching competitor brand names to see how you compare.",
  },
  {
    category: "tip",
    text: "Export reports as PDFs to share with your team or stakeholders.",
  },
  {
    category: "tip",
    text: "Check trending topics weekly to catch emerging conversations about your brand.",
  },
  {
    category: "tip",
    text: "Search for common misspellings of your brand name to catch all mentions.",
  },
]

interface SearchProgressLoaderProps {
  query: string
  sources: string[]
  onProgress?: (event: SearchProgressEvent) => void
  onComplete?: (data: Record<string, unknown>) => void
  onError?: (error: string) => void
  onCancel?: () => void
}

interface PlatformState {
  status: "pending" | "searching" | "complete" | "error"
  postCount?: number
  error?: string
}

export default function SearchProgressLoader({
  query,
  sources,
  onProgress,
  onComplete,
  onError,
  onCancel,
}: SearchProgressLoaderProps) {
  // Progress state
  const [currentStage, setCurrentStage] = useState<string>("starting")
  const [progressMessage, setProgressMessage] = useState("Starting your search...")
  const [secondaryMessage, setSecondaryMessage] = useState<string | null>(null)
  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>({})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalPostsFound, setTotalPostsFound] = useState(0) // Used for dynamic message updates
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isStalled, setIsStalled] = useState(false)

  // Fact carousel state
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [isFactVisible, setIsFactVisible] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [showFactCarousel, setShowFactCarousel] = useState(false)

  // Timing refs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchStartTime = useRef<number>(Date.now()) // For tracking total search duration
  const stageStartTime = useRef<number>(Date.now())
  const longWaitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stalledTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const factCarouselDelayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const factRotationInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Shuffle facts on mount
  const [shuffledFacts] = useState(() => {
    const shuffled = [...FACTS]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  })

  // Update progress message based on stage
  const updateProgressMessage = useCallback((stage: string, data?: Record<string, unknown>) => {
    stageStartTime.current = Date.now()
    setSecondaryMessage(null)
    setIsStalled(false)

    // Clear any existing timeouts
    if (longWaitTimeout.current) {
      clearTimeout(longWaitTimeout.current)
    }
    if (stalledTimeout.current) {
      clearTimeout(stalledTimeout.current)
    }

    // Set up long wait message (10 seconds)
    longWaitTimeout.current = setTimeout(() => {
      setSecondaryMessage("This might take a moment — we're being thorough.")
    }, 10000)

    // Set up stalled detection (20 seconds)
    stalledTimeout.current = setTimeout(() => {
      setIsStalled(true)
      setSecondaryMessage("Still working — this search is taking longer than usual.")
    }, 20000)

    switch (stage) {
      case "starting":
        setProgressMessage("Starting your search...")
        break
      case "platform_started": {
        const platform = data?.platform as string
        setProgressMessage(`Scanning ${PLATFORM_NAMES[platform] || platform} for mentions...`)
        break
      }
      case "platform_complete": {
        const platform = data?.platform as string
        const count = data?.count as number
        if (count > 0) {
          setProgressMessage(`Found ${count} posts on ${PLATFORM_NAMES[platform] || platform}`)
        }
        break
      }
      case "stats": {
        const total = data?.totalPosts as number
        if (total > 0) {
          setProgressMessage(`Found ${total} posts. Analyzing themes...`)
        }
        break
      }
      case "ai_analysis_started":
        setProgressMessage("Generating insights...")
        break
      case "wrapping_up":
        setProgressMessage("Wrapping up...")
        break
      default:
        break
    }
  }, [])

  // Handle SSE events
  const handleEvent = useCallback((event: SearchProgressEvent) => {
    setCurrentStage(event.type)
    onProgress?.(event)

    switch (event.type) {
      case "connected":
        updateProgressMessage("starting")
        // Initialize platform states
        const initialPlatforms: Record<string, PlatformState> = {}
        sources.forEach(source => {
          initialPlatforms[source] = { status: "pending" }
        })
        setPlatforms(initialPlatforms)
        break

      case "platform_started":
        setPlatforms(prev => ({
          ...prev,
          [event.data.platform as string]: { status: "searching" }
        }))
        updateProgressMessage("platform_started", event.data)
        break

      case "platform_complete":
        setPlatforms(prev => ({
          ...prev,
          [event.data.platform as string]: {
            status: "complete",
            postCount: event.data.count as number
          }
        }))
        setTotalPostsFound(prev => prev + (event.data.count as number || 0))
        updateProgressMessage("platform_complete", event.data)
        break

      case "platform_error":
        setPlatforms(prev => ({
          ...prev,
          [event.data.platform as string]: {
            status: "error",
            error: event.data.error as string
          }
        }))
        break

      case "stats":
        updateProgressMessage("stats", event.data)
        break

      case "ai_analysis_started":
        setIsAnalyzing(true)
        updateProgressMessage("ai_analysis_started")
        break

      case "ai_analysis_complete":
        setIsAnalyzing(false)
        updateProgressMessage("wrapping_up")
        break

      case "ai_analysis_error":
        setIsAnalyzing(false)
        updateProgressMessage("wrapping_up")
        break

      case "complete":
        if (longWaitTimeout.current) {
          clearTimeout(longWaitTimeout.current)
        }
        onComplete?.(event.data)
        break
    }
  }, [sources, updateProgressMessage, onProgress, onComplete])

  // Start SSE connection
  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller

    const searchParams = new URLSearchParams()
    searchParams.set("query", query)
    sources.forEach(source => searchParams.append("sources", source))

    const startStream = async () => {
      try {
        const response = await fetch(`/api/search/stream?${searchParams.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        const decoder = new TextDecoder()
        let buffer = ""
        let currentEventType: string | null = null

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              // Store event type for the next data line
              currentEventType = line.slice(7).trim()
              continue
            }
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                // Use the event type from the previous line
                const eventType = currentEventType || "connected"
                handleEvent({ type: eventType as SearchProgressEvent["type"], data })
                currentEventType = null // Reset for next event
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return // Cancelled, don't report error
        }
        const errorMessage = error instanceof Error ? error.message : "Search failed"
        onError?.(errorMessage)
      }
    }

    startStream()

    return () => {
      controller.abort()
      if (longWaitTimeout.current) {
        clearTimeout(longWaitTimeout.current)
      }
      if (stalledTimeout.current) {
        clearTimeout(stalledTimeout.current)
      }
      if (factCarouselDelayTimeout.current) {
        clearTimeout(factCarouselDelayTimeout.current)
      }
    }
  }, [query, sources, handleEvent, onError, currentStage])

  // Delay showing fact carousel for fast completion handling
  useEffect(() => {
    // Only show fact carousel after 7 seconds (skip for fast searches)
    factCarouselDelayTimeout.current = setTimeout(() => {
      setShowFactCarousel(true)
    }, 7000)

    return () => {
      if (factCarouselDelayTimeout.current) {
        clearTimeout(factCarouselDelayTimeout.current)
      }
    }
  }, [])

  // Fact carousel rotation (only when visible)
  useEffect(() => {
    if (isHovering || !showFactCarousel) return

    factRotationInterval.current = setInterval(() => {
      setIsFactVisible(false)

      setTimeout(() => {
        setCurrentFactIndex(prev => (prev + 1) % shuffledFacts.length)
        setIsFactVisible(true)
      }, 300) // Fade out duration
    }, 7000)

    return () => {
      if (factRotationInterval.current) {
        clearInterval(factRotationInterval.current)
      }
    }
  }, [isHovering, shuffledFacts.length, showFactCarousel])

  // Cancel handler
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    onCancel?.()
  }, [onCancel])

  // Calculate completed platforms
  const completedPlatforms = Object.values(platforms).filter(p => p.status === "complete").length
  const totalPlatforms = sources.length

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl text-center">
        {/* Query Badge */}
        <div className="mb-8">
          <span className="inline-block rounded-full bg-white border border-gray-200 px-4 py-2 text-sm text-gray-800 shadow-sm">
            {query}
          </span>
        </div>

        {/* Progress Storytelling */}
        <div className="mb-12">
          {/* Animated Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* Outer ring */}
              <div className="h-16 w-16 rounded-full border-4 border-gray-100" />
              {/* Spinning arc */}
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-gray-800" style={{ animationDuration: "1.5s" }} />
              {/* Inner dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`h-3 w-3 rounded-full transition-colors duration-300 ${isAnalyzing ? "bg-purple-500" : "bg-gray-800"}`} />
              </div>
            </div>
          </div>

          {/* Progress Message */}
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            {progressMessage}
          </h2>

          {/* Secondary Message (long wait) */}
          {secondaryMessage && (
            <p className="text-sm text-gray-500 animate-fade-in">
              {secondaryMessage}
            </p>
          )}

          {/* Platform Progress Indicators */}
          {totalPlatforms > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {sources.map(source => {
                const state = platforms[source]
                return (
                  <div
                    key={source}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      !state || state.status === "pending"
                        ? "bg-gray-200"
                        : state.status === "searching"
                        ? "bg-gray-400 animate-pulse"
                        : state.status === "complete"
                        ? "bg-green-500"
                        : "bg-red-400"
                    }`}
                    title={`${PLATFORM_NAMES[source] || source}: ${state?.status || "pending"}`}
                  />
                )
              })}
            </div>
          )}

          {/* Progress bar (optional) */}
          {completedPlatforms > 0 && totalPlatforms > 1 && (
            <div className="mt-4 mx-auto max-w-xs">
              <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-800 transition-all duration-500"
                  style={{ width: `${(completedPlatforms / totalPlatforms) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {completedPlatforms} of {totalPlatforms} platforms searched
              </p>
            </div>
          )}
        </div>

        {/* Fact Carousel - only show after 7 seconds (skip for fast searches) */}
        {showFactCarousel && (
          <div
            className="mx-auto max-w-md animate-fade-in"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {/* Icon based on category */}
                <div className="flex-shrink-0 mt-0.5">
                  {shuffledFacts[currentFactIndex].category === "tip" ? (
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ) : shuffledFacts[currentFactIndex].category === "platform" ? (
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                </div>

                {/* Fact text with fade transition */}
                <p
                  className={`text-sm text-gray-600 text-left transition-opacity duration-300 ${
                    isFactVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {shuffledFacts[currentFactIndex].text}
                </p>
              </div>

              {/* Carousel dots */}
              <div className="mt-4 flex justify-center gap-1">
                {shuffledFacts.slice(0, 5).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentFactIndex % 5
                        ? "w-4 bg-gray-400"
                      : "w-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Stalled state - offer to continue or cancel */}
        {isStalled && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel search
            </button>
            <button
              onClick={() => setIsStalled(false)}
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Keep waiting
            </button>
          </div>
        )}

        {/* Cancel button (when not stalled) */}
        {!isStalled && (
          <button
            onClick={handleCancel}
            className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel search
          </button>
        )}
      </div>
    </div>
  )
}
