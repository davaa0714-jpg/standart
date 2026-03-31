'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ROLE_LABELS } from '@/types/database'
import type { Profile } from '@/types/database'

export function SettingsClient({ profile }: { profile: Profile | null }) {
  const { success, error: toastErr } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name:  profile?.full_name  ?? '',
    position:   profile?.position   ?? '',
    department: profile?.department ?? '',
    phone:      profile?.phone      ?? '',
    notify_days: '3',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    setLoading(true)
    const db = createClient()
    const { error } = await db.from('profiles').update({
      full_name:  form.full_name,
      position:   form.position || null,
      department: form.department || null,
      phone:      form.phone || null,
    }).eq('id', profile?.id ?? '')
    setLoading(false)
    if (error) toastErr('Хадгалахад алдаа гарлаа')
    else success('Мэдээлэл хадгалагдлаа')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Profile */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold mb-4">Хувийн мэдээлэл</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white">
              {profile?.full_name?.[0] ?? '?'}
            </div>
            <div>
              <div className="text-sm font-semibold">{profile?.full_name}</div>
              <div className="text-xs text-tx3">{profile ? ROLE_LABELS[profile.role] : ''}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Овог нэр</label>
            <Input value={form.full_name} onChange={set('full_name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-tx2">Албан тушаал</label>
              <Input placeholder="Мэргэжилтэн" value={form.position} onChange={set('position')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-tx2">Хэлтэс</label>
              <Input placeholder="Кадастрын хэлтэс" value={form.department} onChange={set('department')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Утасны дугаар</label>
            <Input placeholder="99001122" value={form.phone} onChange={set('phone')} />
          </div>
          <Button variant="primary" loading={loading} onClick={handleSave} className="self-start">
            Хадгалах
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold mb-4">🔔 Мэдэгдлийн тохиргоо</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Хугацаа дуусахаас хэдэн хоногийн өмнө мэдэгдэх</label>
            <Select value={form.notify_days} onChange={set('notify_days')} className="max-w-xs">
              <option value="1">1 хоногийн өмнө</option>
              <option value="3">3 хоногийн өмнө</option>
              <option value="7">7 хоногийн өмнө</option>
            </Select>
          </div>
          <Button variant="primary" loading={loading} onClick={handleSave} className="self-start">
            Хадгалах
          </Button>
        </div>
      </div>

      {/* Role info */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold mb-3">Эрхийн мэдээлэл</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-tx3">Одоогийн эрх</span>
            <span className="font-semibold">{profile ? ROLE_LABELS[profile.role] : '—'}</span>
          </div>
          <div className="text-xs text-tx3 mt-1 bg-surface2 rounded p-3 leading-relaxed">
            Эрхийг өөрчлөх шаардлагатай бол байгууллагынхаа админтай холбогдоно уу.
          </div>
        </div>
      </div>
    </div>
  )
}
