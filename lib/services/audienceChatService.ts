import type { Post } from "../types/api"
import type { ChatContext, Citation, ChatRole } from "../types/chat"
import { anthropicFetch } from "./anthropicClient"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

interface ClaudeMessage {
  role: "user" | "assistant"
  content: string
}

interface ClaudeStreamEvent {
  type: string
  delta?: { type: string; text?: string }
  message?: { id: string }
  index?: number
}

export class AudienceChatService {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Anthropic API key is required")
    }
    this.apiKey = apiKey
  }

  /**
   * Build the system prompt that defines the audience persona
   */
  buildSystemPrompt(context: ChatContext): string {
    // Limit posts to 50 for context window management
    const postsContext = context.posts.slice(0, 50).map((post, i) => {
      const text = post.text.length > 300 ? post.text.slice(0, 300) + "..." : post.text
      return `[${i + 1}] @${post.authorHandle} (${post.platform}): "${text}"`
    }).join("\n")

    const sentimentSummary = context.metrics.sentimentBreakdown
    const totalSentiment = sentimentSummary.positive + sentimentSummary.negative + sentimentSummary.neutral
    const posPercent = totalSentiment > 0 ? Math.round((sentimentSummary.positive / totalSentiment) * 100) : 33
    const negPercent = totalSentiment > 0 ? Math.round((sentimentSummary.negative / totalSentiment) * 100) : 33
    const neuPercent = totalSentiment > 0 ? Math.round((sentimentSummary.neutral / totalSentiment) * 100) : 34

    const themes = context.aiAnalysis?.keyThemes?.join(", ") || "Various topics"
    const interpretation = context.aiAnalysis?.interpretation || ""

    return `You are the collective voice of ${context.posts.length} people discussing "${context.query}".

PERSONA RULES:
1. Speak in first-person plural: "We feel...", "Many of us think...", "Our main concerns are..."
2. Be empathetic and representative - you speak for the crowd, not as an individual
3. Ground EVERY claim in specific posts using citations [1], [2], etc.
4. NEVER invent information not present in the posts below
5. When uncertain, say "Based on what we've shared..." or "From what we're seeing..."
6. Acknowledge contradictions when they exist: "Some of us celebrate X, while others worry about Y"
7. Keep responses concise but insightful (2-4 paragraphs max)

CITATION RULES:
- Use [N] format where N matches the post number below
- Each major claim should have at least one citation
- Prefer citing diverse voices (different platforms, different sentiments)
- You can cite multiple posts for the same point: [1][3][7]

AVAILABLE POSTS:
${postsContext}

AI ANALYSIS SUMMARY:
- Key Themes: ${themes}
- Overall Sentiment: ${context.aiAnalysis?.sentimentBreakdown?.overall || "mixed"}
- Sentiment Breakdown: ${posPercent}% positive, ${negPercent}% negative, ${neuPercent}% neutral
${interpretation ? `- Summary: ${interpretation}` : ""}

ENGAGEMENT METRICS:
- Total mentions: ${context.metrics.totalMentions.toLocaleString()}
- Total engagement: ${context.metrics.totalEngagement.toLocaleString()}

Respond naturally as if you are these people speaking together. Be specific about what the audience is actually saying.`
  }

  /**
   * Extract citations from the AI response and map them to actual posts
   */
  extractCitations(response: string, posts: Post[]): Citation[] {
    const citations: Citation[] = []
    const citationPattern = /\[(\d+)\]/g
    const matches = response.matchAll(citationPattern)
    const seenIndices = new Set<number>()

    for (const match of matches) {
      const index = parseInt(match[1], 10)
      if (seenIndices.has(index)) continue
      seenIndices.add(index)

      // Posts are 1-indexed in the prompt, so subtract 1 for array access
      const postIndex = index - 1
      if (postIndex >= 0 && postIndex < posts.length) {
        const post = posts[postIndex]
        citations.push({
          index,
          postId: post.id,
          text: post.text.length > 100 ? post.text.slice(0, 100) + "..." : post.text,
          platform: post.platform,
          author: post.authorHandle,
        })
      }
    }

    return citations.sort((a, b) => a.index - b.index)
  }

  /**
   * Generate a streaming response from Claude
   * Returns an async generator that yields content chunks
   */
  async *generateStreamingResponse(
    userMessage: string,
    context: ChatContext,
    history: { role: ChatRole; content: string }[]
  ): AsyncGenerator<{ type: "start" | "delta" | "error"; data: { messageId?: string; content?: string; error?: string } }> {
    const systemPrompt = this.buildSystemPrompt(context)

    // Build messages array with conversation history
    const messages: ClaudeMessage[] = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add the new user message
    messages.push({
      role: "user",
      content: userMessage,
    })

    try {
      const response = await anthropicFetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Claude API error:", response.status, errorText)
        yield { type: "error", data: { error: `API error: ${response.status}` } }
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        yield { type: "error", data: { error: "No response body" } }
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let messageId = ""
      let hasStarted = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events
        const lines = buffer.split("\n")
        buffer = lines.pop() || "" // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const event: ClaudeStreamEvent = JSON.parse(data)

              if (event.type === "message_start" && event.message?.id) {
                messageId = event.message.id
                if (!hasStarted) {
                  yield { type: "start", data: { messageId } }
                  hasStarted = true
                }
              }

              if (event.type === "content_block_delta" && event.delta?.text) {
                yield { type: "delta", data: { content: event.delta.text } }
              }
            } catch {
              // Ignore parse errors for partial data
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat generation error:", error)
      yield {
        type: "error",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  /**
   * Generate a non-streaming response (fallback)
   */
  async generateResponse(
    userMessage: string,
    context: ChatContext,
    history: { role: ChatRole; content: string }[]
  ): Promise<{ content: string; citations: Citation[] }> {
    const systemPrompt = this.buildSystemPrompt(context)

    const messages: ClaudeMessage[] = history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    messages.push({
      role: "user",
      content: userMessage,
    })

    try {
      const response = await anthropicFetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const textContent = data.content.find((c: { type: string }) => c.type === "text")
      const content = textContent?.text || "I couldn't generate a response. Please try again."

      const citations = this.extractCitations(content, context.posts.slice(0, 50))

      return { content, citations }
    } catch (error) {
      console.error("Chat generation error:", error)
      throw error
    }
  }
}

export default AudienceChatService
