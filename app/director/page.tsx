import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { StatusPill, TypeTag, ProgressBar } from '@/components/ui/Badges'
import type { TaskFull, MeetingStats, Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function DirectorDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  const orgId = profile?.org_id

  // Verify director role
  if (profile?.role !== 'director' && profile?.role !== 'admin') {
    redirect('/manager')
  }

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('org_id', orgId ?? '') as { data: { status: string }[] | null }

  const typedAllTasks = allTasks ?? []
  const stats = {
    total: typedAllTasks.length,
    done: typedAllTasks.filter(t => t.status === 'done').length,
    overdue: typedAllTasks.filter(t => t.status === 'overdue').length,
    reviewing: typedAllTasks.filter(t => t.status === 'reviewing' || t.status === 'submitted').length,
    pct: typedAllTasks.length
      ? Math.round((typedAllTasks.filter(t => t.status === 'done').length / typedAllTasks.length) * 100)
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

  const manageMeetings = profile?.role === 'admin' || profile?.role === 'director' || profile?.role === 'manager'

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="text-xs text-tx3">Захирал / Хяналтын самбар</div>
        <h1 className="text-2xl font-bold">Сайн байна уу, {profile?.full_name ?? 'Захирал'}?</h1>
        <p className="text-sm text-tx2">Бүхэл бүтэн байгууллагын үйл ажиллагааг хянах самбар</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/meetings/new" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors"
        >
          <span>📅</span> Шинэ хурал
        </Link>
        <Link 
          href="/tasks" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:border-accent hover:text-accent-light transition-colors"
        >
          <span>➕</span> Үүрэг нэмэх
        </Link>
        <Link 
          href="/biyelelt" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:border-accent hover:text-accent-light transition-colors"
        >
          <span>📤</span> Биелэлт хянах
        </Link>
        <Link 
          href="/recorder" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:border-accent hover:text-accent-light transition-colors"
        >
          <span>🎙️</span> Дуу хураах
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Нийт үүрэг" value={stats.total} sub="Бүгдийг харах" color="blue" icon="📊" />
        <StatCard label="Дууссан" value={stats.done} sub={`${stats.pct}% бүрэн`} color="green" icon="✅" />
        <StatCard label="Хариуцлага хүлээсэн" value={stats.reviewing} sub="Хянаж буй" color="purple" icon="🧾" />
        <StatCard label="Хугацаа хэтэрсэн" value={stats.overdue} sub="Яаралтай" color="red" icon="⚠️" />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-5">
        {/* Left Column - Tasks */}
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Яаралтай үүрэг</h2>
              <p className="text-xs text-tx3 mt-0.5">Хугацаа хэтэрсэн болон хянах шаардлагатай</p>
            </div>
            <Link href="/tasks" className="text-xs text-primary-light hover:underline">
              Бүгдийг харах →
            </Link>
          </div>
          <div className="space-y-2">
            {!recentTasks?.length ? (
              <div className="text-sm text-tx3 text-center py-8 bg-surface2/50 rounded-lg">
                Үүрэг олдсонгүй
              </div>
            ) : (
              recentTasks.map((task: TaskFull) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 p-3 bg-surface2 rounded-lg border border-border hover:border-accent transition-colors group"
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
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusPill status={task.status} />
                    <div className="w-20">
                      <ProgressBar value={task.progress} />
                      <div className="text-[10px] text-tx3 font-mono text-right">{task.progress}%</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Meetings */}
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Сүүлийн хурлууд</h2>
                <p className="text-xs text-tx3 mt-0.5">Хурлын биелэлтийн явц</p>
              </div>
              <Link href="/meetings" className="text-xs text-primary-light hover:underline">
                Дэлгэрэнгүй →
              </Link>
            </div>
            <div className="space-y-3">
              {meetings?.length ? (
                meetings.map((m: MeetingStats) => {
                  const pct = m.total_tasks ? Math.round(m.done_tasks / m.total_tasks * 100) : 0
                  return (
                    <Link
                      key={m.id}
                      href={`/meetings/${m.id}`}
                      className="block p-4 bg-surface2 rounded-lg border border-border hover:border-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate">Khural - {new Date(m.meeting_date).toLocaleDateString('mn-MN')}</h3>
                          <p className="text-[11px] text-tx3 mt-0.5">{new Date(m.meeting_date).toLocaleDateString('mn-MN')}</p>
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
                <div className="text-sm text-tx3 text-center py-8 bg-surface2/50 rounded-lg">
                  Хурлын мэдээлэл байхгүй
                </div>
              )}
            </div>
            {manageMeetings && (
              <Link
                href="/meetings/new"
                className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-border rounded-lg text-sm text-tx3 hover:border-accent hover:text-accent-light transition-colors"
              >
                <span>+</span> Хурал төлөвлөх
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
