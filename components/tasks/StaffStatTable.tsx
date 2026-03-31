import { ProgressBar } from '@/components/ui/Badges'
import type { StaffStats } from '@/types/database'

export function StaffStatTable({ stats }: { stats: StaffStats[] }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_70px_70px_70px_100px] gap-2 px-4 py-2 bg-surface2 border-b border-border text-[11px] font-bold text-tx3 uppercase tracking-wide">
        <div>Ажилтан</div><div className="text-center">Нийт</div><div className="text-center">Биелсэн</div><div className="text-center">Хэтэрсэн</div><div>Биелэлт</div>
      </div>
      {stats.map(s => (
        <div key={s.id} className="grid grid-cols-[1fr_70px_70px_70px_100px] gap-2 px-4 py-3 border-b border-border last:border-0 items-center">
          <div>
            <div className="text-sm font-medium">{s.full_name}</div>
            <div className="text-xs text-tx3">{s.position ?? ''}</div>
          </div>
          <div className="text-center text-sm font-mono">{s.total_tasks}</div>
          <div className="text-center text-sm font-mono text-accent-light">{s.done_tasks}</div>
          <div className="text-center text-sm font-mono text-danger-light">{s.overdue_tasks}</div>
          <div>
            <ProgressBar value={s.completion_pct} />
            <div className="text-[10px] text-tx3 font-mono text-right mt-0.5">{s.completion_pct}%</div>
          </div>
        </div>
      ))}
    </div>
  )
}
