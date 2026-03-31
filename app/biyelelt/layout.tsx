import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/app/admin/AdminSidebar'
import { ManagerSidebar } from '@/app/manager/ManagerSidebar'
import { EmployeeSidebar } from '@/app/employee/EmployeeSidebar'
import { Header } from '@/components/layout/Header'
import { ToastProvider } from '@/components/ui/Toast'
import type { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

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
    : userRole === 'manager' 
      ? ManagerSidebar 
      : EmployeeSidebar

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
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
