import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { getReport, getReportForSharing } from "@/lib/services/reportService";
import {
  formatLargeNumber,
  formatDateForPDF,
  calculateTotalViews,
  extractKeywords,
  extractHashtags,
  convertToEmotions,
  calculateResonance,
} from "@/lib/services/pdfService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/report/[id]/pdf/template
 *
 * Internal endpoint that renders the PDF document as HTML.
 * This is called by Playwright to generate the PDF.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const shareToken = new URL(request.url).searchParams.get("token");

    if (!reportId) {
      return new NextResponse("Report ID required", { status: 400 });
    }

    // Validate reportId format (CUID) to prevent enumeration attacks
    const cuidRegex = /^c[a-z0-9]{24,}$/;
    if (!cuidRegex.test(reportId)) {
      return new NextResponse("Invalid report ID format", { status: 400 });
    }

    // Try authenticated access first
    let reportData = null;
    const authHeader = request.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const accessToken = authHeader.split("Bearer ")[1];
      const user = await verifySupabaseToken(accessToken);
      if (user) {
        reportData = await getReport(reportId, user.id);
      }
    }

    // Fall back to shared access ONLY if share token is provided
    if (!reportData && shareToken) {
      reportData = await getReportForSharing(reportId, shareToken);
    }

    // Require either valid auth or valid share token - no anonymous access
    if (!reportData) {
      return new NextResponse("Unauthorized - valid authentication or share token required", { status: 401 });
    }

    // Calculate derived data for PDF
    const totalViews = calculateTotalViews(reportData.posts);
    const keywords = extractKeywords(reportData.posts);
    const hashtags = extractHashtags(reportData.posts);
    const emotions = convertToEmotions(reportData.metrics.sentimentBreakdown);

    // Format dates
    const startDate = formatDateForPDF(reportData.report.createdAt);
    const endDate = reportData.report.completedAt
      ? formatDateForPDF(reportData.report.completedAt)
      : startDate;

    // Platform display names
    const platformNames: Record<string, string> = {
      x: "X",
      tiktok: "TikTok",
      youtube: "YouTube",
      reddit: "Reddit",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      bluesky: "Bluesky",
      truthsocial: "Truth Social",
    };

    const platformsList = reportData.report.sources
      .map((s) => platformNames[s.toLowerCase()] || s)
      .join(", ");

    // Get topic analysis from AI
    const topics = reportData.aiAnalysis?.topicAnalysis || [];

    // Build HTML document
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <title>${reportData.report.query} - Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #1a1a1a;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      width: 1920px;
      height: 1080px;
      padding: 75px;
      position: relative;
      page-break-after: always;
      background: #1a1a1a;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .page-footer {
      position: absolute;
      bottom: 40px;
      left: 75px;
      right: 75px;
      display: flex;
      justify-content: space-between;
      color: #6b7280;
      font-size: 12px;
    }

    .logo {
      position: absolute;
      bottom: 40px;
      right: 75px;
      font-size: 18px;
      font-weight: 600;
      color: #9ca3af;
    }

    /* Title Page */
    .title-page h1 {
      font-size: 72px;
      font-weight: 700;
      margin-top: 125px;
      line-height: 1.1;
    }

    .title-page .platforms {
      font-size: 18px;
      color: #9ca3af;
      margin-top: 40px;
    }

    .title-page .date-range {
      position: absolute;
      bottom: 80px;
      left: 75px;
      font-size: 14px;
      color: #9ca3af;
    }

    /* Overview Page */
    .overview-page h2 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 40px;
    }

    .metrics-row {
      display: flex;
      gap: 40px;
      margin-bottom: 60px;
    }

    .metric-card {
      background: #262626;
      border-radius: 12px;
      padding: 24px 32px;
      min-width: 280px;
    }

    .metric-card .label {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .metric-card .value {
      font-size: 36px;
      font-weight: 700;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .summary-text {
      font-size: 16px;
      color: #e5e7eb;
      line-height: 1.7;
      max-width: 1200px;
    }

    .summary-text code {
      background: #374151;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: inherit;
      color: #60a5fa;
    }

    /* Charts Page */
    .chart-container {
      background: #262626;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 40px;
    }

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .chart-placeholder {
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      font-size: 14px;
    }

    /* Breakdown Page */
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      margin-bottom: 40px;
    }

    .breakdown-card {
      background: #262626;
      border-radius: 12px;
      padding: 24px;
    }

    .breakdown-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .emotion-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .emotion-label {
      width: 80px;
      font-size: 14px;
      color: #9ca3af;
    }

    .emotion-track {
      flex: 1;
      height: 8px;
      background: #374151;
      border-radius: 4px;
      overflow: hidden;
    }

    .emotion-fill {
      height: 100%;
      border-radius: 4px;
    }

    .emotion-value {
      width: 50px;
      text-align: right;
      font-size: 14px;
      font-weight: 500;
    }

    /* Word Cloud */
    .word-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .word-cloud span {
      color: #d1d5db;
    }

    /* Topic Page */
    .topic-page h2 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 40px;
    }

    .topic-metrics {
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    }

    .sentiment-bar-container {
      margin-bottom: 40px;
    }

    .sentiment-bar {
      height: 16px;
      background: #374151;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      margin-bottom: 12px;
    }

    .sentiment-positive {
      background: #22c55e;
    }

    .sentiment-neutral {
      background: #6b7280;
    }

    .sentiment-negative {
      background: #ef4444;
    }

    .sentiment-legend {
      display: flex;
      gap: 24px;
      font-size: 14px;
    }

    .sentiment-legend span {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sentiment-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .topic-overview {
      font-size: 16px;
      color: #e5e7eb;
      line-height: 1.7;
      max-width: 1200px;
    }

    .resonance-high { color: #22c55e; }
    .resonance-medium { color: #eab308; }
    .resonance-low { color: #6b7280; }
  </style>
</head>
<body>
  <!-- Page 1: Title -->
  <div class="page title-page">
    <h1>${escapeHtml(reportData.report.query)}</h1>
    <p class="platforms">${platformsList} Report</p>
    <p class="date-range">Date range: ${startDate} - ${endDate}</p>
    <div class="logo">Civic Voices</div>
  </div>

  <!-- Page 2: Overview -->
  <div class="page overview-page">
    <h2>${escapeHtml(reportData.report.query)}</h2>

    <div class="metrics-row">
      <div class="metric-card">
        <div class="label">Estimated engagements</div>
        <div class="value">${formatLargeNumber(reportData.metrics.totalEngagement)}</div>
      </div>
      <div class="metric-card">
        <div class="label">Engagement rate</div>
        <div class="value">${totalViews > 0 ? ((reportData.metrics.totalEngagement / totalViews) * 100).toFixed(2) : reportData.metrics.totalMentions > 0 ? ((reportData.metrics.avgEngagement / reportData.metrics.totalMentions) * 100).toFixed(2) : "0"}%</div>
      </div>
      <div class="metric-card">
        <div class="label">Estimated views</div>
        <div class="value">${formatLargeNumber(totalViews)}</div>
      </div>
      <div class="metric-card">
        <div class="label">Estimated mentions</div>
        <div class="value">${formatLargeNumber(reportData.metrics.totalMentions)}</div>
      </div>
    </div>

    <h3 class="section-title">Overview</h3>
    <p class="summary-text">
      ${reportData.aiAnalysis?.interpretation
        ? formatAISummary(reportData.aiAnalysis.interpretation)
        : "Analysis pending. Generate insights to see AI-powered summary."}
    </p>

    <div class="page-footer">
      <span>${escapeHtml(reportData.report.query)}</span>
      <span>${startDate} - ${endDate}</span>
    </div>
  </div>

  <!-- Page 3: Activity Charts -->
  <div class="page">
    <div class="chart-container">
      <h3 class="chart-title">Activity over time</h3>
      <div class="chart-placeholder">
        ${renderActivityChart(reportData.activityOverTime)}
      </div>
      <div style="display: flex; gap: 24px; margin-top: 16px; font-size: 14px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 16px; height: 3px; background: #3b82f6; border-radius: 2px;"></span>
          Views
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 16px; height: 3px; background: #f97316; border-radius: 2px;"></span>
          Mentions
        </span>
      </div>
    </div>

    <div class="chart-container">
      <h3 class="chart-title">Sentiment over time</h3>
      <div class="chart-placeholder">
        ${renderSentimentChart(reportData)}
      </div>
      <div style="display: flex; gap: 24px; margin-top: 16px; font-size: 14px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 10px; height: 10px; background: #22c55e; border-radius: 50%;"></span>
          Positive
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></span>
          Negative
        </span>
      </div>
    </div>

    <div class="page-footer">
      <span>${escapeHtml(reportData.report.query)}</span>
      <span>${startDate} - ${endDate}</span>
    </div>
  </div>

  <!-- Page 4: Breakdown -->
  <div class="page">
    <div class="breakdown-grid">
      <div class="breakdown-card">
        <h3>Emotions Breakdown</h3>
        ${emotions
          .map(
            (e) => `
          <div class="emotion-bar">
            <span class="emotion-label">${e.emotion}</span>
            <div class="emotion-track">
              <div class="emotion-fill" style="width: ${e.percentage}%; background: ${getEmotionColor(e.emotion)};"></div>
            </div>
            <span class="emotion-value">${e.percentage}%</span>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="breakdown-card">
        <h3>Platform distribution</h3>
        ${Object.entries(reportData.metrics.platformBreakdown)
          .sort((a, b) => b[1] - a[1])
          .map(([platform, count]) => {
            const total = reportData.metrics.totalMentions;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
            <div class="emotion-bar">
              <span class="emotion-label">${platformNames[platform] || platform}</span>
              <div class="emotion-track">
                <div class="emotion-fill" style="width: ${pct}%; background: ${getPlatformColor(platform)};"></div>
              </div>
              <span class="emotion-value">${pct}%</span>
            </div>
          `;
          })
          .join("")}
      </div>

      <div class="breakdown-card">
        <h3>Sentiment distribution</h3>
        ${(() => {
          const total =
            reportData.metrics.sentimentBreakdown.positive +
            reportData.metrics.sentimentBreakdown.negative +
            reportData.metrics.sentimentBreakdown.neutral;
          const pos = total > 0 ? Math.round((reportData.metrics.sentimentBreakdown.positive / total) * 100) : 0;
          const neg = total > 0 ? Math.round((reportData.metrics.sentimentBreakdown.negative / total) * 100) : 0;
          const neu = total > 0 ? Math.round((reportData.metrics.sentimentBreakdown.neutral / total) * 100) : 0;
          return `
            <div class="emotion-bar">
              <span class="emotion-label">positive</span>
              <div class="emotion-track">
                <div class="emotion-fill" style="width: ${pos}%; background: #22c55e;"></div>
              </div>
              <span class="emotion-value">${pos}%</span>
            </div>
            <div class="emotion-bar">
              <span class="emotion-label">neutral</span>
              <div class="emotion-track">
                <div class="emotion-fill" style="width: ${neu}%; background: #6b7280;"></div>
              </div>
              <span class="emotion-value">${neu}%</span>
            </div>
            <div class="emotion-bar">
              <span class="emotion-label">negative</span>
              <div class="emotion-track">
                <div class="emotion-fill" style="width: ${neg}%; background: #ef4444;"></div>
              </div>
              <span class="emotion-value">${neg}%</span>
            </div>
          `;
        })()}
      </div>
    </div>

    <div class="breakdown-grid">
      <div class="breakdown-card">
        <h3>Keywords map</h3>
        <div class="word-cloud">
          ${keywords
            .map((k) => {
              const size = Math.min(28, Math.max(12, 12 + k.count * 2));
              return `<span style="font-size: ${size}px; opacity: ${0.5 + (k.count / keywords[0].count) * 0.5}">${escapeHtml(k.text)}</span>`;
            })
            .join(" ")}
        </div>
      </div>

      <div class="breakdown-card">
        <h3>Hashtags map</h3>
        <div class="word-cloud">
          ${hashtags
            .map((h) => {
              const size = Math.min(28, Math.max(12, 12 + h.count * 2));
              return `<span style="font-size: ${size}px; opacity: ${0.5 + (h.count / (hashtags[0]?.count || 1)) * 0.5}">${escapeHtml(h.text)}</span>`;
            })
            .join(" ") || '<span style="color: #6b7280;">No hashtags found</span>'}
        </div>
      </div>

      <div class="breakdown-card">
        <h3>Key themes</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${(reportData.aiAnalysis?.keyThemes || [])
            .slice(0, 6)
            .map(
              (theme) => `
            <div style="background: #374151; padding: 8px 12px; border-radius: 6px; font-size: 14px;">
              ${escapeHtml(theme)}
            </div>
          `
            )
            .join("") || '<span style="color: #6b7280;">Generate insights to see themes</span>'}
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>${escapeHtml(reportData.report.query)}</span>
      <span>${startDate} - ${endDate}</span>
    </div>
  </div>

  <!-- Topic Pages -->
  ${topics
    .map((topic) => {
      // Calculate topic metrics (simplified)
      const relatedPosts = reportData.posts.filter((p) =>
        topic.postIds.includes(p.id)
      );
      const audienceSize = relatedPosts.reduce(
        (sum, p) => sum + (p.engagement.views || p.engagement.likes * 100),
        0
      );
      const likes = relatedPosts.reduce(
        (sum, p) => sum + p.engagement.likes,
        0
      );
      const comments = relatedPosts.reduce(
        (sum, p) => sum + p.engagement.comments,
        0
      );
      // Use proper resonance calculation: engagement / audience ratio
      const totalEngagement = likes + comments;
      const resonance = calculateResonance(audienceSize, totalEngagement);

      // Calculate sentiment for this topic
      const topicSentiment = relatedPosts.reduce(
        (acc, p) => {
          if (p.sentiment === "positive") acc.positive++;
          else if (p.sentiment === "negative") acc.negative++;
          else acc.neutral++;
          return acc;
        },
        { positive: 0, neutral: 0, negative: 0 }
      );
      const topicTotal =
        topicSentiment.positive + topicSentiment.neutral + topicSentiment.negative;
      const posPct = topicTotal > 0 ? Math.round((topicSentiment.positive / topicTotal) * 100) : 33;
      const neuPct = topicTotal > 0 ? Math.round((topicSentiment.neutral / topicTotal) * 100) : 34;
      const negPct = topicTotal > 0 ? Math.round((topicSentiment.negative / topicTotal) * 100) : 33;

      return `
      <div class="page topic-page">
        <h2>${escapeHtml(topic.topic)}</h2>

        <div class="topic-metrics">
          <div class="metric-card">
            <div class="label">Audience size</div>
            <div class="value">${formatLargeNumber(audienceSize)}</div>
          </div>
          <div class="metric-card">
            <div class="label">Estimated likes</div>
            <div class="value">${formatLargeNumber(likes)}</div>
          </div>
          <div class="metric-card">
            <div class="label">Resonance</div>
            <div class="value resonance-${resonance.toLowerCase()}">${resonance}</div>
          </div>
        </div>

        <div class="sentiment-bar-container">
          <h3 class="section-title">Sentiment</h3>
          <div class="sentiment-bar">
            <div class="sentiment-positive" style="width: ${posPct}%"></div>
            <div class="sentiment-neutral" style="width: ${neuPct}%"></div>
            <div class="sentiment-negative" style="width: ${negPct}%"></div>
          </div>
          <div class="sentiment-legend">
            <span><span class="sentiment-dot" style="background: #22c55e;"></span> Positive ${posPct}%</span>
            <span><span class="sentiment-dot" style="background: #6b7280;"></span> Neutral ${neuPct}%</span>
            <span><span class="sentiment-dot" style="background: #ef4444;"></span> Negative ${negPct}%</span>
          </div>
        </div>

        <h3 class="section-title">Topic overview</h3>
        <p class="topic-overview">
          ${formatAISummary(topic.postsOverview)}
          ${topic.commentsOverview ? `<br><br>${formatAISummary(topic.commentsOverview)}` : ""}
        </p>

        <div class="page-footer">
          <span>${escapeHtml(reportData.report.query)}</span>
          <span>${startDate} - ${endDate}</span>
        </div>
      </div>
    `;
    })
    .join("")}

</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error rendering PDF template:", error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

// Helper functions

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAISummary(text: string): string {
  // Convert **bold** to <code> tags for highlighting
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<code>$1</code>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    joy: "#22c55e",
    neutral: "#6b7280",
    surprise: "#f59e0b",
    anger: "#ef4444",
    sadness: "#3b82f6",
    fear: "#8b5cf6",
    disgust: "#ec4899",
  };
  return colors[emotion] || "#6b7280";
}

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    x: "#1DA1F2",
    tiktok: "#ff0050",
    youtube: "#FF0000",
    reddit: "#FF4500",
    instagram: "#E4405F",
    linkedin: "#0A66C2",
    bluesky: "#0085FF",
    truthsocial: "#5448EE",
  };
  return colors[platform] || "#6b7280";
}

