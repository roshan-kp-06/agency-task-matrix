import { Task } from './supabase'

const URGENCY_RANK: Record<string, number> = {
  today: 0,
  this_week: 1,
  whenever: 2,
}

export function prioritySort(a: Task, b: Task): number {
  const aRank = URGENCY_RANK[a.urgency] ?? 2
  const bRank = URGENCY_RANK[b.urgency] ?? 2
  if (aRank !== bRank) return aRank - bRank
  return (b.leverage / b.effort) - (a.leverage / a.effort)
}

export function priorityScore(task: Task): number {
  return task.leverage / task.effort
}
