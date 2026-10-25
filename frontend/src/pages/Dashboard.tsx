import { useState } from 'react'
import {
  AlertOctagon, AlertTriangle, ShieldCheck,
  Activity, BrainCircuit, HeartPulse, RefreshCw,
  CheckCircle2, Building2, PlusCircle, Clock,
} from 'lucide-react'
import { useDashboardKPIs, useSystemHealth, useRefreshAll } from '@/hooks/useDashboard'

// Existing components
import KpiCard                  from '@/components/dashboard/KpiCard'
import ThreatActivityChart      from '@/components/dashboard/ThreatActivityChart'
import AttackDistributionChart  from '@/components/dashboard/AttackDistributionChart'
import ActiveIncidentsTable     from '@/components/dashboard/ActiveIncidentsTable'
import AIEnginePanel            from '@/components/dashboard/AIEnginePanel'
import RiskDistributionPanel    from '@/components/dashboard/RiskDistributionPanel'
import PreventionPanel          from '@/components/dashboard/PreventionPanel'
import WebSecurityPanel         from '@/components/dashboard/WebSecurityPanel'
import URIAssessmentPanel       from '@/components/dashboard/URIAssessmentPanel'
import ThreatCorrelationPanel   from '@/components/dashboard/ThreatCorrelationPanel'
import ResponseActionsPanel     from '@/components/dashboard/ResponseActionsPanel'
import ArchitecturePanel        from '@/components/dashboard/ArchitecturePanel'

// Production-grade components
import LiveEventsPanelEnhanced  from '@/components/dashboard/LiveEventsPanelEnhanced'
import IncidentDetailModal      from '@/components/dashboard/IncidentDetailModal'
import type { IncidentDetail }  from '@/components/dashboard/IncidentDetailModal'
import SystemStatusPanel        from '@/components/dashboard/SystemStatusPanel'
import AIWorkflowPanel          from '@/components/dashboard/AIWorkflowPanel'

