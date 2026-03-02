/**
 * Onboarding Topic Selection Screen (Step 1 of 3)
 * Multi-category accordion with subcategory checkboxes
 */

import { useState } from 'react'
import { TAXONOMY } from '@/lib/data/taxonomy'
import { getRecommendedTopics } from '@/lib/topicRecommendations'

interface TopicSelectionScreenProps {
  selectedTopics: string[]
  onToggleTopic: (topicId: string) => void
  onContinue: () => void
  userUseCase?: string | null
  onSetTopics?: (topicIds: string[]) => void
}

export default function TopicSelectionScreen({
  selectedTopics,
  onToggleTopic,
  onContinue,
  userUseCase,
  onSetTopics,
}: TopicSelectionScreenProps) {
  // Get recommended topics for this user's use case (MUST BE FIRST)
  const recommendedTopics = getRecommendedTopics(userUseCase)
  const isRecommended = (topicId: string) => recommendedTopics.includes(topicId)
  
  // Auto-expand categories that have recommended topics
  const categoriesWithRecommendations = TAXONOMY
    .filter(cat => cat.subcategories.some(sub => recommendedTopics.includes(sub.id)))
    .map(cat => cat.id)
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categoriesWithRecommendations.length > 0 ? categoriesWithRecommendations : ['housing']
  )

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const isExpanded = (categoryId: string) => expandedCategories.includes(categoryId)

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
              Onboarding • Step 1 of 3
            </p>
          </div>
          <div className="text-center">
            <h2 className="font-display text-3xl text-stone-900 mb-2">
              Confirm Your Topics
            </h2>
            <p className="font-mono text-xs text-stone-600">
              {recommendedTopics.length > 0 
                ? `We've pre-selected ${recommendedTopics.length} topics based on your role. Add or remove as needed.`
                : 'Choose 3-10 civic issues to track'}
            </p>
          </div>
        </div>
      </div>

      {/* Selection counter banner with instructions */}
      <div className="relative z-10 border-b-2 border-stone-900 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm font-bold text-stone-900 tracking-wide">
              {selectedTopics.length} TOPICS SELECTED
              {recommendedTopics.length > 0 && (
                <span className="ml-3 text-xs text-stone-600 font-normal">
                  ({selectedTopics.filter(id => recommendedTopics.includes(id)).length} of {recommendedTopics.length} recommended kept)
                </span>
              )}
            </p>
            {recommendedTopics.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-yellow-200 border border-yellow-400 font-mono text-[9px] font-bold text-yellow-900 tracking-wider">
                  ⭐ PICK
                </span>
                <span className="font-mono text-stone-600">= Recommended for your role</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto p-6">
        {/* Instructions callout with quick actions */}
        {recommendedTopics.length > 0 && (
          <div className="bg-white border-2 border-red-600 mb-6">
            <div className="border-b-2 border-red-600 p-4 bg-red-50">
              <p className="font-mono text-xs font-bold text-stone-900 tracking-wide uppercase">
                📋 Review Pre-Selected Topics
              </p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[11px] text-stone-700 leading-relaxed mb-4">
                We&apos;ve selected {recommendedTopics.length} topics based on your role. 
                <span className="font-bold"> Uncheck any you don&apos;t want</span>, or expand other categories to add more.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onSetTopics?.(recommendedTopics)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-red-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase transition-colors"
                >
                  Keep All Recommended
                </button>
                <button
                  onClick={() => onSetTopics?.([])}
                  className="px-3 py-1.5 bg-white border-2 border-stone-900 hover:bg-stone-50 text-stone-900 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors"
                >
                  Clear All & Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category accordion - Editorial sections */}
        <div className="space-y-4 mb-10">
          {TAXONOMY.map((category) => {
            const expanded = isExpanded(category.id)
            const selectedInCategory = category.subcategories.filter(sub =>
              selectedTopics.includes(sub.id)
            ).length

            return (
              <div
                key={category.id}
                className="bg-white border-2 border-stone-900 overflow-hidden"
              >
                {/* Category Header - Section masthead */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors border-b-2 border-stone-900 ${
                    category.subcategories.some(sub => isRecommended(sub.id)) ? 'bg-yellow-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono text-sm font-bold text-stone-900 tracking-wide uppercase">
                          {category.name}
                        </h3>
                        {category.subcategories.some(sub => isRecommended(sub.id)) && (
                          <span className="text-xs">⭐</span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-stone-600 tracking-wide mt-0.5">
                        {category.subcategories.length} SUBCATEGORIES
                        {selectedInCategory > 0 && ` · ${selectedInCategory} SELECTED`}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-stone-900 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Subcategories - Editorial listings */}
                {expanded && (
                  <div className="bg-stone-50 animate-accordion-open">
                    {category.subcategories.map((subcategory) => {
                      const isSelected = selectedTopics.includes(subcategory.id)
                      const recommended = isRecommended(subcategory.id)

                      return (
                        <label
                          key={subcategory.id}
                          className={`flex items-start gap-4 p-4 cursor-pointer transition-all border-b border-stone-200 last:border-0 hover:bg-white ${
                            isSelected ? 'bg-white' : ''
                          } ${
                            recommended ? 'border-l-4 !border-l-yellow-500 bg-yellow-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleTopic(subcategory.id)}
                            className="mt-1 w-5 h-5 border-2 border-stone-900 text-red-600 focus:ring-2 focus:ring-red-600/30 rounded-none"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-stone-900 tracking-wide uppercase">
                                {subcategory.name}
                              </span>
                              {recommended && (
                                <span className="px-2 py-0.5 bg-yellow-200 border border-yellow-400 font-mono text-[9px] font-bold text-yellow-900 tracking-wider">
                                  ⭐ PICK
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Continue button - Editorial CTA */}
        <div className="text-center border-t-4 border-stone-900 pt-8">
          {selectedTopics.length < 3 && (
            <p className="font-mono text-xs text-red-600 mb-4 tracking-wide uppercase">
              ⚠ Please select at least 3 topics
            </p>
          )}
          <button
            onClick={onContinue}
            disabled={selectedTopics.length < 3}
            className="px-16 py-5 bg-stone-900 hover:bg-red-600 disabled:bg-stone-300 text-white font-mono text-sm font-bold tracking-[0.15em] uppercase transition-colors disabled:cursor-not-allowed"
          >
            {selectedTopics.length >= 3 ? 'Continue to Location →' : 'Need 3 Topics Minimum'}
          </button>
        </div>
      </div>
    </div>
  )
}
