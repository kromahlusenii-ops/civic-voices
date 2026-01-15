import type { ValueExplanation } from "@/components/InfoButton";

/**
 * Centralized value explanations for all computed metrics in the app.
 * These provide transparency about what each value means and how it's calculated.
 */

export const VALUE_EXPLANATIONS: Record<string, ValueExplanation> = {
  // ============ Engagement Metrics ============
  totalEngagement: {
    label: "Est. Engagements",
    shortDescription: "Total likes, comments, shares, and interactions",
    fullDescription:
      "This is the sum of all user interactions with posts matching your search query. It includes likes, comments, shares, retweets, quotes, and other platform-specific engagement actions. This metric helps gauge how much attention and interaction a topic is generating.",
    calculation:
      "Sum of (likes + comments + shares + retweets + quotes) across all posts",
    limitations: [
      "Some platforms may not expose all engagement types via their APIs",
      "Engagement counts may be delayed by up to several hours",
      "Does not include private interactions or DMs",
    ],
    learnMoreLink: "/methodology#engagement",
  },

  engagementRate: {
    label: "Engagement Rate",
    shortDescription: "Percentage of viewers who engaged with content",
    fullDescription:
      "The engagement rate measures how effectively content converts views into interactions. A higher rate suggests more compelling or controversial content that prompts users to engage rather than scroll past.",
    calculation: "(Total Engagements / Total Views) × 100",
    limitations: [
      "Views are estimated when platforms don't provide exact counts",
      "Rate can be inflated for viral content with many reshares",
      "Doesn't distinguish between positive and negative engagement",
    ],
    learnMoreLink: "/methodology#engagement-rate",
  },

  totalViews: {
    label: "Est. Views",
    shortDescription: "Estimated total content views across platforms",
    fullDescription:
      "This represents the estimated number of times posts were viewed. When platforms don't provide view counts, we estimate using engagement-to-view ratios typical for each platform.",
    calculation:
      "Direct view counts when available, otherwise: Engagements × Platform-specific multiplier (typically 10-20x)",
    limitations: [
      "X/Twitter and some platforms don't expose view counts via API",
      "Estimates are based on industry averages and may vary",
      "Doesn't count unique viewers (same user may view multiple times)",
    ],
    learnMoreLink: "/methodology#views",
  },

  potentialReach: {
    label: "Potential Reach",
    shortDescription: "Estimated unique users who could see this content",
    fullDescription:
      "Potential reach estimates how many unique users could have been exposed to content about this topic. This includes followers of accounts that posted, plus potential exposure from shares and algorithmic distribution.",
    calculation:
      "Sum of (poster follower counts) + Estimated share amplification (typically 1.5-3x)",
    limitations: [
      "Not all followers see every post (algorithmic filtering)",
      "Overlap between audiences is not fully accounted for",
      "Actual reach is typically 10-30% of potential reach",
    ],
    learnMoreLink: "/methodology#reach",
  },

  totalMentions: {
    label: "Est. Mentions",
    shortDescription: "Total posts and mentions found",
    fullDescription:
      "The number of unique posts, comments, and mentions matching your search query across all selected platforms. This indicates how much the topic is being discussed.",
    calculation: "Count of unique posts matching search criteria",
    limitations: [
      "API rate limits may prevent capturing all mentions",
      "Some posts may be private or deleted before capture",
      "Duplicate content (reposts) may be counted separately",
    ],
    learnMoreLink: "/methodology#mentions",
  },

  // ============ Sentiment Analysis ============
  sentiment: {
    label: "Sentiment",
    shortDescription: "Overall emotional tone of the conversation",
    fullDescription:
      "Sentiment analysis uses AI to classify posts as positive, negative, neutral, or mixed based on the language and context. This helps you understand the general attitude toward your topic.",
    calculation:
      "AI model analyzes text content and assigns sentiment scores. Overall sentiment is the predominant category.",
    limitations: [
      "Sarcasm and irony may be misclassified",
      "Cultural and contextual nuances may affect accuracy",
      "Accuracy is approximately 85-90% on average",
      "Mixed sentiment may indicate polarized discussion",
    ],
    learnMoreLink: "/methodology#sentiment",
  },

  sentimentPositive: {
    label: "Positive Sentiment",
    shortDescription: "Posts expressing approval, support, or enthusiasm",
    fullDescription:
      "Posts classified as positive contain language indicating approval, support, happiness, excitement, or other favorable attitudes toward the topic.",
    calculation: "Count of posts where sentiment score > 0.5 positive threshold",
    limitations: [
      "Marketing/promotional content may skew positive",
      "Sarcastic positivity may be miscounted",
    ],
  },

  sentimentNegative: {
    label: "Negative Sentiment",
    shortDescription: "Posts expressing criticism, concern, or disapproval",
    fullDescription:
      "Posts classified as negative contain language indicating criticism, concern, anger, disappointment, or other unfavorable attitudes toward the topic.",
    calculation: "Count of posts where sentiment score > 0.5 negative threshold",
    limitations: [
      "Constructive criticism may be classified as negative",
      "News reporting of negative events may inflate this count",
    ],
  },

  sentimentNeutral: {
    label: "Neutral Sentiment",
    shortDescription: "Posts that are informational or balanced",
    fullDescription:
      "Posts classified as neutral contain primarily factual information without strong emotional language. This includes news reporting, questions, and balanced discussions.",
    calculation:
      "Count of posts where neither positive nor negative exceeds threshold",
    limitations: [
      "Subtle sentiment may be missed",
      "Balanced posts discussing both sides appear neutral",
    ],
  },

  // ============ Platform-Specific ============
  platformBreakdown: {
    label: "Platform Breakdown",
    shortDescription: "Distribution of posts across social media platforms",
    fullDescription:
      "Shows how discussion of your topic is distributed across different social media platforms. This helps identify where conversations are most active and where your audience engages.",
    calculation: "Count of posts per platform / Total posts × 100",
    limitations: [
      "API access varies by platform (some have stricter limits)",
      "Sample may not represent full platform activity",
      "Some platforms may have delayed data",
    ],
    learnMoreLink: "/methodology#platforms",
  },

  // ============ Source Credibility ============
  sourceCredibility: {
    label: "Source Credibility",
    shortDescription: "Reliability score based on account characteristics",
    fullDescription:
      "Source credibility scores evaluate the reliability of accounts posting about your topic. Factors include account age, verification status, follower-to-following ratio, and historical posting patterns.",
    calculation:
      "Weighted average of: Account age (20%), Verification (30%), Engagement ratio (25%), Consistency (25%)",
    limitations: [
      "New but legitimate accounts may score lower",
      "Purchased followers can inflate scores",
      "Does not verify factual accuracy of content",
    ],
    learnMoreLink: "/methodology#credibility",
  },

  // ============ AI Analysis ============
  aiInsights: {
    label: "AI Insights",
    shortDescription: "AI-generated analysis of trends and themes",
    fullDescription:
      "Our AI analyzes the collected posts to identify key themes, emerging trends, and notable patterns in the conversation. This provides a high-level summary to help you quickly understand what's being discussed.",
    calculation:
      "Claude AI processes post content, engagement patterns, and temporal data to generate insights",
    limitations: [
      "AI may miss niche or highly technical discussions",
      "Analysis is based on sampled posts, not all content",
      "Insights reflect data at time of generation",
    ],
    learnMoreLink: "/methodology#ai-analysis",
  },

  keyThemes: {
    label: "Key Themes",
    shortDescription: "Main topics being discussed",
    fullDescription:
      "Key themes are the most prominent topics and subjects being discussed in relation to your search query. These are extracted using AI analysis of post content.",
    limitations: [
      "Themes from small samples may not be representative",
      "Emerging themes may take time to surface",
    ],
  },

  suggestedQueries: {
    label: "Suggested Queries",
    shortDescription: "Related searches to explore",
    fullDescription:
      "Based on the content found, our AI suggests related search queries that might help you explore different aspects of your topic or discover adjacent conversations.",
    limitations: [
      "Suggestions are based on current sample",
      "May not cover all relevant angles",
    ],
  },
};

/**
 * Get explanation by key, with fallback
 */
export function getExplanation(key: string): ValueExplanation {
  return (
    VALUE_EXPLANATIONS[key] || {
      label: key,
      shortDescription: "No description available",
      fullDescription: "Detailed information for this metric is not yet available.",
    }
  );
}
