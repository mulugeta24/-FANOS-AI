import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bell,
  FileWarning,
  Search,
  Zap,
  Network,
  ShieldCheck,
  BrainCircuit,
  Package,
  BarChart2,
  ChevronRight,
  ChevronDown,
  Shield,
  Layers,
  Activity,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useSecOpsAlerts } from '@/context/SecOpsAlertContext'
import FanosLogo from '@/components/common/FanosLogo'

interface NavItem {
  label: string
  to:    string
  icon:  React.ReactNode
  badge?: string
  badgeTone?: 'red' | 'purple' | 'amber' | 'blue'
  exact?:   boolean
}

// Sub-nav for expandable groups
interface ExpandableGroup {
  group:   string
  icon:    React.ReactNode
  color:   string
  basePath: string
  items:   NavItem[]
}

const EXPANDABLE: ExpandableGroup[] = [
  {
    group:    'Network Security',
    icon:     <Network size={14} />,
    color:    '#38bdf8',
    basePath: '/secops/network',
    items: [
      { label: 'Zeek',     to: '/secops/network/zeek',     icon: <Layers size={13} /> },
      { label: 'Suricata + XGBoost', to: '/secops/network/suricata', icon: <Shield size={13} />, badge: 'LIVE', badgeTone: 'blue' },
    ],
  },
  {
    group:    'Web Security',
    icon:     <ShieldCheck size={14} />,
    color:    '#34d399',
    basePath: '/secops/web',
    items: [
      { label: 'WAF',                  to: '/secops/web/waf',              icon: <ShieldCheck size={13} />, badge: 'PROXY', badgeTone: 'blue' },
      { label: 'URL Threat Detection', to: '/secops/web/threat-detection', icon: <Zap size={13} />, badge: 'AI', badgeTone: 'purple' },
      { label: 'Web Scanner',          to: '/secops/web/scanner',          icon: <Search size={13} />, badge: 'DAST', badgeTone: 'amber' },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { label: 'Threat Intelligence', to: '/secops/threat-intel', icon: <BrainCircuit size={15} /> },
  { label: 'Assets',              to: '/secops/assets',       icon: <Package size={15} /> },
  { label: 'Security Reports',    to: '/secops/reports',      icon: <BarChart2 size={15} /> },
]

function NavItemRow({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 px-3 py-2 mx-2 rounded-xl text-[12px] font-medium transition-all duration-200 cursor-pointer relative',
        isActive
          ? 'bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent text-white font-semibold shadow-[0_2px_12px_rgba(56,189,248,0.15)] border border-sky-500/35'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent',
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-sky-400 to-blue-500 rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
          )}
          <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'text-slate-400 group-hover:text-slate-200')}>
            {item.icon}
          </span>
          <span className="flex-1 truncate tracking-tight">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0 tracking-wider uppercase border',
                item.badgeTone === 'red' || (!item.badgeTone && item.badge !== 'LIVE' && item.badge !== 'AI')
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/35 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                  : item.badgeTone === 'purple' || item.badge === 'AI'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/35 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                  : item.badgeTone === 'amber'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/35'
                  : 'bg-sky-500/15 text-sky-400 border-sky-500/35 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function ExpandableSection({ group }: { group: ExpandableGroup }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-lg text-[10px] font-bold tracking-[1.5px] uppercase text-slate-400 hover:text-slate-200 transition-colors cursor-pointer group"
      >
        <span className="flex-shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]" style={{ color: group.color }}>{group.icon}</span>
        <span className="flex-1 truncate text-left">{group.group}</span>
        {open
          ? <ChevronDown size={11} className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-transform" />
          : <ChevronRight size={11} className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-transform" />
        }
      </button>

      {/* Sub-items */}
      {open && (
        <div className="space-y-0.5 mt-1 ml-4 border-l border-white/[0.08] pl-2">
          {group.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent',
              )}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] transition-all"
                    style={{
                      background: isActive ? `${group.color}25` : `${group.color}15`,
                      color: group.color,
                      border: `1px solid ${isActive ? `${group.color}50` : `${group.color}25`}`,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase border',
                        item.badge === 'LIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                          : 'bg-white/[0.05] text-slate-300 border-white/[0.1]',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SecOpsSidebar() {
  const { newAlertsCount, activeIncidentsCount, securityEventsCount, investigations } = useSecOpsAlerts()

  const activeInvCount = investigations.filter(i => i.status === 'Active').length

  const topNav: NavItem[] = [
    { label: 'SOC Overview',   to: '/secops/overview',      icon: <LayoutDashboard size={15} />, exact: true },
    { label: 'Alerts',         to: '/secops/alerts',        icon: <Bell size={15} />,            badge: newAlertsCount > 0 ? String(newAlertsCount) : undefined, badgeTone: 'red' },
    { label: 'Incidents',      to: '/secops/incidents',     icon: <FileWarning size={15} />,     badge: activeIncidentsCount > 0 ? String(activeIncidentsCount) : undefined, badgeTone: 'red' },
    { label: 'Investigations', to: '/secops/investigations',icon: <Search size={15} />,          badge: activeInvCount > 0 ? String(activeInvCount) : undefined, badgeTone: 'amber' },
    { label: 'Security Events',to: '/secops/events',        icon: <Zap size={15} />,             badge: securityEventsCount > 1000 ? `${(securityEventsCount / 1000).toFixed(1)}K` : String(securityEventsCount), badgeTone: 'blue' },
  ]

  return (
    <aside className="w-[252px] min-w-[252px] bg-[#070b14]/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col overflow-hidden z-50 select-none shadow-2xl">
      {/* Brand & Workspace */}
      <div className="p-3.5 border-b border-white/[0.08] flex-shrink-0 bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="flex items-center gap-3 mb-3 px-1">
          <FanosLogo
            size={38}
            subtitle="ENTERPRISE SOC"
            subtitleClass="text-sky-400/90"
          />
        </div>
        <WorkspaceSwitcher />
      </div>

      {/* Navigation scrollable */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {/* Operations */}
        <div>
          <div className="px-5 pb-1.5 flex items-center justify-between">
            <span className="text-[9.5px] font-bold tracking-[1.8px] uppercase text-slate-400">
              Operations
            </span>
          </div>
          <div className="space-y-0.5">
            {topNav.map(item => <NavItemRow key={item.to} item={item} />)}
          </div>
        </div>

        {/* Security Engines */}
        <div>
          <div className="px-5 pb-1.5 flex items-center justify-between">
            <span className="text-[9.5px] font-bold tracking-[1.8px] uppercase text-slate-400">
              Security Engines
            </span>
            <span className="text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
              6 ONLINE
            </span>
          </div>
          <div className="space-y-1">
            {EXPANDABLE.map(group => (
              <ExpandableSection key={group.group} group={group} />
            ))}
          </div>
        </div>

        {/* Intelligence */}
        <div>
          <div className="px-5 pb-1.5 flex items-center justify-between">
            <span className="text-[9.5px] font-bold tracking-[1.8px] uppercase text-slate-400">
              Intelligence
            </span>
          </div>
          <div className="space-y-0.5">
            {BOTTOM_NAV.map(item => <NavItemRow key={item.to} item={item} />)}
          </div>
        </div>
      </nav>

      {/* Bottom telemetry card */}
      <div className="p-3 border-t border-white/[0.08] flex-shrink-0 bg-gradient-to-t from-slate-950/80 to-transparent">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-white/[0.08] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent opacity-70" />
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                All Engines Online
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-300 font-bold bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.08]">
              6/6 Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-white/[0.06] text-[10px]">
            <div className="flex items-center gap-1 text-slate-400">
              <Cpu size={10} className="text-sky-400 flex-shrink-0" />
              <span className="truncate">Suricata + Zeek</span>
            </div>
            <div className="text-right font-mono font-bold text-emerald-400">
              99.98% SLA
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-white/[0.04]">
            <span className="flex items-center gap-1 text-slate-400">
              <Activity size={9} className="text-purple-400" /> Telemetry
            </span>
            <span className="text-sky-300">48.2 MB/s</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
