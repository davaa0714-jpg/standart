import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
    return
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: Profile | null }
  const role = profile?.role
  if (role === 'admin') redirect('/admin')
  else if (role === 'manager') redirect('/manager')
  else redirect('/employee')
}
