import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/ui/StatCard'
import { TaskMiniList } from '@/components/tasks/TaskMiniList'
import Link from 'next/link'
import type { TaskFull } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function EmployeePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: tasks } = await supabase
    .from('tasks_full')
    .select('*')
    .eq('assignee_id', user.id)
    .order('deadline', { ascending: true })

  const pending = (tasks ?? []).filter(t => ['new', 'in_progress', 'reviewing'].includes(t.status))
  const done = (tasks ?? []).filter(t => t.status === 'done')
  const overdue = (tasks ?? []).filter(t => t.status === 'overdue')

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div>
        <div className="text-xs text-tx3 mb-1">Хэрэглэгч / Үүрэг</div>
        <h1 className="text-2xl font-bold">Сайн байна уу, {profile?.full_name}</h1>
        <p className="text-sm text-tx2 mt-0.5">Танд даалгасан үүрэг даалгаврууд</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Хүлээгдэж буй" value={pending.length} sub="Илгээх, хянах" color="orange" icon="⏳" />
        <StatCard label="Дууссан" value={done.length} sub="Батлагдсан" color="green" icon="✅" />
        <StatCard label="Хугацаа хэтэрсэн" value={overdue.length} sub="Яаралтай" color="red" icon="⚠️" />
      </div>

      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Идэвхтэй үүрэг</h2>
          <Link href="/tasks" className="text-xs text-primary-light hover:underline">Бүгдийг харах</Link>
        </div>
        {pending.length ? (
          <TaskMiniList tasks={pending as TaskFull[]} />
        ) : (
          <div className="text-sm text-tx3 text-center py-10">Танд одоогоор хүлээгдэж буй үүрэг алга.</div>
        )}
      </div>
    </div>
  )
}
