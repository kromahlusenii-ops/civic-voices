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
    // Prepare posts summary for context - use full text for richer analysis
    // Include post IDs so AI can reference them for topic association
    const postsContext = posts.slice(0, 80).map((post, i) => {
      return `[${i + 1}] (id: ${post.id}) @${post.authorHandle} (${post.platform}): "${post.text}" - ${post.engagement.likes} likes, ${post.engagement.comments} comments`;
    }).join("\n\n");

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

CRITICAL INSTRUCTIONS FOR QUALITY:
1. DO NOT write generic summaries like "users are discussing" or "audience shows mixed reactions"
2. MUST quote or paraphrase SPECIFIC content from the posts and comments above
3. MUST mention specific claims, specific numbers, specific events, or specific phrases from the data
4. DO NOT mention usernames or handles - focus on WHAT is being said, not WHO said it
5. Each postsOverview and commentsOverview should feel like it could ONLY be written about THIS specific dataset

LANGUAGE AWARENESS - AAVE & Slang:
Many posts use AAVE (African American Vernacular English) or internet slang. Interpret these correctly:
- POSITIVE expressions: "fire/🔥" (excellent), "slay/ate that" (did well), "goated/GOAT" (greatest), "bussin" (really good), "hits different" (uniquely great), "valid" (approved), "W" (win), "periodt" (emphatic yes), "snatched" (looks great), "iconic/legend" (praise), "stan" (strong fan), "understood the assignment" (perfect execution)
- NEGATIVE expressions: "mid" (mediocre), "cap" (lying), "L" (loss/failure), "sus" (suspicious), "ratio'd" (publicly corrected/overwhelmed)
- NEUTRAL modifiers: "no cap/deadass/fr fr" (emphasis), "lowkey/highkey" (degree), "bet" (agreement), "it's giving..." (resembles)
When analyzing sentiment, understand the ACTUAL meaning behind slang expressions rather than taking them literally

For topicAnalysis, provide SPECIFIC analysis for each keyTheme:
- postsOverview: Summarize the ACTUAL arguments, claims, or perspectives from posts about this topic. Quote specific phrases (e.g., "one user says...") and reference concrete examples. Use **bold** for 2-3 key insights. NEVER use generic phrases like "content related to" or "users discuss" - cite real data.
- commentsOverview: Describe SPECIFIC reactions from comments - what exactly are people saying? Quote memorable replies (e.g., "replies include..."). What questions are they asking? What are they agreeing/disagreeing with? Use **bold** for key reactions. If no comments available, write "No comment data available for this topic."
- postIds: Array of 4 post IDs from the posts above that are most relevant to this topic.

IMPORTANT: Every postsOverview and commentsOverview MUST include at least one specific quote or paraphrase from the actual data. Generic summaries will be rejected.

BAD example (too generic): "**Users discuss** the topic with varying opinions and **engagement patterns** show interest"
GOOD example (specific): "**Claims of a 40% price drop** by Q2 sparked debate, while **critics point to** the failed 2023 predictions as evidence of overconfidence"

For suggestedQueries, generate 4-5 refined Boolean search queries based on themes you ACTUALLY found in the data:
- Use AND to add required context: "${query} AND policy"
- Use OR with parentheses for alternatives: "${query} AND (support OR opposition)"

For intentionsBreakdown, analyze the primary purpose/intention of each post:
- Inform: Sharing news, facts, data, or educational content
- Persuade: Advocating positions, promoting products/ideas, calls to action
- Entertain: Humor, memes, creative content, storytelling
- Express: Personal opinions, emotional responses, questions, discussion

For scope, determine the geographic/political scope of the conversation:
- "local": Posts about specific cities, towns, neighborhoods, local businesses, local elections, local events
- "national": Posts about federal policy, national politics, nationwide trends, presidential/congressional topics
- "international": Posts about global issues, foreign countries, international relations
- "mixed": Posts spanning multiple scope levels
Include 1-3 indicators explaining WHY you chose this scope (e.g., "mentions Austin city council", "discusses federal tax policy")
IMPORTANT: If scope is "local", you MUST include the "location" object with city and/or state. Extract the specific location mentioned in the posts.

Provide a JSON response with the following structure:
{
  "interpretation": "A 2-3 sentence analysis that summarizes the ACTUAL CONTENT of the posts. DO NOT say 'Found X posts' or mention numbers. DO NOT use generic phrases like 'conversation spans multiple platforms'. Instead, describe WHAT people are saying - the key claims, events, opinions, or narratives you found. Example: 'Recent discussions focus on [specific event], with many expressing [specific opinion]. A notable narrative is [specific claim].'",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "sentimentBreakdown": {
    "overall": "positive|negative|neutral|mixed",
    "summary": "Brief explanation with SPECIFIC examples of why sentiment is this way"
  },
  "scope": {
    "type": "local|national|international|mixed",
    "indicators": ["specific reason 1", "specific reason 2"],
    "location": {"city": "Austin", "state": "Texas"}
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
      "postsOverview": "**A viral claim** about X sparked debate, with **multiple posts** sharing data showing Y. The most engaged content argues that...",
      "commentsOverview": "**Replies challenge** the claim with questions like 'what about Z?' while **supporters cite** specific examples. One popular response pushes back on...",
      "postIds": ["post-id-1", "post-id-2", "post-id-3", "post-id-4"]
    }
  ],
  "suggestedQueries": [
    {"label": "Label based on actual theme found", "description": "Description of what this explores", "query": "${query} AND (relevant terms from data)"}
  ],
  "followUpQuestion": "A specific question based on what you found - e.g., 'Several posts mention [X event] - would you like to see reactions to that specifically?'"
}

