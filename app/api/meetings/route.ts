import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Profile } from '@/types/database'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single() as { data: Profile | null }
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('org_id', profile?.org_id ?? '')
    .order('meeting_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role,org_id').eq('id', user.id).single() as { data: Profile | null }
  if (profile?.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase.from('meetings').insert({
    ...body,
    org_id: profile?.org_id,
    created_by: user.id,
    status: 'scheduled',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
