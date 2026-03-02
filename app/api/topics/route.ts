/**
 * Topics API - Save and retrieve user's selected topics
 * Used during onboarding and for personalized dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { supabaseUid: supabaseUser.id },
      select: {
        selectedTopics: true,
        geoScope: true,
        geoState: true,
        geoCity: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      selectedTopics: user.selectedTopics || [],
      geoScope: user.geoScope || null,
      geoState: user.geoState || null,
      geoCity: user.geoCity || null,
    })
  } catch (error) {
    console.error('[Topics API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve topics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { topics, geoScope, geoState, geoCity } = body

    // Validate topics array
    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: 'Topics must be an array' },
        { status: 400 }
      )
    }

    // Validate geoScope
    if (geoScope && !['national', 'state', 'city'].includes(geoScope)) {
      return NextResponse.json(
        { error: 'Invalid geoScope. Must be national, state, or city' },
        { status: 400 }
      )
    }

    // Update user in database
    const user = await prisma.user.update({
      where: { supabaseUid: supabaseUser.id },
      data: {
        selectedTopics: topics,
        geoScope: geoScope || null,
        geoState: geoState || null,
        geoCity: geoCity || null,
      },
      select: {
        selectedTopics: true,
        geoScope: true,
        geoState: true,
        geoCity: true,
      },
    })

    return NextResponse.json({
      success: true,
      selectedTopics: user.selectedTopics,
      geoScope: user.geoScope,
      geoState: user.geoState,
      geoCity: user.geoCity,
    })
  } catch (error) {
    console.error('[Topics API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save topics' },
      { status: 500 }
    )
  }
}
