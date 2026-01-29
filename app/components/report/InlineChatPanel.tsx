"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useAudienceChat } from "@/lib/hooks/useAudienceChat"
import ChatMessage from "./ChatMessage"
import ChatInput from "./ChatInput"
import ChatWelcome from "./ChatWelcome"

interface ReportData {
  report: {
    id: string
    query: string
  }
  posts?: Array<{ id: string }>
}

interface InlineChatPanelProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  reportData: ReportData
  getAccessToken: () => Promise<string | null>
  onScrollToPost: (postId: string) => void
  initialMessage?: string
  onInitialMessageSent?: () => void
}

// Sparkles icon for the collapsed state
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

export default function InlineChatPanel({
  isCollapsed,
  onToggleCollapse,
  reportData,
  getAccessToken,
  onScrollToPost,
  initialMessage,
  onInitialMessageSent,
}: InlineChatPanelProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isTokenLoading, setIsTokenLoading] = useState(true)
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false)
  const searchParams = useSearchParams()

  // Get share token from URL (for shared reports)
  const shareToken = useMemo(() => searchParams.get("token"), [searchParams])

  // Get access token on mount
  useEffect(() => {
    setIsTokenLoading(true)
    getAccessToken()
      .then((token) => {
        setAccessToken(token)
        setIsTokenLoading(false)
      })
      .catch(() => {
        setIsTokenLoading(false)
      })
  }, [getAccessToken])

  const {
    messages,
    status,
    error,
    sendMessage,
    clearHistory,
    exportConversation,
  } = useAudienceChat(reportData.report.id, accessToken, shareToken)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Handle initial message when panel is expanded with a pending message
  useEffect(() => {
    if (
      !isCollapsed &&
      initialMessage &&
      !hasProcessedInitialMessage &&
      !isTokenLoading &&
      status === "idle"
    ) {
      setHasProcessedInitialMessage(true)
      sendMessage(initialMessage)
      onInitialMessageSent?.()
    }
  }, [isCollapsed, initialMessage, hasProcessedInitialMessage, isTokenLoading, status, sendMessage, onInitialMessageSent])

  // Reset processed flag when panel collapses or initial message changes
  useEffect(() => {
    if (isCollapsed) {
      setHasProcessedInitialMessage(false)
    }
  }, [isCollapsed])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Handle citation click
  const handleCitationClick = (postId: string) => {
    onScrollToPost(postId)
  }

  // Handle export
  const handleExport = () => {
    const content = exportConversation()
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat-export-${reportData.report.id}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle copy
  const handleCopy = async () => {
    const content = exportConversation()
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const postCount = reportData.posts?.length || 0

  // Collapsed state - just show a toggle button
  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 w-14 bg-white border-l border-gray-200 fixed top-0 right-0 h-screen z-30 shadow-lg">
        <button
          onClick={onToggleCollapse}
          className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
          aria-label="Open chat panel"
          title="Chat with your data"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-gray-500 writing-mode-vertical">Chat</span>
        </button>
      </div>
    )
  }

  // Expanded state - full chat panel
  return (
    <div className="hidden lg:flex flex-col w-[380px] bg-white border-l border-gray-200 fixed top-0 right-0 h-screen z-30 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Chat with your data
              </h2>
              <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-violet-100 text-violet-700 rounded">
                Beta
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Actions */}
          {messages.length > 0 && (
            <>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                aria-label="Copy conversation"
                title="Copy conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                aria-label="Export conversation"
                title="Export as Markdown"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={clearHistory}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                aria-label="Clear chat"
                title="New conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </>
          )}

          {/* Collapse button */}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label="Collapse chat panel"
            title="Collapse"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading state while getting auth token */}
        {isTokenLoading && !shareToken ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <ChatWelcome
            query={reportData.report.query}
            postCount={postCount}
            onPromptClick={sendMessage}
          />
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onCitationClick={handleCitationClick}
              />
            ))}

            {/* Streaming indicator */}
            {status === "streaming" && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        disabled={status === "streaming" || (isTokenLoading && !shareToken)}
        placeholder={isTokenLoading && !shareToken ? "Loading..." : "Ask anything about your data..."}
      />
    </div>
  )
}
