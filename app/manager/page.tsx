import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { StatusPill, TypeTag, ProgressBar } from '@/components/ui/Badges'
import type { TaskFull, MeetingStats } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const orgId = profile?.org_id

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('org_id', orgId ?? '')

  const stats = {
    total: allTasks?.length ?? 0,
    done: allTasks?.filter(t => t.status === 'done').length ?? 0,
    overdue: allTasks?.filter(t => t.status === 'overdue').length ?? 0,
    reviewing: allTasks?.filter(t => t.status === 'reviewing' || t.status === 'submitted').length ?? 0,
    pct: allTasks?.length
      ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100)
      : 0,
  }

  const { data: recentTasks } = await supabase
    .from('tasks_full')
    .select('*')
    .eq('org_id', orgId ?? '')
    .in('status', ['overdue', 'in_progress', 'new', 'submitted'])
    .order('deadline', { ascending: true })
    .limit(8)

  const { data: meetings } = await supabase
    .from('meeting_stats')
    .select('*')
    .eq('org_id', orgId ?? '')
    .order('held_at', { ascending: false })
    .limit(4)

  const manageMeetings = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Админ / Менежерийн самбар</div>
        <h1 className="text-xl font-bold">Сайн байна уу, {profile?.full_name ?? 'хүндэт'}?</h1>
        <p className="text-sm text-tx2 mt-0.5">Товчлон менежерийн хянах самбар</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Нийт үүрэг" value={stats.total} sub="Бүгдийг харах" color="blue" icon="📊" />
        <StatCard label="Дууссан" value={stats.done} sub={`${stats.pct}% бүрэн`} color="green" icon="✅" />
        <StatCard label="Хариуцлага хүлээсэн" value={stats.reviewing} sub="Хянаж буй" color="purple" icon="🧾" />
        <StatCard label="Хугацаа хэтэрсэн" value={stats.overdue} sub="Яаралтай" color="red" icon="⚠️" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Яаралтай үүрэг</h2>
            <Link href="/tasks" className="text-xs text-primary-light hover:underline">Бүгдийг харах</Link>
          </div>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {!recentTasks?.length ? (
              <div className="text-center py-10 text-tx3 text-sm">Үүрэг олдсонгүй</div>
            ) : (
              recentTasks.map((task: TaskFull) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface2 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeTag type={task.task_type} />
                      {task.is_overdue && (
                        <span className="text-[10px] font-bold text-danger-light">! Хугацаа хэтэрсэн</span>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate group-hover:text-accent-light">{task.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-tx3">
                      <span>{task.assignee_name ?? '—'}</span>
                      <span className="font-mono">{task.deadline}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusPill status={task.status} />
                    <div className="w-24">
                      <ProgressBar value={task.progress} />
                      <div className="text-[10px] text-tx3 font-mono text-right mt-0.5">{task.progress}%</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Сүүлийн хурлууд</h2>
              <Link href="/meetings" className="text-xs text-primary-light hover:underline">Дэлгэрэнгүй</Link>
            </div>
            {meetings?.length ? (
              meetings.map((m: MeetingStats) => {
                const pct = m.total_tasks ? Math.round(m.done_tasks / m.total_tasks * 100) : 0
                return (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="block border border-border rounded-lg p-4 hover:border-accent hover:text-accent-light transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold leading-tight">{m.title}</div>
                        <div className="text-[11px] text-tx3 font-mono mt-0.5">{m.held_at}</div>
                      </div>
                      <span className={`text-sm font-bold font-mono ${pct >= 80 ? 'text-accent-light' : pct >= 50 ? 'text-warn-light' : 'text-danger-light'}`}>
                        {pct}%
                      </span>
                    </div>
                    <ProgressBar value={pct} />
                    <div className="flex justify-between mt-2 text-[11px] text-tx3">
                      <span>Үүрэг: <strong className="text-tx">{m.total_tasks}</strong></span>
                      <span>Дууссан: <strong className="text-accent-light">{m.done_tasks}</strong></span>
                      {m.overdue_tasks > 0 && <span className="text-danger-light">Хэтэрсэн: {m.overdue_tasks}</span>}
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="text-center text-sm text-tx3 py-6">Хурлын мэдээлэл байхгүй</div>
            )}
          </div>
          {manageMeetings && (
            <Link
              href="/meetings/new"
              className="flex items-center justify-center border border-dashed border-border rounded-lg p-3 text-sm text-tx3 hover:border-accent hover:text-accent-light transition-colors"
            >
              + Хурал төлөвлөх
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
