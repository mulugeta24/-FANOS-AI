import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Activity, RefreshCw } from 'lucide-react'
import { useThreatActivity } from '@/hooks/useDashboard'
import { mockThreatActivity } from '@/lib/mockData'

const SERIES = [
  { key: 'network', label: 'Network Attacks', color: '#ef4444' },
  { key: 'web',     label: 'Web Attacks',     color: '#f97316' },
  { key: 'system',  label: 'System Threats',  color: '#f59e0b' },
  { key: 'blocked', label: 'Blocked',         color: '#00e5a0' },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-[11px] shadow-xl"
      style={{ background: '#111c2e', border: '1px solid rgba(0,200,255,0.15)' }}>
      <p className="text-fanos-muted mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="text-fanos-muted">{p.name}:</span>
          <span className="text-white font-semibold ml-1">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ThreatActivityChart() {
  const { data = mockThreatActivity, isFetching } = useThreatActivity(24)

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Activity size={13} className="text-fanos-accent" />
          Threat Activity
        </div>
        <div className="flex items-center gap-2">
          {isFetching && <RefreshCw size={10} className="text-fanos-dim animate-spin" />}
          <span style={{
            background: 'rgba(0,229,160,0.08)', color: '#00e5a0',
            border: '1px solid rgba(0,229,160,0.22)',
            fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
          }}>
            LIVE · 24h
          </span>
        </div>
      </div>

      <div className="px-4 pt-1 pb-1">
        <p className="text-[10px] text-fanos-dim">Detected security events over the last 24 hours</p>
      </div>

      <div className="flex gap-5 px-4 pb-2 flex-wrap">
        {SERIES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px] text-fanos-muted">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      <div className="px-2 pb-3" style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              {SERIES.map(s => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#4a6080', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4a6080', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {SERIES.map(s => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={1.5}
                fill={`url(#grad-${s.key})`}
                dot={false}
                activeDot={{ r: 3, fill: s.color }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
