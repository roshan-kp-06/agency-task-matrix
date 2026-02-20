import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_url_here') {
    throw new Error('Supabase env vars not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }
  _client = createClient(url, key)
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export type TaskMetadata = {
  sender_name?: string
  channel_name?: string
  ai_overview?: string
  workspace?: string
} | null

export type Task = {
  id: string
  title: string
  description: string | null
  source: 'manual' | 'slack' | 'airtable'
  source_id: string | null
  leverage: number
  effort: number
  status: 'active' | 'completed' | 'killed' | 'archived'
  created_at: string
  updated_at: string
  completed_at: string | null
  context_url: string | null
  tags: string[]
  metadata: TaskMetadata
}

export type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>
