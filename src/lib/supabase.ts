import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Supabase now calls the anon key "publishable" — support both names
const anonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null

// helper for components to check
export function getSupabase() {
  if (!supabase) throw new Error('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env')
  return supabase
}

// Types for DB rows (snake_case in DB, camelCase in app via mapper)
export type DbFacility = {
  id: string
  workspace_id: string | null
  name: string
  facility_type: string
  address: string | null
  contact: string | null
  status: string
  notes: string | null
  created_at: string
}
