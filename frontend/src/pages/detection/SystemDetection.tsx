import { 
  Monitor, Shield, Activity, HardDrive, FileText, AlertTriangle,
  Cpu, Server, Package,
  Download, RefreshCw, FileWarning, Search, Zap,
  User, Network, Key
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { severityClass } from '@/lib/utils'

const HOST_STATS = [
  { label: 'Monitored Hosts', value: '248', change: '+12', icon: <Server size={16}/>, color: '#00c8ff', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { label: 'Active Agents', value: '242', change: '+8', icon: <Activity size={16}/>, color: '#00e5a0', gradient: 'from-green-500/20 to-emerald-500/20' },
  { label: 'File Changes', value: '1,456', change: '+245', icon: <FileText size={16}/>, color: '#f59e0b', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { label: 'Security Events', value: '3,821', change: '+567', icon: <AlertTriangle size={16}/>, color: '#ef4444', gradient: 'from-red-500/20 to-orange-500/20' },
]

const RECENT_EVENTS = [
  { time: '30 sec ago', host: 'web-server-01', event: 'Suspicious Process Execution', severity: 'CRITICAL', process: '/tmp/shell.elf', user: 'www-data', status: 'ALERTED' },
  { time: '2 min ago', host: 'db-server-03', event: 'Unauthorized File Access', severity: 'HIGH', process: '/etc/shadow', user: 'backup', status: 'BLOCKED' },
  { time: '5 min ago', host: 'app-server-02', event: 'Root Login Detected', severity: 'HIGH', process: 'sshd', user: 'root', status: 'ALERTED' },
  { time: '8 min ago', host: 'web-server-05', event: 'Configuration File Modified', severity: 'MEDIUM', process: '/etc/nginx/nginx.conf', user: 'admin', status: 'LOGGED' },
  { time: '12 min ago', host: 'api-server-01', event: 'Privilege Escalation Attempt', severity: 'CRITICAL', process: 'sudo', user: 'webapp', status: 'BLOCKED' },
]

const AGENT_STATUS = [
  { host: 'web-server-01', ip: '10.0.1.15', os: 'Ubuntu 22.04', agent: 'v4.7.0', status: 'ACTIVE', uptime: '45d 12h', events: 8421, cpu: 12, mem: 34 },
  { host: 'db-server-03', ip: '10.0.2.23', os: 'CentOS 8', agent: 'v4.7.0', status: 'ACTIVE', uptime: '32d 8h', events: 12456, cpu: 8, mem: 28 },
  { host: 'app-server-02', ip: '10.0.1.42', os: 'Ubuntu 20.04', agent: 'v4.6.2', status: 'ACTIVE', uptime: '18d 3h', events: 5687, cpu: 15, mem: 42 },
  { host: 'web-server-05', ip: '10.0.1.67', os: 'Debian 11', agent: 'v4.7.0', status: 'ACTIVE', uptime: '8d 15h', events: 3421, cpu: 9, mem: 31 },
  { host: 'api-server-01', ip: '10.0.3.12', os: 'RHEL 8', agent: 'v4.7.0', status: 'DEGRADED', uptime: '2d 6h', events: 1892, cpu: 22, mem: 67 },
]

const EVENT_CATEGORIES = [
  { category: 'File Integrity', count: 1456, pct: 38, color: '#00c8ff', icon: <FileText size={14}/>, trend: '+12%' },
  { category: 'Process Monitoring', count: 1124, pct: 29, color: '#8b5cf6', icon: <Cpu size={14}/>, trend: '+8%' },
  { category: 'Registry Changes', count: 687, pct: 18, color: '#f59e0b', icon: <Key size={14}/>, trend: '-5%' },
  { category: 'User Activity', count: 354, pct: 9, color: '#00e5a0', icon: <User size={14}/>, trend: '+15%' },
  { category: 'Network Events', count: 200, pct: 6, color: '#ef4444', icon: <Network size={14}/>, trend: '+3%' },
]

const HOURLY_EVENTS = [
  { hour: '00:00', events: 245, critical: 12 },
  { hour: '04:00', events: 187, critical: 8 },
  { hour: '08:00', events: 456, critical: 23 },
  { hour: '12:00', events: 623, critical: 34 },
  { hour: '16:00', events: 542, critical: 28 },
  { hour: '20:00', events: 389, critical: 18 },
]

const FIM_ALERTS = [
  { path: '/etc/passwd', action: 'Modified', host: 'web-server-01', severity: 'HIGH', time: '2 min ago', user: 'root' },
  { path: '/var/www/html/config.php', action: 'Modified', host: 'app-server-02', severity: 'MEDIUM', time: '5 min ago', user: 'www-data' },
  { path: '/etc/ssh/sshd_config', action: 'Modified', host: 'db-server-03', severity: 'HIGH', time: '8 min ago', user: 'admin' },
  { path: '/root/.ssh/authorized_keys', action: 'Created', host: 'web-server-05', severity: 'CRITICAL', time: '12 min ago', user: 'unknown' },
]

const COMPLIANCE_STATUS = [
  { standard: 'PCI-DSS v4.0', status: 'COMPLIANT', score: 98, issues: 2, color: '#00e5a0' },
  { standard: 'HIPAA', status: 'COMPLIANT', score: 96, issues: 4, color: '#00e5a0' },
  { standard: 'CIS Benchmark', status: 'PARTIAL', score: 87, issues: 12, color: '#f59e0b' },
  { standard: 'NIST 800-53', status: 'COMPLIANT', score: 94, issues: 6, color: '#00e5a0' },
]

export default function SystemDetection() {
  const maxEvents = Math.max(...HOURLY_EVENTS.map(d => d.events))

  return (
    <PageShell 
      title="System Detection" 
      subtitle="Host-based intrusion detection powered by Wazuh agent data, file integrity monitoring, and system call analysis"
      badge={{ label: 'WAZUH ACTIVE', color: 'green' }}
    >
      {/* Hero Banner */}
      <div className="fanos-card relative overflow-hidden mb-4" style={{ minHeight: '220px' }}>
        {/* Animated Background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(0,200,255,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(0,229,160,0.08) 100%)',
        }}>
          {/* Server Grid Pattern */}
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(0,200,255,0.3) 0px, transparent 1px, transparent 40px, rgba(0,200,255,0.3) 41px),
              repeating-linear-gradient(90deg, rgba(0,200,255,0.3) 0px, transparent 1px, transparent 40px, rgba(0,200,255,0.3) 41px)
            `,
            backgroundSize: '40px 40px',
          }} />
          
          {/* Glowing Orbs */}
          <div className="absolute top-10 left-20 w-40 h-40 rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, #00c8ff 0%, transparent 70%)' }} />
          <div className="absolute bottom-10 right-20 w-48 h-48 rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          
          {/* Floating Server Icons */}
          <div className="absolute top-24 right-40 w-12 h-12 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.2)' }}>
            <Server size={20} className="text-fanos-accent" />
          </div>
          <div className="absolute bottom-28 left-48 w-12 h-12 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', animationDelay: '1.5s' }}>
            <HardDrive size={20} className="text-fanos-purple" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(0,200,255,0.15), rgba(139,92,246,0.15))',
                    border: '2px solid rgba(0,200,255,0.3)',
                    boxShadow: '0 0 30px rgba(0,200,255,0.2)'
                  }}>
                  <Monitor size={32} className="text-fanos-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Host-Based Intrusion Detection System</h2>
                  <p className="text-sm text-fanos-muted">Comprehensive endpoint security with Wazuh agents • File integrity monitoring • Process & registry tracking</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-fanos-green animate-pulse" 
                    style={{ boxShadow: '0 0 10px rgba(0,229,160,0.6)' }} />
                  <span className="text-xs font-semibold text-fanos-green">WAZUH MANAGER ACTIVE</span>
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">248</span> Monitored Hosts
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">97.6%</span> Agent Uptime
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">3,821</span> Events Today
                </div>
                <div className="text-xs text-fanos-muted">
                  <span className="text-fanos-text font-semibold">1,456</span> FIM Alerts
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <button className="fanos-btn gap-2">
                <RefreshCw size={13} />
                Refresh Agents
              </button>
              <button className="fanos-btn gap-2">
                <Download size={13} />
                Export Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {HOST_STATS.map(stat => (
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
              <div className="text-[11px] font-semibold text-fanos-green">
                +{stat.change} since yesterday
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event Timeline & Event Categories */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-4">
        {/* Hourly Event Activity */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Activity size={13} className="text-fanos-accent"/>
              System Event Timeline
            </div>
            <span className="text-[10px] text-fanos-dim">Last 24 hours</span>
          </div>
          
          <div className="px-6 py-5">
            <div className="flex items-end justify-between h-44 gap-3">
              {HOURLY_EVENTS.map((d, i) => {
                const eventHeight = (d.events / maxEvents) * 100
                const criticalHeight = (d.critical / maxEvents) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-full w-full">
                      {/* Total events bar */}
                      <div className="flex-1 rounded-t-md transition-all duration-500 relative group cursor-pointer"
                        style={{ 
                          height: `${eventHeight}%`,
                          background: 'linear-gradient(to top, rgba(0,200,255,0.5), rgba(0,200,255,0.8))',
                          minHeight: '6px'
                        }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.events} events
                        </div>
                      </div>
                      {/* Critical events bar */}
                      <div className="flex-1 rounded-t-md transition-all duration-500 relative group cursor-pointer"
                        style={{ 
                          height: `${criticalHeight}%`,
                          background: 'linear-gradient(to top, rgba(239,68,68,0.5), rgba(239,68,68,0.8))',
                          minHeight: '6px'
                        }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.critical} critical
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
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(0,200,255,0.8)' }} />
                <span className="text-[10px] text-fanos-muted">All Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.8)' }} />
                <span className="text-[10px] text-fanos-muted">Critical</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Categories */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Package size={13} className="text-fanos-accent"/>
              Event Categories
            </div>
          </div>
          
          <div className="px-4 py-4">
            <div className="flex flex-col gap-3">
              {EVENT_CATEGORIES.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ background: `${cat.color}20`, color: cat.color }}>
                        {cat.icon}
                      </div>
                      <span className="text-[11px] text-fanos-text font-medium">{cat.category}</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${cat.trend.startsWith('+') ? 'text-red-400' : 'text-green-400'}`}>
                      {cat.trend}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${cat.pct}%`,
                        background: `linear-gradient(90deg, ${cat.color}80, ${cat.color})`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-fanos-dim">{cat.count.toLocaleString()} events</span>
                    <span className="text-[9px] font-semibold" style={{ color: cat.color }}>{cat.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status & Compliance */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-4 mb-4">
        {/* Agent Status */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Server size={13} className="text-fanos-accent"/>
              Wazuh Agent Status
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-fanos-dim">242 Active / 6 Degraded</span>
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
                  {['Host','IP Address','OS','Agent','Status','Uptime','CPU','MEM'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold tracking-[0.8px] uppercase text-fanos-dim whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {AGENT_STATUS.map(agent => (
                  <tr key={agent.host} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 font-medium text-[11px] text-fanos-text">{agent.host}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{agent.ip}</td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{agent.os}</td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-dim">{agent.agent}</td>
                    <td className="px-3 py-2.5">
                      <span className={agent.status === 'ACTIVE' ? 'status-active' : 'status-alert'}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{agent.uptime}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full" 
                            style={{ 
                              width: `${agent.cpu}%`,
                              background: agent.cpu > 80 ? '#ef4444' : agent.cpu > 50 ? '#f59e0b' : '#00e5a0'
                            }} />
                        </div>
                        <span className="text-[9px] text-fanos-dim w-6 text-right">{agent.cpu}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full" 
                            style={{ 
                              width: `${agent.mem}%`,
                              background: agent.mem > 80 ? '#ef4444' : agent.mem > 50 ? '#f59e0b' : '#00e5a0'
                            }} />
                        </div>
                        <span className="text-[9px] text-fanos-dim w-6 text-right">{agent.mem}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Shield size={13} className="text-fanos-accent"/>
              Compliance Status
            </div>
          </div>
          
          <div className="px-4 py-4">
            <div className="flex flex-col gap-3">
              {COMPLIANCE_STATUS.map(comp => (
                <div key={comp.standard}
                  className="px-4 py-3 rounded-md"
                  style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-fanos-text font-medium">{comp.standard}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                      style={{ background: `${comp.color}15`, color: comp.color }}>
                      {comp.status}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ 
                          width: `${comp.score}%`,
                          background: `linear-gradient(90deg, ${comp.color}80, ${comp.color})`
                        }} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-fanos-dim">{comp.issues} open issues</span>
                    <span className="text-[12px] font-bold" style={{ color: comp.color }}>{comp.score}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] text-fanos-dim font-semibold">Overall Compliance</span>
                <span className="text-[14px] font-bold text-fanos-green">93.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Integrity Monitoring Alerts */}
      <div className="fanos-card mb-4">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <FileWarning size={13} className="text-fanos-accent"/>
            File Integrity Monitoring Alerts
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-fanos-dim">Critical file changes detected</span>
            <button className="fanos-btn gap-1.5 text-[10px]">
              <Search size={10} />
              View All
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Time','File Path','Action','Host','Severity','User'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.8px] uppercase text-fanos-dim whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {FIM_ALERTS.map((alert, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[11px] text-fanos-dim whitespace-nowrap">{alert.time}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-accent">{alert.path}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-[10px] font-semibold"
                      style={{ background: 'rgba(0,200,255,0.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.2)' }}>
                      {alert.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-fanos-text">{alert.host}</td>
                  <td className="px-4 py-3"><span className={severityClass(alert.severity)}>{alert.severity}</span></td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-muted">{alert.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <Zap size={13} className="text-fanos-accent"/>
            Recent Security Events
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-fanos-dim">Real-time host monitoring</span>
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
                {['Time','Host','Event Description','Severity','Process/File','User','Status'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.8px] uppercase text-fanos-dim whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {RECENT_EVENTS.map((event, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[11px] text-fanos-dim whitespace-nowrap">{event.time}</td>
                  <td className="px-4 py-3 font-medium text-[11px] text-fanos-text">{event.host}</td>
                  <td className="px-4 py-3 text-[12px] text-fanos-text">{event.event}</td>
                  <td className="px-4 py-3"><span className={severityClass(event.severity)}>{event.severity}</span></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-fanos-accent">{event.process}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fanos-muted">{event.user}</td>
                  <td className="px-4 py-3">
                    <span className={
                      event.status === 'BLOCKED' ? 'status-blocked' : 
                      event.status === 'ALERTED' ? 'status-alert' : 
                      'status-active'
                    }>
                      {event.status}
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
