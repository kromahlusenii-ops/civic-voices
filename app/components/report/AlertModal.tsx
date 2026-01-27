"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/app/contexts/ToastContext"

type AlertFrequency = "INSTANTLY" | "HOURLY" | "DAILY" | "WEEKLY"

interface Alert {
  id: string
  searchQuery: string
  platforms: string[]
  scope: string
  timeRange: string
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
}

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  searchQuery: string
  platforms: string[]
  scope?: string      // "national" or "local"
  timeRange?: string  // e.g. "24h", "7d"
  getAccessToken: () => Promise<string | null>
  userEmail: string
}

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string; description: string }[] = [
  { value: "INSTANTLY", label: "Instantly", description: "Every 15 minutes" },
  { value: "HOURLY", label: "Hourly", description: "Once per hour" },
  { value: "DAILY", label: "Daily", description: "Once per day" },
  { value: "WEEKLY", label: "Weekly", description: "Once per week" },
]

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
]

export default function AlertModal({
  isOpen,
  onClose,
  searchQuery,
  platforms,
  scope: initialScope = "national",
  timeRange: initialTimeRange = "24h",
  getAccessToken,
  userEmail,
}: AlertModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Form state
  const [existingAlert, setExistingAlert] = useState<Alert | null>(null)
  const [recipients, setRecipients] = useState<string[]>([userEmail])
  const [newRecipient, setNewRecipient] = useState("")
  const [frequency, setFrequency] = useState<AlertFrequency>("DAILY")
  const [preferredTime, setPreferredTime] = useState("09:00")
  const [preferredDay, setPreferredDay] = useState(1) // Monday
  const [timezone, setTimezone] = useState("America/New_York")
  const [isActive, setIsActive] = useState(true)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [recipientError, setRecipientError] = useState("")

  // Fetch existing alert on open
  useEffect(() => {
    if (isOpen) {
      fetchExistingAlert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, searchQuery])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const fetchExistingAlert = async () => {
    setIsLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch("/api/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        // Find alert matching this search query
        const matchingAlert = data.alerts?.find(
          (a: Alert) => a.searchQuery === searchQuery
        )
        if (matchingAlert) {
          setExistingAlert(matchingAlert)
          setRecipients(matchingAlert.recipients.map((r: { email: string }) => r.email))
          setFrequency(matchingAlert.frequency)
          setPreferredTime(matchingAlert.preferredTime)
          setPreferredDay(matchingAlert.preferredDay ?? 1)
          setTimezone(matchingAlert.timezone)
          setIsActive(matchingAlert.isActive)
        } else {
          // Reset to defaults for new alert
          setExistingAlert(null)
          setRecipients([userEmail])
          setFrequency("DAILY")
          setPreferredTime("09:00")
          setPreferredDay(1)
          setTimezone("America/New_York")
          setIsActive(true)
        }
      }
    } catch (error) {
      console.error("Failed to fetch existing alert:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const addRecipient = () => {
    const email = newRecipient.toLowerCase().trim()
    setRecipientError("")

    if (!email) {
      setRecipientError("Please enter an email address")
      return
    }

    if (!validateEmail(email)) {
      setRecipientError("Please enter a valid email address")
      return
    }

    if (recipients.includes(email)) {
      setRecipientError("This email is already added")
      return
    }

    if (recipients.length >= 5) {
      setRecipientError("Maximum 5 recipients allowed")
      return
    }

    setRecipients([...recipients, email])
    setNewRecipient("")
  }

  const removeRecipient = (email: string) => {
    // Don't allow removing the owner
    if (email.toLowerCase() === userEmail.toLowerCase()) {
      return
    }
    setRecipients(recipients.filter((r) => r !== email))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) return

      const isCreating = !existingAlert
      const payload = {
        ...(existingAlert && { id: existingAlert.id }),
        searchQuery,
        platforms,
        scope: existingAlert?.scope || initialScope,
        timeRange: existingAlert?.timeRange || initialTimeRange,
        recipients,
        frequency,
        preferredTime,
        preferredDay: frequency === "WEEKLY" ? preferredDay : undefined,
        timezone,
        isActive,
        // Send immediate alert when creating (for instant feedback)
        ...(isCreating && { sendImmediately: true }),
      }

      const res = await fetch("/api/alerts", {
        method: existingAlert ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const savedAlert = await res.json()
        setExistingAlert(savedAlert)

        showToast({
          message: isCreating
            ? "Alert created! Your first digest will be emailed shortly."
            : "Alert updated",
        })
        onClose()
      } else {
        const error = await res.json()
        showToast({ message: error.error || "Failed to save alert" })
      }
    } catch (error) {
      console.error("Failed to save alert:", error)
      showToast({ message: "Failed to save alert" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingAlert) return

    setIsDeleting(true)
    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch(`/api/alerts/${existingAlert.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setExistingAlert(null)
        setRecipients([userEmail])
        showToast({ message: "Alert deleted" })
        onClose()
      } else {
        showToast({ message: "Failed to delete alert" })
      }
    } catch (error) {
      console.error("Failed to delete alert:", error)
      showToast({ message: "Failed to delete alert" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-600"
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
            <div>
              <h2
                id="alert-modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                {existingAlert ? "Edit Alert" : "Create Alert"}
              </h2>
              <p className="text-sm text-gray-500 truncate max-w-[250px]">
                {searchQuery}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Toggle */}
              {existingAlert && (
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Alert Active</span>
                    <p className="text-sm text-gray-500">
                      {isActive ? "Receiving email notifications" : "Paused"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                      isActive ? "bg-green-500" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={isActive}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients (max 5)
                </label>
                <div className="space-y-2">
                  {recipients.map((email) => {
                    const isOwner = email.toLowerCase() === userEmail.toLowerCase()
                    const recipientData = existingAlert?.recipients.find(
                      (r) => r.email.toLowerCase() === email.toLowerCase()
                    )
                    const isVerified = isOwner || recipientData?.verified

                    return (
                      <div
                        key={email}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-700 truncate">
                            {email}
                          </span>
                          {isOwner && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                          {!isVerified && !isOwner && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                        {!isOwner && (
                          <button
                            onClick={() => removeRecipient(email)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`Remove ${email}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {recipients.length < 5 && (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newRecipient}
                        onChange={(e) => {
                          setNewRecipient(e.target.value)
                          setRecipientError("")
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addRecipient()
                          }
                        }}
                        placeholder="Add email address"
                        className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      />
                      <button
                        onClick={addRecipient}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}
                  {recipientError && (
                    <p className="text-sm text-red-600">{recipientError}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    External recipients will need to verify their email address.
                  </p>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFrequency(option.value)}
                      className={`flex flex-col items-start p-3 border rounded-lg transition-all ${
                        frequency === option.value
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium text-gray-900 text-sm">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Time (for Daily/Weekly) */}
              {(frequency === "DAILY" || frequency === "WEEKLY") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Preferred Day (for Weekly) */}
              {frequency === "WEEKLY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Day
                  </label>
                  <select
                    value={preferredDay}
                    onChange={(e) => setPreferredDay(parseInt(e.target.value))}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                {existingAlert ? (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete Alert"}
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || recipients.length === 0}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving
                      ? "Saving..."
                      : existingAlert
                      ? "Save Changes"
                      : "Create Alert"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
