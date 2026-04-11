import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusPill, TypeTag, ProgressBar, Badge } from '@/components/ui/Badges'
import { ExportButton } from '@/components/export/ExportButton'
import type { TaskFull, Profile, MeetingStats } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: meeting } = await supabase.from('meetings').select('*').eq('id', params.id).single()
  if (!meeting) notFound()

  const { data: tasks } = await supabase
    .from('tasks_full').select('*').eq('meeting_id', params.id).order('deadline') as { data: TaskFull[] | null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: Profile | null }
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const pct = tasks ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0

  const totalTasks = tasks?.length || 0
  const doneTasks = tasks?.filter(t => t.status === 'done').length || 0
  const overdueTasks = tasks?.filter(t => t.status === 'overdue').length || 0

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Breadcrumb */}
      <div className="text-xs text-tx3 mb-4">
        <Link href="/admin/meetings" className="hover:text-tx">Khurluud</Link> / <span className="text-tx2">{new Date(meeting.meeting_date).toLocaleDateString('mn-MN')}</span>
      </div>

      {/* Header */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={meeting.status === 'scheduled' ? 'success' : 'default'}>
                {meeting.status === 'scheduled' ? 'Tovlogdson' : meeting.status === 'held' ? 'Bolson' : 'Tsutsuldsan'}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">Khural - {new Date(meeting.meeting_date).toLocaleDateString('mn-MN')}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-tx2">
              <span className="font-mono">{new Date(meeting.meeting_date).toLocaleDateString('mn-MN')}</span>
              {meeting.held_date && <span>Bolson: {new Date(meeting.held_date).toLocaleDateString('mn-MN')}</span>}
              {meeting.location && <span> : {meeting.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && <ExportButton tasks={tasks ?? []} title={`Khural - ${new Date(meeting.meeting_date).toLocaleDateString('mn-MN')}`} />}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-tx3 mb-1.5">
            <span>Niit biyelelt</span>
            <span className="font-mono font-bold text-tx">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Niit', val: totalTasks, color: 'text-primary-light' },
            { label: 'Bielsn', val: doneTasks, color: 'text-accent-light' },
            { label: 'Uldsn', val: totalTasks - doneTasks, color: 'text-warn-light' },
            { label: 'Khetrsen', val: overdueTasks, color: 'text-danger-light' },
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
          <h2 className="text-sm font-bold">Uureg daalgavaruud</h2>
          <span className="text-xs text-tx3">{tasks?.length ?? 0} uureg</span>
        </div>
        {!tasks?.length ? (
          <div className="text-center py-12 text-tx3 text-sm">Uureg baikhgui baina</div>
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
