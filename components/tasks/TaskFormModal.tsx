'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { Profile, Meeting, TaskType, Priority } from '@/types/database'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  orgId: string
  currentUserId: string
}

export function TaskFormModal({ open, onClose, onSaved, orgId, currentUserId }: TaskFormProps) {
  const { success, error: toastErr } = useToast()
  const [loading, setLoading] = useState(false)
  const [profiles, setProfiles] = useState<Array<Pick<Profile, 'id' | 'full_name' | 'position'>>>([])
  const [meetings, setMeetings]  = useState<Array<Pick<Meeting, 'id' | 'title' | 'meeting_no'>>>([])

  const [form, setForm] = useState({
    title: '', description: '', task_type: 'uureg' as TaskType,
    priority: 'mid' as Priority, assignee_id: '',
    meeting_id: '', deadline: '', notify_days: '3', note: '',
  })

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('profiles').select('id,full_name,position').eq('org_id', orgId).eq('is_active', true)
      .then(({ data }) => setProfiles(data ?? []))
    supabase.from('meetings').select('id,title,meeting_no').eq('org_id', orgId).eq('status', 'open')
      .order('held_at', { ascending: false })
      .then(({ data }) => setMeetings(data ?? []))
  }, [open, orgId])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.deadline || !form.assignee_id) {
      toastErr('Заавал талбаруудыг бөглөнө үү')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').insert({
      org_id: orgId,
      title: form.title,
      description: form.description || null,
      task_type: form.task_type,
      priority: form.priority,
      assignee_id: form.assignee_id,
      assigned_by: currentUserId,
      meeting_id: form.meeting_id || null,
      deadline: form.deadline,
      notify_days: parseInt(form.notify_days),
      status: 'new',
      progress: 0,
      created_by: currentUserId,
    })
    setLoading(false)
    if (error) { toastErr('Алдаа гарлаа', error.message); return }

    // Мэдэгдэл
    if (form.assignee_id) {
      await supabase.from('notifications').insert({
        profile_id: form.assignee_id,
        type: 'assigned',
        title: 'Шинэ үүрэг хүлээн авлаа',
        body: form.title,
      })
    }

    success('Үүрэг амжилттай нэмэгдлээ', form.title)
    setForm({ title: '', description: '', task_type: 'uureg', priority: 'mid', assignee_id: '', meeting_id: '', deadline: '', notify_days: '3', note: '' })
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="＋ Шинэ үүрэг / Даалгавар нэмэх"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Болих</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>Үүрэг нэмэх</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">Үүргийн гарчиг *</label>
          <Input placeholder="Үүрэг, даалгаварын гарчиг..." value={form.title} onChange={set('title')} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Төрөл *</label>
            <Select value={form.task_type} onChange={set('task_type')}>
              <option value="uureg">Үүрэг</option>
              <option value="daalgavar">Даалгавар</option>
              <option value="medeelel">Мэдээлэл</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Эрэмбэ</label>
            <Select value={form.priority} onChange={set('priority')}>
              <option value="high">🔴 Өндөр</option>
              <option value="mid">🟡 Дунд</option>
              <option value="low">🟢 Бага</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Хариуцагч *</label>
            <Select value={form.assignee_id} onChange={set('assignee_id')} required>
              <option value="">— Сонгох —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}{p.position ? ` (${p.position})` : ''}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Биелэх хугацаа *</label>
            <Input type="date" value={form.deadline} onChange={set('deadline')} required min={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Хурал</label>
            <Select value={form.meeting_id} onChange={set('meeting_id')}>
              <option value="">— Хурал сонгох —</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Мэдэгдэл (хэдэн хоногийн өмнө)</label>
            <Select value={form.notify_days} onChange={set('notify_days')}>
              <option value="1">1 хоногийн өмнө</option>
              <option value="3">3 хоногийн өмнө</option>
              <option value="7">7 хоногийн өмнө</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">Тайлбар</label>
          <Textarea placeholder="Нэмэлт тайлбар, заавар..." value={form.description} onChange={set('description')} />
        </div>
      </form>
    </Modal>
  )
}
