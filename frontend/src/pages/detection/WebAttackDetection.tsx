import { 
  Globe, Shield, Activity, Database, Code, Lock, FileText, Download, RefreshCw,
  ExternalLink, Target, Crosshair, Bug, Zap
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { severityClass } from '@/lib/utils'

const ATTACK_STATS = [
  { label: 'SQL Injection', value: '1,248', change: '+12%', icon: <Database size={16}/>, color: '#ef4444', gradient: 'from-red-500/20 to-rose-500/20' },
  { label: 'XSS Attempts', value: '892', change: '+8%', icon: <Code size={16}/>, color: '#f97316', gradient: 'from-orange-500/20 to-amber-500/20' },
  { label: 'CSRF Attacks', value: '456', change: '-15%', icon: <Lock size={16}/>, color: '#f59e0b', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { label: 'Path Traversal', value: '234', change: '+5%', icon: <FileText size={16}/>, color: '#8b5cf6', gradient: 'from-purple-500/20 to-violet-500/20' },
]

const RECENT_ATTACKS = [
  { time: '1 min ago', type: 'SQL Injection', severity: 'CRITICAL', target: '/api/users', ip: '203.45.67.89', payload: "' OR '1'='1", status: 'BLOCKED' },
  { time: '3 min ago', type: 'XSS Attack', severity: 'HIGH', target: '/search', ip: '198.12.34.56', payload: '<script>alert(1)</script>', status: 'BLOCKED' },
  { time: '5 min ago', type: 'Path Traversal', severity: 'HIGH', target: '/files/download', ip: '45.78.90.12', payload: '../../etc/passwd', status: 'BLOCKED' },
  { time: '7 min ago', type: 'CSRF Token Missing', severity: 'MEDIUM', target: '/api/transfer', ip: '102.34.56.78', payload: 'POST without token', status: 'ALERTED' },
  { time: '10 min ago', type: 'SQL Injection', severity: 'CRITICAL', target: '/login', ip: '156.78.90.23', payload: "admin'--", status: 'BLOCKED' },
]

const ATTACK_VECTORS = [
  { vector: 'SQL Injection', count: 1248, pct: 42, color: '#ef4444', icon: <Database size={14}/> },
  { vector: 'XSS', count: 892, pct: 30, color: '#f97316', icon: <Code size={14}/> },
  { vector: 'CSRF', count: 456, pct: 15, color: '#f59e0b', icon: <Lock size={14}/> },
  { vector: 'Path Traversal', count: 234, pct: 8, color: '#8b5cf6', icon: <FileText size={14}/> },
  { vector: 'Other', count: 150, pct: 5, color: '#6b7280', icon: <Bug size={14}/> },
]

const HOURLY_ACTIVITY = [
  { hour: '00:00', attacks: 45, blocked: 42 },
  { hour: '04:00', attacks: 32, blocked: 30 },
  { hour: '08:00', attacks: 128, blocked: 125 },
  { hour: '12:00', attacks: 198, blocked: 195 },
  { hour: '16:00', attacks: 167, blocked: 162 },
  { hour: '20:00', attacks: 94, blocked: 91 },
]

const TOP_TARGETS = [
  { endpoint: '/api/users', attacks: 487, severity: 'CRITICAL', method: 'POST' },
  { endpoint: '/login', attacks: 342, severity: 'HIGH', method: 'POST' },
  { endpoint: '/search', attacks: 298, severity: 'HIGH', method: 'GET' },
  { endpoint: '/api/transfer', attacks: 156, severity: 'MEDIUM', method: 'POST' },
  { endpoint: '/files/download', attacks: 89, severity: 'MEDIUM', method: 'GET' },
]

const THREAT_INTEL = [
  { source: 'Known Malicious IPs', count: 45, status: 'ACTIVE', color: '#ef4444' },
  { source: 'Suspicious Payloads', count: 128, status: 'MONITORING', color: '#f59e0b' },
  { source: 'Bot Networks', count: 23, status: 'BLOCKED', color: '#ef4444' },
  { source: 'Vulnerability Scanners', count: 67, status: 'MONITORED', color: '#3b82f6' },
]

export default function WebAttackDetection() {
  const maxActivity = Math.max(...HOURLY_ACTIVITY.map(d => d.attacks))

  return (
    <PageShell 
      title="Web Attack Detection" 
      subtitle="AI-powered detection of web-based attacks including SQLi, XSS, SSRF, and more across all web endpoints"
      badge={{ label: 'AI DETECTION ACTIVE', color: 'green' }}
    >
      {/* Hero Banner */}
      <div className="fanos-card relative overflow-hidden mb-4" style={{ minHeight: '220px' }}>
        {/* Animated Background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.08) 50%, rgba(245,158,11,0.08) 100%)',
        }}>
          {/* Circuit Pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(239,68,68,0.4) 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, rgba(249,115,22,0.4) 1px, transparent 1px),
              radial-gradient(circle at 40% 80%, rgba(245,158,11,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }} />
          
          {/* Glowing Orbs */}
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
          
          {/* Floating Attack Icons */}
          <div className="absolute top-20 right-32 w-12 h-12 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Database size={20} className="text-red-400" />
          </div>
          <div className="absolute bottom-24 left-40 w-12 h-12 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', animationDelay: '1s' }}>
            <Code size={20} className="text-orange-400" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))',
                    border: '2px solid rgba(239,68,68,0.3)',
                    boxShadow: '0 0 30px rgba(239,68,68,0.2)'
                  }}>
                  <Globe size={32} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Web Application Attack Detection</h2>
                  <p className="text-sm text-fanos-muted">AI-powered detection & blocking of OWASP Top 10 vulnerabilities • Real-time payload analysis</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-fanos-green animate-pulse" 
                    style={{ boxShadow: '0 0 10px rgba(0,229,160,0.6)' }} />
                  <span className="text-xs font-semibold text-fanos-green">ML ENGINE ACTIVE</span>
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">99.2%</span> Detection Rate
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">2,980</span> Attacks Blocked Today
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">&lt;1ms</span> Inspection Time
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">128</span> Active Rules
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <button className="fanos-btn gap-2">
                <RefreshCw size={13} />
                Refresh Data
              </button>
              <button className="fanos-btn gap-2">
                <Download size={13} />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attack Statistics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {ATTACK_STATS.map(stat => (
          <div key={stat.label} className="fanos-card px-5 py-4 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[1px] font-semibold text-fanos-dim">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `${stat.color}20`,
                    border: `1px solid ${stat.color}40`,
                    color: stat.color
                  }}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-[28px] font-bold text-white mb-1">{stat.value}</div>
              <div className={`text-[11px] font-semibold ${stat.change.startsWith('+') ? 'text-red-400' : 'text-green-400'}`}>
                {stat.change} vs yesterday
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attack Activity Chart & Attack Vectors */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-4">
        {/* Hourly Attack Activity */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Activity size={13} className="text-fanos-accent"/>
              Attack Activity Timeline
            </div>
            <span className="text-[10px] text-fanos-dim">Last 24 hours</span>
          </div>
          
          <div className="px-6 py-5">
            <div className="flex items-end justify-between h-44 gap-3">
              {HOURLY_ACTIVITY.map((d, i) => {
                const attackHeight = (d.attacks / maxActivity) * 100
                const blockedHeight = (d.blocked / maxActivity) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-full w-full">
                      {/* Attacks bar */}
                      <div className="flex-1 rounded-t-md transition-all duration-500 relative group cursor-pointer"
                        style={{ 
                          height: `${attackHeight}%`,
                          background: 'linear-gradient(to top, rgba(239,68,68,0.5), rgba(239,68,68,0.9))',
                          minHeight: '6px'
                        }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.attacks} attacks
                        </div>
                      </div>
                      {/* Blocked bar */}
                      <div className="flex-1 rounded-t-md transition-all duration-500 relative group cursor-pointer"
                        style={{ 
                          height: `${blockedHeight}%`,
                          background: 'linear-gradient(to top, rgba(0,229,160,0.5), rgba(0,229,160,0.8))',
                          minHeight: '6px'
                        }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.blocked} blocked
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-fanos-dim">{d.hour}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.8)' }} />
                <span className="text-[10px] text-fanos-muted">Total Attacks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(0,229,160,0.8)' }} />
                <span className="text-[10px] text-fanos-muted">Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attack Vector Distribution */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Target size={13} className="text-fanos-accent"/>
              Attack Vectors
            </div>
          </div>
          
          <div className="px-4 py-4">
            {/* Horizontal Bars */}
            <div className="flex flex-col gap-3 mb-4">
              {ATTACK_VECTORS.map(v => (
                <div key={v.vector}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ background: `${v.color}20`, color: v.color }}>
                        {v.icon}
                      </div>
                      <span className="text-[11px] text-fanos-text font-medium">{v.vector}</span>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: v.color }}>{v.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${v.pct}%`,
                        background: `linear-gradient(90deg, ${v.color}80, ${v.color})`
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-fanos-dim mt-1">{v.count.toLocaleString()} attempts</div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between px-2 py-2 rounded-md"
                style={{ background: 'rgba(239,68,68,0.08)' }}>
                <span className="text-[11px] text-fanos-muted font-semibold">Total Detected</span>
                <span className="text-[14px] font-bold text-red-400">
                  {ATTACK_VECTORS.reduce((sum, v) => sum + v.count, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Targeted Endpoints & Threat Intelligence */}
      <div className="grid grid-cols-[1fr_1fr] gap-4 mb-4">
        {/* Top Targets */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Crosshair size={13} className="text-fanos-accent"/>
              Most Targeted Endpoints
            </div>
            <span className="text-[10px] text-fanos-dim">Last 24 hours</span>
          </div>
          
          <div className="px-4 py-3">
            <div className="flex flex-col gap-2">
              {TOP_TARGETS.map((target, i) => (
                <div key={target.endpoint} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.02] transition-colors"
                  style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-[14px] font-bold text-fanos-dim w-6">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] text-fanos-accent truncate">{target.endpoint}</div>
                    <div className="text-[9px] text-fanos-dim mt-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                        {target.method}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-white">{target.attacks}</div>
                    <div className="text-[9px] text-fanos-dim">attacks</div>
                  </div>
                  <span className={severityClass(target.severity)}>{target.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Threat Intelligence */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Shield size={13} className="text-fanos-accent"/>
              Threat Intelligence
            </div>
            <button className="fanos-btn gap-1.5 text-[10px]">
              <ExternalLink size={10} />
              View All
            </button>
          </div>
          
          <div className="px-4 py-3">
            <div className="flex flex-col gap-3">
              {THREAT_INTEL.map(intel => (
                <div key={intel.source}
                  className="flex items-center justify-between px-3 py-3 rounded-md"
                  style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" 
                      style={{ background: intel.color, boxShadow: `0 0 8px ${intel.color}` }} />
                    <div>
                      <div className="text-[11px] text-fanos-text font-medium">{intel.source}</div>
                      <div className="text-[9px] text-fanos-dim mt-0.5">
                        <span className="px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${intel.color}15`, color: intel.color }}>
                          {intel.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[16px] font-bold text-white">{intel.count}</div>
                </div>
              ))}
            </div>

            {/* Update Info */}
            <div className="mt-3 pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between text-[9px] text-fanos-dim">
                <span>Last intel update: 2 min ago</span>
                <span className="text-fanos-green font-semibold">● LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attack Events Table */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <Zap size={13} className="text-fanos-accent"/>
            Recent Attack Events
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-fanos-dim">Real-time monitoring</span>
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
                {['Time','Attack Type','Severity','Target Endpoint','Source IP','Payload Preview','Status'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.8px] uppercase text-fanos-dim whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {RECENT_ATTACKS.map((attack, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3 text-[11px] text-fanos-dim whitespace-nowrap">{attack.time}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-[10px] font-semibold"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                      {attack.type}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className={severityClass(attack.severity)}>{attack.severity}</span></td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-accent">{attack.target}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-muted">{attack.ip}</td>
                  <td className="px-4 py-3">
                    <code className="text-[10px] px-2 py-1 rounded font-mono text-red-400"
                      style={{ background: 'rgba(239,68,68,0.08)' }}>
                      {attack.payload}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={attack.status === 'BLOCKED' ? 'status-blocked' : 'status-alert'}>
                      {attack.status}
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
