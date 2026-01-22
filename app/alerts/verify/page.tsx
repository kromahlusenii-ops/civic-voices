"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided")
      return
    }

    verifyToken(token)
  }, [token])

  const verifyToken = async (verifyToken: string) => {
    try {
      const res = await fetch("/api/alerts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage("Your email has been verified successfully!")
        setSearchQuery(data.searchQuery || null)
      } else {
        setStatus("error")
        setMessage(data.error || "Verification failed")
      }
    } catch (error) {
      console.error("Verification error:", error)
      setStatus("error")
      setMessage("An unexpected error occurred")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying your email...
            </h1>
            <p className="text-gray-500">Please wait while we verify your email address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Email Verified!
            </h1>
            <p className="text-gray-500 mb-6">{message}</p>
            {searchQuery && (
              <p className="text-sm text-gray-600 mb-6">
                You will now receive alerts for: <strong>{searchQuery}</strong>
              </p>
            )}
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go to Brand Yap
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
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
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              The verification link may have expired or already been used.
              Please contact the person who invited you to request a new link.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go to Brand Yap
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
