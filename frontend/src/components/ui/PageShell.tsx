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
  green:  'bg-fanos-green/10 text-fanos-green border border-fanos-green/25',
  red:    'bg-fanos-red/10 text-fanos-red border border-fanos-red/25',
  orange: 'bg-fanos-orange/10 text-fanos-orange border border-fanos-orange/25',
  blue:   'bg-fanos-accent/10 text-fanos-accent border border-fanos-accent/25',
  purple: 'bg-fanos-purple/10 text-fanos-purple border border-fanos-purple/25',
}

export default function PageShell({ title, subtitle, badge, actions, children, className }: PageShellProps) {
  return (
    <div className={cn('px-5 py-4 flex flex-col gap-4 animate-fade-in', className)}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-white tracking-tight">{title}</h1>
            {badge && (
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase', badgeStyles[badge.color])}>
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-fanos-muted mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
