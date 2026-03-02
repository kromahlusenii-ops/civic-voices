/**
 * Onboarding Welcome Screen
 * Editorial newspaper aesthetic
 */

'use client'

interface WelcomeScreenProps {
  onGetStarted: () => void
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-stone-50 grain relative">
      {/* Newspaper-style header */}
      <div className="relative z-10 border-b-4 border-stone-900 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center border-b-2 border-stone-300 pb-6 mb-6">
            <h1 className="font-display text-5xl md:text-6xl text-stone-900 mb-2 tracking-tight">
              CIVIC VOICES
            </h1>
            <p className="font-mono text-[10px] text-stone-500 tracking-[0.2em] uppercase">
              Est. 2026 • Real-Time Social Intelligence
            </p>
          </div>
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-stone-900 mb-3">
              Your Personalized Intelligence Feed
            </h2>
            <p className="font-mono text-xs text-stone-600 tracking-wide uppercase">
              Starts with Topic Selection
            </p>
          </div>
        </div>
      </div>

      {/* Main content - editorial columns */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Three column layout - newspaper style */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Column 1 */}
          <div className="bg-white border-2 border-stone-900 p-6">
            <div className="border-b-2 border-stone-900 pb-3 mb-4">
              <h3 className="font-mono text-xs font-bold text-stone-900 tracking-[0.15em] uppercase">
                Instant Access
              </h3>
            </div>
            <p className="font-mono text-[11px] text-stone-700 leading-relaxed">
              Pre-loaded sentiment data for topics you care about. No waiting. Just insights.
            </p>
            <div className="mt-4 text-4xl text-stone-900">⚡</div>
          </div>

          {/* Column 2 */}
          <div className="bg-white border-2 border-stone-900 p-6">
            <div className="border-b-2 border-stone-900 pb-3 mb-4">
              <h3 className="font-mono text-xs font-bold text-stone-900 tracking-[0.15em] uppercase">
                Personalized
              </h3>
            </div>
            <p className="font-mono text-[11px] text-stone-700 leading-relaxed">
              Your custom dashboard. Your issues. Real conversations from real Americans.
            </p>
            <div className="mt-4 text-4xl text-stone-900">📊</div>
          </div>

          {/* Column 3 */}
          <div className="bg-white border-2 border-stone-900 p-6">
            <div className="border-b-2 border-stone-900 pb-3 mb-4">
              <h3 className="font-mono text-xs font-bold text-stone-900 tracking-[0.15em] uppercase">
                Real-Time
              </h3>
            </div>
            <p className="font-mono text-[11px] text-stone-700 leading-relaxed">
              Track civic intelligence as it happens. Multi-platform aggregation 24/7.
            </p>
            <div className="mt-4 text-4xl text-stone-900">🔔</div>
          </div>
        </div>

        {/* Feature callout box */}
        <div className="bg-white border-l-4 border-red-600 p-6 mb-12">
          <p className="font-mono text-sm text-stone-900 leading-relaxed">
            <span className="font-bold text-red-600">WHAT YOU&apos;LL DO:</span> Select 3-10 topics 
            you want to track. We&apos;ll prepare your dashboard with real-time data from X/Twitter, 
            TikTok, YouTube, Reddit, Bluesky, and Truth Social.
          </p>
        </div>

        {/* Time estimate banner */}
        <div className="text-center border-t-2 border-b-2 border-stone-900 py-4 mb-8">
          <p className="font-mono text-xs text-stone-600 tracking-wide uppercase">
            Estimated Time: 2-3 Minutes
          </p>
        </div>

        {/* Editorial CTA */}
        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="px-16 py-5 bg-stone-900 hover:bg-red-600 text-white font-mono text-sm font-bold tracking-[0.15em] uppercase transition-colors"
          >
            Begin Setup →
          </button>
        </div>
      </div>
    </div>
  )
}
