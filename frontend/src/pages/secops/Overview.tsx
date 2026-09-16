/**
 * Security Operations — SOC Overview Dashboard
 * The primary security operations dashboard showing real-time status
 * across all security engines, active incidents, and critical alerts.
 */
import {
  AlertOctagon, FileWarning, Shield, Zap, Activity,
  Network, Globe, BrainCircuit, ArrowUpRight, ArrowRight,
  Clock, TrendingUp, CheckCircle2, Eye,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color, href, pulse,
}: {
  label: string; value: string | number; sub: string
  icon: React.ReactNode; color: string; href: string; pulse?: boolean
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(href)}
      className="fanos-card p-4 text-left w-full transition-all hover:border-white/10 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <ArrowUpRight size={11} className="text-fanos-dim" />
      </div>
      <div className="text-[22px] font-bold text-white leading-none flex items-center gap-2">
        {value}
        {pulse && <span className="w-2 h-2 rounded-full bg-fanos-red animate-pulse" />}
      </div>
      <div className="text-[10px] font-semibold text-fanos-muted mt-1">{label}</div>
      <div className="text-[9px] text-fanos-dim mt-0.5">{sub}</div>
    </button>
  )
}

// ── Mock chart data ────────────────────────────────────────────
const THREAT_DATA = [
  { time: '00:00', network: 12, web: 8,  system: 4,  blocked: 18 },
  { time: '02:00', network: 8,  web: 5,  system: 2,  blocked: 12 },
  { time: '04:00', network: 6,  web: 4,  system: 1,  blocked: 9  },
  { time: '06:00', network: 14, web: 9,  system: 5,  blocked: 22 },
  { time: '08:00', network: 28, web: 18, system: 9,  blocked: 48 },
  { time: '10:00', network: 45, web: 32, system: 14, blocked: 78 },
  { time: '12:00', network: 38, web: 28, system: 11, blocked: 65 },
  { time: '14:00', network: 52, web: 35, system: 16, blocked: 92 },
  { time: '16:00', network: 61, web: 44, system: 18, blocked: 110},
  { time: '18:00', network: 48, web: 36, system: 14, blocked: 84 },
  { time: '20:00', network: 35, web: 25, system: 10, blocked: 62 },
  { time: '22:00', network: 22, web: 15, system: 6,  blocked: 38 },
  { time: '24:00', network: 18, web: 11, system: 4,  blocked: 28 },
]

// ── Recent Alerts ─────────────────────────────────────────────
const ALERTS = [
  { id:'ALT-001', sev:'CRITICAL', title:'SQL Injection Campaign',        src:'192.168.56.10', time:'2 min ago',  engine:'WAF'      },
  { id:'ALT-002', sev:'CRITICAL', title:'Command Injection on /api/exec',src:'172.16.0.88',  time:'5 min ago',  engine:'Suricata' },
  { id:'ALT-003', sev:'HIGH',     title:'Brute Force — SSH Port 22',     src:'185.220.0.14', time:'8 min ago',  engine:'Suricata' },
  { id:'ALT-004', sev:'HIGH',     title:'Port Scan — 500+ ports',        src:'192.168.56.31',time:'15 min ago', engine:'Zeek'     },
  { id:'ALT-005', sev:'HIGH',     title:'XSS on /comment endpoint',      src:'10.0.0.44',    time:'30 min ago', engine:'WAF'      },
]

// ── Active Incidents ───────────────────────────────────────────
const INCIDENTS = [
  { id:'INC-001', title:'Multi-stage SQL Injection Attack', sev:'CRITICAL', status:'Investigating', assignee:'Kidist W.', updated:'5 min ago'  },
  { id:'INC-002', title:'Credential Brute Force Campaign',  sev:'HIGH',     status:'Contained',     assignee:'SOC-1',     updated:'12 min ago' },
  { id:'INC-003', title:'Lateral Movement Detected',        sev:'HIGH',     status:'Investigating', assignee:'Unassigned',updated:'1 hr ago'   },
  { id:'INC-004', title:'DDoS Amplification Attempt',       sev:'MEDIUM',   status:'Monitoring',    assignee:'SOC-2',     updated:'2 hr ago'   },
]

