"use client"

import { SUGGESTED_PROMPTS } from "@/lib/types/chat"

interface ChatWelcomeProps {
  query: string
  postCount: number
  onPromptClick: (prompt: string) => void
}

export default function ChatWelcome({
  query,
  postCount,
  onPromptClick,
}: ChatWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Avatar / Icon */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      {/* Welcome text */}
      <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
        Talk to the Audience
      </h3>
      <p className="text-sm text-gray-600 text-center mb-6 max-w-xs">
        I represent{" "}
        <span className="font-medium text-gray-900">
          {postCount.toLocaleString()} voices
        </span>{" "}
        discussing{" "}
        <span className="font-medium text-gray-900">&ldquo;{query}&rdquo;</span>.
        Ask me anything about what we&apos;re saying.
      </p>

      {/* Suggested prompts */}
      <div className="w-full space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 text-center">
          Suggested questions
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => onPromptClick(prompt.prompt)}
              className="px-3 py-2.5 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
            >
              <span className="font-medium">{prompt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
