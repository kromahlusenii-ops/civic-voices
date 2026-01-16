import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

// Fetch report data for metadata
async function getReportMetadata(reportId: string) {
  try {
    const job = await prisma.researchJob.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        queryJson: true,
        totalResults: true,
        status: true,
        createdAt: true,
        shareToken: true,
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

    if (!job) return null

    const queryJson = job.queryJson as { query: string; sources?: string[] } | null
    const query = queryJson?.query || "Report"
    const sources = job.searches[0]?.sources || queryJson?.sources || []
    const aiAnalysis = job.insights[0]?.outputJson as { interpretation?: string; keyThemes?: string[] } | null

    return {
      query,
      sources: sources as string[],
      totalResults: job.totalResults,
      status: job.status,
      interpretation: aiAnalysis?.interpretation,
      themes: aiAnalysis?.keyThemes,
      hasShareToken: !!job.shareToken,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params
  const report = await getReportMetadata(id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://civicvoices.app"

  if (!report) {
    return {
      title: "Report Not Found | Civic Voices",
      description: "This report could not be found or you don't have access to it.",
    }
  }

  const title = `${report.query} | Civic Voices Report`
  const platformNames = report.sources.map(s => s === "x" ? "X" : s.charAt(0).toUpperCase() + s.slice(1)).join(", ")

  // Build a rich description
  let description = `Social intelligence report analyzing "${report.query}"`
  if (report.totalResults) {
    description += ` with ${report.totalResults.toLocaleString()} posts`
  }
  if (platformNames) {
    description += ` from ${platformNames}`
  }
  description += "."

  if (report.interpretation) {
    // Add first sentence of AI interpretation
    const firstSentence = report.interpretation.split(/[.!?]/)[0]
    if (firstSentence && firstSentence.length < 150) {
      description += ` ${firstSentence}.`
    }
  }

  // Build theme keywords
  const keywords = [
    "social media analysis",
    "sentiment analysis",
    report.query,
    ...(report.themes || []),
  ]

  return {
    title,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title,
      description,
      type: "article",
      url: `${baseUrl}/report/${id}`,
      siteName: "Civic Voices",
      images: [
        {
          url: `${baseUrl}/api/report/${id}/og`,
          width: 1200,
          height: 630,
          alt: `Report preview for "${report.query}"`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/api/report/${id}/og`],
    },
  }
}

export default function ReportLayout({ children }: LayoutProps) {
  return children
}
