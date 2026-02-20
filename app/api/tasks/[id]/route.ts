import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.leverage !== undefined) updates.leverage = body.leverage
  if (body.effort !== undefined) updates.effort = body.effort
  if (body.status !== undefined) {
    updates.status = body.status
    if (body.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
  }
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.urgency !== undefined) updates.urgency = body.urgency
  if (body.category !== undefined) updates.category = body.category

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
