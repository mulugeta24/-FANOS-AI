import { Zap, RefreshCw } from 'lucide-react'
import { useLiveEvents, useRefreshAll } from '@/hooks/useDashboard'
import { mockEvents } from '@/lib/mockData'
import { severityClass, statusClass, riskColor } from '@/lib/utils'

const COLS = 'grid-cols-[72px_1fr_100px_96px_56px_78px_84px]'

function ConfBar({ value }: { value: number }) {
  const color = value >= 95 ? '#00e5a0' : value >= 85 ? '#00c8ff' : '#f59e0b'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-fanos-text font-medium">{value.toFixed(1)}%</span>
      <div className="w-8 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

export default function LiveEventsPanel() {
  const { data: events = mockEvents, isFetching } = useLiveEvents(20)
  const refresh = useRefreshAll()

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Zap size={15} className="text-fanos-accent" />
          Live Security Events
        </div>
        <div className="flex items-center gap-2">
          <div style={{
            background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)',
            borderRadius: '20px', padding: '3px 8px',
            fontSize: '10px', fontWeight: 600, color: '#00e5a0',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span className="dot-green" />
            REAL-TIME
          </div>
          <button
            onClick={refresh}
            className="text-fanos-dim hover:text-fanos-muted transition-colors"
            title="Refresh all data"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className={`grid ${COLS} gap-2 px-4 py-2 border-b border-white/[0.04] bg-black/10`}>
        {['SEVERITY', 'ATTACK TYPE', 'SOURCE IP', 'TARGET', 'RISK', 'AI CONF.', 'STATUS'].map(h => (
          <span key={h} className="text-[10px] font-bold tracking-[0.7px] uppercase text-fanos-dim">{h}</span>
        ))}
      </div>

      <div className="divide-y divide-white/[0.03]">
        {events.map((ev) => (
          <div
            key={ev.id as string}
            className={`grid ${COLS} gap-2 px-4 py-2.5 hover:bg-white/[0.018] transition-colors items-center`}
          >
            <span className={severityClass(ev.severity)}>{ev.severity}</span>
            <span className="text-[12px] text-fanos-text font-medium truncate">{ev.attack_type}</span>
            <span className="text-[12px] font-mono text-fanos-accent truncate">{ev.source_ip}</span>
            <span className="text-[12px] text-fanos-muted truncate">{ev.target}</span>
            <span className={`text-[13px] font-bold ${riskColor(ev.risk_score)}`}>{ev.risk_score}</span>
            <ConfBar value={ev.ai_confidence} />
            <span className={statusClass(ev.status)}>{ev.status}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[11px] text-fanos-dim">Showing {events.length} most recent events</span>
        <button className="fanos-btn text-[10px] py-1 px-2.5">View All Events</button>
      </div>
    </div>
  )
}
