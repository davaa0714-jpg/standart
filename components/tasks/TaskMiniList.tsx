import Link from 'next/link'
import { StatusPill, TypeTag, ProgressBar } from '@/components/ui/Badges'
import type { TaskFull } from '@/types/database'

interface TaskMiniListProps {
  tasks: TaskFull[]
}

export function TaskMiniList({ tasks }: TaskMiniListProps) {
  if (!tasks.length) return null

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {tasks.map((t: TaskFull) => (
        <Link
          key={t.id}
          href={`/tasks/${t.id}`}
          className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface2 transition-colors group"
        >
          <TypeTag type={t.task_type} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate group-hover:text-accent-light">{t.title}</div>
            <div className="text-xs text-tx3 font-mono mt-0.5">
              {t.deadline}
              {t.assignee_name ? ` · ${t.assignee_name}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-14">
              <ProgressBar value={t.progress} />
              <div className="text-[10px] text-tx3 font-mono text-right">{t.progress}%</div>
            </div>
            <StatusPill status={t.status} />
          </div>
        </Link>
      ))}
    </div>
  )
}
