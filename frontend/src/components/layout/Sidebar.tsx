import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileWarning, Globe,
  Radio, Monitor, Filter, Zap, Cpu, ShieldAlert,
  Fingerprint, Cloud, Skull, Lock, Mail, Bot, KeyRound,
  Shield, Ban, WifiOff, ShieldCheck, List, History,
  RotateCcw, BookOpen,
  BrainCircuit, Crosshair, GitBranch, Target,
  Package, Users, Wifi, Plug, ScrollText, Settings,
  Building2, Users2, Key, Settings2,
  Bell, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'

interface NavItem {
  label: string
  to:    string
  icon:  React.ReactNode
  badge?: string
}
interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',         to: '/',             icon: <LayoutDashboard size={15} /> },
      { label: 'Incidents',         to: '/soc/incidents',icon: <FileWarning size={15} />,   badge: '24' },
      { label: 'Threat Intelligence',to: '/soc/threats', icon: <Globe size={15} /> },
    ],
  },
  {
    group: 'Detection',
    items: [
      { label: 'Network IDS / NDR',      to: '/detection/network',     icon: <Radio size={15} /> },
      { label: 'Web Attack Detection',   to: '/detection/web',          icon: <Globe size={15} /> },
      { label: 'System Detection',       to: '/detection/system',       icon: <Monitor size={15} /> },
      { label: 'Endpoint Detection',     to: '/detection/endpoint',     icon: <Cpu size={15} /> },
      { label: 'Identity Detection',     to: '/detection/identity',     icon: <Fingerprint size={15} /> },
      { label: 'Cloud Detection',        to: '/detection/cloud',        icon: <Cloud size={15} /> },
      { label: 'Malware Detection',      to: '/detection/malware',      icon: <Skull size={15} /> },
      { label: 'Ransomware Detection',   to: '/detection/ransomware',   icon: <Lock size={15} />,  badge: 'NEW' },
      { label: 'Phishing Detection',     to: '/detection/phishing',     icon: <Mail size={15} /> },
      { label: 'Bot Detection',          to: '/detection/bots',         icon: <Bot size={15} /> },
      { label: 'Brute Force Detection',  to: '/detection/bruteforce',   icon: <KeyRound size={15} /> },
      { label: 'Detection Rules',        to: '/detection/rules',        icon: <Filter size={15} /> },
      { label: 'Detection Events',       to: '/detection/events',       icon: <Zap size={15} />,   badge: '8.4K' },
    ],
  },
  {
    group: 'Prevention',
    items: [
      { label: 'Active Blocking',    to: '/prevention/blocking',  icon: <Shield size={15} /> },
      { label: 'Blocked IPs',        to: '/prevention/ips',       icon: <Ban size={15} />,       badge: '128' },
      { label: 'Blocked Sessions',   to: '/prevention/sessions',  icon: <WifiOff size={15} /> },
      { label: 'WAF Protection',     to: '/prevention/waf',       icon: <ShieldCheck size={15} /> },
      { label: 'Endpoint Isolation', to: '/prevention/isolation', icon: <ShieldAlert size={15} /> },
      { label: 'Prevention Rules',   to: '/prevention/rules',     icon: <List size={15} /> },
    ],
  },
  {
    group: 'Response',
    items: [
      { label: 'Incident Response',   to: '/soc/incidents',         icon: <Bell size={15} /> },
      { label: 'Automated Response',  to: '/prevention/history',    icon: <RotateCcw size={15} /> },
      { label: 'Response Playbooks',  to: '/response/playbooks',    icon: <BookOpen size={15} /> },
      { label: 'Response History',    to: '/response/history',      icon: <History size={15} /> },
    ],
  },
  {
    group: 'Analysis',
    items: [
      { label: 'AI Threat Detection',  to: '/ai/engine',            icon: <BrainCircuit size={15} /> },
      { label: 'Threat Hunting',       to: '/soc/correlation',      icon: <Crosshair size={15} /> },
      { label: 'Attack Timeline',      to: '/soc/timeline',         icon: <GitBranch size={15} /> },
      { label: 'MITRE ATT&CK',         to: '/analysis/mitre',       icon: <Target size={15} /> },
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'Assets',              to: '/infra/hosts',            icon: <Package size={15} /> },
      { label: 'Users & Identities',  to: '/admin/users',            icon: <Users size={15} /> },
      { label: 'Sensors',             to: '/infra/sensors',          icon: <Wifi size={15} /> },
      { label: 'Integrations',        to: '/infra/datasources',      icon: <Plug size={15} /> },
      { label: 'Reports',             to: '/analytics/reports',      icon: <ScrollText size={15} /> },
      { label: 'Audit Logs',          to: '/admin/audit',            icon: <Activity size={15} /> },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Organizations',       to: '/admin/orgs',             icon: <Building2 size={15} /> },
      { label: 'Teams',               to: '/admin/roles',            icon: <Users2 size={15} /> },
      { label: 'API Keys',            to: '/admin/api-keys',         icon: <Key size={15} /> },
      { label: 'Settings',            to: '/admin/settings',         icon: <Settings size={15} /> },
      { label: 'SMS Center',          to: '/admin/sms',              icon: <Settings2 size={15} /> },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="w-[260px] min-w-[260px] bg-fanos-surface border-r border-white/[0.06] flex flex-col overflow-hidden z-50">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-[13px] border-b border-white/[0.06] flex-shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#0d2a45,#0a3d62)', border: '1px solid rgba(0,200,255,0.3)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
              stroke="#00c8ff" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(0,200,255,0.06)" />
            <path d="M9 12l2.5 2.5L15 9" stroke="#00e5a0" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-bold text-white tracking-wide leading-tight">
            FANOS <span className="text-fanos-accent">AI</span>
          </div>
          <div className="text-[9px] text-fanos-dim tracking-[1.5px] uppercase mt-0.5">AI Cyber Defense</div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 py-2 border-b border-white/[0.06] flex-shrink-0">
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1.5 scrollbar-thin">
        {NAV.map((group) => (
          <div key={group.group} className="mb-0.5">
            <p className="px-4 py-[7px] text-[10px] font-semibold tracking-[1.2px] uppercase text-fanos-dim">
              {group.group}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-4 py-[6px] text-[13px] font-normal',
                  'transition-all duration-150 border-l-2 cursor-pointer',
                  isActive
                    ? 'border-fanos-accent text-fanos-accent font-medium'
                    : 'border-transparent text-fanos-muted hover:text-fanos-text hover:bg-fanos-accent/5 hover:border-fanos-accent/30',
                  isActive && 'bg-gradient-to-r from-fanos-accent/10 to-transparent',
                )}
              >
                <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: item.badge === 'NEW'
                        ? 'rgba(139,92,246,0.15)'
                        : 'rgba(239,68,68,0.15)',
                      color: item.badge === 'NEW' ? '#8b5cf6' : '#ef4444',
                      border: `1px solid ${item.badge === 'NEW' ? 'rgba(139,92,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0 space-y-2">
        {/* Demo mode banner */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-fanos-amber animate-pulse" />
          <span className="text-[10px] font-semibold text-fanos-amber tracking-wide">DEMO MODE</span>
        </div>
        {/* System online */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)' }}>
          <span className="dot-green" />
          <span className="text-[10px] font-semibold text-fanos-green tracking-wide">SYSTEM ONLINE</span>
          <span className="ml-auto text-[9px] text-fanos-dim">12/12 sensors</span>
        </div>
      </div>
    </aside>
  )
}
