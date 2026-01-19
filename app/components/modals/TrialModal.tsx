"use client"

import { useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"

interface TrialModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export default function TrialModal({ isOpen, onClose, feature }: TrialModalProps) {
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStartTrial = async () => {
    if (!session?.access_token) {
      setError("Please sign in to start your trial")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // Include more details in the error message
        const errorDetail = data.details ? ` (${data.details})` : ""
        throw new Error((data.error || "Failed to start checkout") + errorDetail)
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
              PRO FEATURE
            </span>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h2 className="text-2xl font-bold mb-2">Unlock Full Access</h2>
          <p className="text-blue-100">
            {feature
              ? `${feature} is a premium feature.`
              : "Get unlimited access to all features."}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Trial offer */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-800">Try Pro for just $1</p>
                <p className="text-sm text-green-600">1-day trial, then $49/month</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              What you get
            </h3>
            <ul className="space-y-2">
              {[
                "200 credits/month included",
                "Unlimited search timeframes",
                "AI-powered report generation",
                "Export data and insights",
                "Priority support",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleStartTrial}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg
                       hover:from-blue-700 hover:to-indigo-700 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-blue-500/25"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              "Start $1 Trial"
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Cancel anytime. No commitment required.
          </p>
        </div>
      </div>
    </div>
  )
}
