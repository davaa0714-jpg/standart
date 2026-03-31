import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status     = searchParams.get('status')
  const meeting_id = searchParams.get('meeting_id')
  const assignee   = searchParams.get('assignee')

  const { data: profile } = await supabase.from('profiles').select('role,org_id').eq('id', user.id).single()

  let q = supabase.from('tasks_full').select('*')
  if (profile?.role === 'staff') q = q.eq('assignee_id', user.id)
  else if (profile?.org_id)      q = q.eq('org_id', profile.org_id)
  if (status)     q = q.eq('status', status)
  if (meeting_id) q = q.eq('meeting_id', meeting_id)
  if (assignee)   q = q.eq('assignee_id', assignee)
  q = q.order('deadline', { ascending: true })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role,org_id').eq('id', user.id).single()
  if (profile?.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase.from('tasks').insert({
    ...body,
    org_id:     profile?.org_id,
    created_by: user.id,
    assigned_by: user.id,
    status:     'new',
    progress:   0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Мэдэгдэл
  if (data.assignee_id) {
    await supabase.from('notifications').insert({
      profile_id: data.assignee_id,
      task_id:    data.id,
      type:       'assigned',
      title:      'Шинэ үүрэг хүлээн авлаа',
      body:       data.title,
    })
  }
  // Түүх
  await supabase.from('task_history').insert({
    task_id:    data.id,
    profile_id: user.id,
    action:     'created',
    new_status: 'new',
  })

  return NextResponse.json(data, { status: 201 })
}
