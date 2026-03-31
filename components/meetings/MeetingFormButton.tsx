'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

export function MeetingFormButton({ orgId, userId }: { orgId: string; userId: string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({ title: '', held_at: '', location: '', note: '' })
  const { success, error: toastErr } = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.title || !form.held_at) { toastErr('Нэр болон огноо оруулна уу'); return }
    setLoading(true)
    const db = createClient()

    // Meeting number auto-increment
    const { count } = await db.from('meetings').select('*', { count: 'exact', head: true }).eq('org_id', orgId)

    const { error } = await db.from('meetings').insert({
      org_id: orgId,
      title: form.title,
      meeting_no: (count ?? 0) + 1,
      held_at: form.held_at,
      location: form.location || null,
      note: form.note || null,
      chair_id: userId,
      created_by: userId,
      status: 'open',
    })
    setLoading(false)
    if (error) { toastErr('Алдаа гарлаа', error.message); return }
    success('Хурал амжилттай бүртгэгдлээ', form.title)
    setForm({ title: '', held_at: '', location: '', note: '' })
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>＋ Шинэ хурал</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="＋ Шинэ хурал бүртгэх"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Болих</Button>
            <Button variant="primary" loading={loading} onClick={handleSubmit}>Бүртгэх</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Хурлын нэр *</label>
            <Input placeholder="Газрын шуурхай хурал #5" value={form.title} onChange={set('title')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-tx2">Болсон огноо *</label>
              <Input type="date" value={form.held_at} onChange={set('held_at')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-tx2">Байршил</label>
              <Input placeholder="Хурлын өрөө №1" value={form.location} onChange={set('location')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Тэмдэглэл</label>
            <Textarea placeholder="Хурлын товч агуулга..." value={form.note} onChange={set('note')} />
          </div>
        </div>
      </Modal>
    </>
  )
}
