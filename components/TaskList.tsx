'use client'

import { useState } from 'react'
import { Task } from '@/lib/supabase'
import { Check, X, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'

type Props = {
  tasks: Task[]
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDone: (id: string) => void
  onKill: (id: string) => void
}

function getQuadrantStyle(leverage: number, effort: number) {
  if (leverage >= 6 && effort <= 5) return { label: 'Quick Win', dot: 'bg-emerald-500', text: 'text-emerald-400' }
  if (leverage >= 6 && effort >= 6) return { label: 'Big Bet', dot: 'bg-blue-500', text: 'text-blue-400' }
  if (leverage < 6 && effort <= 5) return { label: 'Fill-in', dot: 'bg-yellow-500', text: 'text-yellow-400' }
  return { label: 'Eliminate', dot: 'bg-red-500', text: 'text-red-400' }
}

function getSourceEmoji(source: string) {
  if (source === 'slack') return '💬'
  if (source === 'airtable') return '📋'
  return '✏️'
}

export function TaskList({ tasks, onUpdate, onDone, onKill }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = [...tasks].sort((a, b) => (b.leverage / b.effort) - (a.leverage / a.effort))

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs text-gray-500 font-medium border-b border-gray-800">
        <div className="col-span-5">Task</div>
        <div className="col-span-1 text-center">Score</div>
        <div className="col-span-2 text-center">Leverage</div>
        <div className="col-span-2 text-center">Effort</div>
        <div className="col-span-1 text-center">Source</div>
        <div className="col-span-1 text-center">Actions</div>
      </div>

      {sorted.map((task, i) => {
        const q = getQuadrantStyle(task.leverage, task.effort)
        const score = task.leverage / task.effort
        const expanded = expandedId === task.id

        return (
          <div key={task.id} className="rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div
              className="grid grid-cols-12 gap-3 px-4 py-3 items-center cursor-pointer"
              onClick={() => setExpandedId(expanded ? null : task.id)}
            >
              {/* Task title */}
              <div className="col-span-5 flex items-center gap-2">
                <span className="text-xs text-gray-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${q.dot}`} />
                <span className="text-sm text-gray-200 leading-snug line-clamp-1">{task.title}</span>
                {expanded ? <ChevronUp size={12} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={12} className="text-gray-500 flex-shrink-0" />}
              </div>

              {/* Priority score */}
              <div className="col-span-1 text-center">
                <span className={`text-sm font-semibold ${q.text}`}>{score.toFixed(1)}</span>
              </div>

              {/* Leverage */}
              <div className="col-span-2 flex items-center gap-1.5">
                <input
                  type="range" min={1} max={10} value={task.leverage}
                  onChange={e => { e.stopPropagation(); onUpdate(task.id, { leverage: Number(e.target.value) }) }}
                  onClick={e => e.stopPropagation()}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-gray-400 w-4 text-right">{task.leverage}</span>
              </div>

              {/* Effort */}
              <div className="col-span-2 flex items-center gap-1.5">
                <input
                  type="range" min={1} max={10} value={task.effort}
                  onChange={e => { e.stopPropagation(); onUpdate(task.id, { effort: Number(e.target.value) }) }}
                  onClick={e => e.stopPropagation()}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <span className="text-xs text-gray-400 w-4 text-right">{task.effort}</span>
              </div>

              {/* Source */}
              <div className="col-span-1 text-center text-sm">
                {getSourceEmoji(task.source)}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); onDone(task.id) }}
                  className="p-1 rounded hover:bg-emerald-900/50 text-gray-500 hover:text-emerald-400 transition-colors"
                  title="Mark done"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onKill(task.id) }}
                  className="p-1 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors"
                  title="Kill task"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
              <div className="px-4 pb-3 pt-0 border-t border-gray-800">
                <div className="flex items-start gap-4 pt-3">
                  <div className="flex-1 space-y-2">
                    {/* AI overview for Slack tasks */}
                    {task.source === 'slack' && task.metadata?.ai_overview && (
                      <div className="rounded-md bg-blue-950/40 border border-blue-800/40 px-3 py-2">
                        <p className="text-xs text-blue-300 leading-relaxed">{task.metadata.ai_overview}</p>
                      </div>
                    )}

                    {/* Sender/channel badge for Slack tasks */}
                    {task.source === 'slack' && (task.metadata?.sender_name || task.metadata?.channel_name) && (
                      <p className="text-xs text-gray-500">
                        {task.metadata.sender_name && <span>From <span className="text-gray-400">@{task.metadata.sender_name}</span></span>}
                        {task.metadata.sender_name && task.metadata.channel_name && <span> in </span>}
                        {task.metadata.channel_name && <span className="text-gray-400">#{task.metadata.channel_name}</span>}
                      </p>
                    )}

                    {task.description && (
                      <p className="text-xs text-gray-400 leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${q.text}`}>{q.label}</span>
                      <span className="text-xs text-gray-600">
                        Added {new Date(task.created_at).toLocaleDateString()}
                      </span>
                      {task.context_url && (
                        <a
                          href={task.context_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <ExternalLink size={11} /> View source
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
