/**
 * AdminSidebar — navigation for the Admin Portal workspace.
 * Business / platform management focused.
 */
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  ClipboardList,
  CheckSquare,
  Package,
  Rocket,
  Layers,
  Plug,
  ScrollText,
  Settings,
  ChevronRight,
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
      { label: 'Overview',      to: '/admin-portal/overview',      icon: <LayoutDashboard size={15} /> },
    ],
  },
  {
    group: 'Platform',
    items: [
      { label: 'Organizations',    to: '/admin-portal/organizations', icon: <Building2 size={15} /> },
      { label: 'Customers',        to: '/admin-portal/customers',     icon: <Users size={15} />,      badge: '12' },
      { label: 'Service Requests', to: '/admin-portal/requests',      icon: <ClipboardList size={15} />, badge: '3' },
      { label: 'Approvals',        to: '/admin-portal/approvals',     icon: <CheckSquare size={15} />,   badge: '5' },
    ],
  },
  {
    group: 'Deployment',
    items: [
      { label: 'Assets',       to: '/admin-portal/assets',      icon: <Package size={15} /> },
      { label: 'Deployments',  to: '/admin-portal/deployments', icon: <Rocket size={15} /> },
      { label: 'Services',     to: '/admin-portal/services',    icon: <Layers size={15} /> },
      { label: 'Integrations', to: '/admin-portal/integrations',icon: <Plug size={15} /> },
    ],
  },
  {
    group: 'Access & Control',
    items: [
      { label: 'Users & Roles', to: '/admin-portal/users',    icon: <UserCog size={15} /> },
      { label: 'Audit Logs',    to: '/admin-portal/audit',    icon: <ScrollText size={15} /> },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { label: 'System Settings', to: '/admin-portal/settings', icon: <Settings size={15} /> },
    ],
  },
]

export default function AdminSidebar() {
  return (
    <aside className="w-[240px] min-w-[240px] bg-fanos-surface border-r border-white/[0.06] flex flex-col overflow-hidden z-50">

      {/* Brand */}
      <div className="px-4 py-[13px] border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#2d1b69,#4c1d95)', border: '1px solid rgba(139,92,246,0.4)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6.5V12c0 5 3.58 9.6 8 10.93C16.42 21.6 20 17 20 12V6.5L12 2Z"
                stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(139,92,246,0.1)" />
              <rect x="8" y="10" width="8" height="6" rx="1" stroke="#a78bfa" strokeWidth="1.2" fill="none" />
              <path d="M10 10V8a2 2 0 014 0v2" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold text-white tracking-wide leading-tight">
              FANOS <span style={{ color: '#8b5cf6' }}>AI</span>
            </div>
            <div className="text-[9px] tracking-[1.2px] uppercase mt-0.5" style={{ color: '#8b5cf6' }}>
              Admin Portal
            </div>
          </div>
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1.5 scrollbar-thin">
        {NAV.map(group => (
          <div key={group.group} className="mb-0.5">
            <p className="px-4 py-[7px] text-[10px] font-semibold tracking-[1.2px] uppercase text-fanos-dim">
              {group.group}
            </p>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin-portal/overview'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-4 py-[6px] text-[13px] font-normal',
                  'transition-all duration-150 border-l-2 cursor-pointer',
                  isActive
                    ? 'border-[#8b5cf6] font-medium'
                    : 'border-transparent text-fanos-muted hover:text-fanos-text hover:border-purple-500/30',
                  isActive && 'bg-gradient-to-r from-purple-500/10 to-transparent',
                )}
                style={({ isActive }) => isActive ? { color: '#a78bfa' } : {}}
              >
                <span className="flex-shrink-0 opacity-80">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: 'rgba(139,92,246,0.15)',
                      color:      '#a78bfa',
                      border:     '1px solid rgba(139,92,246,0.3)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0 space-y-1.5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <Building2 size={10} style={{ color: '#8b5cf6' }} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#a78bfa' }}>
            ADMIN PORTAL
          </span>
          <span className="ml-auto">
            <ChevronRight size={9} style={{ color: '#8b5cf6' }} />
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)' }}>
          <span className="dot-green" />
          <span className="text-[10px] font-semibold text-fanos-green tracking-wide">SYSTEM ONLINE</span>
          <span className="ml-auto text-[9px] text-fanos-dim">v1.0</span>
        </div>
      </div>
    </aside>
  )
}
