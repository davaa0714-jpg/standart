'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'

export function useNotifications(profileId?: string) {
  const [notifs, setNotifs]   = useState<Notification[]>([])
  const [unread, setUnread]   = useState(0)

  const load = useCallback(async () => {
    if (!profileId) return
    const db = createClient()
    const { data } = await db
      .from('notifications')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs(data ?? [])
    setUnread((data ?? []).filter(n => !n.is_read).length)
  }, [profileId])

  useEffect(() => {
    load()
    if (!profileId) return

    // Realtime subscribe
    const db = createClient()
    const channel = db
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${profileId}`,
      }, () => load())
      .subscribe()

    return () => { db.removeChannel(channel) }
  }, [profileId, load])

  const markRead = async (id: string) => {
    const db = createClient()
    await db.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(p => Math.max(0, p - 1))
  }

  const markAllRead = async () => {
    if (!profileId) return
    const db = createClient()
    await db.from('notifications').update({ is_read: true }).eq('profile_id', profileId)
    setNotifs(p => p.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return { notifs, unread, markRead, markAllRead, reload: load }
}
