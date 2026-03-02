/**
 * Onboarding Geographic Focus Screen (Step 2 of 3)
 * Editorial newspaper aesthetic
 */

'use client'

import { useState } from 'react'
import { US_STATES } from '@/lib/search-suggestions'
import { CITIES_BY_STATE } from '@/lib/data/cities'

interface GeographicFocusScreenProps {
  geoScope: 'national' | 'state' | 'city' | null
  geoState: string | null
  geoCity: string | null
  onUpdate: (scope: 'national' | 'state' | 'city', state?: string, city?: string) => void
  onContinue: () => void
  onBack: () => void
}

export default function GeographicFocusScreen({
  geoScope,
  geoState,
  geoCity,
  onUpdate,
  onContinue,
  onBack,
}: GeographicFocusScreenProps) {
  const [selectedScope, setSelectedScope] = useState<'national' | 'state' | 'city'>(geoScope || 'national')
  const [selectedState, setSelectedState] = useState<string>(geoState || '')
  const [selectedCity, setSelectedCity] = useState<string>(geoCity || '')

  const handleScopeChange = (scope: 'national' | 'state' | 'city') => {
    setSelectedScope(scope)
    
    if (scope === 'national') {
      setSelectedState('')
      setSelectedCity('')
      onUpdate('national')
    } else if (scope === 'state') {
      setSelectedCity('')
      onUpdate('state', selectedState || undefined)
    } else {
      onUpdate('city', selectedState || undefined, selectedCity || undefined)
    }
  }

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode)
    setSelectedCity('') // Reset city when state changes
    
    if (selectedScope === 'state') {
      onUpdate('state', stateCode)
    } else if (selectedScope === 'city') {
      onUpdate('city', stateCode, '')
    }
  }

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    onUpdate('city', selectedState, city)
  }

  const canContinue = 
    selectedScope === 'national' ||
    (selectedScope === 'state' && selectedState) ||
    (selectedScope === 'city' && selectedState && selectedCity)

  const availableCities = selectedState ? CITIES_BY_STATE[selectedState] || [] : []

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
              Onboarding • Step 2 of 3
            </p>
          </div>
          <div className="text-center">
            <h2 className="font-display text-3xl text-stone-900 mb-2">
              Geographic Scope
            </h2>
            <p className="font-mono text-xs text-stone-600">
              Select your focus area for conversation tracking
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto p-6">
        {/* Scope Options - Editorial cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* National */}
          <button
            onClick={() => handleScopeChange('national')}
            className={`p-6 border-2 transition-all text-center ${
              selectedScope === 'national'
                ? 'border-red-600 bg-red-50 shadow-lg'
                : 'border-stone-900 bg-white hover:bg-stone-50'
            }`}
          >
            <div className="text-4xl mb-3">🌎</div>
            <h3 className="font-mono text-sm font-bold text-stone-900 tracking-wide uppercase mb-2">
              National
            </h3>
            <p className="font-mono text-[10px] text-stone-600 leading-relaxed">
              Track conversations across the United States
            </p>
          </button>

          {/* State */}
          <button
            onClick={() => handleScopeChange('state')}
            className={`p-6 border-2 transition-all text-center ${
              selectedScope === 'state'
                ? 'border-red-600 bg-red-50 shadow-lg'
                : 'border-stone-900 bg-white hover:bg-stone-50'
            }`}
          >
            <div className="text-4xl mb-3">🗺️</div>
            <h3 className="font-mono text-sm font-bold text-stone-900 tracking-wide uppercase mb-2">
              State
            </h3>
            <p className="font-mono text-[10px] text-stone-600 leading-relaxed">
              Focus on a specific state
            </p>
          </button>

          {/* City */}
          <button
            onClick={() => handleScopeChange('city')}
            className={`p-6 border-2 transition-all text-center ${
              selectedScope === 'city'
                ? 'border-red-600 bg-red-50 shadow-lg'
                : 'border-stone-900 bg-white hover:bg-stone-50'
            }`}
          >
            <div className="text-4xl mb-3">🏙️</div>
            <h3 className="font-mono text-sm font-bold text-stone-900 tracking-wide uppercase mb-2">
              City
            </h3>
            <p className="font-mono text-[10px] text-stone-600 leading-relaxed">
              Focus on a specific city
            </p>
          </button>
        </div>

        {/* Dropdowns (conditional) - Editorial form */}
        {(selectedScope === 'state' || selectedScope === 'city') && (
          <div className="max-w-md mx-auto space-y-4 mb-10 bg-white border-2 border-stone-900 p-6">
            <div className="border-b-2 border-stone-900 pb-3 mb-4">
              <h3 className="font-mono text-xs font-bold text-stone-900 tracking-[0.15em] uppercase">
                Location Details
              </h3>
            </div>

            {/* State Dropdown */}
            <div>
              <label className="block font-mono text-[10px] font-bold text-stone-900 tracking-wide uppercase mb-2">
                Select State
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-stone-900 font-mono text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600/30"
              >
                <option value="">CHOOSE A STATE...</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* City Dropdown (only for city scope) */}
            {selectedScope === 'city' && (
              <div>
                <label className="block font-mono text-[10px] font-bold text-stone-900 tracking-wide uppercase mb-2">
                  Select City
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={!selectedState}
                  className="w-full px-4 py-3 bg-white border-2 border-stone-900 font-mono text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600/30 disabled:bg-stone-100 disabled:cursor-not-allowed"
                >
                  <option value="">CHOOSE A CITY...</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city.toUpperCase()}
                    </option>
                  ))}
                </select>
                {!selectedState && (
                  <p className="font-mono text-[10px] text-red-600 mt-2 tracking-wide uppercase">
                    ⚠ Select a state first
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons - Editorial */}
        <div className="flex items-center justify-between border-t-4 border-stone-900 pt-8">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white border-2 border-stone-900 hover:bg-stone-50 font-mono text-sm font-bold text-stone-900 tracking-[0.1em] uppercase transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={!canContinue}
            className="px-12 py-4 bg-stone-900 hover:bg-red-600 disabled:bg-stone-300 text-white font-mono text-sm font-bold tracking-[0.15em] uppercase transition-colors disabled:cursor-not-allowed"
          >
            {canContinue ? 'Review & Finish →' : 'Select Location'}
          </button>
        </div>
      </div>
    </div>
  )
}
