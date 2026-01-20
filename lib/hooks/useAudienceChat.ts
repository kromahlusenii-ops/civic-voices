"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { ChatMessage, ChatStatus, Citation, ChatRole } from "@/lib/types/chat"

export interface UseAudienceChatState {
  messages: ChatMessage[]
  status: ChatStatus
  error: string | null
}

export interface UseAudienceChatReturn extends UseAudienceChatState {
  sendMessage: (content: string) => void
  clearHistory: () => void
  exportConversation: () => string
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useAudienceChat(
  reportId: string,
  accessToken: string | null,
  shareToken?: string | null
): UseAudienceChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      // Cancel any existing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setStatus("streaming")
      setError(null)

      // Create placeholder for assistant message
      const assistantMessageId = generateId()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        citations: [],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      try {
        // Build conversation history for context
        const conversationHistory: { role: ChatRole; content: string }[] = messages.map(
          (msg) => ({
            role: msg.role,
            content: msg.content,
          })
        )

        // Build headers - include auth token if available
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }

        // Build URL with optional share token
        let chatUrl = `/api/report/${reportId}/chat`
        if (shareToken) {
          chatUrl += `?token=${encodeURIComponent(shareToken)}`
        }

        const response = await fetch(chatUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: content.trim(),
            conversationHistory,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Request failed: ${response.status}`)
        }

        // Process SSE stream
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""
        let citations: Citation[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete events
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              // Event type line - skip to data line
              continue
            }

            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)

                if (parsed.content) {
                  // Delta event - append content
                  fullContent += parsed.content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  )
                }

                if (parsed.fullMessage !== undefined) {
                  // Complete event
                  fullContent = parsed.fullMessage
                  citations = parsed.citations || []
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent, citations }
                        : msg
                    )
                  )
                }

                if (parsed.message && !parsed.content && !parsed.fullMessage) {
                  // Error event
                  throw new Error(parsed.message)
                }
              } catch (parseError) {
                // Ignore parse errors for incomplete data
                if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") {
                  console.error("Parse error:", parseError)
                }
              }
            }
          }
        }

        setStatus("idle")
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, don't show error
          return
        }

        console.error("Chat error:", err)
        setError(err instanceof Error ? err.message : "Failed to send message")
        setStatus("error")

        // Remove the empty assistant message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        )
      }
    },
    [reportId, accessToken, shareToken, messages]
  )

  const clearHistory = useCallback(() => {
    abortControllerRef.current?.abort()
    setMessages([])
    setStatus("idle")
    setError(null)
  }, [])

  const exportConversation = useCallback(() => {
    const lines: string[] = []
    lines.push("# Audience Chat Conversation")
    lines.push(`Report ID: ${reportId}`)
    lines.push(`Exported: ${new Date().toLocaleString()}`)
    lines.push("")
    lines.push("---")
    lines.push("")

    for (const msg of messages) {
      const role = msg.role === "user" ? "You" : "Audience Voice"
      const time = msg.timestamp.toLocaleTimeString()
      lines.push(`**${role}** (${time}):`)
      lines.push(msg.content)
      lines.push("")
    }

    return lines.join("\n")
  }, [reportId, messages])

  return {
    messages,
    status,
    error,
    sendMessage,
    clearHistory,
    exportConversation,
  }
}
