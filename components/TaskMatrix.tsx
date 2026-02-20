'use client'

import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts'
import { Task } from '@/lib/supabase'
import { ExternalLink, Check, X, Slack } from 'lucide-react'

type Props = {
  tasks: Task[]
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDone: (id: string) => void
  onKill: (id: string) => void
}

function getQuadrant(leverage: number, effort: number) {
  if (leverage >= 6 && effort <= 5) return { label: 'Quick Win', color: '#10b981', bg: 'bg-emerald-900/30 border-emerald-700' }
  if (leverage >= 6 && effort >= 6) return { label: 'Big Bet', color: '#3b82f6', bg: 'bg-blue-900/30 border-blue-700' }
  if (leverage < 6 && effort <= 5) return { label: 'Fill-in', color: '#eab308', bg: 'bg-yellow-900/30 border-yellow-700' }
  return { label: 'Eliminate', color: '#ef4444', bg: 'bg-red-900/30 border-red-700' }
}

function getSourceIcon(source: string) {
  if (source === 'slack') return '💬'
  if (source === 'airtable') return '📋'
  return '✏️'
}

const CustomDot = (props: {
  cx?: number; cy?: number; payload?: Task;
  onClick: (task: Task) => void; selected: boolean
}) => {
  const { cx = 0, cy = 0, payload, onClick, selected } = props
  if (!payload) return null
  const { color } = getQuadrant(payload.leverage, payload.effort)
  const label = (payload.title || '').slice(0, 18)
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onClick(payload)}>
      <circle
        cx={cx}
        cy={cy}
        r={selected ? 10 : 7}
        fill={color}
        stroke={selected ? '#fff' : 'transparent'}
        strokeWidth={2}
        style={{ transition: 'r 0.15s' }}
      />
      <text
        x={cx}
        y={cy - 11}
        textAnchor="middle"
        fill="rgba(255,255,255,0.8)"
        fontSize={9}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Task }[] }) => {
  if (!active || !payload?.length) return null
  const task = payload[0].payload
  const { label } = getQuadrant(task.leverage, task.effort)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl max-w-xs">
      <p className="text-sm font-medium text-gray-100 mb-1">{task.title}</p>
      <div className="flex gap-3 text-xs text-gray-400">
        <span>Leverage: <strong className="text-gray-200">{task.leverage}</strong></span>
        <span>Effort: <strong className="text-gray-200">{task.effort}</strong></span>
        <span className="text-gray-500">{label}</span>
      </div>
    </div>
  )
}

export function TaskMatrix({ tasks, onUpdate, onDone, onKill }: Props) {
  const [selected, setSelected] = useState<Task | null>(null)

  const chartData = tasks.map(t => ({ ...t, x: t.effort, y: t.leverage }))

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 520 }}>
      {/* Matrix chart */}
      <div className="flex-1 relative">
        {/* Quadrant labels */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{ left: 60, right: 20, top: 8, bottom: 50 }}>
          <div className="absolute top-2 left-2 text-xs text-emerald-500/60 font-medium">Quick Wins ↗</div>
          <div className="absolute top-2 right-2 text-xs text-blue-500/60 font-medium">Big Bets ↗</div>
          <div className="absolute bottom-2 left-2 text-xs text-yellow-500/60 font-medium">Fill-ins</div>
          <div className="absolute bottom-2 right-2 text-xs text-red-500/60 font-medium">Eliminate ✕</div>
        </div>

        <ResponsiveContainer width="100%" height={520}>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              type="number" dataKey="x" domain={[0, 11]} name="Effort"
              label={{ value: 'Effort →', position: 'bottom', fill: '#6b7280', fontSize: 12 }}
              ticks={[1,2,3,4,5,6,7,8,9,10]}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              stroke="#374151"
            />
            <YAxis
              type="number" dataKey="y" domain={[0, 11]} name="Leverage"
              label={{ value: 'Leverage ↑', angle: -90, position: 'left', fill: '#6b7280', fontSize: 12, dx: -12 }}
              ticks={[1,2,3,4,5,6,7,8,9,10]}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              stroke="#374151"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={5.5} stroke="#374151" strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine y={5.5} stroke="#374151" strokeDasharray="4 4" strokeWidth={1.5} />
            <Scatter data={chartData} shape={(props) => (
              <CustomDot
                {...props}
                onClick={(task) => setSelected(selected?.id === task.id ? null : task)}
                selected={selected?.id === props.payload?.id}
              />
            )}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={getQuadrant(entry.leverage, entry.effort).color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-600 text-center -mt-2">Click a dot to inspect and score</p>
      </div>

      {/* Side panel — selected task or instruction */}
      <div className="w-80 flex-shrink-0">
        {selected ? (
          <div className={`rounded-xl border p-4 ${getQuadrant(selected.leverage, selected.effort).bg} h-full flex flex-col gap-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 mb-2 inline-block">
                  {getSourceIcon(selected.source)} {selected.source}
                </span>
                <h3 className="text-sm font-semibold text-gray-100 leading-snug">{selected.title}</h3>
                {selected.description && (
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{selected.description}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
                <X size={14} />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Quadrant</p>
              <span className="text-sm font-semibold" style={{ color: getQuadrant(selected.leverage, selected.effort).color }}>
                {getQuadrant(selected.leverage, selected.effort).label}
              </span>
            </div>

            {/* Leverage slider */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Leverage (ROI)</span>
                <span className="font-semibold text-gray-200">{selected.leverage}/10</span>
              </div>
              <input
                type="range" min={1} max={10} value={selected.leverage}
                onChange={e => onUpdate(selected.id, { leverage: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                <span>Low ROI</span><span>High ROI</span>
              </div>
            </div>

            {/* Effort slider */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Effort</span>
                <span className="font-semibold text-gray-200">{selected.effort}/10</span>
              </div>
              <input
                type="range" min={1} max={10} value={selected.effort}
                onChange={e => onUpdate(selected.id, { effort: Number(e.target.value) })}
                className="w-full accent-red-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                <span>Quick</span><span>Months</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <p className="text-xs text-gray-500">
                Priority score: <strong className="text-gray-300">{(selected.leverage / selected.effort).toFixed(2)}</strong>
              </p>
              {selected.context_url && (
                <a
                  href={selected.context_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <ExternalLink size={12} /> View source
                </a>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { onDone(selected.id); setSelected(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                >
                  <Check size={12} /> Done
                </button>
                <button
                  onClick={() => { onKill(selected.id); setSelected(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-300 transition-colors"
                >
                  <X size={12} /> Kill
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 h-full flex flex-col justify-center items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <Slack size={20} className="text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Click any dot to score it</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Drag the sliders to set leverage and effort. The dot will move to the right quadrant instantly.
            </p>
            <div className="mt-2 text-xs text-gray-600 space-y-1.5 text-left w-full">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" /><span>Top-left = do first</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" /><span>Top-right = schedule</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" /><span>Bottom-left = if time</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" /><span>Bottom-right = eliminate</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
