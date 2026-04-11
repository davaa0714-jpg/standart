import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/app/admin/AdminSidebar'
import { ManagerSidebar } from '@/app/manager/ManagerSidebar'
import { DirectorSidebar } from '@/app/director/DirectorSidebar'
import { Header } from '@/components/layout/Header'
import { ToastProvider } from '@/components/ui/Toast'

import type { Profile } from '@/types/database'

export default async function RecorderLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Restrict access to managers, directors, and admins only
  if (!profile?.role || !['manager', 'director', 'admin'].includes(profile.role)) {
    redirect('/employee')
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

  // Determine which sidebar to show based on role
  const userRole = profile?.role || 'admin'
  const SidebarComponent = userRole === 'admin' 
    ? AdminSidebar 
    : userRole === 'director'
      ? DirectorSidebar
      : ManagerSidebar

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-bg">
        <SidebarComponent
          orgName={profile?.org_id ? undefined : 'Газрын Харилцааны Алба'}
          overdueCount={overdueCount ?? 0}
          unreadCount={unreadCount ?? 0}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            profile={profile}
            unreadCount={unreadCount ?? 0}
          />
          <main className="flex-1 overflow-y-auto p-6 animate-fadeIn">
            {/* Role indicator */}
            <div className={`mb-4 p-3 rounded-lg border ${
              userRole === 'admin' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>{userRole === 'admin' ? '👁️' : '🎙️'}</span>
                <span>
                  {userRole === 'admin' ? 'Хандах эрх: Харах (View-only)' : 'Хандах эрх: Бичих (Record)'}
                </span>
              </div>
              {userRole === 'admin' && (
                <p className="text-xs mt-1 opacity-80">
                  Админ хэрэглэгчид зөвхөн бичлэгүүдийг харж, татаж авах боломжтой. Шинэ бичлэг хийх боломжгүй.
                </p>
              )}
            </div>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
