'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Role = 'admin' | 'manager' | 'staff'

const roleOptions: { value: Role; title: string; description: string }[] = [
  { value: 'admin', title: 'Админ', description: 'Бүх байгууллагын удирдлага' },
  { value: 'manager', title: 'Менежер', description: 'Багийн ажлыг хариуцагч' },
  { value: 'staff', title: 'Ажилтан', description: 'Өдөр тутмын үүргээ биелүүлэгч' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', position: '', department: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<Role>('staff')
  const router = useRouter()

  const updateField = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: event.target.value }))

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    const userId = data?.user?.id
    if (signUpErr || !userId) {
      setError(signUpErr?.message ?? 'Бүртгэл үүсгэхэд алдаа гарлаа.')
      setLoading(false)
      return
    }

    const profileValues = {
      id: userId,
      org_id: ORG_ID,
      full_name: form.full_name,
      position: form.position || null,
      department: form.department || null,
      phone: form.phone || null,
      role,
      is_active: true,
      avatar_url: null,
    }

    const response = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: profileValues }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload?.error ?? 'Профайл үүсгэхэд алдаа гарлаа.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6 shadow-card">
      <h2 className="text-base font-bold mb-5">Бүртгүүлэх</h2>

      <div className="mb-4">
        <p className="text-xs font-semibold text-tx2 uppercase tracking-wide mb-2">Үүрэг сонгох</p>
        <div className="grid grid-cols-3 gap-2">
          {roleOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={cn(
                'border border-border rounded-lg px-3 py-2 flex flex-col gap-1 text-left text-xs transition-colors',
                role === option.value
                  ? 'bg-accent/10 border-accent text-accent-light'
                  : 'bg-surface hover:border-accent hover:text-tx'
              )}
            >
              <span className="font-semibold text-sm">{option.title}</span>
              <span className="text-[11px] text-tx3">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">Овог нэр *</label>
          <Input placeholder="Д. Мөнхбаяр" value={form.full_name} onChange={updateField('full_name')} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">И-мэйл *</label>
          <Input type="email" placeholder="name@example.com" value={form.email} onChange={updateField('email')} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">Нууц үг *</label>
          <Input
            type="password"
            placeholder="Хамгийн багадаа 6 тэмдэгт"
            value={form.password}
            onChange={updateField('password')}
            required
            minLength={6}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Албан тушаал</label>
            <Input placeholder="Мэргэжилтэн" value={form.position} onChange={updateField('position')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-tx2">Хэлтэс</label>
            <Input placeholder="Кадастрын хэлтэс" value={form.department} onChange={updateField('department')} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">Утасны дугаар</label>
          <Input placeholder="99001122" value={form.phone} onChange={updateField('phone')} />
        </div>
        {error && (
          <p className="text-xs text-danger-light bg-danger/10 border border-danger/20 rounded px-3 py-2">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center mt-1">
          Бүртгүүлэх
        </Button>
      </form>
      <p className="text-xs text-tx3 text-center mt-4">
        Бүртгэлтэй юу?{' '}
        <Link href="/auth/login" className="text-primary-light hover:underline">
          Нэвтрэх
        </Link>
      </p>
    </div>
  )
}
