import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileWarning, Globe,
  Radio, Zap, ShieldAlert,
  Ban, ShieldCheck, History,
  Package, Wifi, ScrollText, Settings,
  Users2, Building2,
  Bell, Activity, Bug, LogOut, PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspace } from '@/context/WorkspaceContext'
import FanosLogo from '@/components/common/FanosLogo'

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

// ── Functional & Real Engines Only (Non-functional placeholders removed) ──
const CLEAN_SOC_NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'SOC Dashboard',       to: '/dashboard',             icon: <LayoutDashboard size={15} /> },
      { label: 'Active Incidents',    to: '/soc/incidents',         icon: <FileWarning size={15} />,   badge: '3' },
      { label: 'Threat Intelligence', to: '/soc/threats',           icon: <Globe size={15} /> },
    ],
  },
  {
    group: 'Functional Security Engines',
    items: [
      { label: 'Network IDS (Suricata/Zeek)', to: '/detection/network', icon: <Radio size={15} />, badge: 'LIVE' },
      { label: 'Web Attack Detection (WAF)',  to: '/detection/web',     icon: <ShieldCheck size={15} />, badge: 'PROXY' },
      { label: 'URL Threat Detection',       to: '/threat-detection',  icon: <Globe size={15} />, badge: 'AI' },
      { label: 'Web Vulnerability Scanner',  to: '/web-scanner',       icon: <Bug size={15} />, badge: 'DAST' },
      { label: 'Security Events Stream',     to: '/detection/events',  icon: <Zap size={15} /> },
    ],
  },
  {
    group: 'Prevention & Response',
    items: [
      { label: 'WAF Active Rules',    to: '/prevention/waf',       icon: <ShieldCheck size={15} /> },
      { label: 'Blocked Malicious IPs',to: '/prevention/ips',      icon: <Ban size={15} />, badge: '190' },
      { label: 'Incident Containment', to: '/soc/incidents',        icon: <Bell size={15} /> },
    ],
  },
  {
    group: 'Operations & Assets',
    items: [
      { label: 'Monitored Assets',    to: '/infra/hosts',          icon: <Package size={15} /> },
      { label: 'Security Sensors',    to: '/infra/sensors',        icon: <Wifi size={15} />, badge: 'Active' },
      { label: 'Security Reports',    to: '/analytics/reports',    icon: <ScrollText size={15} /> },
      { label: 'Audit Trail',         to: '/admin/audit',          icon: <Activity size={15} /> },
    ],
  },
  {
    group: 'Platform Governance',
    items: [
      { label: 'Organizations',       to: '/admin/orgs',           icon: <Building2 size={15} /> },
      { label: 'Users & Roles',       to: '/admin/users',          icon: <Users2 size={15} /> },
      { label: 'System Settings',     to: '/admin/settings',       icon: <Settings size={15} /> },
    ],
  },
]

