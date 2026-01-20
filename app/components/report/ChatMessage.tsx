"use client"

import type { ChatMessage as ChatMessageType, Citation } from "@/lib/types/chat"
import CitationLink from "./CitationLink"

interface ChatMessageProps {
  message: ChatMessageType
  onCitationClick: (postId: string) => void
}

/**
 * Parse message content and render citations as clickable links
 */
function renderContentWithCitations(
  content: string,
  citations: Citation[],
  onCitationClick: (postId: string) => void
): React.ReactNode[] {
  const citationMap = new Map(citations.map(c => [c.index, c]))
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const regex = /\[(\d+)\]/g
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      )
    }

    // Add citation link if we have citation data
    const citationIndex = parseInt(match[1], 10)
    const citation = citationMap.get(citationIndex)

    if (citation) {
      parts.push(
        <CitationLink
          key={`citation-${match.index}`}
          citation={citation}
          onClick={onCitationClick}
        />
      )
    } else {
      // Render as plain text if no citation data
      parts.push(
        <span key={`citation-text-${match.index}`} className="text-blue-600">
          [{citationIndex}]
        </span>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {content.slice(lastIndex)}
      </span>
    )
  }

  return parts
}

export default function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        }`}
      >
        {/* Message content */}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "" : "prose prose-sm max-w-none"}`}>
          {isUser ? (
            message.content
          ) : (
            renderContentWithCitations(
              message.content,
              message.citations || [],
              onCitationClick
            )
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 ${
            isUser ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}
