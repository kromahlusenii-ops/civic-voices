'use client'

/**
 * Topic Selection Onboarding Flow
 * 4-screen flow: Welcome -> Topics -> Location -> Review
 */

import { useState, useEffect } from 'react'
import { getRecommendedTopics } from '@/lib/topicRecommendations'
import RoleSelectionScreen from './components/RoleSelectionScreen'
import WelcomeScreen from './components/WelcomeScreen'
import TopicSelectionScreen from './components/TopicSelectionScreen'
import GeographicFocusScreen from './components/GeographicFocusScreen'
import ReviewScreen from './components/ReviewScreen'

type Screen = 'role' | 'welcome' | 'topics' | 'location' | 'review'

export default function OnboardingPage() {
  // Note: Using window.location.href for redirects (see handleComplete)
  const [currentScreen, setCurrentScreen] = useState<Screen>('role')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userUseCase, setUserUseCase] = useState<string | null>(null)

  // Onboarding state
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [geoScope, setGeoScope] = useState<'national' | 'state' | 'city'>('national')
  const [geoState, setGeoState] = useState<string>('')
  const [geoCity, setGeoCity] = useState<string>('')

  // Fetch user's use case on mount to check if they already selected a role
  useEffect(() => {
    const fetchUserUseCase = async () => {
      try {
        const response = await fetch('/api/onboarding/use-case')
        if (response.ok) {
          const data = await response.json()
          if (data.useCase) {
            setUserUseCase(data.useCase)
            // Pre-populate topics based on use case
            const recommended = getRecommendedTopics(data.useCase)
            setSelectedTopics(recommended)
            // Skip role selection if already set - go directly to topics
            setCurrentScreen('topics')
          }
        }
      } catch (error) {
        console.error('Failed to fetch use case:', error)
      }
    }
    fetchUserUseCase()
  }, [])

  // Navigation handlers
  const handleRoleSelect = async (role: string) => {
    setUserUseCase(role)
    // Pre-populate topics based on selected role
    const recommended = getRecommendedTopics(role)
    setSelectedTopics(recommended)
    
    // Save role to database
    try {
      await fetch('/api/onboarding/use-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: role }),
      })
    } catch (error) {
      console.error('Failed to save use case:', error)
    }
  }

  const handleRoleContinue = () => {
    if (userUseCase) {
      // Skip welcome screen - go directly to topics with pre-selected recommendations
      setCurrentScreen('topics')
    }
  }

  const handleGetStarted = () => setCurrentScreen('topics')

  const handleTopicsContinue = () => {
    if (selectedTopics.length > 0) {
      setCurrentScreen('location')
    }
  }

  const handleLocationBack = () => setCurrentScreen('topics')

  const handleLocationContinue = () => setCurrentScreen('review')

  const handleReviewEditTopics = () => setCurrentScreen('topics')

  const handleReviewEditLocation = () => setCurrentScreen('location')

  const handleFinish = async () => {
    setIsSubmitting(true)

    try {
      const payload = {
        selectedTopics,
        geoScope,
        ...(geoScope !== 'national' && geoState && { geoState }),
        ...(geoScope === 'city' && geoCity && { geoCity }),
      }

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to complete onboarding')

      // Success! Redirect to search page (unified dashboard)
      window.location.href = '/search'
    } catch (error) {
      console.error('Onboarding completion error:', error)
      alert('Failed to save your preferences. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Topic selection handlers
  const handleToggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    )
  }

  // Geographic focus handlers
  const handleGeoUpdate = (scope: 'national' | 'state' | 'city', state?: string, city?: string) => {
    setGeoScope(scope)
    setGeoState(state || '')
    setGeoCity(city || '')
  }

  // Render current screen
  return (
    <>
      {currentScreen === 'role' && (
        <RoleSelectionScreen
          selectedRole={userUseCase}
          onSelectRole={handleRoleSelect}
          onContinue={handleRoleContinue}
        />
      )}

      {currentScreen === 'welcome' && (
        <WelcomeScreen onGetStarted={handleGetStarted} />
      )}

      {currentScreen === 'topics' && (
        <TopicSelectionScreen
          selectedTopics={selectedTopics}
          onToggleTopic={handleToggleTopic}
          onContinue={handleTopicsContinue}
          userUseCase={userUseCase}
          onSetTopics={setSelectedTopics}
        />
      )}

      {currentScreen === 'location' && (
        <GeographicFocusScreen
          geoScope={geoScope}
          geoState={geoState}
          geoCity={geoCity}
          onUpdate={handleGeoUpdate}
          onContinue={handleLocationContinue}
          onBack={handleLocationBack}
        />
      )}

      {currentScreen === 'review' && (
        <ReviewScreen
          selectedTopicIds={selectedTopics}
          geoScope={geoScope}
          geoState={geoState}
          geoCity={geoCity}
          onEditTopics={handleReviewEditTopics}
          onEditLocation={handleReviewEditLocation}
          onFinish={handleFinish}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  )
}
