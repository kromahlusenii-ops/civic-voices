/**
 * Supabase client for server-side usage (API routes, server components)
 * Uses service role key for elevated permissions
 */

import { createClient } from '@supabase/supabase-js'
import { config } from './config'

const supabaseUrl = config.supabase.url
const serviceRoleKey = config.supabase.serviceRoleKey

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase server configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

/**
 * Create a Supabase client for server-side operations
 * This client has elevated permissions via the service role key
 */
export function createServerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}

/**
 * Verify a Supabase JWT token and return the user
 * @param token - The JWT token from the Authorization header
 * @returns User object if valid, null otherwise
 */
export async function verifySupabaseToken(token: string) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Supabase token verification error:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error verifying Supabase token:', error)
    return null
  }
}
