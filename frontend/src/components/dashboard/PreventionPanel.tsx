import { Shield, ExternalLink } from 'lucide-react'
import { usePreventionStatus } from '@/hooks/useDashboard'
import { mockPrevention } from '@/lib/mockData'

interface StatTileProps { label: string; value: string | number; color?: string }
function StatTile({ label, value, color }: StatTileProps) {
  return (
    <div className="rounded-md p-2.5"
      style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="text-[9px] uppercase tracking-[0.8px] text-fanos-dim">{label}</div>
      <div className="text-[18px] font-bold mt-0.5" style={{ color: color ?? '#e8f0fe' }}>{value}</div>
    </div>
  )
}

export default function PreventionPanel() {
  const { data: p = mockPrevention } = usePreventionStatus()

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Shield size={13} className="text-fanos-accent" />
          Prevention Center
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }}>
          {p.active_blocking ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        <StatTile label="Blocked IPs"      value={p.blocked_ips}      color="#00c8ff" />
        <StatTile label="Blocked Sessions" value={p.blocked_sessions}  color="#f97316" />
        <StatTile label="WAF Blocks"       value={p.waf_blocks}        color="#f59e0b" />
        <StatTile label="Firewall Actions" value={p.firewall_actions}  color="#8b5cf6" />
      </div>

      <div className="px-3 py-2 border-t border-white/[0.04] flex items-center justify-between">
        <div className="text-[10px] text-fanos-muted font-semibold">Automatic Response</div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.25)' }}>
          {p.auto_response ? 'ENABLED' : 'DISABLED'}
        </span>
      </div>

      <div className="px-3 pb-3">
        <button className="fanos-btn w-full justify-center gap-1.5">
          <ExternalLink size={11} />
          MANAGE PREVENTION
        </button>
      </div>
    </div>
  )
}
