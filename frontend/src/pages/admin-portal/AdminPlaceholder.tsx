/**
 * Generic placeholder for Admin Portal pages not yet fully implemented.
 * Maintains the same design system as the main Placeholder.
 */
import { Construction } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

type IconName = keyof typeof LucideIcons

interface Props {
  title:  string
  desc?:  string
  icon?:  string
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'red'
}

const colorMap = {
  purple: { bg:'rgba(139,92,246,0.08)',  border:'rgba(139,92,246,0.2)',  text:'#a78bfa' },
  blue:   { bg:'rgba(0,200,255,0.08)',   border:'rgba(0,200,255,0.2)',   text:'#00c8ff' },
  green:  { bg:'rgba(0,229,160,0.08)',   border:'rgba(0,229,160,0.2)',   text:'#00e5a0' },
  orange: { bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.2)',  text:'#f59e0b' },
  red:    { bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.2)',   text:'#ef4444' },
}

export default function AdminPlaceholder({ title, desc, icon = 'Construction', color = 'purple' }: Props) {
  const c = colorMap[color]
  const IconComponent = (LucideIcons[icon as IconName] ?? Construction) as React.ComponentType<LucideProps>

  return (
    <PageShell title={title} subtitle={desc ?? ''}>
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <IconComponent size={28} style={{ color: c.text }} />
        </div>
        <div className="text-center max-w-md">
          <div className="text-[16px] font-bold text-white mb-2">{title}</div>
          {desc && <div className="text-[13px] text-fanos-muted leading-relaxed">{desc}</div>}
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}
        >
          <Construction size={12} />
          Coming Soon
        </div>
      </div>
    </PageShell>
  )
}
