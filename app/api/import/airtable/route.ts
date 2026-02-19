import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchAirtableTasks } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const airtableTasks = await fetchAirtableTasks()

    if (airtableTasks.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, message: 'No tasks found in Airtable' })
    }

    // Get existing source_ids to avoid duplicates
    const sourceIds = airtableTasks.map((t) => t.source_id)
    const { data: existing } = await supabase
      .from('tasks')
      .select('source_id')
      .in('source_id', sourceIds)

    const existingIds = new Set((existing || []).map((r) => r.source_id))
    const newTasks = airtableTasks.filter((t) => !existingIds.has(t.source_id))

    if (newTasks.length === 0) {
      return NextResponse.json({ imported: 0, skipped: airtableTasks.length, message: 'All tasks already imported' })
    }

    const { data, error } = await supabase.from('tasks').insert(
      newTasks.map((t) => ({
        title: t.title,
        description: t.description || null,
        source: 'airtable',
        source_id: t.source_id,
        leverage: 5,
        effort: 5,
        status: 'active',
        context_url: t.context_url,
        tags: [],
      }))
    ).select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      imported: data?.length || 0,
      skipped: existingIds.size,
      tasks: data,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
