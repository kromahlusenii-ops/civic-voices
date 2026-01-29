"use client"

import { SUGGESTED_PROMPTS } from "@/lib/types/chat"

interface ChatWelcomeProps {
  query: string
  postCount: number
  onPromptClick: (prompt: string) => void
}

// Icon components for suggested prompts
function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="2" strokeWidth={1.5} />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function QuotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
      />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  )
}

function getIconComponent(iconName: string | undefined) {
  switch (iconName) {
    case "target":
      return TargetIcon
    case "document":
      return DocumentIcon
    case "quotes":
      return QuotesIcon
    case "compass":
      return CompassIcon
    default:
      return DocumentIcon
  }
}

export default function ChatWelcome({
  query,
  postCount,
  onPromptClick,
}: ChatWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* AI Sparkle Icon */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-200">
        <SparklesIcon className="w-7 h-7 text-white" />
      </div>

      {/* Welcome text */}
      <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
        Chat with your data
      </h3>
      <p className="text-sm text-gray-500 text-center mb-8 max-w-xs leading-relaxed">
        Interview{" "}
        <span className="font-medium text-gray-700">
          {postCount.toLocaleString()} voices
        </span>{" "}
        at once about{" "}
        <span className="font-medium text-gray-700">&ldquo;{query}&rdquo;</span>{" "}
        and receive instant AI-powered insights.
      </p>

      {/* Suggested prompts - 2x2 grid */}
      <div className="w-full max-w-sm">
        <div className="grid grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((prompt) => {
            const IconComponent = getIconComponent(prompt.icon)
            return (
              <button
                key={prompt.id}
                onClick={() => onPromptClick(prompt.prompt)}
                className="group flex flex-col items-start gap-2 p-4 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center group-hover:border-gray-300 transition-colors">
                  <IconComponent className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700 leading-tight">
                  {prompt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
