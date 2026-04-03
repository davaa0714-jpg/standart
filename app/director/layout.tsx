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

  // Check if user has director role
  if (profile?.role !== 'director' && profile?.role !== 'admin') {
    redirect('/manager')
  }

  const { count: overdueCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'overdue')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('is_read', false)

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
            {/* Debug Info */}
            <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs font-mono">
              <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
                <span>🔧 DEBUG:</span>
                <span>Director Layout</span>
              </div>
              <div className="text-tx2 space-y-0.5">
                <div>User ID: {user.id}</div>
                <div>Role: {profile?.role || 'N/A'}</div>
                <div>Layout: DirectorLayout</div>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
