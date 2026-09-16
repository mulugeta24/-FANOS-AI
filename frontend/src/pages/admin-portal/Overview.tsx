/**
 * Admin Portal — Overview
 * Business / platform management dashboard.
 */
import {
  Building2, Users, ClipboardList, CheckSquare,
  Rocket, Layers, TrendingUp, AlertCircle,
  ArrowUpRight, ArrowRight, Clock, CheckCircle2,
  XCircle, Package,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color, href,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; href: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(href)}
      className="fanos-card p-4 flex flex-col gap-3 text-left cursor-pointer w-full transition-all hover:border-white/10"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <ArrowUpRight size={12} className="text-fanos-dim mt-1" />
      </div>
      <div>
        <div className="text-[24px] font-bold text-white leading-none">{value}</div>
        <div className="text-[11px] font-semibold text-fanos-muted mt-1">{label}</div>
        <div className="text-[10px] text-fanos-dim mt-0.5">{sub}</div>
      </div>
    </button>
  )
}

// ── Recent Activity Row ───────────────────────────────────────
function ActivityRow({
  type, title, time, status,
}: {
  type: string; title: string; time: string; status: 'approved' | 'pending' | 'rejected'
}) {
  const statusMap = {
    approved: { label: 'Approved', color: '#00e5a0', bg: 'rgba(0,229,160,0.08)', icon: <CheckCircle2 size={11} /> },
    pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',icon: <Clock size={11} /> },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <XCircle size={11} /> },
  }
  const s = statusMap[status]
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="text-[10px] font-semibold text-fanos-dim w-20 flex-shrink-0 truncate">{type}</div>
      <div className="flex-1 text-[11px] text-fanos-text truncate">{title}</div>
      <div className="text-[10px] text-fanos-dim flex-shrink-0">{time}</div>
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold flex-shrink-0"
        style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}25` }}
      >
        {s.icon}
        {s.label}
      </div>
    </div>
  )
}

// ── Customer Row ──────────────────────────────────────────────
function CustomerRow({
  name, org, plan, status, sensors,
}: {
  name: string; org: string; plan: string; status: 'Active' | 'Trial' | 'Suspended'; sensors: number
}) {
  const st = {
    Active:    { color: '#00e5a0', bg: 'rgba(0,229,160,0.08)'   },
    Trial:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
    Suspended: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
  }[status]
  return (
    <tr className="hover:bg-white/[0.018] transition-colors">
      <td className="px-3 py-2.5">
        <div className="text-[11px] font-medium text-fanos-text">{name}</div>
        <div className="text-[9px] text-fanos-dim">{org}</div>
      </td>
      <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{plan}</td>
      <td className="px-3 py-2.5">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}25` }}>
          {status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{sensors}</td>
    </tr>
  )
}

