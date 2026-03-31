import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import type { Profile } from '@/types/database'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('tasks_full').select('*').eq('id', params.id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data: old } = await supabase.from('tasks').select('status,assignee_id,assigned_by,title').eq('id', params.id).single() as { data: { status: string, assignee_id: string, assigned_by: string, title: string } | null }

  const { data, error } = await (supabase as any).from('tasks').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Статус өөрчлөгдсөн бол түүх + мэдэгдэл
  if (old && body.status && old.status !== body.status) {
    const db = supabase as any
    await db.from('task_history').insert({
      task_id: params.id, profile_id: user.id,
      action: body.status === 'submitted' ? 'Биелэлт илгээсэн'
            : body.status === 'done'      ? 'Батлагдлаа'
            : body.status === 'in_progress' && old.status === 'submitted' ? 'Буцаагдлаа'
            : 'Шинэчлэгдлээ',
      old_status: old.status, new_status: body.status, note: body.review_note ?? body.submitted_note,
    })

    const notifTarget = body.status === 'submitted' ? old.assigned_by
                      : old.assignee_id
    const notifType   = body.status === 'submitted' ? 'submitted'
                      : body.status === 'done'      ? 'approved'
                      : body.status === 'in_progress' && old.status === 'submitted' ? 'rejected'
                      : 'assigned'
    if (notifTarget) {
      const db = supabase as any
      await db.from('notifications').insert({
        profile_id: notifTarget, task_id: params.id, type: notifType,
        title: notifType === 'submitted' ? 'Биелэлт ирлээ'
             : notifType === 'approved'  ? '✅ Үүрэг батлагдлаа'
             : notifType === 'rejected'  ? '↩️ Буцаагдлаа'
             : 'Үүрэг шинэчлэгдлээ',
        body: old.title,
      })
    }
  }

  return NextResponse.json(data)
}
