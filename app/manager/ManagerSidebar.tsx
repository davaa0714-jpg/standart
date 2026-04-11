'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type SidebarItem = {
  label: string
  href: string
  icon: string
}

interface SidebarProps {
  orgName?: string
  unreadCount?: number
  overdueCount?: number
}

export function ManagerSidebar({
  orgName = 'Газрын Харилцааны Алба',
  unreadCount = 0,
  overdueCount = 0,
}: SidebarProps) {
  const path = usePathname()

  const navItems: SidebarItem[] = [
    { label: 'Хяналтын самбар', href: '/manager', icon: '📊' },
    { label: 'Хурлын жагсаалт', href: '/manager/meetings', icon: '📋' },
    { label: 'Үүрэг даалгавар', href: '/manager/tasks', icon: '✅' },
    { label: 'Биелэлт хянах', href: '/manager/biyelelt', icon: '📈' },
    { label: 'Дуу хураах', href: '/manager/recorder', icon: '🎙️' },
  ]

  const bottomItems: SidebarItem[] = [
    { label: 'Тохиргоо', href: '/manager/settings', icon: '⚙️' },
  ]

  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-accent/20 flex items-center justify-center text-accent-light text-xs font-bold">ГШ</div>
          <div>
            <div className="text-sm font-bold leading-tight">ГШХ Систем</div>
            <div className="text-[10px] text-tx3 leading-tight truncate max-w-[140px]">{orgName}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-3 mb-1">
          <span className="text-[10px] font-bold text-tx3 uppercase tracking-widest px-2">Менежер цэс</span>
        </div>
        {navItems.map(item => {
          const active = path === item.href || path.startsWith(item.href + '/')
          const count = item.href === '/manager/tasks' ? overdueCount : 0
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-2.5 mx-2 px-3 py-2 rounded text-sm transition-all duration-100 border border-transparent',
                active
                  ? 'bg-accent/10 text-tx border-accent/20 border-l-2 border-l-accent-light'
                  : 'text-tx2 hover:bg-surface3 hover:text-tx'
              )}
            >
              <span className="text-base w-4 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger/15 text-danger-light border border-danger/25">
                  {count}
                </span>
              )}
            </Link>
          )
        })}

        <div className="px-3 mt-4 mb-1">
          <span className="text-[10px] font-bold text-tx3 uppercase tracking-widest px-2">Бусад</span>
        </div>
        {bottomItems.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-2.5 mx-2 px-3 py-2 rounded text-sm transition-all',
                active ? 'bg-surface3 text-tx' : 'text-tx2 hover:bg-surface3 hover:text-tx'
              )}
            >
              <span className="text-base w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
