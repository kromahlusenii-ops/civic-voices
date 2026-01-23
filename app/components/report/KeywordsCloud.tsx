"use client";

import { useMemo, useState } from "react";
import type { Post } from "@/lib/types/api";

interface KeywordsCloudProps {
  posts: Post[];
  keyThemes?: string[];
  maxKeywords?: number;
}

interface KeywordData {
  word: string;
  count: number;
  isTheme: boolean;
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "through", "during", "before", "after",
  "above", "below", "between", "under", "again", "further", "then", "once",
  "here", "there", "when", "where", "why", "how", "all", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "can", "will", "just", "should", "now", "also",
  "been", "being", "have", "has", "had", "do", "does", "did", "doing", "would",
  "could", "might", "must", "shall", "this", "that", "these", "those", "am", "is",
  "are", "was", "were", "be", "it", "its", "he", "she", "they", "them", "his",
  "her", "their", "what", "which", "who", "whom", "if", "as", "because", "until",
  "while", "although", "though", "since", "unless", "like", "get", "got", "getting",
  "going", "go", "went", "come", "came", "make", "made", "take", "took", "know",
  "think", "see", "want", "way", "well", "back", "even", "new", "first", "last",
  "long", "great", "little", "still", "much", "may", "say", "said", "says",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "people", "time", "year", "years", "day", "days", "thing", "things", "really",
  "actually", "basically", "literally", "definitely", "probably", "maybe",
  "something", "anything", "everything", "nothing", "someone", "anyone", "everyone",
  "im", "ive", "dont", "doesnt", "didnt", "cant", "wont", "youre", "theyre",
  "hes", "shes", "its", "thats", "whats", "lets", "were", "youve", "theyve",
  "http", "https", "www", "com", "org", "net", "html", "amp",
]);

// Extract keywords from post text
function extractKeywords(posts: Post[], keyThemes: string[], maxKeywords: number): KeywordData[] {
  const wordCounts = new Map<string, number>();
  const themeSet = new Set(keyThemes.map(t => t.toLowerCase()));

  // Process each post
  posts.forEach(post => {
    const text = post.text.toLowerCase();
    // Split by non-word characters and filter
    const words = text.split(/[^a-zA-Z0-9]+/).filter(word => {
      return (
        word.length >= 3 &&
        word.length <= 25 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word) // Filter pure numbers
      );
    });

    // Count word occurrences
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  // Convert to array and sort by count
  const keywords: KeywordData[] = Array.from(wordCounts.entries())
    .map(([word, count]) => ({
      word,
      count,
      isTheme: themeSet.has(word) || keyThemes.some(theme =>
        theme.toLowerCase().includes(word) || word.includes(theme.toLowerCase())
      ),
    }))
    .filter(k => k.count >= 2) // Minimum 2 occurrences
    .sort((a, b) => {
      // Prioritize themes, then by count
      if (a.isTheme !== b.isTheme) return a.isTheme ? -1 : 1;
      return b.count - a.count;
    })
    .slice(0, maxKeywords);

  return keywords;
}

// Calculate font size based on count
function getFontSize(count: number, maxCount: number, minCount: number): number {
  if (maxCount === minCount) return 16;
  const normalized = (count - minCount) / (maxCount - minCount);
  // Scale from 12px to 32px
  return Math.round(12 + normalized * 20);
}

// Get color based on whether it's a theme
function getKeywordColor(isTheme: boolean, index: number): string {
  if (isTheme) {
    return "text-blue-600 bg-blue-50 border-blue-200";
  }
  const colors = [
    "text-gray-700 bg-gray-50 border-gray-200",
    "text-slate-700 bg-slate-50 border-slate-200",
    "text-zinc-700 bg-zinc-50 border-zinc-200",
  ];
  return colors[index % colors.length];
}

export default function KeywordsCloud({
  posts,
  keyThemes = [],
  maxKeywords = 30,
}: KeywordsCloudProps) {
  const [showAll, setShowAll] = useState(false);

  const keywords = useMemo(
    () => extractKeywords(posts, keyThemes, maxKeywords),
    [posts, keyThemes, maxKeywords]
  );

  const displayKeywords = showAll ? keywords : keywords.slice(0, 20);

  const maxCount = Math.max(...keywords.map(k => k.count), 1);
  const minCount = Math.min(...keywords.map(k => k.count), 1);

  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Keywords</h3>
        <p className="text-sm text-gray-500 text-center py-8">
          No keywords data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="text-sm font-semibold text-gray-800">Keywords</h3>
            <span className="ml-2 text-xs text-gray-400">
              ({keywords.length} found)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              AI Theme
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              Frequent
            </span>
          </div>
        </div>
      </div>

      {/* Keywords Cloud */}
      <div className="p-5">
        <div className="flex flex-wrap gap-2 justify-center">
          {displayKeywords.map((keyword, index) => {
            const fontSize = getFontSize(keyword.count, maxCount, minCount);
            const colorClass = getKeywordColor(keyword.isTheme, index);

            return (
              <span
                key={keyword.word}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-full border
                  transition-all duration-200 hover:scale-105 cursor-default
                  ${colorClass}
                `}
                style={{ fontSize: `${fontSize}px` }}
                title={`${keyword.count} mentions${keyword.isTheme ? " (AI Theme)" : ""}`}
              >
                {keyword.word}
                {keyword.isTheme && (
                  <svg
                    className="ml-1.5 w-3 h-3 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
            );
          })}
        </div>

        {/* Show more button */}
        {keywords.length > 20 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showAll ? "Show less" : `Show ${keywords.length - 20} more`}
            </button>
          </div>
        )}
      </div>

      {/* Top Keywords List */}
      <div className="px-5 pb-5">
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">
            Top 10 Keywords by Frequency
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {keywords.slice(0, 10).map((keyword, index) => (
              <div
                key={keyword.word}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-400">
                    {index + 1}.
                  </span>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {keyword.word}
                  </span>
                </div>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {keyword.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
