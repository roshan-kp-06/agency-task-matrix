import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!Array.isArray(body.tasks)) {
    return NextResponse.json(
      { error: 'Expected { tasks: [...] }' },
      { status: 400 }
    )
  }

  const rows = body.tasks.map((t: Record<string, unknown>) => ({
    title: t.title,
    description: (t.description as string) || null,
    source: (t.source as string) || 'manual',
    source_id: (t.source_id as string) || null,
    leverage: (t.leverage as number) ?? 5,
    effort: (t.effort as number) ?? 5,
    urgency: (t.urgency as string) || 'whenever',
    category: (t.category as string) || null,
    status: 'active',
    context_url: (t.context_url as string) || null,
    tags: (t.tags as string[]) || [],
  }))

  const { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { imported: data?.length || 0, tasks: data },
    { status: 201 }
  )
}
