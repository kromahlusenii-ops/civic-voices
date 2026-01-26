"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import AlertModal from "./report/AlertModal"

type AlertFrequency = "INSTANTLY" | "HOURLY" | "DAILY" | "WEEKLY"

interface AlertRecipient {
  id: string
  email: string
  isOwner: boolean
  verified: boolean
}

interface Alert {
  id: string
  searchQuery: string
  platforms: string[]
  scope: string
  timeRange: string
  recipients: AlertRecipient[]
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
}

interface AlertHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function AlertHistorySidebar({
  isOpen,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: AlertHistorySidebarProps) {
  const { user, isAuthenticated, getAccessToken } = useAuth()
  const { showToast } = useToast()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("No active session")
      }

      const response = await fetch("/api/alerts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch alerts")
      }

      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (err) {
      console.error("Error fetching alerts:", err)
      setError("Failed to load alerts")
    } finally {
      setIsLoading(false)
    }
  }, [user, getAccessToken])

  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      fetchAlerts()
    }
  }, [isOpen, isAuthenticated, user, fetchAlerts])

  const handleMenuClick = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation()
    setMenuOpenId(menuOpenId === alertId ? null : alertId)
  }

  const handleEdit = (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation()
    setMenuOpenId(null)
    setEditingAlert(alert)
  }

  const handleToggle = async (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation()
    setMenuOpenId(null)
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

  const handleDelete = async (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation()
    setMenuOpenId(null)

    if (!confirm("Delete this alert?")) return

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
      } else {
        showToast({ message: "Failed to delete alert" })
      }
    } catch (error) {
      console.error("Failed to delete alert:", error)
      showToast({ message: "Failed to delete alert" })
    }
  }

  const handleModalClose = () => {
    setEditingAlert(null)
    // Refresh alerts after editing
    fetchAlerts()
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-16 z-30 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden"
        }`}
        data-testid="alert-history-sidebar"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 min-w-72">
          <h2 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            Email Alerts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label="Close sidebar"
            data-testid="close-alert-sidebar-btn"
          >
            <svg
              className="h-5 w-5"
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2 min-w-72">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                onClick={fetchAlerts}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                Try again
              </button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg
                className="h-10 w-10 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-sm text-gray-500 whitespace-nowrap">
                No alerts yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Create alerts from any report
              </p>
            </div>
          ) : (
            <ul className="space-y-1 px-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(alert.id)}
                  onMouseLeave={() => {
                    setHoveredId(null)
                    if (menuOpenId === alert.id) setMenuOpenId(null)
                  }}
                >
                  <div
                    onClick={() => setEditingAlert(alert)}
                    className={`w-full px-3 py-2.5 text-left text-sm rounded-lg hover:bg-gray-100 cursor-pointer ${
                      !alert.isActive ? "opacity-60" : ""
                    }`}
                    data-testid={`sidebar-alert-item-${alert.id}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setEditingAlert(alert)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate block">
                            {alert.searchQuery}
                          </span>
                          {!alert.isActive && (
                            <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{FREQUENCY_LABELS[alert.frequency]}</span>
                          <span>·</span>
                          <span>
                            {alert.recipients.length} recipient
                            {alert.recipients.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {(hoveredId === alert.id || menuOpenId === alert.id) && (
                        <button
                          onClick={(e) => handleMenuClick(e, alert.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          data-testid={`alert-menu-btn-${alert.id}`}
                          aria-label="More options"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown menu */}
                  {menuOpenId === alert.id && (
                    <div
                      className="absolute right-2 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                      data-testid={`alert-dropdown-${alert.id}`}
                    >
                      <button
                        onClick={(e) => handleEdit(e, alert)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleToggle(e, alert)}
                        disabled={togglingId === alert.id}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        {alert.isActive ? (
                          <>
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
                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Pause
                          </>
                        ) : (
                          <>
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
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Resume
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, alert.id)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Edit Modal */}
      {editingAlert && user?.email && (
        <AlertModal
          isOpen={!!editingAlert}
          onClose={handleModalClose}
          reportId=""
          searchQuery={editingAlert.searchQuery}
          platforms={editingAlert.platforms}
          scope={editingAlert.scope}
          timeRange={editingAlert.timeRange}
          getAccessToken={getAccessToken}
          userEmail={user.email}
        />
      )}
    </>
  )
}
