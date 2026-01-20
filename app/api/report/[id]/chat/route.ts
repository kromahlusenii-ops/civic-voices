import { NextRequest } from "next/server"
import { verifySupabaseToken } from "@/lib/supabase-server"
import { getReport } from "@/lib/services/reportService"
import { AudienceChatService } from "@/lib/services/audienceChatService"
import { config } from "@/lib/config"
import type { ChatRequest, ChatContext, Citation } from "@/lib/types/chat"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/report/[id]/chat - Streaming chat endpoint
 * Returns Server-Sent Events (SSE) stream with chat response
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const encoder = new TextEncoder()

  // Helper to send SSE events
  const sendEvent = (
    controller: ReadableStreamDefaultController,
    type: string,
    data: Record<string, unknown>
  ) => {
    const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
    controller.enqueue(encoder.encode(message))
  }

  try {
    const { id: reportId } = await params

    if (!reportId) {
      return new Response(JSON.stringify({ error: "Report ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const accessToken = authHeader.split("Bearer ")[1]
    const user = await verifySupabaseToken(accessToken)

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Parse request body
    let body: ChatRequest
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!body.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch report data
    const reportData = await getReport(reportId, user.id)
    if (!reportData) {
      return new Response(JSON.stringify({ error: "Report not found or access denied" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build chat context from report data
    const context: ChatContext = {
      reportId,
      query: reportData.report.query,
      posts: reportData.posts || [],
      aiAnalysis: reportData.aiAnalysis || null,
      metrics: {
        totalMentions: reportData.metrics?.totalMentions || reportData.posts?.length || 0,
        totalEngagement: reportData.metrics?.totalEngagement || 0,
        sentimentBreakdown: reportData.metrics?.sentimentBreakdown || {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
      },
    }

    // Check if Anthropic API key is configured
    const apiKey = config.llm.anthropic.apiKey
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Chat service not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Create chat service
    const chatService = new AudienceChatService(apiKey)

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullMessage = ""

        try {
          // Stream response from Claude
          const generator = chatService.generateStreamingResponse(
            body.message,
            context,
            body.conversationHistory || []
          )

          for await (const event of generator) {
            if (event.type === "start") {
              sendEvent(controller, "start", { messageId: event.data.messageId || "" })
            } else if (event.type === "delta" && event.data.content) {
              fullMessage += event.data.content
              sendEvent(controller, "delta", { content: event.data.content })
            } else if (event.type === "error") {
              sendEvent(controller, "error", { message: event.data.error || "Unknown error" })
              controller.close()
              return
            }
          }

          // Extract citations from complete response
          const citations: Citation[] = chatService.extractCitations(
            fullMessage,
            context.posts.slice(0, 50)
          )

          // Send complete event
          sendEvent(controller, "complete", {
            fullMessage,
            citations,
          })
        } catch (error) {
          console.error("Chat stream error:", error)
          sendEvent(controller, "error", {
            message: error instanceof Error ? error.message : "Stream error",
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat endpoint error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
