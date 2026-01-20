"use client"

import { useState } from "react"
import type { Citation } from "@/lib/types/chat"

interface CitationLinkProps {
  citation: Citation
  onClick: (postId: string) => void
}

// Platform icons for tooltip
const platformIcons: Record<string, string> = {
  x: "𝕏",
  twitter: "𝕏",
  tiktok: "♪",
  youtube: "▶",
  reddit: "◉",
  bluesky: "🦋",
  truthsocial: "T",
}

export default function CitationLink({ citation, onClick }: CitationLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick(citation.postId)
  }

  const platformIcon = platformIcons[citation.platform] || "•"

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer mx-0.5"
        aria-label={`View source ${citation.index}`}
      >
        {citation.index}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 max-w-xs">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{platformIcon}</span>
              <span className="font-medium">{citation.author}</span>
              <span className="text-gray-400 text-[10px]">on {citation.platform}</span>
            </div>
            <p className="text-gray-300 line-clamp-2">{citation.text}</p>
            <p className="text-blue-400 text-[10px] mt-1">Click to view post</p>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  )
}
