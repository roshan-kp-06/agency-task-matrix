'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TaskMatrix } from '@/components/TaskMatrix'
import { TaskList } from '@/components/TaskList'
import { AddTaskPanel } from '@/components/AddTaskPanel'
import { Task, Urgency } from '@/lib/supabase'
import {
  LayoutGrid, List, Plus, RefreshCw, Download, Check, X, Zap, Database,
  Flame, Calendar,
} from 'lucide-react'

type View = 'today' | 'this_week' | 'all' | 'matrix' | 'list' | 'quick-wins' | 'big-bets'
type SourceFilter = 'all' | 'slack' | 'airtable' | 'manual'
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

function isQuickWin(t: Task) { return t.leverage >= 6 && t.effort <= 5 }
function isBigBet(t: Task) { return t.leverage >= 6 && t.effort >= 6 }

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('today')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
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
        setStorageMode('local')
        setTasks(localLoad().filter(t => t.status === 'active'))
      } else {
        setStorageMode('supabase')
        setTasks(Array.isArray(data) ? data : [])
      }
    } catch {
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
    urgency: Urgency
    category: string | null
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
        urgency: taskInput.urgency,
        category: taskInput.category,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
        context_url: null,
        tags: [],
        metadata: null,
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
    setTimeout(() => setStatus({ loading: false, message: '', type: 'idle' }), 5000)
  }

  // Source counts (always from full task list, not filtered)
  const sourceCounts = {
    all: tasks.length,
    slack: tasks.filter(t => t.source === 'slack').length,
    airtable: tasks.filter(t => t.source === 'airtable').length,
    manual: tasks.filter(t => t.source === 'manual').length,
  }

  // Urgency counts
  const urgencyCounts = {
    today: tasks.filter(t => t.urgency === 'today').length,
    this_week: tasks.filter(t => t.urgency === 'today' || t.urgency === 'this_week').length,
  }

  // Get unique categories
  const categories = useMemo(() =>
    [...new Set(tasks.map(t => t.category).filter(Boolean))] as string[],
  [tasks])

  // Apply source filter first
  const sourceFiltered = sourceFilter === 'all' ? tasks : tasks.filter(t => t.source === sourceFilter)

  // Apply category filter
  const categoryFiltered = categoryFilter
    ? sourceFiltered.filter(t => t.category === categoryFilter || t.category?.startsWith(categoryFilter + ' >'))
    : sourceFiltered

  // Then apply view filter
  const visibleTasks = view === 'today'
    ? categoryFiltered.filter(t => t.urgency === 'today')
    : view === 'this_week'
    ? categoryFiltered.filter(t => t.urgency === 'today' || t.urgency === 'this_week')
    : view === 'quick-wins'
    ? categoryFiltered.filter(isQuickWin)
    : view === 'big-bets'
    ? categoryFiltered.filter(isBigBet)
    : categoryFiltered

  const viewLabels: Record<View, string> = {
    today: 'Today',
    this_week: 'This Week',
    all: 'All Tasks',
    matrix: 'Matrix',
    list: 'List',
    'quick-wins': 'Quick Wins',
    'big-bets': 'Big Bets',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Local mode banner */}
      {storageMode === 'local' && (
        <div className="bg-amber-900/40 border-b border-amber-800/50 px-6 py-2 text-center">
          <p className="text-xs text-amber-300 flex items-center justify-center gap-1.5">
            <Database size={12} />
            <strong>Local mode</strong> — tasks saved in this browser only. Add Supabase env vars to sync across devices.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 0px)' }}>
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Task Matrix</span>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-5 overflow-y-auto">
            {/* URGENCY VIEWS */}
            <div>
              <p className="px-2 mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Focus</p>
              <button
                onClick={() => setView('today')}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                  view === 'today'
                    ? 'bg-red-600/20 text-red-300 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span className="flex items-center gap-2"><Flame size={13} /> Today</span>
                {urgencyCounts.today > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    view === 'today' ? 'bg-red-600/30 text-red-300' : 'bg-gray-800 text-gray-500'
                  }`}>{urgencyCounts.today}</span>
                )}
              </button>
              <button
                onClick={() => setView('this_week')}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                  view === 'this_week'
                    ? 'bg-amber-600/20 text-amber-300 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span className="flex items-center gap-2"><Calendar size={13} /> This Week</span>
                {urgencyCounts.this_week > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    view === 'this_week' ? 'bg-amber-600/30 text-amber-300' : 'bg-gray-800 text-gray-500'
                  }`}>{urgencyCounts.this_week}</span>
                )}
              </button>
            </div>

            {/* VIEWS */}
            <div>
              <p className="px-2 mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Views</p>
              {(['all', 'matrix', 'list', 'quick-wins', 'big-bets'] as View[]).map((v) => {
                const icons: Record<string, React.ReactNode> = {
                  all: <List size={13} />,
                  matrix: <LayoutGrid size={13} />,
                  list: <List size={13} />,
                  'quick-wins': <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 inline-block" />,
                  'big-bets': <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 inline-block" />,
                }
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                      view === v
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    {icons[v]}
                    <span>{viewLabels[v]}</span>
                  </button>
                )
              })}
            </div>

            {/* CATEGORIES */}
            {categories.length > 0 && (
              <div>
                <p className="px-2 mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Categories</p>
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                    categoryFilter === null
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  All Categories
                </button>
                {categories.sort().map(c => {
                  const count = tasks.filter(t => t.category === c || t.category?.startsWith(c + ' >')).length
                  return (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                        categoryFilter === c
                          ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`}
                    >
                      <span className="truncate">{c}</span>
                      {count > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          categoryFilter === c ? 'bg-indigo-600/30 text-indigo-300' : 'bg-gray-800 text-gray-500'
                        }`}>{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* SOURCES */}
            <div>
              <p className="px-2 mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Sources</p>
              {(['all', 'slack', 'airtable', 'manual'] as SourceFilter[]).map((s) => {
                const labels = { all: 'All', slack: 'Slack', airtable: 'Airtable', manual: 'Manual' }
                const count = sourceCounts[s]
                return (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                      sourceFilter === s
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <span>{labels[s]}</span>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        sourceFilter === s ? 'bg-indigo-600/30 text-indigo-300' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Sidebar footer — import + add */}
          <div className="px-2 py-3 border-t border-gray-800 space-y-1.5">
            <button
              onClick={() => handleImport('slack')}
              disabled={slackStatus.loading}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 disabled:opacity-50 transition-colors"
            >
              {slackStatus.loading
                ? <RefreshCw size={13} className="animate-spin text-gray-500" />
                : <Download size={13} />}
              <span>Import Slack</span>
              {slackStatus.type === 'success' && <Check size={12} className="text-emerald-400 ml-auto" />}
              {slackStatus.type === 'error' && <X size={12} className="text-red-400 ml-auto" />}
            </button>

            <button
              onClick={() => handleImport('airtable')}
              disabled={airtableStatus.loading}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 disabled:opacity-50 transition-colors"
            >
              {airtableStatus.loading
                ? <RefreshCw size={13} className="animate-spin text-gray-500" />
                : <Download size={13} />}
              <span>Import Airtable</span>
              {airtableStatus.type === 'success' && <Check size={12} className="text-emerald-400 ml-auto" />}
              {airtableStatus.type === 'error' && <X size={12} className="text-red-400 ml-auto" />}
            </button>

            <button
              onClick={() => setShowAddPanel(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus size={13} />
              <span>Add Task</span>
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-200">{viewLabels[view]}</h2>
              {sourceFilter !== 'all' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">
                  {sourceFilter}
                </span>
              )}
              {categoryFilter && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter(null)} className="hover:text-white"><X size={10} /></button>
                </span>
              )}
              <span className="text-xs text-gray-600">{visibleTasks.length} tasks</span>
            </div>

            <button
              onClick={fetchTasks}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </header>

          {/* Import status messages */}
          {(slackStatus.message || airtableStatus.message) && (
            <div className="px-6 py-2 flex gap-3 border-b border-gray-800 bg-gray-900/50">
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

          {/* Content */}
          <main className="flex-1 p-6 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <RefreshCw size={20} className="animate-spin mr-2" /> Loading tasks...
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
                <Zap size={32} className="text-gray-700" />
                <p className="text-lg font-medium text-gray-400">
                  {tasks.length === 0
                    ? 'No active tasks'
                    : view === 'today'
                    ? 'Nothing due today'
                    : view === 'this_week'
                    ? 'Nothing due this week'
                    : `No ${view === 'quick-wins' ? 'Quick Win' : view === 'big-bets' ? 'Big Bet' : ''} tasks${sourceFilter !== 'all' ? ` from ${sourceFilter}` : ''}`}
                </p>
                {tasks.length === 0 && (
                  <>
                    <p className="text-sm">Add a task manually or import from Slack / Airtable</p>
                    <button
                      onClick={() => setShowAddPanel(true)}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                    >
                      <Plus size={14} /> Add your first task
                    </button>
                  </>
                )}
              </div>
            ) : view === 'matrix' ? (
              <TaskMatrix tasks={visibleTasks} onUpdate={updateTask} onDone={markDone} onKill={killTask} />
            ) : (
              <TaskList
                tasks={visibleTasks}
                onUpdate={updateTask}
                onDone={markDone}
                onKill={killTask}
                showUrgency={view !== 'today'}
              />
            )}
          </main>
        </div>
      </div>

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
