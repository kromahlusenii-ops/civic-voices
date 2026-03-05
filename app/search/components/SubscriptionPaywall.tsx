"use client"

interface SubscriptionPaywallProps {
  onSubscribe: () => void
  isAuthenticated: boolean
}

export default function SubscriptionPaywall({
  onSubscribe,
  isAuthenticated,
}: SubscriptionPaywallProps) {
  return (
    <div className="relative">
      {/* Fade mask over truncated content */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, #F5F0E8 90%)",
        }}
      />

      {/* CTA Card */}
      <div
        className="relative mt-4 overflow-hidden rounded-xl"
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          border: "1px solid rgba(212,162,74,0.25)",
          boxShadow: "0 4px 24px rgba(44,37,25,0.06)",
        }}
      >
        {/* Decorative top accent */}
        <div
          className="h-[3px] w-full"
          style={{
            background: "linear-gradient(90deg, #D4A24A 0%, rgba(212,162,74,0.3) 100%)",
          }}
        />

        <div className="px-6 py-8 text-center">
          {/* Lock icon */}
          <div
            className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(212,162,74,0.12)" }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: "#D4A24A" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h3
            className="mb-2 text-lg font-bold"
            style={{ color: "#2C2519" }}
          >
            Unlock full civic analysis
          </h3>

          <p
            className="mx-auto mb-6 max-w-md text-sm leading-relaxed"
            style={{ color: "rgba(44,37,25,0.6)" }}
          >
            Access all social posts, AI synthesis, topic breakdowns, and
            platform-level analysis across every civic issue.
          </p>

          <button
            type="button"
            onClick={onSubscribe}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110"
            style={{
              backgroundColor: "#D4A24A",
              color: "#FFFDF8",
              boxShadow: "0 2px 8px rgba(212,162,74,0.3)",
            }}
          >
            Start free trial
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {!isAuthenticated && (
            <p className="mt-4 text-xs" style={{ color: "rgba(44,37,25,0.4)" }}>
              Already subscribed?{" "}
              <button
                type="button"
                onClick={onSubscribe}
                className="underline transition-colors hover:text-[#D4A24A]"
                style={{ color: "rgba(44,37,25,0.55)" }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
