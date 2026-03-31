'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'
import { cn } from '@/lib/utils'

interface HeaderProps {
  profile: Profile | null
  unreadCount?: number
  pageTitle?: string
}

export function Header({ profile, unreadCount = 0, pageTitle }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="h-14 bg-surface border-b border-border px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        {pageTitle && (
          <h1 className="text-sm font-semibold text-tx">{pageTitle}</h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded border border-border text-tx2 hover:bg-surface3 hover:text-tx transition-colors text-base">
          🔔
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-danger rounded-full text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border bg-surface3 hover:border-border2 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
              {initials}
            </div>
            <div className="text-left">
              <div className="text-xs font-medium leading-tight">{profile?.full_name ?? 'Хэрэглэгч'}</div>
              <div className="text-[10px] text-tx3 leading-tight">{profile ? ROLE_LABELS[profile.role] : ''}</div>
            </div>
            <span className="text-tx3 text-xs ml-1">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface2 border border-border rounded-lg shadow-modal overflow-hidden animate-fadeIn z-50">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-xs font-semibold">{profile?.full_name}</div>
                <div className="text-[10px] text-tx3">{profile?.position ?? ''}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-danger-light hover:bg-danger/10 transition-colors"
              >
                🚪 Гарах
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
