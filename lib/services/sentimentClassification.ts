/**
 * Sentiment Classification Service
 *
 * Uses Claude Haiku to classify sentiment of social media posts in batches.
 * Optimized for speed and cost-effectiveness.
 */

import { anthropicFetch } from "./anthropicClient";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type Sentiment = "positive" | "negative" | "neutral";

export interface SentimentResult {
  postId: string;
  sentiment: Sentiment;
}

interface PostInput {
  id: string;
  text: string;
}

interface ClaudeResponse {
  content: Array<{ type: "text"; text: string }>;
  stop_reason: string;
}

export class SentimentClassificationService {
  private apiKey: string;
  private batchSize: number;
  private maxConcurrent: number;

  constructor(
    apiKey: string,
    options: { batchSize?: number; maxConcurrent?: number } = {}
  ) {
    if (!apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.apiKey = apiKey;
    this.batchSize = options.batchSize || 10;
    this.maxConcurrent = options.maxConcurrent || 3;
  }

  /**
   * Classify sentiment for a batch of posts (single API call)
   */
  async classifyBatch(posts: PostInput[]): Promise<SentimentResult[]> {
    if (posts.length === 0) return [];

    // Create prompt with numbered posts
    const postsText = posts
      .map((post, i) => `[${i + 1}] "${post.text.slice(0, 300)}"`)
      .join("\n\n");

    const prompt = `Classify the sentiment of each social media post as "positive", "negative", or "neutral".

Guidelines:
- "positive": Expresses optimism, happiness, support, praise, enthusiasm
- "negative": Expresses criticism, anger, disappointment, concern, fear
- "neutral": Factual, informational, balanced, or ambiguous

Posts to classify:
${postsText}

Respond with ONLY a JSON array in this exact format (no other text):
[{"id": "1", "sentiment": "positive"}, {"id": "2", "sentiment": "neutral"}]

Use the number from the brackets as the id. Classify ALL ${posts.length} posts.`;

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
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude API error:", response.status, errorText);
        // Return neutral for all posts on error
        return posts.map((post) => ({
          postId: post.id,
          sentiment: "neutral" as Sentiment,
        }));
      }

      const data: ClaudeResponse = await response.json();
      const textContent = data.content.find((c) => c.type === "text");

      if (!textContent) {
        return posts.map((post) => ({
          postId: post.id,
          sentiment: "neutral" as Sentiment,
        }));
      }

      // Parse the JSON response
      const results = JSON.parse(textContent.text) as Array<{
        id: string;
        sentiment: string;
      }>;

      // Map results back to original post IDs
      return results.map((result, index) => ({
        postId: posts[index]?.id || result.id,
        sentiment: this.validateSentiment(result.sentiment),
      }));
    } catch (error) {
      console.error("Sentiment classification error:", error);
      // Return neutral for all posts on error
      return posts.map((post) => ({
        postId: post.id,
        sentiment: "neutral" as Sentiment,
      }));
    }
  }

  /**
   * Classify sentiment for all posts, processing in parallel batches
   */
  async classifyAll(posts: PostInput[]): Promise<Map<string, Sentiment>> {
    const results = new Map<string, Sentiment>();

    if (posts.length === 0) return results;

    // Split into batches
    const batches: PostInput[][] = [];
    for (let i = 0; i < posts.length; i += this.batchSize) {
      batches.push(posts.slice(i, i + this.batchSize));
    }

    // Process batches with concurrency limit
    const processedResults: SentimentResult[] = [];

    for (let i = 0; i < batches.length; i += this.maxConcurrent) {
      const currentBatches = batches.slice(i, i + this.maxConcurrent);
      const batchPromises = currentBatches.map((batch) =>
        this.classifyBatch(batch)
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((results) => processedResults.push(...results));
    }

    // Build map from results
    processedResults.forEach((result) => {
      results.set(result.postId, result.sentiment);
    });

    return results;
  }

  /**
   * Validate sentiment string and return default if invalid
   */
  private validateSentiment(sentiment: string): Sentiment {
    const normalized = sentiment.toLowerCase().trim();
    if (
      normalized === "positive" ||
      normalized === "negative" ||
      normalized === "neutral"
    ) {
      return normalized;
    }
    return "neutral";
  }

  /**
   * Calculate sentiment breakdown from a map of sentiments
   */
  static calculateBreakdown(sentiments: Map<string, Sentiment>): {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  } {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    sentiments.forEach((sentiment) => {
      switch (sentiment) {
        case "positive":
          positive++;
          break;
        case "negative":
          negative++;
          break;
        case "neutral":
          neutral++;
          break;
      }
    });

    return {
      positive,
      negative,
      neutral,
      total: sentiments.size,
    };
  }
}

export default SentimentClassificationService;
