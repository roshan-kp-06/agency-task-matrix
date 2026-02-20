import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchSlackTasks } from '@/lib/slack'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

async function generateOverview(contextText: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  try {
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `In 1-2 sentences, explain what task or action is being requested in this Slack message. Be specific and concrete.\n\nMessage:\n${contextText}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    })
    return response.choices[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

export async function POST() {
  try {
    const slackTasks = await fetchSlackTasks()

    if (slackTasks.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, message: 'No actionable Slack messages found' })
    }

    // Get existing source_ids to avoid duplicates
    const sourceIds = slackTasks.map((t) => t.source_id)
    const { data: existing } = await supabase
      .from('tasks')
      .select('source_id')
      .in('source_id', sourceIds)

    const existingIds = new Set((existing || []).map((r) => r.source_id))
    const newTasks = slackTasks.filter((t) => !existingIds.has(t.source_id))

    if (newTasks.length === 0) {
      return NextResponse.json({ imported: 0, skipped: slackTasks.length, message: 'All tasks already imported' })
    }

    // Generate AI overviews for new tasks
    const enrichedTasks = []
    for (const t of newTasks) {
      const ai_overview = await generateOverview(t.context_text)
      enrichedTasks.push({ ...t, ai_overview })
    }

    const { data, error } = await supabase.from('tasks').insert(
      enrichedTasks.map((t) => ({
        title: t.title,
        description: t.description || null,
        source: 'slack',
        source_id: t.source_id,
        leverage: 5,
        effort: 5,
        status: 'active',
        context_url: t.context_url,
        tags: [],
        metadata: {
          sender_name: t.sender_name,
          channel_name: t.channel_name,
          ai_overview: t.ai_overview,
          workspace: 'Airr Digital',
        },
      }))
    ).select()

    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ error: 'Database not set up yet. Run the SQL schema in your Supabase SQL Editor first.' }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      imported: data?.length || 0,
      skipped: existingIds.size,
      tasks: data,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
