import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TasksClient } from '@/components/tasks/TasksClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const orgId = profile?.org_id ?? ''
  const isEmployee = profile?.role === 'employee'
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager'

  let query = supabase.from('tasks_full').select('*').order('deadline', { ascending: true })
  if (isEmployee) query = query.eq('assignee_id', user.id)
  else query = query.eq('org_id', orgId)

  const { data: tasks } = await query

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Үүрэг / Ажилтан</div>
        <h1 className="text-xl font-bold">Үүрэг даалгаврууд</h1>
        <p className="text-sm text-tx2 mt-0.5">
          {isEmployee ? 'Танд тусгагдсан үүрэг даалгаврууд' : 'Ажлын багийн үүрэг даалгаврууд'}
        </p>
      </div>
      <TasksClient
        tasks={tasks ?? []}
        orgId={orgId}
        currentUserId={user.id}
        canCreate={canCreate}
      />
    </div>
  )
}
