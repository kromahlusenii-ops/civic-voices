/**
 * Onboarding Review Screen (Step 3 of 3)
 * Editorial newspaper aesthetic
 */

'use client'

import { TAXONOMY } from '@/lib/data/taxonomy'

interface ReviewScreenProps {
  selectedTopicIds: string[]
  geoScope: 'national' | 'state' | 'city'
  geoState?: string
  geoCity?: string
  onEditTopics: () => void
  onEditLocation: () => void
  onFinish: () => void
  isSubmitting: boolean
}

export default function ReviewScreen({
  selectedTopicIds,
  geoScope,
  geoState,
  geoCity,
  onEditTopics,
  onEditLocation,
  onFinish,
  isSubmitting,
}: ReviewScreenProps) {
  // Group topics by category
  const groupedTopics = selectedTopicIds.reduce((acc, topicId) => {
    for (const category of TAXONOMY) {
      const subcategory = category.subcategories.find(sub => sub.id === topicId)
      if (subcategory) {
        if (!acc[category.name]) {
          acc[category.name] = []
        }
        acc[category.name].push(subcategory.name)
        break
      }
    }
    return acc
  }, {} as Record<string, string[]>)

  // Format location text
  const getLocationText = () => {
    if (geoScope === 'city' && geoCity && geoState) {
      return `${geoCity}, ${geoState}`
    }
    if (geoScope === 'state' && geoState) {
      return geoState
    }
    return 'National (United States)'
  }

  return (
    <div className="min-h-screen bg-stone-50 grain relative">
      {/* Newspaper-style header */}
      <div className="relative z-10 border-b-4 border-stone-900 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-center border-b-2 border-stone-300 pb-4 mb-4">
            <h1 className="font-display text-4xl md:text-5xl text-stone-900 mb-2 tracking-tight">
              CIVIC VOICES
            </h1>
            <p className="font-mono text-[10px] text-stone-500 tracking-[0.2em] uppercase">
              Onboarding • Step 3 of 3
            </p>
          </div>
          <div className="text-center">
            <h2 className="font-display text-3xl text-stone-900 mb-2">
              Ready to Launch
            </h2>
            <p className="font-mono text-xs text-stone-600">
              Review your selections before proceeding
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto p-6">
        {/* Review Sections - Editorial layout */}
        <div className="space-y-6 mb-10">
          {/* Topics Section - Editorial box */}
          <div className="bg-white border-2 border-stone-900 p-6">
            <div className="flex items-center justify-between border-b-2 border-stone-900 pb-4 mb-4">
              <div>
                <h2 className="font-mono text-sm font-bold text-stone-900 tracking-wide uppercase">
                  Topics Selected
                </h2>
                <p className="font-mono text-[10px] text-stone-600 tracking-wide mt-1">
                  {selectedTopicIds.length} CIVIC ISSUES
                </p>
              </div>
              <button
                onClick={onEditTopics}
                className="font-mono text-xs text-red-600 hover:text-red-700 font-bold tracking-wider uppercase"
              >
                Edit →
              </button>
            </div>

            {/* Grouped topics by category - Editorial columns */}
            <div className="space-y-4">
              {Object.entries(groupedTopics).map(([categoryName, topics]) => (
                <div key={categoryName} className="border-l-4 border-stone-300 pl-4">
                  <h3 className="font-mono text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-2">
                    {categoryName}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topicName) => (
                      <span
                        key={topicName}
                        className="px-3 py-1 bg-stone-100 border border-stone-300 font-mono text-[10px] text-stone-900 tracking-wide"
                      >
                        {topicName.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location Section - Editorial box */}
          <div className="bg-white border-2 border-stone-900 p-6">
            <div className="flex items-center justify-between border-b-2 border-stone-900 pb-4 mb-4">
              <div>
                <h2 className="font-mono text-sm font-bold text-stone-900 tracking-wide uppercase">
                  Geographic Scope
                </h2>
                <p className="font-mono text-[10px] text-stone-600 tracking-wide mt-1">
                  {geoScope.toUpperCase()} FOCUS
                </p>
              </div>
              <button
                onClick={onEditLocation}
                className="font-mono text-xs text-red-600 hover:text-red-700 font-bold tracking-wider uppercase"
              >
                Edit →
              </button>
            </div>

            <div className="flex items-center gap-4 border-l-4 border-stone-300 pl-4">
              <span className="text-3xl">
                {geoScope === 'city' ? '🏙️' : geoScope === 'state' ? '🗺️' : '🌎'}
              </span>
              <div>
                <p className="font-mono text-sm font-bold text-stone-900">
                  {getLocationText()}
                </p>
                <p className="font-mono text-[10px] text-stone-600 tracking-wide uppercase mt-1">
                  {geoScope} coverage area
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="bg-white border-l-4 border-red-600 p-4 mb-8">
          <p className="font-mono text-[10px] text-stone-600 leading-relaxed">
            Your preferences are saved and can be modified anytime in settings. 
            We&apos;re now preparing your personalized intelligence dashboard.
          </p>
        </div>

        {/* CTA Button - Editorial */}
        <div className="text-center border-t-4 border-stone-900 pt-8">
          <button
            onClick={onFinish}
            disabled={isSubmitting}
            className="px-20 py-5 bg-stone-900 hover:bg-red-600 disabled:bg-stone-300 text-white font-mono text-sm font-bold tracking-[0.15em] uppercase transition-colors disabled:cursor-not-allowed min-w-[300px]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading Dashboard...
              </span>
            ) : (
              'Launch Dashboard →'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
