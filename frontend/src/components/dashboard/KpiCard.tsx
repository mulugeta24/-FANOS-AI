import { cn } from '@/lib/utils'

interface KpiCardProps {
  label:       string
  value:       string | number
  change?:     string
  changeTone?: 'red' | 'green' | 'blue' | 'amber'
  sub?:        string
  sub2?:       string
  accent:      'red' | 'orange' | 'teal' | 'blue' | 'ai' | 'health'
  icon:        React.ReactNode
  extra?:      React.ReactNode
}

const iconBg: Record<string, string> = {
  red:    'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
  orange: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  teal:   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  blue:   'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.15)]',
  ai:     'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
  health: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
}

const changeCls: Record<string, string> = {
  red:   'text-rose-400 bg-rose-500/10 border border-rose-500/25',
  green: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25',
  blue:  'text-sky-400 bg-sky-500/10 border border-sky-500/25',
  amber: 'text-amber-400 bg-amber-500/10 border border-amber-500/25',
}

export default function KpiCard({
  label, value, change, changeTone = 'green', sub, sub2, accent, icon, extra,
}: KpiCardProps) {
  return (
    <div className="fanos-card p-4 transition-all duration-200 hover:border-white/20 flex flex-col justify-between group hover:shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Top row: Icon container + Trend badge */}
      <div className="flex items-center justify-between">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105', iconBg[accent])}>
          {icon}
        </div>
        {change && (
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-0.5', changeCls[changeTone])}>
            {change}
          </span>
        )}
      </div>

      {/* Middle row: Big bold number */}
      <div className="mt-3">
        <div className="text-[28px] font-extrabold text-white leading-none tracking-tight font-mono">
          {value}
        </div>
        {/* Label */}
        <div className="text-[12px] font-medium text-slate-400 mt-1.5 truncate">
          {label}
        </div>
      </div>

      {/* Subtext or progress bar */}
      {(sub || sub2 || extra) && (
        <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex flex-col gap-1">
          {sub && <span className="text-[11px] text-slate-500 font-medium">{sub}</span>}
          {sub2 && <span className="text-[10px] font-semibold text-slate-400">{sub2}</span>}
          {extra}
        </div>
      )}
    </div>
  )
}
