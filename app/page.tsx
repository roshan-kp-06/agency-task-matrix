'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskMatrix } from '@/components/TaskMatrix'
import { TaskList } from '@/components/TaskList'
import { AddTaskPanel } from '@/components/AddTaskPanel'
import { Task } from '@/lib/supabase'
import { LayoutGrid, List, Plus, RefreshCw, Download, Check, X, Zap, Database } from 'lucide-react'

type View = 'matrix' | 'list'
type StorageMode = 'supabase' | 'local' | 'detecting'
type ImportStatus = { loading: boolean; message: string; type: 'idle' | 'success' | 'error' }

const LOCAL_STORAGE_KEY = 'task-matrix-tasks'

function localLoad(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function localSave(tasks: Task[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    console.error('Failed to save tasks to localStorage')
  }
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('matrix')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [storageMode, setStorageMode] = useState<StorageMode>('detecting')
  const [slackStatus, setSlackStatus] = useState<ImportStatus>({ loading: false, message: '', type: 'idle' })
  const [airtableStatus, setAirtableStatus] = useState<ImportStatus>({ loading: false, message: '', type: 'idle' })

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks?status=active')
      const data = await res.json()
      if (data.supabaseNotConfigured) {
        // Fall back to localStorage
        setStorageMode('local')
        setTasks(localLoad().filter(t => t.status === 'active'))
      } else {
        setStorageMode('supabase')
        setTasks(Array.isArray(data) ? data : [])
      }
    } catch {
      // Network error — also fall back to localStorage
      setStorageMode('local')
      setTasks(localLoad().filter(t => t.status === 'active'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    setTasks(updated)

    if (storageMode === 'local') {
      const allTasks = localLoad()
      localSave(allTasks.map(t => t.id === id ? { ...t, ...updates } : t))
    } else {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    }
  }

  const removeFromView = async (id: string, status: 'completed' | 'killed') => {
    setTasks(prev => prev.filter(t => t.id !== id))

    if (storageMode === 'local') {
      const allTasks = localLoad()
      localSave(allTasks.map(t => t.id === id ? { ...t, status } : t))
    } else {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    }
  }

  const markDone = (id: string) => removeFromView(id, 'completed')
  const killTask = (id: string) => removeFromView(id, 'killed')

  const addTask = async (taskInput: {
    title: string
    description: string
    source: 'manual'
    leverage: number
    effort: number
  }) => {
    if (storageMode === 'local') {
      const newTask: Task = {
        id: generateId(),
        title: taskInput.title,
        description: taskInput.description || null,
        source: taskInput.source,
        source_id: null,
        leverage: taskInput.leverage,
        effort: taskInput.effort,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
        context_url: null,
        tags: [],
      }
      const allTasks = localLoad()
      localSave([newTask, ...allTasks])
      setTasks(prev => [newTask, ...prev])
      setShowAddPanel(false)
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })
      const newTask = await res.json()
      setTasks(prev => [newTask, ...prev])
      setShowAddPanel(false)
    }
  }

  const handleImport = async (source: 'slack' | 'airtable') => {
    const setStatus = source === 'slack' ? setSlackStatus : setAirtableStatus
    setStatus({ loading: true, message: 'Importing...', type: 'idle' })
    try {
      const res = await fetch(`/api/import/${source}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setStatus({ loading: false, message: data.error, type: 'error' })
      } else {
        setStatus({
          loading: false,
          message: `${data.imported} imported, ${data.skipped} already exist`,
          type: 'success',
        })
        if (data.imported > 0) await fetchTasks()
      }
    } catch (err) {
      setStatus({ loading: false, message: String(err), type: 'error' })
    }
    setTimeout(() => setStatus({ loading: false, message: '', type: 'idle' }), 4000)
  }

  const quadrantCounts = {
    quick_win: tasks.filter(t => t.leverage >= 6 && t.effort <= 5).length,
    big_bet: tasks.filter(t => t.leverage >= 6 && t.effort >= 6).length,
    fill_in: tasks.filter(t => t.leverage < 6 && t.effort <= 5).length,
    eliminate: tasks.filter(t => t.leverage < 6 && t.effort >= 6).length,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Local mode banner */}
      {storageMode === 'local' && (
        <div className="bg-amber-900/40 border-b border-amber-800/50 px-6 py-2 text-center">
          <p className="text-xs text-amber-300 flex items-center justify-center gap-1.5">
            <Database size={12} />
            <span>
              <strong>Local mode</strong> — tasks saved in this browser only. To sync across devices,{' '}
              add <code className="bg-amber-900/60 px-1 rounded text-amber-200">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="bg-amber-900/60 px-1 rounded text-amber-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel env vars.
            </span>
          </p>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Task Matrix</h1>
            <span className="text-gray-500 text-sm">{tasks.length} active</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Import buttons */}
            <button
              onClick={() => handleImport('slack')}
              disabled={slackStatus.loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {slackStatus.loading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Slack</span>
              {slackStatus.type === 'success' && <Check size={13} className="text-emerald-400" />}
              {slackStatus.type === 'error' && <X size={13} className="text-red-400" />}
            </button>
            <button
              onClick={() => handleImport('airtable')}
              disabled={airtableStatus.loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {airtableStatus.loading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Airtable</span>
              {airtableStatus.type === 'success' && <Check size={13} className="text-emerald-400" />}
              {airtableStatus.type === 'error' && <X size={13} className="text-red-400" />}
            </button>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden">
              <button
                onClick={() => setView('matrix')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === 'matrix' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'}`}
              >
                <LayoutGrid size={13} /> Matrix
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'}`}
              >
                <List size={13} /> List
              </button>
            </div>

            <button
              onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus size={13} /> Add Task
            </button>
          </div>
        </div>

        {/* Import status messages */}
        {(slackStatus.message || airtableStatus.message) && (
          <div className="max-w-7xl mx-auto mt-2 flex gap-3">
            {slackStatus.message && (
              <span className={`text-xs px-2 py-1 rounded ${slackStatus.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-gray-800 text-gray-400'}`}>
                Slack: {slackStatus.message}
              </span>
            )}
            {airtableStatus.message && (
              <span className={`text-xs px-2 py-1 rounded ${airtableStatus.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-gray-800 text-gray-400'}`}>
                Airtable: {airtableStatus.message}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Quadrant summary bar */}
      <div className="border-b border-gray-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-400">Quick Wins</span>
            <span className="font-semibold text-emerald-400">{quadrantCounts.quick_win}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-400">Big Bets</span>
            <span className="font-semibold text-blue-400">{quadrantCounts.big_bet}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-400">Fill-ins</span>
            <span className="font-semibold text-yellow-400">{quadrantCounts.fill_in}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400">Eliminate</span>
            <span className="font-semibold text-red-400">{quadrantCounts.eliminate}</span>
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
            <Zap size={32} className="text-gray-700" />
            <p className="text-lg font-medium text-gray-400">No active tasks</p>
            <p className="text-sm">Add a task manually or import from Slack / Airtable</p>
            <button
              onClick={() => setShowAddPanel(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus size={14} /> Add your first task
            </button>
          </div>
        ) : view === 'matrix' ? (
          <TaskMatrix tasks={tasks} onUpdate={updateTask} onDone={markDone} onKill={killTask} />
        ) : (
          <TaskList tasks={tasks} onUpdate={updateTask} onDone={markDone} onKill={killTask} />
        )}
      </main>

      {/* Add Task Panel */}
      {showAddPanel && (
        <AddTaskPanel
          onClose={() => setShowAddPanel(false)}
          onAdd={addTask}
        />
      )}
    </div>
  )
}
