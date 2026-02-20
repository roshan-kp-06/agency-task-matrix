import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'active'

  const urgency = searchParams.get('urgency')
  const category = searchParams.get('category')

  const query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query.eq('status', status)
  }
  if (urgency) {
    query.eq('urgency', urgency)
  }
  if (category) {
    query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    // Fall back to localStorage mode if Supabase isn't configured or table doesn't exist yet
    if (
      error.message?.includes('Supabase env vars not configured') ||
      error.message?.includes('relation') ||
      error.message?.includes('does not exist') ||
      error.code === '42P01'
    ) {
      return NextResponse.json({ supabaseNotConfigured: true, tasks: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Core columns that always exist
  const coreRow = {
    title: body.title,
    description: body.description || null,
    source: body.source || 'manual',
    source_id: body.source_id || null,
    leverage: body.leverage ?? 5,
    effort: body.effort ?? 5,
    status: 'active',
    context_url: body.context_url || null,
    tags: body.tags || [],
  }

  const baseRow = {
    ...coreRow,
    urgency: body.urgency || 'whenever',
    category: body.category || null,
  }

  let { data, error } = await supabase
    .from('tasks')
    .insert({ ...baseRow, metadata: body.metadata || null })
    .select()
    .single()

  // If metadata column doesn't exist yet, retry without it
  if (error && error.message?.includes('metadata')) {
    const r = await supabase.from('tasks').insert(baseRow).select().single()
    data = r.data; error = r.error
  }

  // If urgency/category columns don't exist yet, retry with core columns only
  if (error && (error.message?.includes('urgency') || error.message?.includes('category') || error.message?.includes('schema cache'))) {
    const r = await supabase.from('tasks').insert(coreRow).select().single()
    data = r.data; error = r.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
