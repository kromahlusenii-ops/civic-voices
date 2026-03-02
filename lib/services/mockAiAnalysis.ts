import type { Post, AIAnalysis } from "../types/api"

/**
 * Generate mock AI analysis for development/testing when API keys aren't configured
 */
export function generateMockAIAnalysis(query: string, posts: Post[]): AIAnalysis {
  const postCount = posts.length
  
  // Calculate simple sentiment distribution
  const sentiments = posts.map(p => p.sentiment || "neutral")
  const positive = sentiments.filter(s => s === "positive").length
  const negative = sentiments.filter(s => s === "negative").length
  const neutral = sentiments.filter(s => s === "neutral").length
  
  const majorSentiment = 
    positive > negative && positive > neutral ? "positive" :
    negative > positive && negative > neutral ? "negative" :
    "neutral"
  
  // Extract common words for themes (very basic)
  const allText = posts.map(p => p.text).join(" ").toLowerCase()
  const commonWords = ["affordable", "housing", "rent", "cost", "community", "access", "safety", "quality"]
  const themes = commonWords.filter(word => allText.includes(word))
    .slice(0, 5)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  
  return {
    interpretation: `Analysis of ${postCount} posts about "${query}". The conversation shows ${majorSentiment} sentiment with ${positive} positive, ${negative} negative, and ${neutral} neutral mentions. This is mock AI analysis - configure ANTHROPIC_API_KEY or GOOGLE_GEMINI_API_KEY for real analysis.`,
    keyThemes: themes.length > 0 ? themes : [
      "Community concerns",
      "Access and availability",
      "Cost and affordability"
    ],
    sentimentBreakdown: {
      overall: majorSentiment as "positive" | "negative" | "neutral" | "mixed",
      summary: `${Math.round((positive / postCount) * 100)}% positive, ${Math.round((negative / postCount) * 100)}% negative, ${Math.round((neutral / postCount) * 100)}% neutral`
    },
    suggestedQueries: [
      { query: `${query} solutions`, label: `Proposed solutions for ${query}` },
      { query: `${query} policy`, label: `Policy responses to ${query}` },
      { query: `${query} community impact`, label: `Community impact of ${query}` }
    ],
    followUpQuestion: `What specific aspects of ${query} are most important to your community?`
  }
}
