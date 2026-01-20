"use client"

import { useEffect, useRef, useState } from "react"
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

interface AudienceChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  reportData: ReportData
  getAccessToken: () => Promise<string | null>
  onScrollToPost: (postId: string) => void
}

export default function AudienceChatSidebar({
  isOpen,
  onClose,
  reportData,
  getAccessToken,
  onScrollToPost,
}: AudienceChatSidebarProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Get access token when sidebar opens
  useEffect(() => {
    if (isOpen) {
      getAccessToken().then(setAccessToken)
    }
  }, [isOpen, getAccessToken])

  const {
    messages,
    status,
    error,
    sendMessage,
    clearHistory,
    exportConversation,
  } = useAudienceChat(reportData.report.id, accessToken)

  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      // Could add a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const postCount = reportData.posts?.length || 0

  return (
    <>
      {/* Backdrop - mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 bg-white flex flex-col shadow-xl transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          inset-y-0 right-0 w-full md:w-[400px]
          md:border-l md:border-gray-200
        `}
        aria-label="Audience chat panel"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            {/* Mobile back button */}
            <button
              onClick={onClose}
              className="md:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Close chat"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Talk to the Audience
              </h2>
              <p className="text-xs text-gray-500">
                Speaking for {postCount.toLocaleString()} posts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Actions dropdown or buttons */}
            {messages.length > 0 && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Copy conversation"
                  title="Copy conversation"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleExport}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Export conversation"
                  title="Export as Markdown"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
                <button
                  onClick={clearHistory}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Clear chat"
                  title="New conversation"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Desktop close button */}
            <button
              onClick={onClose}
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Close chat"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
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
          disabled={status === "streaming"}
          placeholder="Ask about this audience..."
        />
      </aside>
    </>
  )
}
