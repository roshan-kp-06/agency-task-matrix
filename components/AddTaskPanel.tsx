'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'

type Props = {
  onClose: () => void
  onAdd: (task: {
    title: string
    description: string
    source: 'manual'
    leverage: number
    effort: number
  }) => Promise<void>
}

export function AddTaskPanel({ onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [leverage, setLeverage] = useState(5)
  const [effort, setEffort] = useState(5)
  const [saving, setSaving] = useState(false)

  const quadrantLabel = () => {
    if (leverage >= 6 && effort <= 5) return { label: 'Quick Win', color: 'text-emerald-400' }
    if (leverage >= 6 && effort >= 6) return { label: 'Big Bet', color: 'text-blue-400' }
    if (leverage < 6 && effort <= 5) return { label: 'Fill-in', color: 'text-yellow-400' }
    return { label: 'Eliminate', color: 'text-red-400' }
  }

  const q = quadrantLabel()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onAdd({ title: title.trim(), description, source: 'manual', leverage, effort })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Add Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Task title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Context, links, or details..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Leverage */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Leverage — how much ROI if completed?</span>
              <span className="font-semibold text-gray-200">{leverage}/10</span>
            </div>
            <input
              type="range" min={1} max={10} value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>Low ROI</span><span>Game-changing</span>
            </div>
          </div>

          {/* Effort */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Effort — how hard or time-consuming?</span>
              <span className="font-semibold text-gray-200">{effort}/10</span>
            </div>
            <input
              type="range" min={1} max={10} value={effort}
              onChange={e => setEffort(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>Quick</span><span>Weeks/months</span>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">This task is a</span>
            <span className={`text-sm font-semibold ${q.color}`}>{q.label}</span>
            <span className="text-xs text-gray-500">
              Score: <strong className="text-gray-300">{(leverage / effort).toFixed(2)}</strong>
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> {saving ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
