/**
 * SecOpsSidebar — navigation for the Security Operations workspace.
 * Security monitoring, detection, and response focused.
 * Organized by security domains with sub-navigation support.
 */
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
  Globe,
  BrainCircuit,
  Package,
  BarChart2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'

interface NavItem {
  label: string
  to:    string
  icon:  React.ReactNode
  badge?: string
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
    color:    '#00c8ff',
    basePath: '/secops/network',
    items: [
      { label: 'Zeek',     to: '/secops/network/zeek',     icon: <span className="text-[10px] font-bold">Z</span> },
      { label: 'Suricata', to: '/secops/network/suricata', icon: <span className="text-[10px] font-bold">S</span> },
    ],
  },
  {
    group:    'Web Security',
    icon:     <ShieldCheck size={14} />,
    color:    '#00e5a0',
    basePath: '/secops/web',
    items: [
      { label: 'WAF', to: '/secops/web/waf', icon: <span className="text-[10px] font-bold">W</span> },
    ],
  },
]

const TOP_NAV: NavItem[] = [
  { label: 'SOC Overview',      to: '/secops/overview',    icon: <LayoutDashboard size={15} />, exact: true },
  { label: 'Alerts',            to: '/secops/alerts',      icon: <Bell size={15} />,            badge: '12' },
  { label: 'Incidents',         to: '/secops/incidents',   icon: <FileWarning size={15} />,     badge: '5'  },
  { label: 'Investigations',    to: '/secops/investigations',icon: <Search size={15} />  },
  { label: 'Security Events',   to: '/secops/events',      icon: <Zap size={15} />,             badge: '8.4K' },
]

const BOTTOM_NAV: NavItem[] = [
  { label: 'Threat Intelligence', to: '/secops/threat-intel', icon: <BrainCircuit size={15} /> },
  { label: 'Assets',              to: '/secops/assets',       icon: <Package size={15} /> },
  { label: 'Security Reports',    to: '/secops/reports',      icon: <BarChart2 size={15} /> },
]

function NavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-4 py-[6px] text-[13px] font-normal',
        'transition-all duration-150 border-l-2 cursor-pointer',
        isActive
          ? 'border-fanos-accent text-fanos-accent font-medium bg-gradient-to-r from-fanos-accent/10 to-transparent'
          : 'border-transparent text-fanos-muted hover:text-fanos-text hover:bg-fanos-accent/5 hover:border-fanos-accent/30',
      )}
    >
      <span className="flex-shrink-0 opacity-80">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: item.badge === 'NEW'     ? 'rgba(139,92,246,0.15)' : 'rgba(239,68,68,0.15)',
            color:      item.badge === 'NEW'     ? '#8b5cf6' : '#ef4444',
            border:     `1px solid ${item.badge === 'NEW' ? 'rgba(139,92,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

function ExpandableSection({ group }: { group: ExpandableGroup }) {
  const [open, setOpen] = useState(true) // default open for visibility

  return (
    <div>
      {/* Group header — clickable to expand/collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-[6px] text-[13px] font-normal
          transition-all duration-150 border-l-2 border-transparent text-fanos-muted
          hover:text-fanos-text hover:bg-fanos-accent/5 cursor-pointer"
      >
        <span className="flex-shrink-0 opacity-80" style={{ color: group.color }}>{group.icon}</span>
        <span className="flex-1 truncate text-left">{group.group}</span>
        {open
          ? <ChevronDown size={10} className="flex-shrink-0 text-fanos-dim" />
          : <ChevronRight size={10} className="flex-shrink-0 text-fanos-dim" />
        }
      </button>

      {/* Sub-items */}
      {open && (
        <div className="ml-4">
          {group.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-4 py-[5px] text-[12px] font-normal',
                'transition-all duration-150 border-l-2 cursor-pointer',
                isActive
                  ? 'border-fanos-accent text-fanos-accent font-medium bg-gradient-to-r from-fanos-accent/10 to-transparent'
                  : 'border-transparent text-fanos-muted hover:text-fanos-text hover:bg-fanos-accent/5 hover:border-fanos-accent/30',
              )}
            >
              <span
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}25` }}
              >
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SecOpsSidebar() {
  return (
    <aside className="w-[240px] min-w-[240px] bg-fanos-surface border-r border-white/[0.06] flex flex-col overflow-hidden z-50">

      {/* Brand */}
      <div className="px-4 py-[13px] border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#0d2a45,#0a3d62)', border: '1px solid rgba(0,200,255,0.35)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
                stroke="#00c8ff" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(0,200,255,0.06)" />
              <circle cx="12" cy="12" r="2.5" stroke="#00e5a0" strokeWidth="1.2" />
              <path d="M12 9.5V7M12 14.5V17M9.5 12H7M14.5 12H17" stroke="#00c8ff" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold text-white tracking-wide leading-tight">
              FANOS <span className="text-fanos-accent">AI</span>
            </div>
            <div className="text-[9px] tracking-[1.2px] uppercase mt-0.5 text-fanos-accent">
              Security Ops
            </div>
          </div>
        </div>
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1.5 scrollbar-thin">

        {/* Top nav group */}
        <div className="mb-0.5">
          <p className="px-4 py-[7px] text-[10px] font-semibold tracking-[1.2px] uppercase text-fanos-dim">
            Operations
          </p>
          {TOP_NAV.map(item => <NavItem key={item.to} item={item} />)}
        </div>

        {/* Expandable security domains */}
        <div className="mb-0.5">
          <p className="px-4 py-[7px] text-[10px] font-semibold tracking-[1.2px] uppercase text-fanos-dim">
            Security Engines
          </p>
          {EXPANDABLE.map(group => (
            <ExpandableSection key={group.group} group={group} />
          ))}
        </div>

        {/* Intelligence + assets */}
        <div className="mb-0.5">
          <p className="px-4 py-[7px] text-[10px] font-semibold tracking-[1.2px] uppercase text-fanos-dim">
            Intelligence
          </p>
          {BOTTOM_NAV.map(item => <NavItem key={item.to} item={item} />)}
        </div>

      </nav>

      {/* Bottom status */}
      <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0 space-y-1.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.2)' }}>
          <Globe size={10} className="text-fanos-accent" />
          <span className="text-[10px] font-semibold text-fanos-accent tracking-wide">SECURITY OPS</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)' }}>
          <span className="dot-green" />
          <span className="text-[10px] font-semibold text-fanos-green tracking-wide">ALL ENGINES ONLINE</span>
          <span className="ml-auto text-[9px] text-fanos-dim">6/6</span>
        </div>
      </div>
    </aside>
  )
}
