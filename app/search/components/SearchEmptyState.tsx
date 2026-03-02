"use client"

interface SearchEmptyStateProps {
  query: string
  onBackToDashboard: () => void
}

const SUGGESTIONS = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    text: "Try broader terms",
    detail: "Use general keywords like \"housing\" instead of specific phrases",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    text: "Check spelling",
    detail: "Make sure all words are spelled correctly",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    text: "Use different keywords",
    detail: "Try synonyms or related terms for your topic",
  },
]

export default function SearchEmptyState({ query, onBackToDashboard }: SearchEmptyStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      {/* Empty state icon */}
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "rgba(0,0,0,0.025)" }}
      >
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "rgba(0,0,0,0.3)" }}
        >
          <path
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Heading */}
      <h2
        className="mb-2 text-center text-xl font-semibold"
        style={{ color: "#2C2519", fontFamily: "var(--font-body)" }}
      >
        No results found
      </h2>
      <p
        className="mb-8 max-w-md text-center text-sm"
        style={{ color: "rgba(0,0,0,0.5)" }}
      >
        We couldn&apos;t find any signals for{" "}
        <span
          className="inline-block rounded px-1.5 py-0.5 font-medium"
          style={{
            color: "#2C2519",
            backgroundColor: "rgba(0,0,0,0.04)",
            fontFamily: "var(--font-mono)",
          }}
        >
          &ldquo;{query}&rdquo;
        </span>
      </p>

      {/* Refinement suggestions */}
      <div
        className="mb-8 w-full max-w-sm rounded-xl p-4"
        style={{
          backgroundColor: "rgba(0,0,0,0.025)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <p
          className="mb-3 text-xs font-medium uppercase tracking-wider"
          style={{ color: "rgba(0,0,0,0.4)", fontFamily: "var(--font-mono)" }}
        >
          Suggestions
        </p>
        <ul className="space-y-3">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion.text} className="flex items-start gap-3">
              <span
                className="mt-0.5 shrink-0"
                style={{ color: "rgba(0,0,0,0.35)" }}
              >
                {suggestion.icon}
              </span>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "#2C2519" }}
                >
                  {suggestion.text}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(0,0,0,0.45)" }}
                >
                  {suggestion.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Back to Dashboard button */}
      <button
        type="button"
        onClick={onBackToDashboard}
        className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #D4654A, #D4A24A)" }}
      >
        Back to Dashboard
      </button>
    </div>
  )
}
