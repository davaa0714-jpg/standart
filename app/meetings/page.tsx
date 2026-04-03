import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProgressBar, Badge } from '@/components/ui/Badges'
import { MeetingFormButton } from '@/components/meetings/MeetingFormButton'
import type { MeetingStats, Profile, TaskFull } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  const { data: meetings }  = await supabase
    .from('meeting_stats').select('*').eq('org_id', profile?.org_id ?? '')
    .order('held_at', { ascending: false }) as { data: MeetingStats[] | null }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-xs text-tx3 mb-1">Нүүр / Хурлууд</div>
          <h1 className="text-xl font-bold">Хурлын жагсаалт</h1>
          <p className="text-sm text-tx2 mt-0.5">Газрын шуурхай хурлын бүртгэл</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link 
              href="/recorder"
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface2 transition-colors"
            >
              <span>🎙️</span>
              Дуу хураах
            </Link>
            <MeetingFormButton orgId={profile?.org_id ?? ''} userId={user.id} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {!meetings?.length ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm">Хурал бүртгэгдээгүй байна</div>
          </div>
        ) : meetings.map((m) => {
          const pct = m.total_tasks ? Math.round(m.done_tasks / m.total_tasks * 100) : 0
          return (
            <Link key={m.id} href={`/meetings/${m.id}`}
              className="bg-surface border border-border rounded-lg p-5 hover:border-border2 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={m.status === 'open' ? 'success' : 'default'}>
                      {m.status === 'open' ? 'Нээлттэй' : 'Хаагдсан'}
                    </Badge>
                    {m.overdue_tasks > 0 && <Badge variant="danger">{m.overdue_tasks} хэтэрсэн</Badge>}
                  </div>
                  <h2 className="text-base font-bold group-hover:text-accent-light transition-colors">{m.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-tx3">
                    <span className="font-mono">{m.held_at}</span>
                    {m.chair_name && <span>Даргалагч: {m.chair_name}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-2xl font-bold font-mono ${pct >= 80 ? 'text-accent-light' : pct >= 50 ? 'text-warn-light' : 'text-danger-light'}`}>
                    {pct}%
                  </div>
                  <div className="text-[11px] text-tx3">биелэлт</div>
                </div>
              </div>

              <ProgressBar value={pct} className="mb-3" />

              <div className="flex gap-5 text-xs text-tx3">
                <span>Нийт: <strong className="text-tx">{m.total_tasks}</strong></span>
                <span>Биелсэн: <strong className="text-accent-light">{m.done_tasks}</strong></span>
                <span>Үлдсэн: <strong className="text-warn-light">{m.total_tasks - m.done_tasks}</strong></span>
                {m.overdue_tasks > 0 && <span>Хэтэрсэн: <strong className="text-danger-light">{m.overdue_tasks}</strong></span>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
