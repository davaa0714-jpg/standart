'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { TaskFull } from '@/types/database'

interface TaskActionsProps {
  task: TaskFull
  userId: string
  isAssignee: boolean
  isAdmin: boolean
}

export function TaskActions({ task, userId, isAssignee, isAdmin }: TaskActionsProps) {
  const { success, error: toastErr, warn } = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [note, setNote]     = useState('')
  const [progress, setProgress] = useState(task.progress)
  const [loading, setLoading]   = useState(false)

  const refresh = () => startTransition(() => router.refresh())

  // ── SUBMIT (ажилтан биелэлт илгээх) ──────────────────────────
  const handleSubmit = async () => {
    if (!note.trim()) { warn('Биелэлтийн тайлбар бичнэ үү'); return }
    setLoading(true)
    const db = createClient()
    await db.from('tasks').update({
      status: 'submitted',
      progress: 100,
      submitted_at: new Date().toISOString(),
      submitted_note: note,
    }).eq('id', task.id)

    await db.from('task_history').insert({
      task_id: task.id, profile_id: userId,
      action: 'Биелэлт илгээсэн', old_status: task.status, new_status: 'submitted',
    })
    if (task.assigned_by) {
      await db.from('notifications').insert({
        profile_id: task.assigned_by, task_id: task.id,
        type: 'submitted', title: 'Биелэлт ирлээ', body: task.title,
      })
    }
    setLoading(false)
    success('Биелэлт амжилттай илгээгдлээ')
    setNote('')
    refresh()
  }

  // ── APPROVE / REJECT (admin/inspector) ───────────────────────
  const handleReview = async (approve: boolean) => {
    if (!note.trim()) { warn('Хяналтын тайлбар бичнэ үү'); return }
    setLoading(true)
    const db = createClient()
    await db.from('tasks').update({
      status: approve ? 'done' : 'in_progress',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    }).eq('id', task.id)

    await db.from('task_history').insert({
      task_id: task.id, profile_id: userId,
      action: approve ? 'Батлагдлаа' : 'Буцаагдлаа',
      old_status: task.status, new_status: approve ? 'done' : 'in_progress',
      note,
    })
    if (task.assignee_id) {
      await db.from('notifications').insert({
        profile_id: task.assignee_id, task_id: task.id,
        type: approve ? 'approved' : 'rejected',
        title: approve ? '✅ Үүрэг батлагдлаа' : '↩️ Буцаагдлаа — дахин хийнэ үү',
        body: note,
      })
    }
    setLoading(false)
    success(approve ? 'Үүрэг батлагдлаа' : 'Буцаагдлаа', note)
    setNote('')
    refresh()
  }

  // ── UPDATE PROGRESS ───────────────────────────────────────────
  const handleProgressSave = async () => {
    setLoading(true)
    const db = createClient()
    await db.from('tasks').update({
      progress,
      status: progress > 0 && progress < 100 ? 'in_progress' : task.status,
    }).eq('id', task.id)
    await db.from('task_history').insert({
      task_id: task.id, profile_id: userId,
      action: `Явц шинэчлэгдлээ — ${progress}%`,
    })
    setLoading(false)
    success(`Явц ${progress}% болж шинэчлэгдлээ`)
    refresh()
  }

  // ── ADD COMMENT ───────────────────────────────────────────────
  const [comment, setComment] = useState('')
  const handleComment = async () => {
    if (!comment.trim()) return
    const db = createClient()
    await db.from('task_comments').insert({ task_id: task.id, profile_id: userId, content: comment })
    setComment('')
    refresh()
  }

  const canSubmit  = isAssignee && (task.status === 'new' || task.status === 'in_progress' || task.status === 'overdue')
  const canReview  = isAdmin && (task.status === 'submitted' || task.status === 'reviewing')
  const canProgress = isAssignee && task.status !== 'done'

  return (
    <div className="flex flex-col gap-4">
      {/* Progress update */}
      {canProgress && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs font-bold text-tx3 uppercase tracking-wide mb-3">📊 Явц шинэчлэх</div>
          <div className="flex items-center gap-3">
            <input
              type="range" min={0} max={100} step={5}
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="flex-1 accent-green-500"
            />
            <span className="text-sm font-bold font-mono w-10 text-right">{progress}%</span>
            <Button size="sm" variant="secondary" loading={loading} onClick={handleProgressSave}>Хадгалах</Button>
          </div>
        </div>
      )}

      {/* Submit biyelelt */}
      {canSubmit && (
        <div className="bg-surface border border-accent/20 rounded-lg p-4">
          <div className="text-xs font-bold text-accent-light uppercase tracking-wide mb-3">📤 Биелэлт илгээх</div>
          <Textarea
            placeholder="Хийсэн ажлын тайлбар, биелэлтийн мэдээлэл..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="mb-3"
          />
          <Button variant="primary" loading={loading} onClick={handleSubmit}>Биелэлт илгээх</Button>
        </div>
      )}

      {/* Review */}
      {canReview && (
        <div className="bg-surface border border-warn/20 rounded-lg p-4">
          <div className="text-xs font-bold text-warn-light uppercase tracking-wide mb-1">🔍 Биелэлт хянах</div>
          {task.submitted_note && (
            <div className="bg-surface2 border border-border rounded p-3 mb-3">
              <div className="text-xs text-tx3 mb-1">Ажилтны тайлбар:</div>
              <p className="text-sm text-tx2">{task.submitted_note}</p>
            </div>
          )}
          <Textarea
            placeholder="Хяналтын тайлбар, санал..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button variant="primary" loading={loading} onClick={() => handleReview(true)}>✅ Батлах</Button>
            <Button variant="danger" loading={loading} onClick={() => handleReview(false)}>↩️ Буцаах</Button>
          </div>
        </div>
      )}

      {/* Comment */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-xs font-bold text-tx3 uppercase tracking-wide mb-3">💬 Коммент нэмэх</div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-surface2 border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-tx3"
            placeholder="Коммент бичих..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleComment()}
          />
          <Button size="sm" variant="secondary" onClick={handleComment}>Илгээх</Button>
        </div>
      </div>
    </div>
  )
}
