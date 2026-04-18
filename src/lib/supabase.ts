/**
 * Supabase client helpers for the MTM Options Trading Platform.
 * Browser client: used for Realtime subscriptions and reads.
 * Service client: used in API routes that need write access.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (for Realtime subscriptions + reads)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client (for API routes that need write access)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}
