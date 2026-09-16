import { Wifi, Server, ShieldCheck, Globe, Cloud, Users, Activity } from 'lucide-react'

/* ── Sensor/system status data ────────────────────── */
const SENSORS = [
  { name: 'Network Sensors',    icon: Wifi,        online: 12, total: 12, latency: '24ms',  events: '3,241/s', status: 'ONLINE' as const },
  { name: 'Endpoint Agents',    icon: Server,      online: 247, total: 248, latency: '18ms', events: '2,104/s', status: 'ONLINE' as const },
  { name: 'WAF',                icon: ShieldCheck, online: 3, total: 3,  latency: '8ms',   events: '892/s',   status: 'ONLINE' as const },
  { name: 'API Gateway',        icon: Globe,       online: 2, total: 2,  latency: '12ms',  events: '1,847/s', status: 'ONLINE' as const },
  { name: 'Cloud Connectors',   icon: Cloud,       online: 5, total: 5,  latency: '47ms',  events: '438/s',   status: 'ONLINE' as const },
  { name: 'Identity Providers', icon: Users,       online: 2, total: 2,  latency: '31ms',  events: '214/s',   status: 'ONLINE' as const },
]

const STATS = [
  { label: 'Events/sec',     value: '1,284',   color: '#00c8ff' },
  { label: 'Total Sensors',  value: '271/272',  color: '#00e5a0' },
  { label: 'Avg Latency',    value: '24ms',    color: '#8b5cf6' },
  { label: 'Ingestion',      value: 'Healthy', color: '#00e5a0' },
]

export default function SystemStatusPanel() {
  return (
    <div className="fanos-card">
      {/* Header */}
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Activity size={13} className="text-fanos-accent" />
          Real-Time System Status
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold text-fanos-green"
          style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)' }}>
          <span className="dot-green" />
          ALL SYSTEMS OPERATIONAL
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-4 gap-0 border-b border-white/[0.05]">
        {STATS.map(s => (
          <div key={s.label} className="flex flex-col items-center justify-center py-3 border-r border-white/[0.04] last:border-r-0">
            <div className="text-[18px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-fanos-dim mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sensor rows */}
      <div className="divide-y divide-white/[0.03]">
        {SENSORS.map(sensor => {
          const pct = Math.round((sensor.online / sensor.total) * 100)
          return (
            <div key={sensor.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.015] transition-colors">
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.2)' }}>
                <sensor.icon size={13} className="text-fanos-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-fanos-text">{sensor.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="w-24 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${pct}%`,
                      background: pct === 100 ? '#00e5a0' : pct >= 90 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                  <span className="text-[10px] text-fanos-dim">
                    {sensor.online}/{sensor.total} online
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[11px] font-mono text-fanos-muted">{sensor.events}</div>
                <div className="text-[10px] text-fanos-dim">{sensor.latency} latency</div>
              </div>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                background: sensor.online === sensor.total ? '#00e5a0' : '#f59e0b',
              }} />
            </div>
          )
        })}
      </div>

      {/* Demo mode footer */}
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <span className="text-[10px] text-fanos-dim">
          <span className="text-fanos-amber font-semibold">DEMO MODE —</span> Backend offline · Displaying simulated sensor data
        </span>
      </div>
    </div>
  )
}
