import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Activity, RefreshCw, ShieldCheck, Radio } from 'lucide-react'
import { useThreatActivity } from '@/hooks/useDashboard'
import { mockThreatActivity } from '@/lib/mockData'
import { useWorkspace } from '@/context/WorkspaceContext'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0f1d]/95 backdrop-blur-xl rounded-xl p-3 text-[11px] shadow-2xl border border-white/[0.1] text-white">
      <p className="text-slate-400 mb-2 font-mono font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold ml-1 font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ThreatActivityChart() {
  const { activeCustomer, hasService } = useWorkspace()
  const { data: rawData = mockThreatActivity, isFetching } = useThreatActivity(24)

  const hasWaf = hasService('waf')
  const hasIds = hasService('ids')

  // Service-specific series and subtitle
  let series = [
    { key: 'network', label: 'Network Attacks', color: '#ef4444' },
    { key: 'web',     label: 'Web Attacks',     color: '#f97316' },
    { key: 'system',  label: 'System Threats',  color: '#f59e0b' },
    { key: 'blocked', label: 'Blocked by Engine', color: '#10b981' },
  ]
  let subtitle = 'Last 24 hours · 8,421 req today · Multi-engine logs'

  if (hasWaf && !hasIds) {
    series = [
      { key: 'web',     label: 'Web Attacks (OWASP)', color: '#f97316' },
      { key: 'blocked', label: 'Blocked by WAF',      color: '#10b981' },
      { key: 'network', label: 'Clean HTTP Traffic',   color: '#00c8ff' },
    ]
    subtitle = `Last 24 hours · WAF Reverse Proxy (Port 8002) · HTTP/S Traffic (${activeCustomer.domain})`
  } else if (hasIds && !hasWaf) {
    series = [
      { key: 'network', label: 'Network Exploits',  color: '#ef4444' },
      { key: 'system',  label: 'Port Scans / Recon', color: '#38bdf8' },
      { key: 'blocked', label: 'IDS Mitigated',      color: '#10b981' },
    ]
    subtitle = `Last 24 hours · Suricata & Zeek IDS Telemetry · Network Segment (${activeCustomer.ipAddress})`
  }

  // Filter or scale data based on active service
  const data = rawData.map(d => {
    if (hasWaf && !hasIds) {
      return {
        time: d.time,
        web: d.web,
        blocked: d.blocked,
        network: Math.round(d.web * 1.8), // Clean traffic representation
      }
    } else if (hasIds && !hasWaf) {
      return {
        time: d.time,
        network: d.network,
        system: d.system,
        blocked: d.blocked,
      }
    }
    return d
  })

  return (
    <div className="fanos-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0c1324]/50">
        <div className="flex items-center gap-2">
          {hasWaf && !hasIds ? (
            <ShieldCheck size={15} className="text-emerald-400" />
          ) : hasIds && !hasWaf ? (
            <Radio size={15} className="text-sky-400" />
          ) : (
            <Activity size={15} className="text-cyan-400" />
          )}
          <span className="text-[13px] font-bold text-white tracking-wide">
            {hasWaf && !hasIds
              ? 'WAF Traffic & Attack Interception'
              : hasIds && !hasWaf
              ? 'Network IDS Traffic & Anomaly Overview'
              : 'Traffic & Threat Overview'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && <RefreshCw size={11} className="text-slate-400 animate-spin" />}
          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE · {hasWaf && !hasIds ? 'WAF PROXY' : hasIds && !hasWaf ? 'SURICATA IDS' : 'MULTI-ENGINE'}
          </span>
        </div>
      </div>

      <div className="px-5 pt-3 pb-1">
        <p className="text-[12px] text-slate-400 font-mono">{subtitle}</p>
      </div>

      <div className="flex gap-5 px-5 pb-2 flex-wrap">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      <div className="px-2 pb-4" style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              {series.map(s => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {series.map(s => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
                activeDot={{ r: 4, fill: s.color }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

