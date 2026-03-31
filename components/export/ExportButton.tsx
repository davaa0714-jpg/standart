'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { exportTasks } from '@/lib/export'
import type { TaskFull } from '@/types/database'

interface ExportButtonProps {
  tasks: TaskFull[]
  title?: string
}

export function ExportButton({ tasks, title = 'Үүрэг-даалгаварын-жагсаалт' }: ExportButtonProps) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const { success, error: toastErr } = useToast()

  const handle = async (fmt: 'word' | 'excel' | 'pdf') => {
    setLoading(fmt)
    try {
      await exportTasks(tasks, fmt, title)
      success(`${fmt.toUpperCase()} файл татагдлаа`, `${tasks.length} үүрэг`)
      setOpen(false)
    } catch (e: any) {
      toastErr('Файл үүсгэхэд алдаа гарлаа', e?.message)
    } finally {
      setLoading(null)
    }
  }

  const fmts = [
    { key: 'word'  as const, icon: '📄', label: 'Word',  sub: '.docx — Архивын стандарт' },
    { key: 'excel' as const, icon: '📊', label: 'Excel', sub: '.xlsx — Хүснэгт, статистик' },
    { key: 'pdf'   as const, icon: '📋', label: 'PDF',   sub: '.pdf — Хэвлэхэд бэлэн' },
  ]

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>📥 Файл гаргах</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="📥 Файл гаргах — Архивын стандарт"
        width="max-w-md"
      >
        <div className="mb-4 text-xs text-tx2 bg-surface2 border border-border rounded p-3">
          <strong className="text-tx">Нийт {tasks.length} үүрэг</strong> — байгууллагын гарчиг, тэмдэглэлтэйгээр архивын стандарт форматаар гаргана
        </div>
        <div className="flex flex-col gap-3">
          {fmts.map(f => (
            <button
              key={f.key}
              onClick={() => handle(f.key)}
              disabled={!!loading}
              className="flex items-center gap-4 p-4 bg-surface2 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-left disabled:opacity-50"
            >
              <span className="text-2xl">{f.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{f.label}</div>
                <div className="text-xs text-tx3">{f.sub}</div>
              </div>
              {loading === f.key ? (
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-tx3 text-sm">↓</span>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