// ── Engine Health ─────────────────────────────────────────────
const ENGINES = [
  { name:'WAF',          type:'Web Security',    events: 1842, status:'ONLINE',   uptime:'99.9%', color:'#00e5a0' },
  { name:'Zeek',         type:'Network NSM',     events: 5621, status:'ONLINE',   uptime:'100%',  color:'#00c8ff' },
  { name:'Suricata',     type:'Network IDS',     events: 3284, status:'ONLINE',   uptime:'99.7%', color:'#00c8ff' },
  { name:'FANOS AI',     type:'ML Detection',    events: 8421, status:'ONLINE',   uptime:'99.8%', color:'#8b5cf6' },
  { name:'Wazuh',        type:'Host IDS',        events: 2156, status:'ONLINE',   uptime:'99.9%', color:'#f59e0b' },
  { name:'NDR Sensor',   type:'Network Traffic', events: 9823, status:'ONLINE',   uptime:'100%',  color:'#00c8ff' },
]

const sevColor: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  HIGH:     { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM:   { bg: 'rgba(0,200,255,0.10)',  color: '#00c8ff' },
}

const statusColor: Record<string, { bg: string; color: string }> = {
  Investigating: { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
  Contained:     { bg: 'rgba(0,229,160,0.08)',   color: '#00e5a0' },
  Monitoring:    { bg: 'rgba(0,200,255,0.08)',   color: '#00c8ff' },
}

const engineBadge: Record<string,string> = {
  WAF:      '#00e5a0',
  Suricata: '#00c8ff',
  Zeek:     '#8b5cf6',
}

export default function SecOpsOverview() {
  const navigate = useNavigate()

  return (
    <div className="px-4 py-4 flex flex-col gap-4">

      {/* Page hero */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Security Operations Center</h1>
          <p className="text-[13px] text-fanos-muted mt-1">
            Real-time security monitoring across all engines — WAF, Zeek, Suricata, and FANOS AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fanos-green"
            style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <span className="dot-green" />LIVE — Updated just now
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fanos-red"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertOctagon size={11} />7 CRITICAL
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Critical Alerts"    value={7}      sub="+2 last hour"    icon={<AlertOctagon size={15}/>} color="#ef4444" href="/secops/alerts"      pulse />
        <KpiCard label="Active Incidents"   value={5}      sub="3 investigating" icon={<FileWarning size={15}/>}  color="#f59e0b" href="/secops/incidents"   />
        <KpiCard label="Blocked Today"      value={1842}   sub="+18% vs avg"     icon={<Shield size={15}/>}       color="#00e5a0" href="/secops/events"      />
        <KpiCard label="Security Events"    value="8,421"  sub="Last 24 hours"   icon={<Zap size={15}/>}          color="#00c8ff" href="/secops/events"      />
        <KpiCard label="AI Accuracy"        value="99.84%" sub="F1: 99.85%"      icon={<BrainCircuit size={15}/>} color="#8b5cf6" href="/secops/events"      />
        <KpiCard label="Engine Health"      value="6/6"    sub="All online"      icon={<Activity size={15}/>}     color="#00e5a0" href="/secops/assets"      />
      </div>

      {/* Main grid — chart + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Threat activity chart */}
        <div className="xl:col-span-2 fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <TrendingUp size={13} className="text-fanos-accent" />
              Threat Activity — Last 24 Hours
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              {[
                { label:'Network', color:'#ef4444' },
                { label:'Web',     color:'#f59e0b' },
                { label:'System',  color:'#8b5cf6' },
                { label:'Blocked', color:'#00e5a0' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1 text-fanos-dim">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-48 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={THREAT_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  {[
                    { id:'network', color:'#ef4444' },
                    { id:'web',     color:'#f59e0b' },
                    { id:'system',  color:'#8b5cf6' },
                    { id:'blocked', color:'#00e5a0' },
                  ].map(g => (
                    <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={g.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={g.color} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#4a6070' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#4a6070' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#8fa3bf' }}
                />
                <Area type="monotone" dataKey="blocked" stroke="#00e5a0" strokeWidth={1.5} fill="url(#grad-blocked)" />
                <Area type="monotone" dataKey="network" stroke="#ef4444" strokeWidth={1.5} fill="url(#grad-network)" />
                <Area type="monotone" dataKey="web"     stroke="#f59e0b" strokeWidth={1.5} fill="url(#grad-web)"     />
                <Area type="monotone" dataKey="system"  stroke="#8b5cf6" strokeWidth={1.5} fill="url(#grad-system)"  />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <AlertOctagon size={13} className="text-fanos-red" />
              Recent Alerts
            </div>
            <button onClick={() => navigate('/secops/alerts')}
              className="text-[10px] text-fanos-dim hover:text-fanos-accent flex items-center gap-1">
              All alerts <ArrowRight size={10} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {ALERTS.map(a => (
              <div key={a.id} className="px-4 py-2.5 hover:bg-white/[0.018] transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: sevColor[a.sev]?.bg, color: sevColor[a.sev]?.color,
                      border: `1px solid ${sevColor[a.sev]?.color}30` }}>
                    {a.sev}
                  </span>
                  <span className="text-[9px] text-fanos-dim flex-shrink-0">{a.time}</span>
                </div>
                <div className="text-[11px] text-fanos-text leading-tight mb-1">{a.title}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-fanos-dim">{a.src}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: `${engineBadge[a.engine] ?? '#6b7280'}15`,
                      color: engineBadge[a.engine] ?? '#6b7280',
                      border: `1px solid ${engineBadge[a.engine] ?? '#6b7280'}30` }}>
                    {a.engine}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents + Engine Health */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Active incidents */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><FileWarning size={13} className="text-fanos-amber" />Active Incidents</div>
            <button onClick={() => navigate('/secops/incidents')}
              className="text-[10px] text-fanos-dim hover:text-fanos-accent flex items-center gap-1">
              All incidents <ArrowRight size={10} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {INCIDENTS.map(inc => {
              const sc = statusColor[inc.status] ?? { bg: 'rgba(255,255,255,0.05)', color: '#6b7280' }
              return (
                <div key={inc.id} className="px-4 py-3 hover:bg-white/[0.018] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-fanos-dim">{inc.id}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: sevColor[inc.sev]?.bg, color: sevColor[inc.sev]?.color,
                          border: `1px solid ${sevColor[inc.sev]?.color}30` }}>
                        {inc.sev}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                      {inc.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-fanos-text mb-1">{inc.title}</div>
                  <div className="flex items-center gap-3 text-[9px] text-fanos-dim">
                    <span className="flex items-center gap-1"><Eye size={9} />{inc.assignee}</span>
                    <span className="flex items-center gap-1"><Clock size={9} />{inc.updated}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Security engine health */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Activity size={13} className="text-fanos-green" />Security Engine Health</div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {ENGINES.map(eng => (
              <div key={eng.name} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                  style={{ background: `${eng.color}15`, border: `1px solid ${eng.color}25`, color: eng.color }}>
                  {eng.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-fanos-text">{eng.name}</span>
                    <span className="text-[9px] text-fanos-dim">{eng.type}</span>
                  </div>
                  <div className="text-[9px] text-fanos-dim mt-0.5">
                    {eng.events.toLocaleString()} events today
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-fanos-green">
                    <CheckCircle2 size={9} />{eng.status}
                  </div>
                  <span className="text-[9px] text-fanos-dim">{eng.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attack distribution mini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'WAF Events',      value:1842, icon:<Globe size={14}/>,        color:'#00e5a0', href:'/secops/web/waf'            },
          { label:'Network Events',  value:8905, icon:<Network size={14}/>,      color:'#00c8ff', href:'/secops/network/zeek'        },
          { label:'Suricata Alerts', value:3284, icon:<Shield size={14}/>,       color:'#00c8ff', href:'/secops/network/suricata'    },
          { label:'AI Predictions',  value:8421, icon:<BrainCircuit size={14}/>, color:'#8b5cf6', href:'/secops/events'              },
        ].map(s => (
          <button key={s.label} onClick={() => navigate(s.href)}
            className="fanos-card p-3 flex items-center gap-3 cursor-pointer hover:border-white/10 transition-all text-left">
            <span style={{ color: s.color }}>{s.icon}</span>
            <div>
              <div className="text-[16px] font-bold text-white">{s.value.toLocaleString()}</div>
              <div className="text-[10px] text-fanos-muted">{s.label}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