export default function AdminOverview() {
  const navigate = useNavigate()

  return (
    <div className="px-5 py-5 flex flex-col gap-5">

      {/* Page hero */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-[13px] text-fanos-muted mt-1">
            Business and platform management — organizations, customers, deployments, and operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa' }}>
            <Building2 size={12} />
            Admin Portal
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fanos-green"
            style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <span className="dot-green" />
            Live
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Organizations"    value={8}   sub="+1 this month"  icon={<Building2 size={16}/>}    color="#8b5cf6" href="/admin-portal/organizations" />
        <KpiCard label="Customers"        value={23}  sub="18 active"      icon={<Users size={16}/>}         color="#00c8ff" href="/admin-portal/customers" />
        <KpiCard label="Pending Requests" value={3}   sub="2 urgent"       icon={<ClipboardList size={16}/>} color="#f59e0b" href="/admin-portal/requests" />
        <KpiCard label="Pending Approvals"value={5}   sub="Awaiting review"icon={<CheckSquare size={16}/>}   color="#f59e0b" href="/admin-portal/approvals" />
        <KpiCard label="Active Deployments"value={14} sub="2 in progress"  icon={<Rocket size={16}/>}        color="#00e5a0" href="/admin-portal/deployments" />
        <KpiCard label="Active Services"  value={6}   sub="All healthy"    icon={<Layers size={16}/>}        color="#00c8ff" href="/admin-portal/services" />
      </div>

      {/* Main 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Recent activity */}
        <div className="xl:col-span-2 fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <AlertCircle size={13} className="text-fanos-amber" />
              Recent Platform Activity
            </div>
            <button
              onClick={() => navigate('/admin-portal/audit')}
              className="text-[10px] text-fanos-dim hover:text-fanos-accent flex items-center gap-1"
            >
              View all <ArrowRight size={10} />
            </button>
          </div>
          <div className="px-4 pb-3">
            <ActivityRow type="Request"    title="New SOC deployment request — Acme Corp"         time="5 min ago"  status="pending"  />
            <ActivityRow type="Approval"   title="Service tier upgrade — GlobalBank Ltd"           time="12 min ago" status="approved" />
            <ActivityRow type="Customer"   title="New customer registration — SecureOps Inc"       time="1 hr ago"   status="approved" />
            <ActivityRow type="Deployment" title="Sensor cluster deployed — NovaTech (3 sensors)"  time="2 hr ago"   status="approved" />
            <ActivityRow type="Request"    title="API key rotation request — DataGuard SA"         time="3 hr ago"   status="pending"  />
            <ActivityRow type="Approval"   title="Organization onboarding rejected — Reason: docs" time="1 day ago"  status="rejected" />
          </div>
        </div>

        {/* Quick actions */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <TrendingUp size={13} className="text-fanos-accent" />
              Quick Actions
            </div>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-2">
            {[
              { label: 'Add Organization',    href: '/admin-portal/organizations', color: '#8b5cf6' },
              { label: 'Onboard Customer',    href: '/admin-portal/customers',     color: '#00c8ff' },
              { label: 'Review Approvals',    href: '/admin-portal/approvals',     color: '#f59e0b' },
              { label: 'New Deployment',      href: '/admin-portal/deployments',   color: '#00e5a0' },
              { label: 'Manage Users',        href: '/admin-portal/users',         color: '#a78bfa' },
              { label: 'System Settings',     href: '/admin-portal/settings',      color: '#00c8ff' },
            ].map(a => (
              <button
                key={a.href}
                onClick={() => navigate(a.href)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium text-fanos-muted transition-all hover:text-fanos-text text-left w-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${a.color}30` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <ArrowRight size={11} style={{ color: a.color }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer table */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <Users size={13} className="text-fanos-accent" />
            Recent Customers
          </div>
          <button
            onClick={() => navigate('/admin-portal/customers')}
            className="text-[10px] text-fanos-dim hover:text-fanos-accent flex items-center gap-1"
          >
            View all <ArrowRight size={10} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Customer', 'Plan', 'Status', 'Sensors'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              <CustomerRow name="Acme Corporation"   org="acme.com"       plan="Enterprise" status="Active"    sensors={12} />
              <CustomerRow name="GlobalBank Ltd"     org="globalbank.net" plan="Business"   status="Active"    sensors={6}  />
              <CustomerRow name="SecureOps Inc"      org="secureops.io"   plan="Starter"    status="Trial"     sensors={2}  />
              <CustomerRow name="NovaTech"           org="novatech.co"    plan="Business"   status="Active"    sensors={8}  />
              <CustomerRow name="DataGuard SA"       org="dataguard.sa"   plan="Enterprise" status="Active"    sensors={15} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Deployment / Services row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Rocket size={13} className="text-fanos-green" />Active Deployments</div>
            <button onClick={() => navigate('/admin-portal/deployments')}
              className="text-[10px] text-fanos-dim hover:text-fanos-accent flex items-center gap-1">
              View all <ArrowRight size={10} />
            </button>
          </div>
          <div className="px-4 pb-3 space-y-2">
            {[
              { name: 'Acme Corp — Sensor Cluster A', status: 'Running',     sensors: 12, progress: 100 },
              { name: 'GlobalBank — WAF Integration',  status: 'In Progress', sensors: 6,  progress: 65  },
              { name: 'NovaTech — Full Stack Deploy',  status: 'In Progress', sensors: 8,  progress: 40  },
              { name: 'DataGuard — NDR Expansion',     status: 'Scheduled',   sensors: 4,  progress: 0   },
            ].map(d => (
              <div key={d.name} className="flex flex-col gap-1.5 py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-fanos-text truncate flex-1">{d.name}</span>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      background: d.status === 'Running'     ? 'rgba(0,229,160,0.08)'
                               : d.status === 'In Progress' ? 'rgba(0,200,255,0.08)'
                               : 'rgba(245,158,11,0.08)',
                      color:      d.status === 'Running'     ? '#00e5a0'
                               : d.status === 'In Progress' ? '#00c8ff'
                               : '#f59e0b',
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="h-1 rounded-full w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${d.progress}%`,
                      background: d.progress === 100 ? '#00e5a0' : 'linear-gradient(90deg,#00c8ff,#8b5cf6)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Package size={13} className="text-fanos-accent" />Platform Services</div>
            <button onClick={() => navigate('/admin-portal/services')}
              className="text-[10px] text-fanos-dim hover:text-fanos-accent flex items-center gap-1">
              View all <ArrowRight size={10} />
            </button>
          </div>
          <div className="px-4 pb-3 space-y-1">
            {[
              { name: 'AI Detection Engine',   version: 'v3.2.1', status: 'Healthy', uptime: '99.98%' },
              { name: 'WAF Service',            version: 'v2.1.0', status: 'Healthy', uptime: '99.95%' },
              { name: 'NDR / Zeek',             version: 'v5.0.1', status: 'Healthy', uptime: '100%'   },
              { name: 'Suricata IDS',           version: 'v7.0.4', status: 'Healthy', uptime: '99.9%'  },
              { name: 'SMS Notification Svc',   version: 'v1.3.0', status: 'Healthy', uptime: '99.7%'  },
              { name: 'API Gateway',            version: 'v1.0.0', status: 'Healthy', uptime: '100%'   },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-2 py-2 border-b border-white/[0.04] last:border-0">
                <span className="dot-green flex-shrink-0" />
                <span className="flex-1 text-[11px] text-fanos-text truncate">{s.name}</span>
                <span className="text-[9px] text-fanos-dim flex-shrink-0">{s.version}</span>
                <span className="text-[9px] font-semibold text-fanos-green flex-shrink-0">{s.uptime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
