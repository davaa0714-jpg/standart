'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'manager' | 'employee'

const roleOptions: { value: Role; title: string; description: string }[] = [
  { value: 'admin', title: 'Админ', description: 'Бүх байгууллагын удирдлага' },
  { value: 'manager', title: 'Менежер', description: 'Төслийн баг, үүргийг зохицуулагч' },
  { value: 'employee', title: 'Ажилтан', description: 'Өдөр тутмын гүйцэтгэлийг гүйцэтгэгч' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [role, setRole]         = useState<Role>('admin')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('И-мэйл эсвэл нууц үг буруу байна.')
      setLoading(false)
      return
    }

    const redirectPath = role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/employee'
    setLoading(false)
    router.push(redirectPath)
    router.refresh()
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6 shadow-card">
      <h2 className="text-base font-bold mb-5">Нэвтрэх</h2>

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

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">И-мэйл</label>
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tx2">Нууц үг</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-xs text-danger-light bg-danger/10 border border-danger/20 rounded px-3 py-2">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center mt-1">
          Нэвтрэх
        </Button>
      </form>

      <p className="text-xs text-tx3 text-center mt-4">
        Бүртгэлтэй юу?{' '}
        <Link href="/auth/register" className="text-primary-light hover:underline">
          Бүртгүүлэх
        </Link>
      </p>
    </div>
  )
}
