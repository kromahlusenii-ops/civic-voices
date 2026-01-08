"use client";

import { useState } from "react";
import type { SuggestedQuery } from "@/lib/types/api";

interface QuerySuggestionsProps {
  suggestions: SuggestedQuery[];
  onQuerySelect: (query: string) => void;
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function QuerySuggestionItem({
  suggestion,
  onQuerySelect,
}: {
  suggestion: SuggestedQuery;
  onQuerySelect: (query: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(suggestion.query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClick = () => {
    onQuerySelect(suggestion.query);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group w-full text-left rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
      data-testid="query-suggestion-item"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900 text-sm">
            {suggestion.label}
          </span>
          <p className="text-xs text-gray-500 mt-0.5">{suggestion.description}</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 transition-colors"
          aria-label={copied ? "Copied!" : "Copy query"}
          data-testid="copy-query-btn"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-green-600" />
          ) : (
            <CopyIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          )}
        </button>
      </div>
      <div className="mt-2">
        <code className="block text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1.5 rounded overflow-x-auto">
          {suggestion.query}
        </code>
      </div>
    </div>
  );
}

export default function QuerySuggestions({
  suggestions,
  onQuerySelect,
}: QuerySuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="query-suggestions">
      {suggestions.map((suggestion, index) => (
        <QuerySuggestionItem
          key={index}
          suggestion={suggestion}
          onQuerySelect={onQuerySelect}
        />
      ))}
    </div>
  );
}
