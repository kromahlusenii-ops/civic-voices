"use client"

import { useEffect, useState } from "react"

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastProps {
  message: string
  action?: ToastAction
  onClose: () => void
  duration?: number
}

export default function Toast({
  message,
  action,
  onClose,
  duration = 5000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-20 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-white shadow-2xl transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <span className="text-sm">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onClose}
        className="ml-1 rounded p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-4 w-4"
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
  )
}
