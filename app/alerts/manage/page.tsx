"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/contexts/AuthContext"
import { useToast } from "@/app/contexts/ToastContext"
import { Header } from "@/components/header"

type AlertFrequency = "INSTANTLY" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY"

interface Alert {
  id: string
  searchQuery: string
  platforms: string[]
  recipients: {
    id: string
    email: string
    isOwner: boolean
    verified: boolean
  }[]
  frequency: AlertFrequency
  preferredTime: string
  preferredDay: number | null
  timezone: string
  isActive: boolean
  lastSentAt: string | null
  nextScheduledAt: string | null
  createdAt: string
}

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  INSTANTLY: "Every 15 min",
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
}

const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  reddit: "Reddit",
  instagram: "Instagram",
  bluesky: "Bluesky",
  truthsocial: "Truth Social",
}

export default function ManageAlertsPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, getAccessToken } = useAuth()
  const { showToast } = useToast()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch("/api/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
      showToast({ message: "Failed to load alerts" })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAlert = async (alert: Alert) => {
    setTogglingId(alert.id)
    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: alert.id,
          searchQuery: alert.searchQuery,
          platforms: alert.platforms,
          recipients: alert.recipients.map((r) => r.email),
          frequency: alert.frequency,
          preferredTime: alert.preferredTime,
          preferredDay: alert.preferredDay,
          timezone: alert.timezone,
          isActive: !alert.isActive,
        }),
      })

      if (res.ok) {
        setAlerts(
          alerts.map((a) =>
            a.id === alert.id ? { ...a, isActive: !a.isActive } : a
          )
        )
        showToast({
          message: alert.isActive ? "Alert paused" : "Alert resumed",
        })
      }
    } catch (error) {
      console.error("Failed to toggle alert:", error)
      showToast({ message: "Failed to update alert" })
    } finally {
      setTogglingId(null)
    }
  }

  const deleteAlert = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return

    setDeletingId(alertId)
    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setAlerts(alerts.filter((a) => a.id !== alertId))
        showToast({ message: "Alert deleted" })
      }
    } catch (error) {
      console.error("Failed to delete alert:", error)
      showToast({ message: "Failed to delete alert" })
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleString()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Email Alerts</h1>
          <p className="text-gray-600 mt-1">
            Manage your email notifications for search queries
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
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
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              No alerts yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create alerts from any report page to receive email notifications
            </p>
            <button
              onClick={() => router.push("/search")}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Start a Search
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border transition-all ${
                  alert.isActive
                    ? "border-gray-200"
                    : "border-gray-200 opacity-60"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {alert.searchQuery}
                        </h3>
                        {!alert.isActive && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {alert.platforms.map((p) => (
                          <span
                            key={p}
                            className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                          >
                            {PLATFORM_LABELS[p] || p}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>
                          <span className="font-medium">Frequency:</span>{" "}
                          {FREQUENCY_LABELS[alert.frequency]}
                          {(alert.frequency === "DAILY" ||
                            alert.frequency === "WEEKLY") &&
                            ` at ${alert.preferredTime}`}
                        </p>
                        <p>
                          <span className="font-medium">Recipients:</span>{" "}
                          {alert.recipients.length} (
                          {alert.recipients.filter((r) => r.verified).length}{" "}
                          verified)
                        </p>
                        <p>
                          <span className="font-medium">Last sent:</span>{" "}
                          {formatDate(alert.lastSentAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAlert(alert)}
                        disabled={togglingId === alert.id}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 ${
                          alert.isActive ? "bg-green-500" : "bg-gray-200"
                        }`}
                        role="switch"
                        aria-checked={alert.isActive}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            alert.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        disabled={deletingId === alert.id}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        aria-label="Delete alert"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
