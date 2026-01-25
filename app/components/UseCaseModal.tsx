"use client"

import { useState } from "react"
import { USE_CASE_STORAGE_KEY } from "@/lib/search-suggestions"
import type { UseCase } from "@/lib/search-suggestions"

interface UseCaseModalProps {
  isOpen: boolean
  onClose: (selectedUseCase: string) => void
  accessToken: string | null
}

const USE_CASE_OPTIONS: { id: UseCase; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "civic",
    title: "Civic Leaders & Newsrooms",
    description: "Track public opinion on policies, candidates, and civic issues",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  {
    id: "brand",
    title: "Brand Marketing",
    description: "Monitor brand mentions, competitor activity, and consumer sentiment",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    id: "policy",
    title: "Policy & Research",
    description: "Analyze discourse around policy topics and social trends",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    id: "general",
    title: "General Research",
    description: "Explore what people are saying about any topic",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
]

export default function UseCaseModal({ isOpen, onClose, accessToken }: UseCaseModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSelect = async (useCase: string) => {
    setSelectedId(useCase)
    setIsSaving(true)

    // Save to localStorage immediately
    localStorage.setItem(USE_CASE_STORAGE_KEY, useCase)

    // Persist to database if authenticated
    if (accessToken) {
      try {
        await fetch("/api/onboarding/use-case", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ useCase }),
        })
      } catch (err) {
        console.error("Failed to save use case:", err)
      }
    }

    setIsSaving(false)
    onClose(useCase)
  }

  const handleSkip = () => {
    localStorage.setItem(USE_CASE_STORAGE_KEY, "general")
    onClose("general")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            What brings you here?
          </h2>
          <p className="text-gray-500 text-sm">
            We&apos;ll tailor your experience with relevant search suggestions
          </p>
        </div>

        {/* Use Case Options */}
        <div className="px-6 pb-4 space-y-3">
          {USE_CASE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={isSaving}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all
                ${selectedId === option.id
                  ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${
                selectedId === option.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{option.title}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              {selectedId === option.id && isSaving && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
              )}
            </button>
          ))}
        </div>

        {/* Skip */}
        <div className="px-6 pb-6 text-center">
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
