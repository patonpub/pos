import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Helper to create client with error checking
function createSupabaseClient(): SupabaseClient | null {
  // During build time, env vars might not be available - return null to allow imports
  if (typeof window === 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
    return null
  }

  // At runtime (browser or server with env vars), require env vars
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please create a .env.local file with:\n' +
      'NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\n' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient() as SupabaseClient

export type UserRole = 'owner' | 'employee'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}