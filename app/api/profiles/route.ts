import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profile = body?.profile

    if (!profile) {
      return NextResponse.json({ error: 'Профайлын мэдээлэл илгээгдээгүй байна.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await (supabase as any).from('profiles').insert([profile])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    return NextResponse.json({ error: 'Дотоод серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
