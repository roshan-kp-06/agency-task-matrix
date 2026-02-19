import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'active'

  const query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query.eq('status', status)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description || null,
      source: body.source || 'manual',
      source_id: body.source_id || null,
      leverage: body.leverage ?? 5,
      effort: body.effort ?? 5,
      status: 'active',
      context_url: body.context_url || null,
      tags: body.tags || [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
