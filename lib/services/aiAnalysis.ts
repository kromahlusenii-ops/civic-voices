import type { Post, AIAnalysis } from "../types/api";
import { anthropicFetch } from "./anthropicClient";

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

// Comment data for AI analysis
interface PostCommentData {
  parentId: string;
  platform: string;
  comments: Post[];
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

  async generateAnalysis(
    query: string,
    posts: Post[],
    filters?: FilterContext,
    commentsData?: PostCommentData[]
  ): Promise<AIAnalysis> {
    // Prepare posts summary for context (increased limit for richer analysis)
    // Include post IDs so AI can reference them for topic association
    const postsContext = posts.slice(0, 30).map((post, i) => {
      return `[${i + 1}] (id: ${post.id}) @${post.authorHandle} (${post.platform}): "${post.text.slice(0, 150)}..." - ${post.engagement.likes} likes, ${post.engagement.comments} comments`;
    }).join("\n");

    const platformBreakdown = this.getPlatformBreakdown(posts);
    const engagementStats = this.getEngagementStats(posts);
    const filterContext = this.getFilterContextString(filters);
    const commentsContext = this.formatCommentsContext(commentsData, posts);

    const prompt = `You are an expert social media analyst. Analyze the following social media posts about "${query}" and provide insights.

**Analysis Focus:** This analysis focuses on ${filterContext ? filterContext + " posts" : "posts from selected platforms"}.

**Posts Found (${posts.length} total):**
${postsContext || "No posts found"}

**Platform Breakdown:**
${platformBreakdown}

**Engagement Stats:**
${engagementStats}
${commentsContext}
Important: When writing your interpretation, mention the filter context naturally (e.g., "Based on ${filterContext ? filterContext + " posts" : "the selected sources"}..."). If comment data is available, incorporate insights from the comments/replies to understand how people are reacting to the posts.

For suggestedQueries, generate 4-5 refined Boolean search queries that help users explore specific facets of their topic. Use these patterns:
- Use AND to add required context: "${query} AND policy"
- Use OR with parentheses for alternatives: "${query} AND (support OR opposition)"
- Focus on: emotional angles, behavioral actions, controversies, specific entities, or narrowed scope

For intentionsBreakdown, analyze the primary purpose/intention of each post and estimate the distribution:
- Inform: Sharing news, facts, data, or educational content
- Persuade: Advocating positions, promoting products/ideas, calls to action
- Entertain: Humor, memes, creative content, storytelling
- Express: Personal opinions, emotional responses, questions, discussion

For topicAnalysis, provide detailed analysis for each keyTheme you identify:
- postsOverview: A summary of what posts are saying about this topic. Use **bold** to highlight key phrases (2-3 bold terms).
- commentsOverview: A summary of how the audience is engaging/reacting in comments. Use **bold** to highlight key phrases.
- postIds: Array of 4 post IDs from the posts above that are most relevant to this topic.

Provide a JSON response with the following structure:
{
  "interpretation": "A 2-3 sentence analysis of what people are saying about this topic, including the main perspectives and emotional tone",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "sentimentBreakdown": {
    "overall": "positive|negative|neutral|mixed",
    "summary": "Brief explanation of the overall sentiment"
  },
  "intentionsBreakdown": [
    {"name": "Inform", "percentage": 35, "engagementRate": 3.2},
    {"name": "Persuade", "percentage": 25, "engagementRate": 4.1},
    {"name": "Entertain", "percentage": 20, "engagementRate": 5.8},
    {"name": "Express", "percentage": 20, "engagementRate": 2.9}
  ],
  "topicAnalysis": [
    {
      "topic": "theme1",
      "postsOverview": "**Key trend** drives discussion as creators share content about...",
      "commentsOverview": "**Audience reactions** show enthusiasm with many praising...",
      "postIds": ["post-id-1", "post-id-2", "post-id-3", "post-id-4"]
    }
  ],
  "suggestedQueries": [
    {"label": "Emotional reactions", "description": "Explore how people feel about this topic", "query": "${query} AND (hope OR fear OR concern)"},
    {"label": "Policy & regulation", "description": "Find discussions about laws and policies", "query": "${query} AND (policy OR law OR regulation)"},
    {"label": "Controversies", "description": "Discover debates and opposing views", "query": "${query} AND (controversy OR debate OR criticism)"},
    {"label": "Personal impact", "description": "See how this affects individuals", "query": "${query} AND (impact OR affect OR experience)"}
  ],
  "followUpQuestion": "A question to ask the user to help them explore this topic further"
}

Percentages in intentionsBreakdown must sum to 100. engagementRate is the average engagement rate for posts of that intention type (0-10 scale).
Generate contextually relevant suggestedQueries based on the actual topic "${query}" - the examples above are just format guides.
For topicAnalysis, create an entry for EACH theme in keyThemes with relevant postIds from the posts list above.

Respond ONLY with valid JSON, no additional text.`;

    try {
      const response = await anthropicFetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048,
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

  private formatCommentsContext(commentsData?: PostCommentData[], posts?: Post[]): string {
    if (!commentsData || commentsData.length === 0) return "";

    const totalComments = commentsData.reduce((sum, c) => sum + c.comments.length, 0);
    if (totalComments === 0) return "";

    const lines: string[] = [
      "",
      `**Top Comments/Replies (${totalComments} total):**`,
    ];

    // Find parent post info for context
    const postsMap = new Map(posts?.map(p => [p.id, p]) || []);

    for (const { parentId, platform, comments } of commentsData) {
      const parentPost = postsMap.get(parentId);
      const parentLabel = parentPost
        ? `"${parentPost.text.slice(0, 50)}..." by @${parentPost.authorHandle}`
        : `Post ${parentId}`;

      lines.push(`\n[${platform.toUpperCase()} - ${parentLabel}]`);

      // Show top 5 comments per post by engagement
      const topComments = comments
        .sort((a, b) => (b.engagement.likes || 0) - (a.engagement.likes || 0))
        .slice(0, 5);

      for (const comment of topComments) {
        const likes = comment.engagement.likes || 0;
        lines.push(`  - "${comment.text.slice(0, 100)}..." (${likes} likes)`);
      }
    }

    return lines.join("\n");
  }

  private getFallbackAnalysis(query: string, posts: Post[]): AIAnalysis {
    const hasPositive = posts.length > 0;
    const keyThemes = posts.length > 0
      ? [query.split(" ")[0], "social media discourse", "public opinion"]
      : ["no results"];

    // Generate fallback topic analysis with first 4 post IDs per theme
    const topicAnalysis = keyThemes.map((theme) => ({
      topic: theme,
      postsOverview: `**${theme}** is being discussed across multiple platforms with varying perspectives.`,
      commentsOverview: `**Audience engagement** shows mixed reactions with users sharing diverse opinions.`,
      postIds: posts.slice(0, 4).map(p => p.id),
    }));

    return {
      interpretation: posts.length > 0
        ? `Found ${posts.length} posts discussing "${query}". The conversation spans multiple platforms with varying perspectives and engagement levels.`
        : `No posts found for "${query}". Try broadening your search terms or selecting different platforms.`,
      keyThemes,
      sentimentBreakdown: {
        overall: hasPositive ? "mixed" : "neutral",
        summary: hasPositive
          ? "The conversation shows a mix of perspectives from different users."
          : "Unable to determine sentiment without posts.",
      },
      intentionsBreakdown: [
        { name: "Inform", percentage: 30, engagementRate: 2.5 },
        { name: "Persuade", percentage: 25, engagementRate: 3.0 },
        { name: "Entertain", percentage: 20, engagementRate: 4.0 },
        { name: "Express", percentage: 25, engagementRate: 2.0 },
      ],
      topicAnalysis: posts.length > 0 ? topicAnalysis : undefined,
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
