import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title:      string
  subtitle?:  string
  badge?:     { label: string; color: 'green' | 'red' | 'orange' | 'blue' | 'purple' }
  actions?:   ReactNode
  children:   ReactNode
  className?: string
}

const badgeStyles = {
  green:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)]',
  red:    'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.25)]',
  orange: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.25)]',
  blue:   'bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-[0_0_16px_rgba(56,189,248,0.25)]',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.25)]',
}

const badgeDot = {
  green:  'bg-emerald-400 animate-pulse',
  red:    'bg-rose-400 animate-ping',
  orange: 'bg-amber-400',
  blue:   'bg-sky-400 animate-pulse',
  purple: 'bg-purple-400 animate-pulse',
}

export default function PageShell({ title, subtitle, badge, actions, children, className }: PageShellProps) {
  return (
    <div className={cn('px-6 py-6 flex flex-col gap-6 animate-fade-in max-w-[1920px] mx-auto', className)}>
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-3.5 flex-wrap">
            <h1 className="text-[22px] font-black text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
            </h1>
            {badge && (
              <span className={cn('inline-flex items-center gap-2 text-[10.5px] font-mono font-bold px-3 py-1 rounded-full tracking-wider uppercase border', badgeStyles[badge.color])}>
                <span className={cn('w-2 h-2 rounded-full', badgeDot[badge.color])} />
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[12.5px] text-slate-400 mt-1.5 font-normal tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400/60 inline-block" />
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
