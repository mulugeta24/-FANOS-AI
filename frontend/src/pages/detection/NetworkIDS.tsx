import { 
  Radio, ShieldAlert, TrendingUp, Activity, Network, 
  Zap, AlertTriangle, Eye, Filter, Download, RefreshCw,
  Globe, Server, Lock, Flame
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { severityClass } from '@/lib/utils'

const RULES = [
  { id: 'SID-2100498', name: 'GPL ATTACK_RESPONSE id check returned root', proto: 'TCP', action: 'ALERT',  hits: 142, enabled: true },
  { id: 'SID-2013028', name: 'ET POLICY Suspicious User-Agent',             proto: 'HTTP', action: 'ALERT',  hits: 87,  enabled: true },
  { id: 'SID-2001219', name: 'GPL SCAN nmap XMAS',                           proto: 'TCP', action: 'BLOCK',  hits: 34,  enabled: true },
  { id: 'SID-2008578', name: 'ET SCAN Nessus Vulnerability Scanner',         proto: 'HTTP', action: 'ALERT',  hits: 21,  enabled: true },
  { id: 'SID-2019714', name: 'ET EXPLOIT Apache Struts RCE',                 proto: 'HTTP', action: 'BLOCK',  hits: 8,   enabled: true },
  { id: 'SID-2006380', name: 'ET WEB SQL Injection attempt',                 proto: 'HTTP', action: 'BLOCK',  hits: 203, enabled: true },
]

const EVENTS = [
  { time: '2 min ago',  sev: 'HIGH',    type: 'TCP Port Scan',        src: '192.168.56.31', dst: '10.0.0.1',  proto: 'TCP',  action: 'BLOCK' },
  { time: '5 min ago',  sev: 'CRITICAL',type: 'SQL Injection',         src: '192.168.56.10', dst: '10.0.0.20', proto: 'HTTP', action: 'BLOCK' },
  { time: '9 min ago',  sev: 'MEDIUM',  type: 'Suspicious UA String',  src: '10.0.1.55',     dst: '10.0.0.20', proto: 'HTTP', action: 'ALERT' },
  { time: '14 min ago', sev: 'HIGH',    type: 'Nmap XMAS Scan',        src: '172.16.0.88',   dst: '10.0.0.1',  proto: 'TCP',  action: 'BLOCK' },
  { time: '20 min ago', sev: 'LOW',     type: 'ICMP Flood',            src: '192.168.1.100', dst: '10.0.0.1',  proto: 'ICMP', action: 'ALERT' },
]

const TRAFFIC_DATA = [
  { time: '00:00', events: 120, blocked: 45 },
  { time: '04:00', events: 85, blocked: 32 },
  { time: '08:00', events: 340, blocked: 128 },
  { time: '12:00', events: 520, blocked: 198 },
  { time: '16:00', events: 450, blocked: 167 },
  { time: '20:00', events: 280, blocked: 94 },
]

const PROTOCOL_DIST = [
  { proto: 'TCP', count: 1842, color: '#00c8ff', pct: 45 },
  { proto: 'HTTP', count: 1456, color: '#8b5cf6', pct: 36 },
  { proto: 'HTTPS', count: 523, color: '#00e5a0', pct: 13 },
  { proto: 'UDP', count: 187, color: '#f59e0b', pct: 4 },
  { proto: 'ICMP', count: 92, color: '#ef4444', pct: 2 },
]

const ATTACK_TYPES = [
  { type: 'Port Scanning', count: 487, trend: '+12%', color: '#ef4444', icon: <Eye size={14}/> },
  { type: 'SQL Injection', count: 203, trend: '-8%', color: '#f97316', icon: <AlertTriangle size={14}/> },
  { type: 'Brute Force', count: 142, trend: '+25%', color: '#f59e0b', icon: <Lock size={14}/> },
  { type: 'XSS Attempts', count: 87, trend: '+5%', color: '#8b5cf6', icon: <Globe size={14}/> },
  { type: 'DDoS Activity', count: 34, trend: '-15%', color: '#00c8ff', icon: <Flame size={14}/> },
]

export default function NetworkIDS() {
  const maxTraffic = Math.max(...TRAFFIC_DATA.map(d => d.events))
  
  return (
    <PageShell title="Network IDS" subtitle="Suricata-powered real-time network intrusion detection"
      badge={{ label: 'SURICATA ACTIVE', color: 'green' }}>

      {/* Hero Banner with Network Visualization */}
      <div className="fanos-card relative overflow-hidden mb-4" style={{ minHeight: '200px' }}>
        {/* Animated Background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(0,200,255,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(0,229,160,0.08) 100%)',
        }}>
          {/* Network Grid Pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              linear-gradient(rgba(0,200,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,200,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />
          
          {/* Glowing Orbs */}
          <div className="absolute top-10 left-20 w-32 h-32 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #00c8ff 0%, transparent 70%)' }} />
          <div className="absolute bottom-10 right-20 w-40 h-40 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(0,200,255,0.15), rgba(139,92,246,0.15))',
                    border: '2px solid rgba(0,200,255,0.3)',
                    boxShadow: '0 0 30px rgba(0,200,255,0.2)'
                  }}>
                  <Network size={28} className="text-fanos-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Network Intrusion Detection System</h2>
                  <p className="text-sm text-fanos-muted">Deep packet inspection powered by Suricata engine • Real-time threat detection & prevention</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-fanos-green animate-pulse" 
                    style={{ boxShadow: '0 0 10px rgba(0,229,160,0.6)' }} />
                  <span className="text-xs font-semibold text-fanos-green">ENGINE ACTIVE</span>
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">98.7%</span> Detection Accuracy
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">6,842</span> Rules Loaded
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">3.2ms</span> Avg Latency
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <button className="fanos-btn gap-2">
                <RefreshCw size={13} />
                Refresh Rules
              </button>
              <button className="fanos-btn gap-2">
                <Download size={13} />
                Export Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid with Icons */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Rules Active',   value: '6,842',  icon: <Radio size={16}/>,        color: '#00c8ff', gradient: 'from-blue-500/20 to-cyan-500/20' },
          { label: 'Events Today',   value: '3,241',  icon: <Activity size={16}/>,     color: '#00e5a0', gradient: 'from-green-500/20 to-emerald-500/20' },
          { label: 'Threats Blocked',value: '128',    icon: <ShieldAlert size={16}/>,  color: '#ef4444', gradient: 'from-red-500/20 to-orange-500/20' },
          { label: 'Alerts Raised',  value: '487',    icon: <TrendingUp size={16}/>,   color: '#f59e0b', gradient: 'from-amber-500/20 to-yellow-500/20' },
        ].map(s => (
          <div key={s.label} className="fanos-card px-5 py-4 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[1px] font-semibold text-fanos-dim">{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `${s.color}20`,
                    border: `1px solid ${s.color}40`,
                    color: s.color
                  }}>
                  {s.icon}
                </div>
              </div>
              <div className="text-[28px] font-bold text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Activity Chart & Protocol Distribution */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-4">
        {/* Traffic Over Time */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Activity size={13} className="text-fanos-accent"/>
              Network Traffic Activity
            </div>
            <span className="text-[10px] text-fanos-dim">Last 24 hours</span>
          </div>
          
          <div className="px-6 py-5">
            <div className="flex items-end justify-between h-40 gap-3">
              {TRAFFIC_DATA.map((d, i) => {
                const eventHeight = (d.events / maxTraffic) * 100
                const blockedHeight = (d.blocked / maxTraffic) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-full w-full">
                      {/* Events bar */}
                      <div className="flex-1 rounded-t-md transition-all duration-500 relative group cursor-pointer"
                        style={{ 
                          height: `${eventHeight}%`,
                          background: 'linear-gradient(to top, rgba(0,200,255,0.5), rgba(0,200,255,0.8))',
                          minHeight: '4px'
                        }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.events} events
                        </div>
                      </div>
                      {/* Blocked bar */}
                      <div className="flex-1 rounded-t-md transition-all duration-500 relative group cursor-pointer"
                        style={{ 
                          height: `${blockedHeight}%`,
                          background: 'linear-gradient(to top, rgba(239,68,68,0.5), rgba(239,68,68,0.8))',
                          minHeight: '4px'
                        }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.blocked} blocked
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-fanos-dim">{d.time}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(0,200,255,0.7)' }} />
                <span className="text-[10px] text-fanos-muted">Total Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.7)' }} />
                <span className="text-[10px] text-fanos-muted">Blocked Threats</span>
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Distribution */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Server size={13} className="text-fanos-accent"/>
              Protocol Distribution
            </div>
          </div>
          
          <div className="px-4 py-4">
            {/* Donut visualization */}
            <div className="flex items-center justify-center mb-4 relative">
              <svg width="140" height="140" className="transform -rotate-90">
                <circle cx="70" cy="70" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
                {PROTOCOL_DIST.map((p, i) => {
                  const offset = PROTOCOL_DIST.slice(0, i).reduce((sum, x) => sum + x.pct, 0)
                  const circumference = 2 * Math.PI * 50
                  const dashArray = `${(p.pct / 100) * circumference} ${circumference}`
                  const dashOffset = -((offset / 100) * circumference)
                  
                  return (
                    <circle
                      key={p.proto}
                      cx="70"
                      cy="70"
                      r="50"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="20"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-500"
                    />
                  )
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className="text-[24px] font-bold text-white">4.1K</div>
                <div className="text-[9px] text-fanos-dim uppercase">Total</div>
              </div>
            </div>

            {/* Protocol list */}
            <div className="flex flex-col gap-2">
              {PROTOCOL_DIST.map(p => (
                <div key={p.proto} className="flex items-center justify-between px-2 py-1.5 rounded-md"
                  style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-[11px] text-fanos-text font-medium">{p.proto}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-fanos-muted">{p.count.toLocaleString()}</span>
                    <span className="text-[10px] font-semibold" style={{ color: p.color }}>{p.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attack Types Grid */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {ATTACK_TYPES.map(a => (
          <div key={a.type} className="fanos-card px-4 py-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10 blur-2xl"
              style={{ background: `radial-gradient(circle, ${a.color}, transparent)` }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}40` }}>
                  {a.icon}
                </div>
                <span className={`text-[10px] font-semibold ${a.trend.startsWith('+') ? 'text-fanos-red' : 'text-fanos-green'}`}>
                  {a.trend}
                </span>
              </div>
              <div className="text-[10px] text-fanos-dim mb-1">{a.type}</div>
              <div className="text-[20px] font-bold text-white">{a.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Network Events */}
      <div className="fanos-card mb-4">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <Zap size={13} className="text-fanos-accent"/>
            Recent Network Events
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-fanos-dim">Last updated: just now</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold text-fanos-green"
              style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.22)' }}>
              <span className="dot-green"/>
              LIVE
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Time','Severity','Event Type','Source IP','Destination','Protocol','Action'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.8px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {EVENTS.map((e,i)=>(
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3 text-[11px] text-fanos-dim whitespace-nowrap">{e.time}</td>
                  <td className="px-4 py-3"><span className={severityClass(e.sev)}>{e.sev}</span></td>
                  <td className="px-4 py-3 text-[12px] text-fanos-text font-medium">{e.type}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-accent">{e.src}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-muted">{e.dst}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-[10px] font-semibold" 
                      style={{ background: 'rgba(0,200,255,0.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.2)' }}>
                      {e.proto}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={e.action==='BLOCK'?'status-blocked':'status-alert'}>{e.action}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Detection Rules */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <Filter size={13} className="text-fanos-accent"/>
            Active Detection Rules
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-fanos-dim">{RULES.length} rules loaded</span>
            <button className="fanos-btn gap-1.5 text-[10px]">
              <Filter size={11} />
              Filter Rules
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Rule ID','Description','Protocol','Action','Hits','Status'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.8px] uppercase text-fanos-dim">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {RULES.map(r=>(
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-accent">{r.id}</td>
                  <td className="px-4 py-3 text-[12px] text-fanos-text max-w-[320px]">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-[10px] font-semibold"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                      {r.proto}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className={r.action==='BLOCK'?'status-blocked':'status-alert'}>{r.action}</span></td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-fanos-text">{r.hits}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-semibold text-fanos-green"
                      style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.25)' }}>
                      ● ENABLED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
