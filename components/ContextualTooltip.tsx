"use client"

import { useEffect, useRef } from "react"

interface ContextualTooltipProps {
  children: React.ReactNode
  isVisible: boolean
  title: string
  description: string
  onDismiss: () => void
  position?: "top" | "bottom"
  testId?: string
  className?: string
}

export default function ContextualTooltip({
  children,
  isVisible,
  title,
  description,
  onDismiss,
  position = "bottom",
  testId,
  className,
}: ContextualTooltipProps) {
  const dismissRef = useRef<HTMLButtonElement>(null)

  // Focus dismiss button when tooltip appears
  useEffect(() => {
    if (isVisible && dismissRef.current) {
      dismissRef.current.focus()
    }
  }, [isVisible])

  // Dismiss on Escape key
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, onDismiss])

  return (
    <div className={className ?? "relative inline-block"}>
      {children}

      {isVisible && (
        <div
          role="tooltip"
          aria-live="polite"
          data-testid={testId}
          className={`absolute z-50 w-64 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-lg ${
            position === "bottom"
              ? "top-full mt-3 left-0"
              : "bottom-full mb-3 left-0"
          }`}
        >
          <p className="font-medium text-sm">{title}</p>
          <p className="text-gray-300 text-xs mt-1">{description}</p>
          <button
            ref={dismissRef}
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="mt-2 bg-white/20 hover:bg-white/30 text-white text-xs rounded-full px-3 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            data-testid={testId ? `${testId}-dismiss` : undefined}
          >
            Got it
          </button>

          {/* Arrow */}
          <div
            className={`absolute left-6 border-[6px] border-transparent ${
              position === "bottom"
                ? "bottom-full border-b-gray-900"
                : "top-full border-t-gray-900"
            }`}
          />
        </div>
      )}
    </div>
  )
}
