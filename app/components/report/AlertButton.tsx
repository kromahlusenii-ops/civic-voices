"use client"

import { useState } from "react"
import AlertModal from "./AlertModal"

interface AlertButtonProps {
  reportId: string
  searchQuery: string
  platforms: string[]
  scope?: string
  timeRange?: string
  getAccessToken: () => Promise<string | null>
  userEmail: string
}

export default function AlertButton({
  reportId,
  searchQuery,
  platforms,
  scope,
  timeRange,
  getAccessToken,
  userEmail,
}: AlertButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Set up email alerts"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Create Alert
      </button>

      <AlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reportId={reportId}
        searchQuery={searchQuery}
        platforms={platforms}
        scope={scope}
        timeRange={timeRange}
        getAccessToken={getAccessToken}
        userEmail={userEmail}
      />
    </>
  )
}
