import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { StaffStatTable } from '@/components/tasks/StaffStatTable'
import { TaskMiniList } from '@/components/tasks/TaskMiniList'
import { ProgressBar } from '@/components/ui/Badges'
import type { TaskFull, MeetingStats, Profile, TaskStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const orgId = profile?.org_id ?? ''

  const [
    { data: taskStatuses },
    { data: staffStats },
    { data: urgentTasks },
    { data: meetings },
  ] = await Promise.all([
    supabase.from('tasks').select('status').eq('org_id', orgId),
    supabase.from('staff_stats').select('*').eq('org_id', orgId).order('completion_pct', { ascending: false }),
    supabase
      .from('tasks_full')
      .select('*')
      .eq('org_id', orgId)
      .in('status', ['overdue', 'reviewing', 'in_progress'])
      .order('deadline', { ascending: true })
      .limit(6),
    supabase
      .from('meeting_stats')
      .select('*')
      .eq('org_id', orgId)
      .order('held_at', { ascending: false })
      .limit(4),
  ])

  const statuses = (taskStatuses ?? []) as { status: TaskStatus }[]
  const total = statuses.length
  const done = statuses.filter(t => t.status === 'done').length
  const inProgress = statuses.filter(t => t.status === 'in_progress').length
  const reviewing = statuses.filter(t => t.status === 'reviewing').length
  const overdue = statuses.filter(t => t.status === 'overdue').length
  const donePct = total ? Math.round((done / total) * 100) : 0

  const cards = [
    { label: 'Total tasks', value: total, sub: `${donePct}% complete`, color: 'blue', icon: '📊' },
    { label: 'Completed', value: done, sub: 'Finalized work', color: 'green', icon: '✅' },
    { label: 'In progress', value: inProgress, sub: 'Active workstreams', color: 'orange', icon: '🛠' },
    { label: 'Under review', value: reviewing, sub: 'Awaiting approval', color: 'purple', icon: '🧾' },
    { label: 'Overdue', value: overdue, sub: 'Needs action', color: 'red', icon: '⚠️' },
  ]

  const urgent = urgentTasks ?? []
  const meetingList = meetings ?? []

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs text-tx3">Admin · Control panel</div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-sm text-tx2">Monitor organization-wide tasks, meetings, and team health.</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/tasks" className="text-primary-light hover:underline">View tasks</Link>
        <Link href="/meetings" className="text-primary-light hover:underline">Review meetings</Link>
        <Link href="/meetings/new" className="text-primary-light hover:underline">Schedule meeting</Link>
        <Link href="/biyelelt" className="text-primary-light hover:underline">Export reports</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(card => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            sub={card.sub}
            color={card.color as 'blue' | 'green' | 'orange' | 'purple' | 'red'}
            icon={card.icon}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-5">
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">High-priority tasks</h2>
            <Link href="/tasks" className="text-xs text-primary-light hover:underline">View all</Link>
          </div>
          {urgent.length > 0 ? (
            <TaskMiniList tasks={urgent as TaskFull[]} />
          ) : (
            <div className="text-sm text-tx3 text-center py-10">No high-priority tasks right now.</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Recent meetings</h2>
              <Link href="/meetings" className="text-xs text-primary-light hover:underline">See all</Link>
            </div>
            {meetingList.length > 0 ? (
              meetingList.map((meeting: MeetingStats) => {
                const pct = meeting.total_tasks ? Math.round(meeting.done_tasks / meeting.total_tasks * 100) : 0
                return (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="block border border-border rounded-lg p-4 hover:border-accent hover:text-accent-light transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold leading-tight">{meeting.title}</div>
                        <div className="text-[11px] text-tx3 font-mono mt-0.5">{meeting.held_at}</div>
                      </div>
                      <span className={`text-sm font-bold font-mono ${pct >= 80 ? 'text-accent-light' : pct >= 50 ? 'text-warn-light' : 'text-danger-light'}`}>
                        {pct}%
                      </span>
                    </div>
                    <ProgressBar value={pct} />
                    <div className="flex justify-between mt-2 text-[11px] text-tx3">
                      <span>Tasks: <strong className="text-tx">{meeting.total_tasks}</strong></span>
                      <span>Done: <strong className="text-accent-light">{meeting.done_tasks}</strong></span>
                      {meeting.overdue_tasks > 0 && <span className="text-danger-light">Overdue: {meeting.overdue_tasks}</span>}
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="text-center text-sm text-tx3 py-6">No recent meetings to display.</div>
            )}
          </div>
          <Link
            href="/meetings/new"
            className="flex items-center justify-center border border-dashed border-border rounded-lg p-3 text-sm text-tx3 hover:border-accent hover:text-accent-light transition-colors"
          >
            + Schedule a meeting
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Team performance</h2>
          <Link href="/biyelelt" className="text-xs text-primary-light hover:underline">Open exports</Link>
        </div>
        {staffStats && staffStats.length > 0 ? (
          <StaffStatTable stats={staffStats} />
        ) : (
          <div className="text-sm text-tx3 border border-border rounded-lg p-5 text-center">Staff metrics will show up after tasks are assigned.</div>
        )}
      </div>
    </div>
  )
}