Percentages in intentionsBreakdown must sum to 100. engagementRate is average engagement for that intention type (0-10 scale).
For topicAnalysis, create an entry for EACH theme in keyThemes with relevant postIds from the posts list.

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
          max_tokens: 4096,
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

      // Parse the JSON response with error recovery
      const analysis = this.parseJsonResponse(textContent.text);
      if (!analysis) {
        console.error("AI analysis: Failed to parse JSON response");
        return this.getFallbackAnalysis(query, posts);
      }
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
      `**Comments & Replies (${totalComments} total across ${commentsData.length} posts):**`,
    ];

    // Find parent post info for context
    const postsMap = new Map(posts?.map(p => [p.id, p]) || []);

    for (const { parentId, platform, comments } of commentsData) {
      const parentPost = postsMap.get(parentId);
      const parentLabel = parentPost
        ? `"${parentPost.text.slice(0, 80)}..." by @${parentPost.authorHandle}`
        : `Post ${parentId}`;

      lines.push(`\n[${platform.toUpperCase()} - ${parentLabel}]`);

      // Show top 15 comments per post by engagement - full text for better analysis
      const topComments = comments
        .sort((a, b) => (b.engagement.likes || 0) - (a.engagement.likes || 0))
        .slice(0, 15);

      for (const comment of topComments) {
        const likes = comment.engagement.likes || 0;
        lines.push(`  - @${comment.authorHandle}: "${comment.text}" (${likes} likes)`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Parse JSON response with error recovery
   * Handles common issues like markdown code blocks and malformed JSON
   */
  private parseJsonResponse(text: string): AIAnalysis | null {
    let jsonText = text.trim();

    // Extract JSON from markdown code blocks if present
    const jsonBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1].trim();
    }

    // Try to find JSON object boundaries if there's extra text
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
    }

    // Try parsing directly first
    try {
      return JSON.parse(jsonText) as AIAnalysis;
    } catch (firstError) {
      // Log the first error for debugging
      console.warn("AI analysis: First JSON parse attempt failed:", firstError);

      // Try fixing common issues
      try {
        // Remove trailing commas before } or ]
        let fixedJson = jsonText.replace(/,\s*([}\]])/g, '$1');

        // Fix unescaped newlines in strings (common Claude issue)
        // This regex finds strings and escapes literal newlines within them
        fixedJson = fixedJson.replace(/"([^"\\]|\\.)*"/g, (match) => {
          return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        });

        return JSON.parse(fixedJson) as AIAnalysis;
      } catch (secondError) {
        console.error("AI analysis: JSON parse failed after fixes:", secondError);
        console.error("AI analysis: Raw response (first 500 chars):", text.slice(0, 500));
        return null;
      }
    }
  }

  private getFallbackAnalysis(query: string, posts: Post[]): AIAnalysis {
    const hasResults = posts.length > 0;

    let interpretation = "";
    let keyThemes: string[] = [];

    if (hasResults) {
      // Get platform breakdown for context
      const platforms = [...new Set(posts.map(p => p.platform))];
      const platformNames = platforms.map(p =>
        p === "x" ? "X" : p === "tiktok" ? "TikTok" : p.charAt(0).toUpperCase() + p.slice(1)
      );

      // Create a clean, readable summary
      const platformStr = platformNames.length === 1
        ? platformNames[0]
        : platformNames.slice(0, -1).join(", ") + " and " + platformNames.slice(-1);

      interpretation = `Browse the posts on the right to explore discussions about "${query}" from ${platformStr}. Use the suggested searches below to refine your results.`;

      // Use query terms as themes instead of extracting from messy post content
      keyThemes = query.split(/\s+/).filter(w => w.length > 2 && !["and", "the", "for"].includes(w.toLowerCase())).slice(0, 3);
      if (keyThemes.length === 0) keyThemes = [query];
    } else {
      keyThemes = ["no results"];
      interpretation = `No posts found for "${query}". Try broadening your search terms or selecting different platforms.`;
    }

    // Generate fallback topic analysis with actual post samples
    const topicAnalysis = hasResults
      ? keyThemes.map((theme, index) => {
          // Get relevant posts for this theme - sample from different parts of the list
          const startIdx = (index * 4) % posts.length;
          const themePosts = posts.slice(startIdx, startIdx + 4);
          if (themePosts.length < 4) {
            themePosts.push(...posts.slice(0, 4 - themePosts.length));
          }

          // Create overview from actual post content
          const sampleTexts = themePosts
            .slice(0, 2)
            .map(p => `"${p.text.slice(0, 100)}..."`)
            .join(" Another post mentions ");

          return {
            topic: theme,
            postsOverview: `**Posts discuss** ${sampleTexts}. See the mentions below for full context.`,
            commentsOverview: `Comment analysis is processing. Check back soon for audience reactions.`,
            postIds: themePosts.map(p => p.id),
          };
        })
      : undefined;

    return {
      interpretation,
      keyThemes,
      sentimentBreakdown: {
        overall: hasResults ? "mixed" : "neutral",
        summary: hasResults
          ? "See the posts for detailed perspectives."
          : "Unable to determine sentiment without posts.",
      },
      intentionsBreakdown: [
        { name: "Inform", percentage: 30, engagementRate: 2.5 },
        { name: "Persuade", percentage: 25, engagementRate: 3.0 },
        { name: "Entertain", percentage: 20, engagementRate: 4.0 },
        { name: "Express", percentage: 25, engagementRate: 2.0 },
      ],
      topicAnalysis,
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
      followUpQuestion: `Would you like to explore a specific aspect of "${query}", such as recent events or public reactions?`,
    };
  }
}

export default AIAnalysisService;
