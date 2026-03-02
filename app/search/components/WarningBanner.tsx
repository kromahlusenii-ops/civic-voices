"use client"

interface WarningBannerProps {
  warnings: string[]
  onDismiss: (index: number) => void
}

export default function WarningBanner({ warnings, onDismiss }: WarningBannerProps) {
  if (warnings.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {warnings.map((message, index) => (
        <div
          key={`${index}-${message}`}
          className="flex items-start gap-3 rounded-lg px-4 py-3 relative z-10"
          style={{
            backgroundColor: "rgba(212,162,74,0.12)",
            border: "1px solid rgba(212,162,74,0.3)",
          }}
        >
          <span
            className="shrink-0 text-sm leading-6"
            style={{ color: "#92722A" }}
            aria-hidden="true"
          >
            ⚠
          </span>
          <p
            className="flex-1 text-sm leading-6"
            style={{
              color: "#92722A",
              fontFamily: "var(--font-body)",
            }}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={() => onDismiss(index)}
            className="shrink-0 rounded p-0.5 transition-colors hover:bg-black/5"
            style={{ color: "#92722A" }}
            aria-label={`Dismiss warning: ${message}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
