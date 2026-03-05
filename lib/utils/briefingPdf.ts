import type { TaxonomyCategory, Subcategory } from "@/lib/data/taxonomy"
import type { AIAnalysis } from "@/lib/types/api"
import { PLATFORM_LABELS } from "@/app/search/components/platformConstants"
import { TIME_FILTER_LABELS, type TimeFilter } from "@/lib/utils/timeFilter"

export interface BriefingPdfData {
  category: TaxonomyCategory
  subcategory: Subcategory
  geoScope: string
  geoLabel: string
  timeFilter: string
  aiAnalysis: AIAnalysis | null
  sentimentCounts: { positive: number; neutral: number; negative: number }
  credibilityScore: number | null
  postCount: number
  platformCount: number
  platformBreakdown: Array<{ platform: string; count: number }>
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "")
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureSpace(doc: any, cursorY: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (cursorY + needed > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return cursorY
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSectionHeader(doc: any, label: string, y: number, leftMargin: number, contentWidth: number): number {
  const gold = hexToRgb("#D4A24A")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(gold.r, gold.g, gold.b)
  doc.text(label.toUpperCase(), leftMargin, y)
  doc.setDrawColor(gold.r, gold.g, gold.b)
  doc.setLineWidth(0.3)
  doc.line(leftMargin, y + 2, leftMargin + contentWidth, y + 2)
  return y + 8
}

export async function generateBriefingPdf(data: BriefingPdfData): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "letter" })

  const pageWidth = doc.internal.pageSize.getWidth() // 612
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeLabel = TIME_FILTER_LABELS[data.timeFilter as TimeFilter] ?? data.timeFilter

  // ── Header Band ──
  const headerH = 80
  const dark = hexToRgb("#2C2519")
  const gold = hexToRgb("#D4A24A")

  doc.setFillColor(dark.r, dark.g, dark.b)
  doc.rect(0, 0, pageWidth, headerH, "F")

  // "CIVIC VOICES"
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(gold.r, gold.g, gold.b)
  doc.text("CIVIC VOICES", margin, 24)

  // Briefing title
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(`Briefing: ${data.subcategory.name}`, margin, 46)

  // Subtitle
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255, 0.7)
  const subtitle = `${data.category.name}  ·  ${data.geoLabel || "National"}  ·  ${timeLabel}`
  doc.text(subtitle, margin, 62)

  // Date right-aligned
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255, 0.5)
  doc.text(`Generated ${dateStr}`, pageWidth - margin, 62, { align: "right" })

  let y = headerH + 24

  // ── Metrics Row ──
  const boxW = contentWidth / 3 - 6
  const boxH = 48
  const boxes = [
    { label: "POSTS", value: String(data.postCount) },
    { label: "CREDIBILITY", value: data.credibilityScore != null ? `${Math.round(data.credibilityScore * 100)}%` : "—" },
    { label: "PLATFORMS", value: String(data.platformCount) },
  ]

  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 9)
    doc.setFillColor(245, 243, 238)
    doc.roundedRect(x, y, boxW, boxH, 4, 4, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(dark.r, dark.g, dark.b)
    doc.text(box.value, x + boxW / 2, y + 22, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(box.label, x + boxW / 2, y + 36, { align: "center" })
  })

  y += boxH + 20

  // ── Sentiment Bar ──
  const totalSent = data.sentimentCounts.positive + data.sentimentCounts.neutral + data.sentimentCounts.negative || 1
  const negPct = Math.round((data.sentimentCounts.negative / totalSent) * 100)
  const neutPct = Math.round((data.sentimentCounts.neutral / totalSent) * 100)
  const posPct = Math.round((data.sentimentCounts.positive / totalSent) * 100)

  const barH = 10
  const negW = (negPct / 100) * contentWidth
  const neutW = (neutPct / 100) * contentWidth
  const posW = (posPct / 100) * contentWidth

  if (negW > 0) {
    doc.setFillColor(198, 40, 40)
    doc.roundedRect(margin, y, negW, barH, 3, 3, "F")
  }
  if (neutW > 0) {
    doc.setFillColor(230, 81, 0)
    doc.rect(margin + negW, y, neutW, barH, "F")
  }
  if (posW > 0) {
    doc.setFillColor(46, 125, 50)
    doc.roundedRect(margin + negW + neutW, y, posW, barH, 3, 3, "F")
  }

  y += barH + 10
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")

  doc.setTextColor(198, 40, 40)
  doc.text(`Negative ${negPct}%`, margin, y)
  doc.setTextColor(230, 81, 0)
  doc.text(`Neutral ${neutPct}%`, margin + contentWidth / 3, y)
  doc.setTextColor(46, 125, 50)
  doc.text(`Positive ${posPct}%`, margin + (contentWidth * 2) / 3, y)

  y += 20

  // ── AI Briefing ──
  if (data.aiAnalysis?.interpretation) {
    y = ensureSpace(doc, y, 60, margin)
    y = drawSectionHeader(doc, "AI Briefing", y, margin, contentWidth)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    const lines: string[] = doc.splitTextToSize(data.aiAnalysis.interpretation, contentWidth)
    for (const line of lines) {
      y = ensureSpace(doc, y, 14, margin)
      doc.text(line, margin, y)
      y += 14
    }

    if (data.aiAnalysis.sentimentBreakdown?.summary) {
      y += 4
      doc.setFont("helvetica", "italic")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      const sentLines: string[] = doc.splitTextToSize(data.aiAnalysis.sentimentBreakdown.summary, contentWidth)
      for (const line of sentLines) {
        y = ensureSpace(doc, y, 13, margin)
        doc.text(line, margin, y)
        y += 13
      }
    }

    y += 12
  }

  // ── What People Want ──
  if (data.aiAnalysis?.suggestedQueries && data.aiAnalysis.suggestedQueries.length > 0) {
    y = ensureSpace(doc, y, 40, margin)
    y = drawSectionHeader(doc, "What People Want", y, margin, contentWidth)

    doc.setFontSize(10)
    for (const suggestion of data.aiAnalysis.suggestedQueries) {
      y = ensureSpace(doc, y, 28, margin)

      doc.setFont("helvetica", "bold")
      doc.setTextColor(dark.r, dark.g, dark.b)
      const label = suggestion.label || suggestion.query
      doc.text(`  ${label}`, margin, y)
      y += 13

      if (suggestion.description) {
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(9)
        const descLines: string[] = doc.splitTextToSize(suggestion.description, contentWidth - 10)
        for (const line of descLines) {
          y = ensureSpace(doc, y, 12, margin)
          doc.text(line, margin + 10, y)
          y += 12
        }
      }
      y += 4
    }

    y += 8
  }

  // ── Key Topics ──
  if (data.aiAnalysis?.topicAnalysis && data.aiAnalysis.topicAnalysis.length > 0) {
    y = ensureSpace(doc, y, 40, margin)
    y = drawSectionHeader(doc, "Key Topics", y, margin, contentWidth)

    doc.setFontSize(10)
    const topics = data.aiAnalysis.topicAnalysis.slice(0, 5)
    for (const topic of topics) {
      y = ensureSpace(doc, y, 28, margin)

      doc.setFont("helvetica", "bold")
      doc.setTextColor(dark.r, dark.g, dark.b)
      doc.text(`  ${topic.topic}`, margin, y)
      y += 13

      if (topic.postsOverview) {
        doc.setFont("helvetica", "normal")
        doc.setTextColor(80, 80, 80)
        doc.setFontSize(9)
        const overview = topic.postsOverview.split(".")[0] + "."
        const overviewLines: string[] = doc.splitTextToSize(overview, contentWidth - 10)
        for (const line of overviewLines) {
          y = ensureSpace(doc, y, 12, margin)
          doc.text(line, margin + 10, y)
          y += 12
        }
      }
      y += 4
    }

    y += 8
  }

  // ── Post Intentions ──
  if (data.aiAnalysis?.intentionsBreakdown && data.aiAnalysis.intentionsBreakdown.length > 0) {
    y = ensureSpace(doc, y, 40, margin)
    y = drawSectionHeader(doc, "Post Intentions", y, margin, contentWidth)

    doc.setFontSize(9)
    for (const intent of data.aiAnalysis.intentionsBreakdown) {
      y = ensureSpace(doc, y, 20, margin)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(dark.r, dark.g, dark.b)
      doc.text(intent.name, margin, y)

      doc.setFont("helvetica", "bold")
      doc.setTextColor(gold.r, gold.g, gold.b)
      doc.text(`${intent.percentage}%`, margin + contentWidth - 30, y)

      // Progress bar
      const barStartX = margin + 80
      const barMaxW = contentWidth - 130
      const barFillW = (intent.percentage / 100) * barMaxW

      doc.setFillColor(240, 237, 230)
      doc.roundedRect(barStartX, y - 6, barMaxW, 8, 2, 2, "F")
      if (barFillW > 0) {
        doc.setFillColor(gold.r, gold.g, gold.b)
        doc.roundedRect(barStartX, y - 6, barFillW, 8, 2, 2, "F")
      }

      y += 18
    }

    y += 8
  }

  // ── Platform Summary ──
  if (data.platformBreakdown.length > 0) {
    y = ensureSpace(doc, y, 40, margin)
    y = drawSectionHeader(doc, "Platform Summary", y, margin, contentWidth)

    doc.setFontSize(9)

    // Table header
    doc.setFont("helvetica", "bold")
    doc.setTextColor(120, 120, 120)
    doc.text("PLATFORM", margin, y)
    doc.text("POSTS", margin + contentWidth - 40, y, { align: "right" })
    y += 4
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, y, margin + contentWidth, y)
    y += 12

    doc.setFont("helvetica", "normal")
    for (const entry of data.platformBreakdown) {
      y = ensureSpace(doc, y, 16, margin)
      const label = PLATFORM_LABELS[entry.platform] ?? entry.platform
      doc.setTextColor(dark.r, dark.g, dark.b)
      doc.text(label, margin, y)
      doc.setTextColor(gold.r, gold.g, gold.b)
      doc.setFont("helvetica", "bold")
      doc.text(String(entry.count), margin + contentWidth - 40, y, { align: "right" })
      doc.setFont("helvetica", "normal")
      y += 16
    }
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 30
  doc.setDrawColor(gold.r, gold.g, gold.b)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY, margin + contentWidth, footerY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated by Civic Voices  ·  ${dateStr}`, margin, footerY + 12)

  // ── Save ──
  const slug = data.subcategory.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const dateSlug = new Date().toISOString().slice(0, 10)
  doc.save(`${slug}-briefing-${dateSlug}.pdf`)
}
