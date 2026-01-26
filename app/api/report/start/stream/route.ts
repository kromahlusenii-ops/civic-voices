import { NextRequest } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { startReportWithProgress, ReportProgressEvent } from "@/lib/services/reportService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Get searchId from query params
  const searchParams = request.nextUrl.searchParams;
  const searchId = searchParams.get("searchId");

  if (!searchId) {
    return new Response(JSON.stringify({ error: "Missing searchId parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get Supabase access token from Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized - No token provided" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = authHeader.split("Bearer ")[1];

  // Verify Supabase access token
  const user = await verifySupabaseToken(accessToken);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: "User ID not found in token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      // Helper to send SSE events safely
      const sendEvent = (event: ReportProgressEvent) => {
        if (isClosed) return;
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Controller already closed, ignore
          isClosed = true;
        }
      };

      // Helper to close controller safely
      const closeController = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          // Already closed, ignore
        }
      };

      try {
        // Send initial connected event
        sendEvent({ type: "connected", message: "Connection established" });

        // Start report generation with progress callbacks
        const result = await startReportWithProgress(searchId, userId, sendEvent);

        // Send completion event
        sendEvent({
          type: "complete",
          message: "Report generation complete",
          reportId: result.reportId,
        });
      } catch (error) {
        console.error("Report generation error:", error);
        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to generate report",
        });
      } finally {
        closeController();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
