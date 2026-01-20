"use client"

import type { DashboardTab } from "./DashboardTabs"

interface MobileBottomNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onShare: () => void
  onOpenChat: () => void
  isOwner: boolean
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onShare,
  onOpenChat,
  isOwner,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe sm:hidden">
      <div className="flex items-center justify-around h-14">
        {/* Overview Tab */}
        <button
          onClick={() => onTabChange("overview")}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === "overview" ? "text-gray-900" : "text-gray-500"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === "overview" ? 2.5 : 2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">Overview</span>
        </button>

        {/* Posts Tab */}
        <button
          onClick={() => onTabChange("social-posts")}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === "social-posts" ? "text-gray-900" : "text-gray-500"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === "social-posts" ? 2.5 : 2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">Posts</span>
        </button>

        {/* Chat */}
        <button
          onClick={onOpenChat}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">Chat</span>
        </button>

        {/* Share */}
        {isOwner && (
          <button
            onClick={onShare}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="text-[10px] mt-0.5 font-medium">Share</span>
          </button>
        )}
      </div>
    </nav>
  )
}
