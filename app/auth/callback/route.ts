/**
 * Supabase OAuth callback handler
 * This route handles OAuth redirects from providers like Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/search?error=auth_failed', requestUrl.origin))
    }
  }

  // Redirect to search page on success
  return NextResponse.redirect(new URL('/search', requestUrl.origin))
}
