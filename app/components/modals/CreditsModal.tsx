"use client"

import { useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { STRIPE_CONFIG } from "@/lib/stripe-config"

interface CreditsModalProps {
  isOpen: boolean
  onClose: () => void
  currentCredits: number
  requiredCredits?: number
}

export default function CreditsModal({
  isOpen,
  onClose,
  currentCredits,
  requiredCredits,
}: CreditsModalProps) {
  const { session } = useAuth()
  const [selectedPack, setSelectedPack] = useState<number>(50)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const packs = STRIPE_CONFIG.creditPacks

  const handlePurchase = async () => {
    if (!session?.access_token) {
      setError("Please sign in to purchase credits")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/billing/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ credits: selectedPack }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start checkout")
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

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
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
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {requiredCredits ? "Insufficient Credits" : "Buy Credits"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {requiredCredits
                  ? `You need ${requiredCredits} credits for this action`
                  : "Add more credits to your account"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current balance */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Balance</span>
              <span className={`text-lg font-semibold ${currentCredits < 10 ? "text-red-600" : "text-gray-900"}`}>
                {currentCredits} credits
              </span>
            </div>
            {requiredCredits && currentCredits < requiredCredits && (
              <div className="mt-2 text-sm text-red-600">
                You need {requiredCredits - currentCredits} more credits
              </div>
            )}
          </div>

          {/* Credit packs */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700">Select a credit pack</h3>
            <div className="grid gap-3">
              {packs.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => setSelectedPack(pack.credits)}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all
                    ${selectedPack === pack.credits
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center
                      ${selectedPack === pack.credits ? "bg-blue-100" : "bg-gray-100"}`}>
                      <svg
                        className={`w-5 h-5 ${selectedPack === pack.credits ? "text-blue-600" : "text-gray-500"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${selectedPack === pack.credits ? "text-blue-900" : "text-gray-900"}`}>
                        {pack.credits} Credits
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(pack.price / pack.credits * 100)}/credit
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${selectedPack === pack.credits ? "text-blue-600" : "text-gray-900"}`}>
                    {formatPrice(pack.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg
                       hover:bg-blue-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
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
              `Buy ${selectedPack} Credits for ${formatPrice(packs.find(p => p.credits === selectedPack)?.price || 0)}`
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Credits never expire and can be used anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
