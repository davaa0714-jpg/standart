'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warn' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  body?: string
}

interface ToastCtx {
  toast: (type: ToastType, title: string, body?: string) => void
  success: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
  warn: (title: string, body?: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, title: string, body?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, type, title, body }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])

  const success = useCallback((t: string, b?: string) => toast('success', t, b), [toast])
  const error   = useCallback((t: string, b?: string) => toast('error', t, b), [toast])
  const warn    = useCallback((t: string, b?: string) => toast('warn', t, b), [toast])

  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' }
  const colors = {
    success: 'border-l-accent-light',
    error:   'border-l-danger-light',
    warn:    'border-l-warn-light',
    info:    'border-l-primary-light',
  }

  return (
    <Ctx.Provider value={{ toast, success, error, warn }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={cn(
            'bg-surface2 border border-border2 border-l-4 rounded shadow-modal px-4 py-3 w-80 pointer-events-auto animate-slideIn',
            colors[t.type]
          )}>
            <div className="flex items-start gap-2">
              <span>{icons[t.type]}</span>
              <div>
                <div className="text-sm font-semibold">{t.title}</div>
                {t.body && <div className="text-xs text-tx2 mt-0.5">{t.body}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
