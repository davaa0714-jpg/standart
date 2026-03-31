import { cn } from '@/lib/utils'
import type { TaskStatus, TaskType, Priority } from '@/types/database'
import { STATUS_LABELS, TASK_TYPE_LABELS, PRIORITY_LABELS } from '@/types/database'

// ── STATUS PILL ───────────────────────────────────────────────────
const statusStyles: Record<TaskStatus, string> = {
  new:         'bg-primary/15 text-primary-light border-primary/20',
  in_progress: 'bg-warn/15 text-warn-light border-warn/20',
  submitted:   'bg-purple/15 text-purple-light border-purple/20',
  reviewing:   'bg-cyan/15 text-cyan-light border-cyan/20',
  done:        'bg-accent/15 text-accent-light border-accent/20',
  overdue:     'bg-danger/15 text-danger-light border-danger/20',
}

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span className={cn('inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', statusStyles[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── TYPE TAG ──────────────────────────────────────────────────────
const typeStyles: Record<TaskType, string> = {
  uureg:     'bg-primary/15 text-primary-light border-primary/25',
  daalgavar: 'bg-purple/15 text-purple-light border-purple/25',
  medeelel:  'bg-cyan/15 text-cyan-light border-cyan/25',
}

export function TypeTag({ type }: { type: TaskType }) {
  return (
    <span className={cn('inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide', typeStyles[type])}>
      {TASK_TYPE_LABELS[type]}
    </span>
  )
}

// ── PRIORITY DOT ──────────────────────────────────────────────────
const prioStyles: Record<Priority, string> = {
  high: 'bg-danger-light',
  mid:  'bg-warn-light',
  low:  'bg-accent-light',
}

export function PriorityDot({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', prioStyles[priority])} />
      {showLabel && <span className="text-xs text-tx2">{PRIORITY_LABELS[priority]}</span>}
    </span>
  )
}

// ── BADGE ─────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }: {
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'warn' | 'success'
}) {
  const styles = {
    default: 'bg-surface3 border-border text-tx3',
    danger:  'bg-danger/15 border-danger/30 text-danger-light',
    warn:    'bg-warn/15 border-warn/30 text-warn-light',
    success: 'bg-accent/15 border-accent/30 text-accent-light',
  }
  return (
    <span className={cn('inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border', styles[variant])}>
      {children}
    </span>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────────────
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 80 ? '' : value >= 40 ? 'warn' : 'danger'
  return (
    <div className={cn('progress-bar', className)}>
      <div className={cn('progress-fill', color && `progress-fill ${color}`)} style={{ width: `${value}%` }} />
    </div>
  )
}
