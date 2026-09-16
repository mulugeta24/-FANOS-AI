import { Globe, ExternalLink } from 'lucide-react'
import { useWebSecurityStats } from '@/hooks/useDashboard'
import { mockWebSecurity } from '@/lib/mockData'

export default function WebSecurityPanel() {
  const { data: w = mockWebSecurity } = useWebSecurityStats()
  const maxCount = Math.max(...w.attack_types.map(a => a.count), 1)

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Globe size={13} className="text-fanos-accent" />
          Web Security
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,200,255,0.08)', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.2)' }}>
          WAF ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5">
        {[
          { label: 'Web Requests',       value: w.total_requests.toLocaleString(), color: '#e8f0fe' },
          { label: 'Suspicious',         value: w.suspicious,                      color: '#f59e0b' },
          { label: 'Confirmed Findings', value: w.confirmed_findings,              color: '#f97316' },
          { label: 'Critical Findings',  value: w.critical_findings,               color: '#ef4444' },
          { label: 'High Findings',      value: w.high_findings,                   color: '#f97316' },
        ].map(item => (
          <div key={item.label}>
            <div className="text-[9px] uppercase tracking-[0.7px] text-fanos-dim">{item.label}</div>
            <div className="text-[16px] font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="px-3 pb-2 border-t border-white/[0.04] pt-2">
        <div className="text-[9px] uppercase tracking-[0.8px] text-fanos-dim mb-2">Attack Types</div>
        <div className="flex flex-col gap-1.5">
          {w.attack_types.slice(0, 6).map(a => (
            <div key={a.name} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
              <span className="text-[10px] text-fanos-muted flex-1 truncate">{a.name}</span>
              <div className="w-16 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${(a.count / maxCount) * 100}%`, background: a.color }} />
              </div>
              <span className="text-[10px] font-semibold text-fanos-text w-5 text-right">{a.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3">
        <button className="fanos-btn w-full justify-center gap-1.5">
          <ExternalLink size={11} />
          OPEN WEB SECURITY
        </button>
      </div>
    </div>
  )
}
