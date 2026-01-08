import type { Post, AIAnalysis } from "../types/api";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: "text"; text: string }>;
  stop_reason: string;
}

interface FilterContext {
  timeRange?: string;
  language?: string;
  sources?: string[];
}

// Map time range values to human-readable labels
const TIME_RANGE_LABELS: Record<string, string> = {
  "1d": "today",
  "7d": "the last week",
  "3m": "the last 3 months",
  "12m": "the last year",
  today: "today",
  last_week: "the last week",
  last_3_months: "the last 3 months",
  last_year: "the last year",
};

// Map language codes to labels
const LANGUAGE_LABELS: Record<string, string> = {
  all: "all languages",
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  ar: "Arabic",
};

export class AIAnalysisService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.apiKey = apiKey;
  }

  private getFilterContextString(filters?: FilterContext): string {
    if (!filters) return "";

    const parts: string[] = [];

    if (filters.language && filters.language !== "all") {
      parts.push(`${LANGUAGE_LABELS[filters.language] || filters.language}-language`);
    }

    if (filters.sources && filters.sources.length > 0) {
      const sourceLabels = filters.sources.map(s => s === "x" ? "X" : s.charAt(0).toUpperCase() + s.slice(1));
      parts.push(`from ${sourceLabels.join(" and ")}`);
    }

    if (filters.timeRange) {
      parts.push(`over ${TIME_RANGE_LABELS[filters.timeRange] || filters.timeRange}`);
    }

    return parts.length > 0 ? parts.join(" ") : "";
  }

  async generateAnalysis(query: string, posts: Post[], filters?: FilterContext): Promise<AIAnalysis> {
    // Prepare posts summary for context (limit to avoid token limits)
    const postsContext = posts.slice(0, 15).map((post, i) => {
      return `[${i + 1}] @${post.authorHandle} (${post.platform}): "${post.text.slice(0, 200)}..." - ${post.engagement.likes} likes, ${post.engagement.comments} comments`;
    }).join("\n");

    const platformBreakdown = this.getPlatformBreakdown(posts);
    const engagementStats = this.getEngagementStats(posts);
    const filterContext = this.getFilterContextString(filters);

    const prompt = `You are an expert social media analyst. Analyze the following social media posts about "${query}" and provide insights.

**Analysis Focus:** This analysis focuses on ${filterContext ? filterContext + " posts" : "posts from selected platforms"}.

**Posts Found (${posts.length} total):**
${postsContext || "No posts found"}

**Platform Breakdown:**
${platformBreakdown}

**Engagement Stats:**
${engagementStats}

Important: When writing your interpretation, mention the filter context naturally (e.g., "Based on ${filterContext ? filterContext + " posts" : "the selected sources"}...").

For suggestedQueries, generate 4-5 refined Boolean search queries that help users explore specific facets of their topic. Use these patterns:
- Use AND to add required context: "${query} AND policy"
- Use OR with parentheses for alternatives: "${query} AND (support OR opposition)"
- Focus on: emotional angles, behavioral actions, controversies, specific entities, or narrowed scope

Provide a JSON response with the following structure:
{
  "interpretation": "A 2-3 sentence analysis of what people are saying about this topic, including the main perspectives and emotional tone",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "sentimentBreakdown": {
    "overall": "positive|negative|neutral|mixed",
    "summary": "Brief explanation of the overall sentiment"
  },
  "suggestedQueries": [
    {"label": "Emotional reactions", "description": "Explore how people feel about this topic", "query": "${query} AND (hope OR fear OR concern)"},
    {"label": "Policy & regulation", "description": "Find discussions about laws and policies", "query": "${query} AND (policy OR law OR regulation)"},
    {"label": "Controversies", "description": "Discover debates and opposing views", "query": "${query} AND (controversy OR debate OR criticism)"},
    {"label": "Personal impact", "description": "See how this affects individuals", "query": "${query} AND (impact OR affect OR experience)"}
  ],
  "followUpQuestion": "A question to ask the user to help them explore this topic further"
}

Generate contextually relevant suggestedQueries based on the actual topic "${query}" - the examples above are just format guides.

Respond ONLY with valid JSON, no additional text.`;

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }] as ClaudeMessage[],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude API error:", response.status, errorText);
        return this.getFallbackAnalysis(query, posts);
      }

      const data: ClaudeResponse = await response.json();
      const textContent = data.content.find((c) => c.type === "text");

      if (!textContent) {
        return this.getFallbackAnalysis(query, posts);
      }

      // Parse the JSON response
      const analysis = JSON.parse(textContent.text) as AIAnalysis;
      return analysis;
    } catch (error) {
      console.error("AI analysis error:", error);
      return this.getFallbackAnalysis(query, posts);
    }
  }

  private getPlatformBreakdown(posts: Post[]): string {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      counts[post.platform] = (counts[post.platform] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([platform, count]) => `- ${platform}: ${count} posts`)
      .join("\n") || "No posts";
  }

  private getEngagementStats(posts: Post[]): string {
    if (posts.length === 0) return "No engagement data";

    const totalLikes = posts.reduce((sum, p) => sum + p.engagement.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.engagement.comments, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.engagement.shares, 0);
    const totalViews = posts.reduce((sum, p) => sum + (p.engagement.views || 0), 0);

    return `- Total likes: ${totalLikes.toLocaleString()}
- Total comments: ${totalComments.toLocaleString()}
- Total shares: ${totalShares.toLocaleString()}
- Total views: ${totalViews.toLocaleString()}`;
  }

  private getFallbackAnalysis(query: string, posts: Post[]): AIAnalysis {
    const hasPositive = posts.length > 0;
    return {
      interpretation: posts.length > 0
        ? `Found ${posts.length} posts discussing "${query}". The conversation spans multiple platforms with varying perspectives and engagement levels.`
        : `No posts found for "${query}". Try broadening your search terms or selecting different platforms.`,
      keyThemes: posts.length > 0
        ? [query.split(" ")[0], "social media discourse", "public opinion"]
        : ["no results"],
      sentimentBreakdown: {
        overall: hasPositive ? "mixed" : "neutral",
        summary: hasPositive
          ? "The conversation shows a mix of perspectives from different users."
          : "Unable to determine sentiment without posts.",
      },
      suggestedQueries: [
        {
          label: "Recent news",
          description: "Find the latest news and updates",
          query: `${query} AND (news OR update OR breaking)`,
        },
        {
          label: "Public reactions",
          description: "See how people are responding",
          query: `${query} AND (reaction OR response OR opinion)`,
        },
        {
          label: "Controversies",
          description: "Explore debates and disagreements",
          query: `${query} AND (controversy OR debate OR criticism)`,
        },
        {
          label: "Impact & effects",
          description: "Understand real-world consequences",
          query: `${query} AND (impact OR effect OR consequence)`,
        },
      ],
      followUpQuestion: `Would you like to explore a specific aspect of ${query}, such as recent events or public reactions?`,
    };
  }
}

export default AIAnalysisService;
