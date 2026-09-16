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

const topBar: Record<string, string> = {
  red:    'from-fanos-red   to-transparent',
  orange: 'from-fanos-orange to-transparent',
  teal:   'from-fanos-green  to-transparent',
  blue:   'from-fanos-accent to-transparent',
  ai:     'from-fanos-purple via-fanos-accent to-transparent',
  health: 'from-fanos-green  via-fanos-accent to-transparent',
}

const iconBg: Record<string, string> = {
  red:    'bg-red-500/10    text-fanos-red',
  orange: 'bg-orange-500/10 text-fanos-orange',
  teal:   'bg-emerald-500/10 text-fanos-green',
  blue:   'bg-cyan-500/10   text-fanos-accent',
  ai:     'bg-violet-500/10 text-fanos-purple',
  health: 'bg-emerald-500/10 text-fanos-green',
}

const changeCls: Record<string, string> = {
  red:   'bg-red-500/10   text-fanos-red',
  green: 'bg-emerald-500/10 text-fanos-green',
  blue:  'bg-cyan-500/10  text-fanos-accent',
  amber: 'bg-amber-500/10 text-fanos-amber',
}

export default function KpiCard({
  label, value, change, changeTone = 'green', sub, sub2, accent, icon, extra,
}: KpiCardProps) {
  return (
    <div className="fanos-card relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:bg-fanos-card-hover group">
      {/* Top accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r', topBar[accent])} />

      <div className="px-3.5 pt-3.5 pb-3 flex flex-col gap-1.5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-bold tracking-[1.1px] uppercase text-fanos-dim">{label}</span>
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', iconBg[accent])}>
            {icon}
          </div>
        </div>

        {/* Value */}
        <div className="text-[28px] font-bold text-white leading-none tracking-tight">
          {value}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {change && (
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', changeCls[changeTone])}>
              {change}
            </span>
          )}
          {sub && <span className="text-[10px] text-fanos-dim">{sub}</span>}
        </div>

        {sub2 && <div className="text-[10px] text-fanos-muted">{sub2}</div>}
        {extra}
      </div>
    </div>
  )
}
