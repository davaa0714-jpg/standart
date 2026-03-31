'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusPill, TypeTag, PriorityDot, ProgressBar } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { TaskFormModal } from './TaskFormModal'
import type { TaskFull, TaskStatus, TaskType } from '@/types/database'

interface TasksClientProps {
  tasks: TaskFull[]
  orgId: string
  currentUserId: string
  canCreate: boolean
}

export function TasksClient({ tasks, orgId, currentUserId, canCreate }: TasksClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState<TaskStatus | ''>('')
  const [typeF, setTypeF]         = useState<TaskType | ''>('')
  const [showForm, setShowForm]   = useState(false)

  const filtered = tasks.filter(t => {
    if (statusF && t.status !== statusF) return false
    if (typeF && t.task_type !== typeF) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.assignee_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const refresh = () => startTransition(() => router.refresh())

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        {canCreate && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            ＋ Шинэ үүрэг
          </Button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0 bg-surface border border-border rounded px-3 py-2">
          <span className="text-tx3 text-sm">🔍</span>
          <input
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-tx3"
            placeholder="Үүрэг, хариуцагч хайх..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusF} onChange={e => setStatusF(e.target.value as any)} className="w-44">
          <option value="">Бүх төлөв</option>
          <option value="new">Шинэ</option>
          <option value="in_progress">Хийгдэж байна</option>
          <option value="submitted">Биелэлт илгээсэн</option>
          <option value="reviewing">Хянагдаж байна</option>
          <option value="done">Биелсэн</option>
          <option value="overdue">Хугацаа хэтэрсэн</option>
        </Select>
        <Select value={typeF} onChange={e => setTypeF(e.target.value as any)} className="w-36">
          <option value="">Бүх төрөл</option>
          <option value="uureg">Үүрэг</option>
          <option value="daalgavar">Даалгавар</option>
          <option value="medeelel">Мэдээлэл</option>
        </Select>
        <span className="text-xs text-tx3 ml-auto">{filtered.length} үүрэг</span>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[28px_1fr_110px_130px_120px_100px_70px] gap-2 px-4 py-2.5 bg-surface2 border-b border-border text-[11px] font-bold text-tx3 uppercase tracking-wide">
          <div />
          <div>Үүрэг / Даалгавар</div>
          <div>Төрөл</div>
          <div>Хариуцагч</div>
          <div>Хугацаа</div>
          <div>Төлөв</div>
          <div>%</div>
        </div>

        {/* Rows */}
        {!filtered.length ? (
          <div className="text-center py-14 text-tx3">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-sm">Үүрэг олдсонгүй</div>
          </div>
        ) : (
          filtered.map(task => <TaskRow key={task.id} task={task} />)
        )}
      </div>

      {/* Modal */}
      <TaskFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refresh}
        orgId={orgId}
        currentUserId={currentUserId}
      />
    </>
  )
}

function TaskRow({ task }: { task: TaskFull }) {
  const isOverdue = task.status === 'overdue'
  const deadlineClass = isOverdue
    ? 'text-danger-light'
    : task.is_overdue ? 'text-warn-light' : 'text-tx2'

  return (
    <Link
      href={`/tasks/${task.id}`}
      className={`flex flex-col md:grid md:grid-cols-[28px_1fr_110px_130px_120px_100px_70px] gap-2 px-4 py-3 border-b border-border last:border-0 hover:bg-surface2 transition-colors group ${isOverdue ? 'bg-danger/[0.03]' : ''}`}
    >
      {/* Checkbox visual */}
      <div className="hidden md:flex items-center">
        <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.status === 'done' ? 'bg-accent border-accent' : 'border-border2'}`}>
          {task.status === 'done' && <span className="text-[8px] text-white font-bold">✓</span>}
        </div>
      </div>

      {/* Title */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <TypeTag type={task.task_type} />
          <PriorityDot priority={task.priority} />
          {isOverdue && <span className="text-[10px] font-bold text-danger-light">● ХУГАЦАА ХЭТЭРСЭН</span>}
        </div>
        <div className="text-sm font-medium truncate group-hover:text-accent-light transition-colors">{task.title}</div>
        {task.meeting_title && <div className="text-[11px] text-tx3 truncate">{task.meeting_title}</div>}
      </div>

      {/* Type — hidden on mobile (shown in title row) */}
      <div className="hidden md:flex items-center">
        <TypeTag type={task.task_type} />
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center text-[9px] font-bold text-primary-light flex-shrink-0">
          {task.assignee_name?.[0] ?? '?'}
        </div>
        <span className="text-xs text-tx2 truncate">{task.assignee_name ?? '—'}</span>
      </div>

      {/* Deadline */}
      <div className={`flex items-center text-xs font-mono ${deadlineClass}`}>
        {task.deadline}
        {isOverdue && task.days_overdue && (
          <span className="ml-1 text-[10px]">({task.days_overdue}ш хэтэрсэн)</span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        <StatusPill status={task.status} />
      </div>

      {/* Progress */}
      <div className="flex flex-col justify-center gap-1">
        <ProgressBar value={task.progress} />
        <div className="text-[10px] text-tx3 font-mono text-right">{task.progress}%</div>
      </div>
    </Link>
  )
}
