/**
 * Sentiment Classification Service
 *
 * Uses Anthropic Claude to classify sentiment of social media posts in batches.
 * Optimized for speed and cost-effectiveness.
 */

import { anthropicGenerate } from "./anthropicClient";

export type Sentiment = "positive" | "negative" | "neutral";

export interface SentimentResult {
  postId: string;
  sentiment: Sentiment;
}

interface PostInput {
  id: string;
  text: string;
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

IMPORTANT - Understanding Informal Language & AAVE (African American Vernacular English):
Many social media posts use slang, AAVE, or informal expressions that may SEEM negative but are actually POSITIVE:
- "fire" / "🔥" / "that's fire" = excellent, amazing (POSITIVE)
- "slay" / "slaying" / "ate that" / "ate and left no crumbs" = did extremely well (POSITIVE)
- "goated" / "GOAT" = greatest of all time (POSITIVE)
- "no cap" / "deadass" / "fr fr" = genuine emphasis, "for real" (context-dependent)
- "bussin" / "bussin bussin" = really good, delicious (POSITIVE)
- "hits different" = exceptionally good in a unique way (POSITIVE)
- "valid" / "that's valid" = legitimate, approved, good (POSITIVE)
- "lowkey" / "highkey" = somewhat / very much (modifiers, check context)
- "it's giving..." = it resembles/evokes something (check what follows)
- "periodt" / "period" = emphatic agreement (usually POSITIVE)
- "bet" = agreement, confirmation (POSITIVE/NEUTRAL)
- "mid" = mediocre, average (mildly NEGATIVE)
- "cap" / "that's cap" = lying, false (NEGATIVE about the claim)
- "L" / "took an L" = loss, failure (NEGATIVE)
- "W" / "that's a W" = win, success (POSITIVE)
- "ratio" = when replies/likes exceed original (context-dependent)
- "understood the assignment" = did something perfectly (POSITIVE)
- "main character energy" = confident, standout behavior (usually POSITIVE)
- "rent free" = can't stop thinking about something (context-dependent)
- "vibe" / "vibing" = good feeling, enjoying (POSITIVE)
- "sus" = suspicious (mildly NEGATIVE)
- "snatched" = looking great, well-done (POSITIVE)
- "iconic" / "legend" = praise for excellence (POSITIVE)
- "stan" = strong supporter/fan (POSITIVE)
- "sis" / "bestie" / "queen" / "king" = terms of endearment (POSITIVE context)

When classifying, understand the ACTUAL intent behind slang rather than taking words literally.

Posts to classify:
${postsText}

Respond with ONLY a JSON array in this exact format (no other text):
[{"id": "1", "sentiment": "positive"}, {"id": "2", "sentiment": "neutral"}]

Use the number from the brackets as the id. Classify ALL ${posts.length} posts.`;

    try {
      const result = await anthropicGenerate(
        this.apiKey,
        "claude-sonnet-4-20250514",
        prompt,
        {
          maxTokens: 4096,
          temperature: 0.3,
        }
      );

      if (!result.ok) {
        console.error("Anthropic API error:", result.error);
        // Return neutral for all posts on error
        return posts.map((post) => ({
          postId: post.id,
          sentiment: "neutral" as Sentiment,
        }));
      }

      // Parse the JSON response with error recovery
      const results = this.parseJsonResponse(result.text);
      if (!results) {
        console.error("Sentiment classification: Failed to parse JSON response");
        return posts.map((post) => ({
          postId: post.id,
          sentiment: "neutral" as Sentiment,
        }));
      }

      // Map results back to original post IDs
      return results.map((r, index) => ({
        postId: posts[index]?.id || r.id,
        sentiment: this.validateSentiment(r.sentiment),
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
   * Parse JSON response with error recovery
   */
  private parseJsonResponse(
    text: string
  ): Array<{ id: string; sentiment: string }> | null {
    let jsonText = text.trim();

    // Extract JSON from markdown code blocks if present
    const jsonBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1].trim();
    }

    // Try to find JSON array boundaries
    const jsonStart = jsonText.indexOf("[");
    const jsonEnd = jsonText.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
    }

    // Try parsing directly first
    try {
      return JSON.parse(jsonText);
    } catch (firstError) {
      console.warn("Sentiment: First JSON parse attempt failed:", firstError);

      // Try fixing common issues
      try {
        // Remove trailing commas before ] or }
        let fixedJson = jsonText.replace(/,\s*([}\]])/g, "$1");

        // Fix unescaped quotes in strings
        fixedJson = fixedJson.replace(/"([^"\\]|\\.)*"/g, (match) => {
          return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        });

        return JSON.parse(fixedJson);
      } catch (secondError) {
        console.error("Sentiment: JSON parse failed after fixes:", secondError);
        console.error("Sentiment: Raw response (first 300 chars):", text.slice(0, 300));
        return null;
      }
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