export default function Sidebar() {
  const {
    user,
    workspace,
    activeCustomer,
    hasService
  } = useWorkspace()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('fanos_token')
    localStorage.removeItem('fanos_user')
    navigate('/login')
  }

  const isCustomerScope = user.role === 'customer' || workspace === 'customer-soc'

  const hasApproved = activeCustomer.approvedServices.length > 0

  // Build dynamic customer nav items strictly based on approved services
  const customerNavItems: NavItem[] = [
    {
      label: 'Customer Dashboard',
      to: '/customer/dashboard',
      icon: <LayoutDashboard size={15} />,
    },
  ]

  if (hasApproved) {
    customerNavItems.push({
      label: 'Security Analysis',
      to: '/dashboard',
      icon: <Activity size={15} />,
      badge: 'LIVE',
    })
  }

  // Add ONLY services that the customer has requested and has APPROVED
  if (hasService('waf')) {
    customerNavItems.push({
      label: 'Web Application Firewall (WAF)',
      to: '/customer/services/waf',
      icon: <ShieldCheck size={15} />,
      badge: 'ACTIVE WAF',
    })
  }

  if (hasService('ids')) {
    customerNavItems.push({
      label: 'Network IDS (Suricata / Zeek)',
      to: '/customer/services/ids',
      icon: <Radio size={15} />,
      badge: 'ACTIVE IDS',
    })
  }

  if (hasService('scanner') || hasService('vulnerability-scanner')) {
    customerNavItems.push({
      label: 'Web Vulnerability Scanner',
      to: '/customer/services/vulnerability-scanner',
      icon: <Bug size={15} />,
      badge: 'DAST',
    })
  }

  if (hasService('url-detection')) {
    customerNavItems.push({
      label: 'Malicious URL Detection',
      to: '/customer/services/url-detection',
      icon: <Globe size={15} />,
      badge: 'AI MODEL',
    })
  }

  if (hasService('incident-response')) {
    customerNavItems.push({
      label: 'Incident Response (SOC)',
      to: '/customer/services/incident-response',
      icon: <ShieldAlert size={15} />,
      badge: 'SOC',
    })
  }

  // Customer Management
  const customerMgmtItems: NavItem[] = [
    {
      label: 'My Registered Assets',
      to: '/customer/assets',
      icon: <Package size={15} />,
    },
    {
      label: 'Service Requests & Status',
      to: '/customer/service-requests',
      icon: <History size={15} />,
    },
  ]

  return (
    <aside className="w-[260px] min-w-[260px] bg-[#070b14]/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col overflow-hidden z-50">
      {/* Brand Header — Official FANOS AI Emblem */}
      <div className="flex items-center px-4 py-[14px] border-b border-white/[0.08] flex-shrink-0">
        <FanosLogo
          size={36}
          subtitle={isCustomerScope ? 'CUSTOMER PORTAL' : 'SOC OPERATIONS'}
          subtitleClass="text-emerald-400/90"
        />
      </div>

      {/* Customer Organization Profile (Single customer view — no multi-customer dropdown) */}
      {isCustomerScope && (
        <div className="px-3.5 py-2.5 border-b border-white/[0.08] bg-slate-900/40">
          <div className="text-[9px] font-bold tracking-[1.2px] uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Customer Organization</span>
            <span className={cn(
              "text-[8px] font-semibold px-1.5 py-0.5 rounded border",
              hasApproved
                ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                : "text-amber-400 bg-amber-500/15 border-amber-500/30"
            )}>
              {hasApproved ? `${activeCustomer.approvedServices.length} Active` : 'Pending Approval'}
            </span>
          </div>

          <div className="px-2.5 py-2 rounded-lg bg-slate-950/80 border border-white/[0.1] shadow-inner">
            <div className="text-[12px] font-semibold text-white truncate">
              {activeCustomer.name}
            </div>
            <div className="text-[9px] text-slate-400 truncate font-mono mt-0.5">
              {hasApproved
                ? `Approved: ${activeCustomer.approvedServices.map(s => s.toUpperCase()).join(' + ')}`
                : `Requested: ${activeCustomer.pendingServices.map(s => s.toUpperCase()).join(' + ') || 'WAF'} (Awaiting Review)`}
            </div>
          </div>
        </div>
      )}

      {/* Global Workspace switcher for Admins */}
      {user.role === 'admin' && !isCustomerScope && (
        <div className="px-3 py-2 border-b border-white/[0.08] flex-shrink-0">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        {isCustomerScope ? (
          <div className="space-y-4">
            {/* Approved Active Services */}
            <div>
              <p className="px-3 py-[6px] text-[10px] font-bold tracking-[1.2px] uppercase text-emerald-400/90 flex items-center justify-between">
                <span>Active Services ({activeCustomer.approvedServices.length})</span>
                {activeCustomer.approvedServices.length === 0 && (
                  <span className="text-[9px] text-amber-400 font-semibold lowercase">awaiting approval</span>
                )}
              </p>

              {customerNavItems.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-3 py-[8px] text-[13px] rounded-lg transition-all duration-150 cursor-pointer select-none mb-0.5',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-white font-semibold border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  <span className="flex-shrink-0 text-emerald-400 opacity-90">
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              {activeCustomer.approvedServices.length === 0 && (
                <div className="mx-2 my-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
                  <div className="font-semibold mb-0.5">Pending Approval</div>
                  <div className="text-[10px] text-slate-400">Services awaiting administrator review.</div>
                </div>
              )}
            </div>

            {/* Customer Asset Management */}
            <div>
              <p className="px-3 py-[6px] text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400">
                Customer Management
              </p>
              {customerMgmtItems.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-lg transition-all duration-150 cursor-pointer select-none mb-0.5',
                    isActive
                      ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.12]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  <span className="flex-shrink-0 text-slate-400">
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                </NavLink>
              ))}

              {/* Request New Services (Direct CTA to Image 3 catalog) */}
              <NavLink
                to="/request-service"
                className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all text-[12px] font-semibold cursor-pointer group shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                <PlusCircle size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="flex-1">Request New Service</span>
                <span className="text-[9px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.5 rounded font-mono font-bold">+</span>
              </NavLink>
            </div>

            <div className="pt-2 border-t border-white/[0.08]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-[7px] text-[12px] rounded-lg transition-all duration-150 cursor-pointer select-none text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40"
              >
                <LogOut size={14} />
                <span className="font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          CLEAN_SOC_NAV.map((group) => (
            <div key={group.group} className="mb-2">
              <p className="px-3 py-[5px] text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    className={({ isActive }) => cn(
                      'flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-lg transition-all duration-150 cursor-pointer select-none',
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold shadow-sm border border-cyan-500/35 shadow-[0_0_12px_rgba(0,200,255,0.15)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]',
                    )}
                  >
                    <span className="flex-shrink-0 opacity-80">
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Bottom status */}
      <div className="px-3 py-2.5 border-t border-white/[0.08] flex-shrink-0 space-y-1.5 bg-[#050811]">
        {/* Active Engine Badge */}
        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400">
              {hasService('waf') && hasService('ids')
                ? 'MULTI-ENGINE ACTIVE'
                : hasService('waf')
                ? 'WAF ENGINE ACTIVE'
                : hasService('ids')
                ? 'IDS SURICATA ACTIVE'
                : 'PLATFORM ONLINE'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">
            {hasService('waf') ? 'Port 8002' : 'Port 8000'}
          </span>
        </div>
      </div>
    </aside>
  )
}

