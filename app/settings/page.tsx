import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/layout/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Нүүр / Тохиргоо</div>
        <h1 className="text-xl font-bold">Тохиргоо</h1>
      </div>
      <SettingsClient profile={profile} />
    </div>
  )
}
