import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DirectorSidebar } from './DirectorSidebar'
import { Header } from '@/components/layout/Header'
import { ToastProvider } from '@/components/ui/Toast'

import type { Profile } from '@/types/database'

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Check if user has director role only
  if (!profile?.role || profile.role !== 'director') {
    if (profile?.role === 'admin') {
      redirect('/admin')
    } else if (profile?.role === 'manager') {
      redirect('/manager')
    } else {
      redirect('/employee')
    }
  }

  const { count: overdueCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'overdue')

  let unreadCount = 0
  try {
    const result = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('is_read', false)
    unreadCount = result.count ?? 0
    console.log('NOTIFICATION DEBUG:', { userId: user.id, unreadCount, result })
  } catch (err) {
    // notifications table doesn't exist yet
    console.log('Notifications table not found:', err)
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-bg">
        <DirectorSidebar
          orgName={profile?.org_id ? 'Газрын Харилцааны Алба' : undefined}
          overdueCount={overdueCount ?? 0}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            profile={profile}
            unreadCount={unreadCount ?? 0}
          />
          <main className="flex-1 overflow-y-auto p-6 animate-fadeIn relative">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
