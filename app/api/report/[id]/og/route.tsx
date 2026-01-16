import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

// Use Node.js runtime since Prisma doesn't support edge
export const runtime = "nodejs"

// Image dimensions
const WIDTH = 1200
const HEIGHT = 630

// Platform colors
const PLATFORM_COLORS: Record<string, string> = {
  x: "#000000",
  tiktok: "#00f2ea",
  youtube: "#ff0000",
  reddit: "#ff4500",
  instagram: "#e4405f",
  bluesky: "#0085ff",
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Fetch report data
    const job = await prisma.researchJob.findUnique({
      where: { id },
      select: {
        queryJson: true,
        totalResults: true,
        status: true,
        searches: {
          select: {
            sources: true,
          },
          take: 1,
        },
        insights: {
          select: {
            outputJson: true,
          },
          take: 1,
        },
      },
    })

    if (!job) {
      return new Response("Report not found", { status: 404 })
    }

    const queryJson = job.queryJson as { query: string } | null
    const query = queryJson?.query || "Report"
    const sources = (job.searches[0]?.sources || []) as string[]
    const aiAnalysis = job.insights[0]?.outputJson as {
      interpretation?: string
      keyThemes?: string[]
      sentimentBreakdown?: { overall: string }
    } | null

    const sentiment = aiAnalysis?.sentimentBreakdown?.overall || "mixed"
    const themes = aiAnalysis?.keyThemes?.slice(0, 3) || []

    // Sentiment colors
    const sentimentColors: Record<string, string> = {
      positive: "#22c55e",
      negative: "#ef4444",
      neutral: "#6b7280",
      mixed: "#f59e0b",
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0f172a",
            padding: 60,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Top section - Logo and branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                CV
              </div>
              <span style={{ color: "#94a3b8", fontSize: 24 }}>Civic Voices</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              {sources.slice(0, 4).map((source) => (
                <div
                  key={source}
                  style={{
                    backgroundColor: PLATFORM_COLORS[source] || "#6b7280",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: 16,
                    fontSize: 14,
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {source === "x" ? "X" : source}
                </div>
              ))}
            </div>
          </div>

          {/* Main content - Query */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "white",
                lineHeight: 1.2,
                marginBottom: 24,
                maxWidth: "90%",
              }}
            >
              {query.length > 60 ? query.slice(0, 57) + "..." : query}
            </div>

            {/* Themes */}
            {themes.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 32,
                  flexWrap: "wrap",
                }}
              >
                {themes.map((theme) => (
                  <div
                    key={theme}
                    style={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      color: "#e2e8f0",
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontSize: 18,
                    }}
                  >
                    {theme}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section - Stats */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #334155",
              paddingTop: 32,
            }}
          >
            <div style={{ display: "flex", gap: 48 }}>
              {/* Posts count */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#64748b", fontSize: 16 }}>Posts analyzed</span>
                <span style={{ color: "white", fontSize: 32, fontWeight: 600 }}>
                  {job.totalResults?.toLocaleString() || "0"}
                </span>
              </div>

              {/* Sentiment */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#64748b", fontSize: 16 }}>Sentiment</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: sentimentColors[sentiment] || "#6b7280",
                    }}
                  />
                  <span
                    style={{
                      color: sentimentColors[sentiment] || "#6b7280",
                      fontSize: 32,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {sentiment}
                  </span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div
              style={{
                backgroundColor: job.status === "COMPLETED" ? "#166534" : "#854d0e",
                color: "white",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              {job.status === "COMPLETED" ? "Report Ready" : job.status}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    )
  } catch (error) {
    console.error("[OG Image] Error generating image:", error)
    return new Response("Error generating image", { status: 500 })
  }
}
