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

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  console.log('ROOT DEBUG FULL:', { profile, profileError, userId: user.id })
  
  // Temporary hardcoded admin for debugging
  let role = profile?.role
  if (user.id === '6b64f2f9-7215-4d23-81d1-e2a8f22936d0') {
    role = 'admin'
    console.log('HARDCODED ADMIN in root:', user.id)
  }
  if (role === 'admin') redirect('/admin')
  else if (role === 'manager') redirect('/manager')
  else redirect('/employee')
}
