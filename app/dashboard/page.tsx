'use client'

/**
 * Dashboard - Redirects to unified search page
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  // Redirect to search page (unified dashboard)
  useEffect(() => {
    router.push('/search')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
