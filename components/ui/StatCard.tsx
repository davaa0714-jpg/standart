import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple'
  icon?: string
}

export function StatCard({ label, value, sub, color = 'blue', icon }: StatCardProps) {
  const colors = {
    blue:   'text-primary-light',
    green:  'text-accent-light',
    red:    'text-danger-light',
    orange: 'text-warn-light',
    purple: 'text-purple-light',
  }
  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-border2 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-bold text-tx3 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <div className={cn('text-3xl font-bold font-mono', colors[color])}>{value}</div>
      {sub && <div className="text-[11px] text-tx3 mt-1">{sub}</div>}
    </div>
  )
}
