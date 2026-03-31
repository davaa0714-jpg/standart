import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusPill, TypeTag, ProgressBar, Badge } from '@/components/ui/Badges'
import { ExportButton } from '@/components/export/ExportButton'
import type { TaskFull } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: meeting } = await supabase.from('meeting_stats').select('*').eq('id', params.id).single()
  if (!meeting) notFound()

  const { data: tasks } = await supabase
    .from('tasks_full').select('*').eq('meeting_id', params.id).order('deadline')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const pct = meeting.total_tasks ? Math.round(meeting.done_tasks / meeting.total_tasks * 100) : 0

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Breadcrumb */}
      <div className="text-xs text-tx3 mb-4">
        <Link href="/meetings" className="hover:text-tx">Хурлууд</Link> / <span className="text-tx2">{meeting.title}</span>
      </div>

      {/* Header */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={meeting.status === 'open' ? 'success' : 'default'}>
                {meeting.status === 'open' ? 'Нээлттэй' : 'Хаагдсан'}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">{meeting.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-tx2">
              <span className="font-mono">{meeting.held_at}</span>
              {meeting.chair_name && <span>Даргалагч: {meeting.chair_name}</span>}
              {(meeting as any).location && <span>📍 {(meeting as any).location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && <ExportButton tasks={tasks ?? []} title={meeting.title} />}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-tx3 mb-1.5">
            <span>Нийт биелэлт</span>
            <span className="font-mono font-bold text-tx">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Нийт', val: meeting.total_tasks, color: 'text-primary-light' },
            { label: 'Биелсэн', val: meeting.done_tasks, color: 'text-accent-light' },
            { label: 'Үлдсэн', val: meeting.total_tasks - meeting.done_tasks, color: 'text-warn-light' },
            { label: 'Хэтэрсэн', val: meeting.overdue_tasks, color: 'text-danger-light' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-surface2 rounded p-3 text-center">
              <div className={`text-xl font-bold font-mono ${color}`}>{val}</div>
              <div className="text-[11px] text-tx3">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-surface2 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold">Үүрэг даалгаварууд</h2>
          <span className="text-xs text-tx3">{tasks?.length ?? 0} үүрэг</span>
        </div>
        {!tasks?.length ? (
          <div className="text-center py-12 text-tx3 text-sm">Үүрэг байхгүй байна</div>
        ) : tasks.map((task: TaskFull) => (
          <Link key={task.id} href={`/tasks/${task.id}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface2 transition-colors group"
          >
            <TypeTag type={task.task_type} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate group-hover:text-accent-light">{task.title}</div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-tx3">
                <span>{task.assignee_name ?? '—'}</span>
                <span className="font-mono">{task.deadline}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-16">
                <ProgressBar value={task.progress} />
                <div className="text-[10px] text-tx3 font-mono text-right">{task.progress}%</div>
              </div>
              <StatusPill status={task.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
