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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" data-testid="query-suggestions">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {suggestions.length} suggested {suggestions.length === 1 ? 'search' : 'searches'}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-white border-t border-gray-200">
          {suggestions.map((suggestion, index) => (
            <QuerySuggestionItem
              key={index}
              suggestion={suggestion}
              onQuerySelect={onQuerySelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
