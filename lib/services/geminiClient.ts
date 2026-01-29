/**
 * Gemini API Client
 *
 * Rate-limited, retry-enabled HTTP client for Google Gemini API.
 */

const DEFAULT_MIN_DELAY_MS = Number(process.env.GEMINI_MIN_DELAY_MS ?? "500")
const DEFAULT_MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES ?? "3")

let lastRequestTimeMs = 0
let rateLimitQueue: Promise<unknown> = Promise.resolve()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null
  const seconds = Number.parseInt(value, 10)
  if (!Number.isNaN(seconds)) {
    return seconds * 1000
  }
  const dateMs = Date.parse(value)
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now())
  }
  return null
}

async function scheduleRateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const now = Date.now()
    const waitMs = Math.max(0, DEFAULT_MIN_DELAY_MS - (now - lastRequestTimeMs))
    if (waitMs > 0) {
      await sleep(waitMs)
    }
    lastRequestTimeMs = Date.now()
    return fn()
  }

  rateLimitQueue = rateLimitQueue.then(run, run)
  return rateLimitQueue as Promise<T>
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let attempt = 0

  while (true) {
    const response = await fetch(url, init)
    if (response.ok) return response

    // Don't retry on client errors (except 429)
    if (response.status !== 429 && response.status < 500) {
      return response
    }

    if (attempt >= DEFAULT_MAX_RETRIES) {
      return response
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"))
    const backoffMs = Math.min(10000, 1000 * Math.pow(2, attempt))
    const waitMs = retryAfterMs ?? backoffMs
    attempt += 1
    await sleep(waitMs)
  }
}

export async function geminiFetch(
  url: string,
  init: RequestInit
): Promise<Response> {
  return scheduleRateLimited(() => fetchWithRetry(url, init))
}

// Gemini API types
export interface GeminiContent {
  parts: Array<{ text: string }>
  role?: "user" | "model"
}

export interface GeminiRequest {
  contents: GeminiContent[]
  generationConfig?: {
    temperature?: number
    topP?: number
    topK?: number
    maxOutputTokens?: number
    responseMimeType?: string
  }
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
      role: string
    }
    finishReason: string
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

/**
 * Make a request to the Gemini API
 */
export async function geminiGenerate(
  apiKey: string,
  model: string,
  prompt: string,
  options: {
    maxTokens?: number
    temperature?: number
    jsonMode?: boolean
  } = {}
): Promise<{ text: string; ok: boolean; error?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const request: GeminiRequest = {
    contents: [
      {
        parts: [{ text: prompt }],
        role: "user",
      },
    ],
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    },
  }

  // Enable JSON mode if requested
  if (options.jsonMode) {
    request.generationConfig!.responseMimeType = "application/json"
  }

  try {
    const response = await geminiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini API error:", response.status, errorText)
      return { text: "", ok: false, error: `API error ${response.status}: ${errorText}` }
    }

    const data: GeminiResponse = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      return { text: "", ok: false, error: "No response candidates" }
    }

    const textContent = data.candidates[0]?.content?.parts?.[0]?.text
    if (!textContent) {
      return { text: "", ok: false, error: "No text content in response" }
    }

    return { text: textContent, ok: true }
  } catch (error) {
    console.error("Gemini request error:", error)
    return { text: "", ok: false, error: String(error) }
  }
}