function renderActivityChart(
  activityData: Array<{ date: string; count: number; engagement: number }>
): string {
  if (activityData.length === 0) {
    return '<span style="color: #6b7280;">No activity data available</span>';
  }

  // Simple SVG line chart
  const width = 1700;
  const height = 280;
  const padding = 40;

  const maxCount = Math.max(...activityData.map((d) => d.count), 1);
  const maxEngagement = Math.max(...activityData.map((d) => d.engagement), 1);

  const xScale = (i: number) =>
    padding + (i / (activityData.length - 1 || 1)) * (width - 2 * padding);
  const yScaleCount = (v: number) =>
    height - padding - (v / maxCount) * (height - 2 * padding);
  const yScaleEngagement = (v: number) =>
    height - padding - (v / maxEngagement) * (height - 2 * padding);

  const countPath = activityData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScaleCount(d.count)}`)
    .join(" ");

  const engagementPath = activityData
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScaleEngagement(d.engagement)}`
    )
    .join(" ");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Grid lines -->
      ${[0, 0.25, 0.5, 0.75, 1]
        .map(
          (pct) => `
        <line x1="${padding}" y1="${padding + pct * (height - 2 * padding)}"
              x2="${width - padding}" y2="${padding + pct * (height - 2 * padding)}"
              stroke="#374151" stroke-width="1" />
      `
        )
        .join("")}

      <!-- Engagement line (orange) -->
      <path d="${engagementPath}" fill="none" stroke="#f97316" stroke-width="2" />

      <!-- Count line (blue) -->
      <path d="${countPath}" fill="none" stroke="#3b82f6" stroke-width="2" />

      <!-- X-axis labels -->
      ${activityData
        .filter((_, i) => i % Math.ceil(activityData.length / 8) === 0)
        .map((d) => {
          const x = xScale(activityData.indexOf(d));
          const label = new Date(d.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return `<text x="${x}" y="${height - 10}" fill="#9ca3af" font-size="11" text-anchor="middle">${label}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderSentimentChart(
  reportData: Awaited<ReturnType<typeof getReport>>
): string {
  if (!reportData || reportData.activityOverTime.length === 0) {
    return '<span style="color: #6b7280;">No sentiment data available</span>';
  }

  // Group posts by date and sentiment
  const datesSentiment = new Map<
    string,
    { positive: number; negative: number }
  >();

  reportData.posts.forEach((post) => {
    const date = post.createdAt.split("T")[0];
    const current = datesSentiment.get(date) || { positive: 0, negative: 0 };
    if (post.sentiment === "positive") current.positive++;
    else if (post.sentiment === "negative") current.negative++;
    datesSentiment.set(date, current);
  });

  const sortedDates = Array.from(datesSentiment.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (sortedDates.length === 0) {
    return '<span style="color: #6b7280;">No sentiment data available</span>';
  }

  const width = 1700;
  const height = 280;
  const padding = 40;
  const midY = height / 2;

  const maxVal = Math.max(
    ...sortedDates.flatMap(([, d]) => [d.positive, d.negative]),
    1
  );

  const xScale = (i: number) =>
    padding + (i / (sortedDates.length - 1 || 1)) * (width - 2 * padding);
  const yScalePos = (v: number) => midY - (v / maxVal) * (midY - padding);
  const yScaleNeg = (v: number) => midY + (v / maxVal) * (midY - padding);

  // Area paths
  const posPath =
    `M ${xScale(0)} ${midY} ` +
    sortedDates
      .map(([, d], i) => `L ${xScale(i)} ${yScalePos(d.positive)}`)
      .join(" ") +
    ` L ${xScale(sortedDates.length - 1)} ${midY} Z`;

  const negPath =
    `M ${xScale(0)} ${midY} ` +
    sortedDates
      .map(([, d], i) => `L ${xScale(i)} ${yScaleNeg(d.negative)}`)
      .join(" ") +
    ` L ${xScale(sortedDates.length - 1)} ${midY} Z`;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Center line -->
      <line x1="${padding}" y1="${midY}" x2="${width - padding}" y2="${midY}"
            stroke="#374151" stroke-width="1" />

      <!-- Positive area (green) -->
      <path d="${posPath}" fill="#22c55e" fill-opacity="0.3" />
      <path d="${sortedDates.map(([, d], i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScalePos(d.positive)}`).join(" ")}"
            fill="none" stroke="#22c55e" stroke-width="2" />

      <!-- Negative area (red) -->
      <path d="${negPath}" fill="#ef4444" fill-opacity="0.3" />
      <path d="${sortedDates.map(([, d], i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScaleNeg(d.negative)}`).join(" ")}"
            fill="none" stroke="#ef4444" stroke-width="2" />

      <!-- Y-axis labels -->
      <text x="${padding - 10}" y="${padding}" fill="#9ca3af" font-size="11" text-anchor="end">+${maxVal}</text>
      <text x="${padding - 10}" y="${midY + 4}" fill="#9ca3af" font-size="11" text-anchor="end">0</text>
      <text x="${padding - 10}" y="${height - padding}" fill="#9ca3af" font-size="11" text-anchor="end">-${maxVal}</text>
    </svg>
  `;
}
