/**
 * PDF Generation Service
 *
 * Generates pixel-perfect PDF reports using Playwright to render
 * an HTML template at 1920x1080 resolution.
 */

import type { ReportData } from "./reportService";

export interface PDFGenerationOptions {
  reportId: string;
  width?: number;
  height?: number;
  darkTheme?: boolean;
}

const DEFAULT_OPTIONS = {
  width: 1920,
  height: 1080,
  darkTheme: true,
};

/**
 * Generate a PDF report from report data
 *
 * This function:
 * 1. Launches a headless browser (Chromium via @sparticuz/chromium for Vercel, or Playwright locally)
 * 2. Navigates to the internal PDF template endpoint
 * 3. Renders the page to PDF at 1920x1080
 * 4. Returns the PDF buffer
 */
export async function generateReportPDF(
  reportId: string,
  accessToken: string,
  options: Partial<PDFGenerationOptions> = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Detect if running on Vercel/serverless
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  let browser;

  if (isServerless) {
    // Use @sparticuz/chromium for Vercel/Lambda (has bundled minimal Chromium)
    const chromium = await import("@sparticuz/chromium").then((m) => m.default);
    const { chromium: playwrightCore } = await import("playwright-core");

    const executablePath = await chromium.executablePath();

    browser = await playwrightCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  } else {
    // Use regular Playwright for local development (uses its own Chromium)
    const { chromium: playwright } = await import("playwright-core");

    // Try to find a local Chromium installation
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS Chrome
      "/Applications/Chromium.app/Contents/MacOS/Chromium", // macOS Chromium
      process.env.CHROME_PATH, // Custom path via env
    ].filter(Boolean);

    let executablePath: string | undefined;
    const fs = await import("fs");
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    if (!executablePath) {
      throw new Error(
        "No Chrome/Chromium found. Install Google Chrome or set CHROME_PATH environment variable."
      );
    }

    browser = await playwright.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  try {
    const context = await browser.newContext({
      viewport: {
        width: opts.width,
        height: opts.height,
      },
      deviceScaleFactor: 2, // High DPI for crisp rendering
      extraHTTPHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const page = await context.newPage();

    // Build template URL - internal endpoint that renders the PDF HTML
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const templateUrl = `${baseUrl}/api/report/${reportId}/pdf/template`;

    // Navigate to template with auth
    await page.goto(templateUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for any charts/images to render
    await page.waitForTimeout(1000);

    // Generate multi-page PDF
    const pdfBuffer = await page.pdf({
      width: `${opts.width}px`,
      height: `${opts.height}px`,
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Generate a slugified filename for the PDF
 */
export function generatePDFFilename(reportData: ReportData): string {
  const topicSlug = reportData.report.query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") // Trim leading/trailing underscores
    .substring(0, 50);

  const startDate = reportData.report.createdAt.split("T")[0];
  const endDate = reportData.report.completedAt?.split("T")[0] || startDate;

  return `${topicSlug}_${startDate}_${endDate}_report.pdf`;
}

/**
 * Format large numbers for display (e.g., 6.77B, 60.18M)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toString();
}

/**
 * Format date for display (e.g., "17 Oct 2025")
 */
export function formatDateForPDF(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculate total views from posts (sum of all view counts)
 */
export function calculateTotalViews(posts: ReportData["posts"]): number {
  return posts.reduce((sum, post) => sum + (post.engagement.views || 0), 0);
}

/**
 * Extract keywords from posts for word cloud
 */
export function extractKeywords(
  posts: ReportData["posts"],
  maxWords: number = 40
): Array<{ text: string; count: number }> {
  const wordCounts = new Map<string, number>();

  // Common stop words to filter out
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "this",
    "that", "these", "those", "it", "its", "i", "you", "he", "she", "we",
    "they", "what", "which", "who", "whom", "when", "where", "why", "how",
    "all", "each", "every", "both", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "just", "also", "now", "here", "there", "then", "once", "if",
    "because", "as", "until", "while", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below",
    "up", "down", "out", "off", "over", "under", "again", "further",
    "rt", "via", "amp", "get", "got", "like", "one", "two", "new", "first",
  ]);

  posts.forEach((post) => {
    // Extract words from text
    const words = post.text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "") // Remove URLs
      .replace(/[^a-z0-9\s]/g, " ") // Remove special chars
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  // Sort by count and take top N
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords)
    .map(([text, count]) => ({ text, count }));
}

/**
 * Extract hashtags from posts for hashtag cloud
 */
export function extractHashtags(
  posts: ReportData["posts"],
  maxTags: number = 30
): Array<{ text: string; count: number }> {
  const tagCounts = new Map<string, number>();

  posts.forEach((post) => {
    const hashtags = post.text.match(/#\w+/g) || [];
    hashtags.forEach((tag) => {
      const normalized = tag.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags)
    .map(([text, count]) => ({ text, count }));
}

/**
 * Convert sentiment breakdown to emotions for PDF display
 * Maps pos/neg/neutral to more granular emotions
 */
export function convertToEmotions(
  sentimentBreakdown: ReportData["metrics"]["sentimentBreakdown"]
): Array<{ emotion: string; percentage: number }> {
  const total =
    sentimentBreakdown.positive +
    sentimentBreakdown.negative +
    sentimentBreakdown.neutral;

  if (total === 0) {
    return [
      { emotion: "neutral", percentage: 100 },
    ];
  }

  // For now, we map sentiment to basic emotions
  // In a real implementation, this would use more granular classification
  const emotions = [];

  if (sentimentBreakdown.positive > 0) {
    emotions.push({
      emotion: "joy",
      percentage: Math.round((sentimentBreakdown.positive / total) * 100),
    });
  }

  if (sentimentBreakdown.neutral > 0) {
    emotions.push({
      emotion: "neutral",
      percentage: Math.round((sentimentBreakdown.neutral / total) * 100),
    });
  }

  if (sentimentBreakdown.negative > 0) {
    // Split negative into anger and sadness
    const negPct = Math.round((sentimentBreakdown.negative / total) * 100);
    emotions.push({ emotion: "anger", percentage: Math.round(negPct * 0.6) });
    emotions.push({ emotion: "sadness", percentage: Math.round(negPct * 0.4) });
  }

  return emotions.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Calculate resonance level based on engagement metrics
 */
export function calculateResonance(
  audienceSize: number,
  engagement: number
): "High" | "Medium" | "Low" {
  if (audienceSize === 0) return "Low";

  const rate = engagement / audienceSize;

  if (rate > 0.1) return "High";
  if (rate > 0.05) return "Medium";
  return "Low";
}
