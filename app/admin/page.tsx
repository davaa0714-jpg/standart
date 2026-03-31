import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { StaffStatTable } from '@/components/tasks/StaffStatTable'
import { TaskMiniList } from '@/components/tasks/TaskMiniList'
import { ProgressBar, StatusPill } from '@/components/ui/Badges'
import type { TaskFull, MeetingStats, Profile, TaskStatus } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('USER DEBUG:', { userId: user?.id, userError, hasUser: !!user })
  if (!user) redirect('/auth/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  console.log('PROFILE DEBUG:', { profile, profileError, userId: user.id, query: `id eq ${user.id}` })
  
  const typedProfile = profile as Profile | null

  // Temporary hardcoded admin for debugging - bypass role check completely for this user
  if (user.id === '6b64f2f9-7215-4d23-81d1-e2a8f22936d0') {
    console.log('HARDCODED ADMIN:', user.id)
    // Force admin access - skip all redirects
  } else {
    const isAdmin = typedProfile?.role === 'admin'
    if (!isAdmin) {
      redirect('/employee')
    }
  }

  const orgId = typedProfile?.org_id ?? ''

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

  const stats = [
    { label: 'Нийт үүрэг', value: total, sub: `${donePct}% биелсэн`, color: 'blue' as const, icon: '📊' },
    { label: 'Дууссан', value: done, sub: 'Батлагдсан', color: 'green' as const, icon: '✅' },
    { label: 'Хийж байгаа', value: inProgress, sub: 'Идэвхтэй', color: 'orange' as const, icon: '🛠' },
    { label: 'Хянах', value: reviewing, sub: 'Хүлээгдэж буй', color: 'purple' as const, icon: '🧾' },
    { label: 'Хугацаа хэтэрсэн', value: overdue, sub: 'Яаралтай', color: 'red' as const, icon: '⚠️' },
  ]

  const urgent = urgentTasks ?? []
  const meetingList = meetings ?? []

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="text-xs text-tx3">Админ / Удирдлагын самбар</div>
        <h1 className="text-2xl font-bold">Сайн байна уу, {typedProfile?.full_name ?? 'Админ'}?</h1>
        <p className="text-sm text-tx2">Байгууллагын үйл ажиллагааг хянах самбар</p>
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
          <span>📤</span> Тайлан татах
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(stat => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            sub={stat.sub}
            color={stat.color}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Urgent Tasks */}
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
            {urgent.length > 0 ? (
              <TaskMiniList tasks={urgent as TaskFull[]} />
            ) : (
              <div className="text-sm text-tx3 text-center py-8 bg-surface2/50 rounded-lg">
                Яаралтай үүрэг алга
              </div>
            )}
          </div>

          {/* Team Performance */}
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Багийн гүйцэтгэл</h2>
                <p className="text-xs text-tx3 mt-0.5">Ажилтнуудын биелэлтийн статистик</p>
              </div>
              <Link href="/biyelelt" className="text-xs text-primary-light hover:underline">
                Дэлгэрэнгүй →
              </Link>
            </div>
            {staffStats && staffStats.length > 0 ? (
              <StaffStatTable stats={staffStats} />
            ) : (
              <div className="text-sm text-tx3 text-center py-8 bg-surface2/50 rounded-lg">
                Өгөгдөл байхгүй
              </div>
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
                Бүгд →
              </Link>
            </div>
            
            {meetingList.length > 0 ? (
              <div className="space-y-3">
                {meetingList.map((meeting: MeetingStats) => {
                  const pct = meeting.total_tasks ? Math.round(meeting.done_tasks / meeting.total_tasks * 100) : 0
                  return (
                    <Link
                      key={meeting.id}
                      href={`/meetings/${meeting.id}`}
                      className="block p-4 bg-surface2 rounded-lg border border-border hover:border-accent transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate">{meeting.title}</h3>
                          <p className="text-[11px] text-tx3 mt-0.5">{meeting.held_at}</p>
                        </div>
                        <span className={`text-sm font-bold font-mono ${pct >= 80 ? 'text-accent-light' : pct >= 50 ? 'text-warn-light' : 'text-danger-light'}`}>
                          {pct}%
                        </span>
                      </div>
                      <ProgressBar value={pct} className="mb-2" />
                      <div className="flex gap-4 text-[11px] text-tx3">
                        <span>Нийт: <strong className="text-tx">{meeting.total_tasks}</strong></span>
                        <span>Биелсэн: <strong className="text-accent-light">{meeting.done_tasks}</strong></span>
                        {meeting.overdue_tasks > 0 && (
                          <span className="text-danger-light">Хэтэрсэн: {meeting.overdue_tasks}</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-tx3 text-center py-8 bg-surface2/50 rounded-lg">
                Хурал бүртгэгдээгүй
              </div>
            )}
            
            <Link
              href="/meetings/new"
              className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-border rounded-lg text-sm text-tx3 hover:border-accent hover:text-accent-light transition-colors"
            >
              <span>+</span> Шинэ хурал төлөвлөх
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
