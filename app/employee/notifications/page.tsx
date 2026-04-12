'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification, Task } from '@/types/database'

interface NotificationWithTask extends Notification {
  task?: {
    title: string
    deadline: string | null
  }
}

export default function EmployeeNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithTask[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*, tasks(title, deadline)')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('notifications').update({ is_read: true }).eq('profile_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assigned': return 'assignment'
      case 'submitted': return 'send'
      case 'approved': return 'check_circle'
      case 'rejected': return 'cancel'
      default: return 'notifications'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assigned': return 'text-blue-400'
      case 'submitted': return 'text-yellow-400'
      case 'approved': return 'text-green-400'
      case 'rejected': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('mn-MN')
  }

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Loading notifications...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-xs text-tx3 mb-1">Employee / Notifications</div>
          <h1 className="text-xl font-bold">Notifications</h1>
          <p className="text-sm text-tx2 mt-0.5">Your recent notifications and updates</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-surface2 border border-border rounded-lg text-sm text-tx hover:bg-surface3 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {!notifications.length ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3">notifications</div>
            <div className="text-sm">No notifications yet</div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-surface border border-border rounded-lg p-4 hover:border-primary/50 transition-colors ${
                !notification.is_read ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`text-2xl ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-medium text-tx">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-tx2 mt-1">
                        {notification.body}
                      </p>
                      {notification.task && (
                        <div className="text-xs text-tx3 mt-2">
                          Task: {notification.task.title}
                          {notification.task.deadline && (
                            <span> · Deadline: {new Date(notification.task.deadline).toLocaleDateString('mn-MN')}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-tx3 whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="w-2 h-2 bg-primary rounded-full hover:bg-primary-light transition-colors"
                          title="Mark as read"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
