"use client"

import type { DashboardTab } from "./DashboardTabs"

interface MobileBottomNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onShare: () => void
  onDownloadPDF: () => void
  isOwner: boolean
  canDownload: boolean
  isDownloading: boolean
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onShare,
  onDownloadPDF,
  isOwner,
  canDownload,
  isDownloading,
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

        {/* Download PDF */}
        {canDownload && (
          <button
            onClick={onDownloadPDF}
            disabled={isDownloading}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 disabled:opacity-50 transition-colors"
          >
            {isDownloading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
            <span className="text-[10px] mt-0.5 font-medium">PDF</span>
          </button>
        )}

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