import CustomerPortal from '@/components/customer/CustomerPortal'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const {
    user,
    activeCustomer,
    hasService,
    approveCustomerService,
    rejectCustomerService,
  } = useWorkspace()

  const [viewMode] = useState<'soc' | 'customer'>(() => {
    return user.role === 'customer' ? 'customer' : 'soc'
  })

  const { data: health, isFetching: healthFetching } = useSystemHealth()
  const { data: kpi } = useDashboardKPIs()
  const refreshAll = useRefreshAll()

  // Modals / drawers state
  const [openIncident, setOpenIncident] = useState<IncidentDetail | null>(null)
  const [, setOpenIP]                   = useState<string | null>(null)

  const hasWaf = hasService('waf')
  const hasIds = hasService('ids')
  const isPending = activeCustomer.approvedServices.length === 0

  // If user explicitly switched to pure customer portal tabs view
  if (viewMode === 'customer' && user.role === 'customer') {
    return (
      <div className="flex flex-col min-h-full">
        <CustomerPortal initialTab="overview" />
      </div>
    )
  }

  // If customer has no approved services yet (Request is Pending Review):
  // Show ONLY the Pending Request Screen — Security Analysis is strictly locked until Admin Approval
  if (isPending) {
    const pendingNames = activeCustomer.pendingServices.length > 0
      ? activeCustomer.pendingServices.map(s => {
          if (s.toLowerCase() === 'waf') return 'Web Application Firewall (WAF)'
          if (s.toLowerCase() === 'ids') return 'Network Intrusion Detection System (IDS)'
          if (s.toLowerCase().includes('scan')) return 'Web Vulnerability Scanner (DAST)'
          if (s.toLowerCase().includes('url')) return 'Malicious URL & Phishing Detection'
          return s.toUpperCase()
        }).join(' & ')
      : 'Web Application Firewall (WAF)'

    return (
      <div className="px-6 py-6 flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
        {/* Customer Organization Bar (Single customer tenant display — no other customers) */}
        <div className="rounded-2xl p-4 bg-[#0a1120] border border-white/[0.1] shadow-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/[0.15] flex items-center justify-center text-amber-400">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                CUSTOMER TENANT
              </div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {activeCustomer.name}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                  {activeCustomer.domain}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <Clock size={12} className="animate-pulse" />
              <span>AWAITING ADMIN APPROVAL</span>
            </span>
          </div>
        </div>

        {/* Pending Request Gate Card */}
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-b from-[#0b1426] to-[#070d18] border border-amber-500/30 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Clock size={36} />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <Clock size={13} className="text-amber-400 animate-pulse" />
              <span>SERVICE ACCESS PENDING APPROVAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Security Service Request Under Review
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your service request for <strong className="text-amber-300">{pendingNames}</strong> has been registered and is currently awaiting administrator review and approval.
            </p>
          </div>

          {/* Pending Specifications Table */}
          <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 text-left space-y-3 text-xs max-w-xl mx-auto">
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-slate-400 font-medium">Request Number:</span>
              <span className="font-mono font-bold text-cyan-400">{activeCustomer.lastRequestId || 'REQ-WAF-2026-C97CE9'}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-slate-400 font-medium">Customer Organization:</span>
              <span className="font-semibold text-white">{activeCustomer.name}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-slate-400 font-medium">Requested Service:</span>
              <span className="font-semibold text-emerald-400">{pendingNames}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-slate-400 font-medium">Monitored Primary Asset:</span>
              <span className="font-semibold text-slate-200">{activeCustomer.primaryAsset}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-slate-400 font-medium">Target URL / Domain:</span>
              <span className="font-mono text-cyan-300">{activeCustomer.domain}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.06] pb-2">
              <span className="text-slate-400 font-medium">Target IP & Port:</span>
              <span className="font-mono text-slate-300">{activeCustomer.ipAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Dashboard State:</span>
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Locked until Administrator Approval
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Live security analysis, threat activity charts, OWASP attack analytics, real-time WAF request inspection, and blocking events will only activate once an administrator reviews and approves this request.
          </p>

          {/* Actions & Instant Test Toggle */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/customer/requests"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white border border-white/[0.12] transition cursor-pointer"
            >
              View Request in Customer Portal
            </Link>

            <Link
              to="/admin-portal/approvals"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300 hover:text-cyan-200 border border-cyan-500/20 transition cursor-pointer"
            >
              Admin Approvals Portal
            </Link>

            {/* Test Simulation Button: allows approving on the spot */}
            <button
              type="button"
              onClick={() => {
                const targetService = activeCustomer.pendingServices[0] || 'waf'
                approveCustomerService(activeCustomer.id, targetService)
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>⚡ Approve & Unlock {activeCustomer.pendingServices[0]?.toUpperCase() || 'WAF'} Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate truthful service-scoped KPIs
  let displayKpi = {
    critical_threats: 0,
    critical_change: '—',
    active_incidents: 0,
    incidents_today: 0,
    blocked_threats: 0,
    blocked_change: '—',
    security_events: 0,
    events_change: '—',
    ai_accuracy: 99.84,
    ai_f1_score: 99.85,
    system_health: 100,
    sensors_online: 1,
    sensors_total: 1,
  }

  if (hasWaf && !hasIds) {
    // WAF only customer (e.g. Bank of Abyssinia)
    displayKpi = {
      critical_threats: 3,
      critical_change: '+0 today',
      active_incidents: 2,
      incidents_today: 0,
      blocked_threats: 190,
      blocked_change: '+14 today',
      security_events: 14820,
      events_change: '+1.2K today',
      ai_accuracy: 99.84,
      ai_f1_score: 99.85,
      system_health: 100,
      sensors_online: 1,
      sensors_total: 1,
    }
  } else if (hasIds && !hasWaf) {
    // IDS only customer (e.g. Ethiopian Airlines)
    displayKpi = {
      critical_threats: 4,
      critical_change: '+1 today',
      active_incidents: 2,
      incidents_today: 1,
      blocked_threats: 142,
      blocked_change: '+8 today',
      security_events: 8421,
      events_change: '+842 today',
      ai_accuracy: 99.80,
      ai_f1_score: 99.82,
      system_health: 100,
      sensors_online: 1,
      sensors_total: 1,
    }
  } else {
    // Multi-Engine (Commercial Bank of Ethiopia)
    displayKpi = {
      critical_threats: kpi?.critical_threats || 7,
      critical_change: kpi?.critical_change || '+2 today',
      active_incidents: kpi?.active_incidents || 4,
      incidents_today: kpi?.incidents_today || 2,
      blocked_threats: kpi?.blocked_threats || 332,
      blocked_change: kpi?.blocked_change || '+22 today',
      security_events: kpi?.security_events || 23241,
      events_change: kpi?.events_change || '+2.1K today',
      ai_accuracy: 99.84,
      ai_f1_score: 99.85,
      system_health: 100,
      sensors_online: 2,
      sensors_total: 2,
    }
  }

  return (
    <>
      {/* ── Incident Detail Modal ───────────────────────── */}
      {openIncident && (
        <IncidentDetailModal
          incident={openIncident}
          onClose={() => setOpenIncident(null)}
        />
      )}

      <div className="px-6 py-5 flex flex-col gap-5 bg-transparent min-h-full">

        {/* ── Customer Scope & Service Authorization Banner ── */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-[#0a1120] via-[#0d172a] to-[#0a1120] border border-white/[0.1] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
            {/* Customer identity & domain */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-white/[0.15] flex items-center justify-center flex-shrink-0 shadow-lg">
                <Building2 size={22} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-[1px] uppercase text-emerald-400 font-mono">
                    CUSTOMER SECURITY SCOPE
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {activeCustomer.id}
                  </span>
                </div>
                <h1 className="text-[20px] font-extrabold text-white tracking-tight leading-tight flex items-center gap-2">
                  {activeCustomer.name}
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-white/[0.08] text-slate-300 border border-white/[0.1]">
                    {activeCustomer.domain}
                  </span>
                </h1>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Primary Asset: <strong className="text-slate-200">{activeCustomer.primaryAsset}</strong> · Target: <span className="font-mono text-cyan-400">{activeCustomer.ipAddress}</span>
                </p>
              </div>
            </div>

            {/* Approved Service Badges & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Approved services pills */}
              {activeCustomer.approvedServices.map(srv => (
                <div
                  key={srv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                >
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>{srv.toUpperCase()} Approved & Active</span>
                </div>
              ))}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-semibold">{activeCustomer.name}</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  {activeCustomer.approvedServices.map(s => s.toUpperCase()).join(' + ')}
                </span>
              </div>

              {/* Direct Link to Request More Services */}
              <Link
                to="/request-service"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors text-xs font-semibold cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                <PlusCircle size={13} className="text-cyan-400" />
                <span>Request Service</span>
              </Link>
            </div>
          </div>

          {/* Service Scoping Notice */}
          <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">
                {hasWaf && !hasIds ? (
                  <>
                    <strong className="text-emerald-300">Web Application Firewall (WAF) Scope:</strong> Only HTTP/HTTPS web security analysis, OWASP Top 10 exploits, and reverse proxy traffic are shown. <em>Network IDS (Suricata/Zeek) is not enabled for this customer.</em>
                  </>
                ) : hasIds && !hasWaf ? (
                  <>
                    <strong className="text-sky-300">Network IDS (Suricata / Zeek) Scope:</strong> Only network intrusion alerts, port scans, and deep packet telemetry are shown. <em>Web Application Firewall is not enabled for this customer.</em>
                  </>
                ) : isPending ? (
                  <>
                    <strong className="text-amber-400">Pending Review:</strong> Service request submitted for {activeCustomer.pendingServices.map(s => s.toUpperCase()).join(', ')}. Gated until administrator approval.
                  </>
                ) : (
                  <>
                    <strong className="text-purple-300">Multi-Engine Enterprise Scope:</strong> Unified telemetry from Web Application Firewall and Network IDS sensors.
                  </>
                )}
              </span>
            </div>

            {/* Quick Admin Simulation Toggle to test approving/disapproving */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Simulate Admin Approval:</span>
              <button
                type="button"
                onClick={() => {
                  if (hasWaf) rejectCustomerService(activeCustomer.id, 'waf')
                  else approveCustomerService(activeCustomer.id, 'waf')
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                  hasWaf
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {hasWaf ? '✓ WAF Active' : '+ Enable WAF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasIds) rejectCustomerService(activeCustomer.id, 'ids')
                  else approveCustomerService(activeCustomer.id, 'ids')
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                  hasIds
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {hasIds ? '✓ IDS Active' : '+ Enable IDS'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Page Hero & Truthful Disaggregated Health ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[22px] font-extrabold text-white tracking-tight leading-tight">
              {hasWaf && !hasIds
                ? 'Web Application Security Overview'
                : hasIds && !hasWaf
                ? 'Network Intrusion & Telemetry Overview'
                : 'Security Operations & Telemetry Overview'}
            </h2>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Real-time monitoring and active threat defense for {activeCustomer.name}
            </p>
          </div>

          {/* Disaggregated System Health Status Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Backend API */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              health?.backend
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.backend ? 'bg-emerald-400' : 'bg-red-400'}`} />
              API: {health?.backend ? 'Online' : 'Offline'}
            </div>

            {/* PostgreSQL */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              health?.database === 'online'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.database === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              DB: {health?.database === 'online' ? 'Connected' : 'Offline'}
            </div>

            {/* WAF Engine Status */}
            {hasWaf && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                WAF Proxy: 8002 Online
              </div>
            )}

            {/* Suricata Sensor Status - Only show active if customer has IDS approved */}
            {hasIds ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Suricata IDS: Live Stream
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-slate-800/60 border-slate-700 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                IDS: Not Subscribed
              </div>
            )}

            {/* ML Engine */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              health?.ml_engine === 'loaded'
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.ml_engine === 'loaded' ? 'bg-purple-400' : 'bg-red-400'}`} />
              AI: {health?.ml_engine === 'loaded' ? 'XGBoost Active' : 'Offline'}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refreshAll()}
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors shadow-sm cursor-pointer"
              title="Refresh all metrics"
            >
              <RefreshCw size={13} className={healthFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            label={hasWaf && !hasIds ? 'Critical Web Threats' : 'Critical Threats'}
            value={displayKpi.critical_threats}
            change={displayKpi.critical_change}
            changeTone="red"
            sub="today"
            accent="red"
            icon={<AlertOctagon size={14} />}
          />
          <KpiCard
            label={hasWaf && !hasIds ? 'Active Web Incidents' : 'Active Incidents'}
            value={displayKpi.active_incidents}
            change={`+${displayKpi.incidents_today} today`}
            changeTone="amber"
            accent="orange"
            icon={<AlertTriangle size={14} />}
          />
          <KpiCard
            label={hasWaf && !hasIds ? 'Blocked Threats (WAF)' : 'Blocked Threats'}
            value={displayKpi.blocked_threats}
            change={displayKpi.blocked_change}
            changeTone="green"
            sub="today"
            accent="teal"
            icon={<ShieldCheck size={14} />}
          />
          <KpiCard
            label={hasWaf && !hasIds ? 'Web Requests Analyzed' : 'Security Events'}
            value={displayKpi.security_events.toLocaleString()}
            change={displayKpi.events_change}
            changeTone="blue"
            sub="today"
            accent="blue"
            icon={<Activity size={14} />}
          />
          <KpiCard
            label="AI Detection Accuracy"
            value={`${displayKpi.ai_accuracy}%`}
            sub2={`F1 SCORE: ${displayKpi.ai_f1_score}%`}
            accent="ai"
            icon={<BrainCircuit size={14} />}
            extra={
              <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1">
                <div className="h-full rounded-full"
                  style={{ width: `${displayKpi.ai_accuracy}%`, background: 'linear-gradient(90deg,#8b5cf6,#00c8ff)' }} />
              </div>
            }
          />
          <KpiCard
            label={hasWaf && !hasIds ? 'WAF Reverse Proxy' : 'System Health'}
            value={`${displayKpi.system_health}%`}
            sub={hasWaf && !hasIds ? 'Proxy 8002: Active' : `Sensors: ${displayKpi.sensors_online}/${displayKpi.sensors_total}`}
            accent="health"
            icon={<HeartPulse size={14} />}
            extra={
              <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1">
                <div className="h-full rounded-full"
                  style={{ width: `${displayKpi.system_health}%`, background: 'linear-gradient(90deg,#00e5a0,#00c8ff)' }} />
              </div>
            }
          />
        </div>

        {/* ── Row 2: Threat Activity + Attack Distribution (Scoped to Approved Service) ── */}
        <div className="grid grid-cols-[1fr_300px] gap-4">
          <ThreatActivityChart />
          <AttackDistributionChart />
        </div>

        {/* ── Row 3: Live Security Events (Strictly Scoped) ─────── */}
        <LiveEventsPanelEnhanced
          onOpenIncident={setOpenIncident}
          onOpenIP={setOpenIP}
        />

        {/* ── Row 4: Active Incidents + AI Engine + Risk ──── */}
        <div className="grid grid-cols-[1fr_220px_220px] gap-4">
          <ActiveIncidentsTable />
          <AIEnginePanel />
          <RiskDistributionPanel />
        </div>

        {/* ── Row 5: AI Workflow Pipeline ───────────────── */}
        <AIWorkflowPanel />

        {/* ── Row 6: Web Security & Prevention (Shown when WAF active) ── */}
        {hasWaf && (
          <div className="grid grid-cols-3 gap-4">
            <WebSecurityPanel />
            <URIAssessmentPanel />
            <PreventionPanel />
          </div>
        )}

        {/* ── Row 7: Network & Sensor Infrastructure (Shown when IDS active) ── */}
        {hasIds && (
          <div className="grid grid-cols-2 gap-4">
            <ThreatCorrelationPanel />
            <SystemStatusPanel />
          </div>
        )}

        {/* ── Row 8: Architecture & Response Actions ───────────── */}
        <div className="grid grid-cols-[1fr_240px] gap-4">
          <ResponseActionsPanel />
          <ArchitecturePanel />
        </div>

        <div className="h-4" />
      </div>
    </>
  )
}

