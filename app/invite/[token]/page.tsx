"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/contexts/AuthContext"
import Link from "next/link"

interface InviteDetails {
  email: string
  role: string
  expiresAt: string
  organization: {
    name: string
    ownerName: string | null
    ownerEmail: string
  }
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { session, getAccessToken } = useAuth()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/organization/invites/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Invalid or expired invite")
          return
        }

        setInvite(data.invite)
      } catch {
        setError("Failed to load invite")
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchInvite()
    }
  }, [token])

  const handleAccept = async () => {
    try {
      setIsAccepting(true)
      setAcceptError(null)

      const accessToken = await getAccessToken()
      if (!accessToken) {
        setAcceptError("Please sign in to accept this invite")
        return
      }

      const response = await fetch(`/api/organization/invites/${token}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setAcceptError(data.error || "Failed to accept invite")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/search")
      }, 2000)
    } catch {
      setAcceptError("Failed to accept invite")
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the team!</h1>
          <p className="text-gray-600 mb-6">
            You&apos;ve successfully joined {invite?.organization.name}. Redirecting...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re invited!</h1>
          <p className="text-gray-600">
            {invite?.organization.ownerName || invite?.organization.ownerEmail} has invited you to join
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{invite?.organization.name}</h2>
          <p className="text-sm text-gray-500">
            Role: <span className="capitalize">{invite?.role}</span>
          </p>
        </div>

        {!session ? (
          <div>
            <p className="text-gray-600 text-center mb-4">
              Sign in or create an account to accept this invite.
            </p>
            <div className="space-y-3">
              <Link
                href={`/login?redirect=/invite/${token}`}
                className="block w-full py-3 px-4 bg-gray-900 text-white text-center rounded-lg font-medium hover:bg-gray-800"
              >
                Sign in
              </Link>
              <Link
                href={`/signup?redirect=/invite/${token}`}
                className="block w-full py-3 px-4 border border-gray-300 text-gray-700 text-center rounded-lg font-medium hover:bg-gray-50"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 text-center mb-4">
              Accept this invite to join {invite?.organization.name}.
            </p>

            {acceptError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {acceptError}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isAccepting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Accepting...
                </span>
              ) : (
                "Accept Invite"
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Signed in as {session.user?.email}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Invite expires on {new Date(invite?.expiresAt || "").toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
