import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { StatusPill, TypeTag, ProgressBar } from '@/components/ui/Badges'
import { ExportButton } from '@/components/export/ExportButton'
import { StaffStatTable } from '@/components/tasks/StaffStatTable'
import { CompletionSubmitModal } from '@/components/tasks/CompletionSubmitModal'
import { TaskMiniList } from '@/components/tasks/TaskMiniList'
import type { TaskFull, Profile, TaskStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function BiyeleltPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  const canManage = profile?.role === 'admin' || profile?.role === 'manager'
  const orgId = profile?.org_id ?? ''

  const { data: tasks } = canManage
    ? await supabase.from('tasks_full').select('*').eq('org_id', orgId).order('deadline')
    : await supabase.from('tasks_full').select('*').eq('assignee_id', user.id).order('deadline')

  const { data: staffStats } = canManage
    ? await supabase.from('staff_stats').select('*').order('completion_pct', { ascending: false })
    : { data: null }

  const typedTasks = (tasks ?? []) as (TaskFull & { status: TaskStatus })[]
  const myPending = typedTasks.filter(t => ['new','in_progress','overdue'].includes(t.status))
  const myReview = typedTasks.filter(t => ['submitted','reviewing'].includes(t.status))
  const myDone = typedTasks.filter(t => t.status === 'done')

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-tx3 mb-1">Биелэлт</div>
          <h1 className="text-xl font-bold">{canManage ? 'Багийн биелэлт' : 'Миний биелэлт'}</h1>
          <p className="text-sm text-tx2 mt-0.5">{canManage ? 'Бүх ажилтны биелэлтийг харах' : 'Танд хариуцсан үүрэг биелэлт'}</p>
        </div>
        {canManage ? (
          <ExportButton tasks={tasks ?? []} title="Биелэлтийн тайлан" />
        ) : (
          <CompletionSubmitModal tasks={typedTasks} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Хүлээгдэж буй" value={myPending.length} sub="Ажиллагдаж буй" color="orange" icon="⏳" />
        <StatCard label="Шалгалтанд" value={myReview.length} sub="Шалгаж буй" color="purple" icon="🧾" />
        <StatCard label="Дууссан" value={myDone.length} sub="Баталгаажсан" color="green" icon="✅" />
      </div>

      {canManage && staffStats && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold">Ажилтны үзүүлэлт</h2>
          <StaffStatTable stats={staffStats} />
        </div>
      )}

      {myPending.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-warn-light">Хүлээгдэж буй ({myPending.length})</h2>
            <TaskMiniList tasks={myPending} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-purple-light">Шалгуулах ({myReview.length})</h2>
            <TaskMiniList tasks={myReview} />
          </div>
        </div>
      )}

      {myDone.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-accent-light">Дууссан ({myDone.length})</h2>
          <TaskMiniList tasks={myDone} />
        </div>
      )}
    </div>
  )
}
