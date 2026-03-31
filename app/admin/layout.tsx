import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ToastProvider } from '@/components/ui/Toast'
import type { Profile } from '@/types/database'

const adminNav = [
  { label: 'Удирдлагын самбар', href: '/admin', icon: '📊' },
  { label: 'Хурлын жагсаалт', href: '/meetings', icon: '📋' },
  { label: 'Үүрэг даалгавар', href: '/tasks', icon: '✅' },
  { label: 'Багийн гүйцэтгэл', href: '/biyelelt', icon: '📈' },
  { label: 'Тайлан экспорт', href: '/export', icon: '📤' },
]

const adminBottom = [
  { label: 'Тохиргоо', href: '/settings', icon: '⚙️' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-bg">
        <Sidebar
          orgName={profile?.org_id ? undefined : 'Газрын Харилцааны Алба'}
          overdueCount={overdueCount ?? 0}
          unreadCount={unreadCount ?? 0}
          role={profile?.role}
          navItems={adminNav}
          bottomItems={adminBottom}
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
