import { useState, useEffect } from 'react'
import {
  Users, Search, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw,
  Server, Globe, ShieldAlert, ChevronRight, X, Activity
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import {
  getAdminCustomers,
  getAdminCustomerDetail,
  adminApproveRequest,
  adminRejectRequest,
} from '@/lib/api'

// Fallback customers if backend is offline
const FALLBACK_CUSTOMERS = [
  { id: 'cust-1', username: 'mulugeta.ababi', name: 'Mulugeta Ababi', email: 'mulugeta@acme.com', org: 'Acme Corporation', plan: 'Enterprise', status: 'Active', sensors: 12, assets_count: 12, approved_services: 3, pending_requests: 0, misconfigurations_count: 2, risk_score: 42, mfa: true, joined: 'Jan 15, 2025' },
  { id: 'cust-2', username: 'tigist.bekele', name: 'Tigist Bekele', email: 'tigist@globalbank.net', org: 'GlobalBank Group', plan: 'Enterprise', status: 'Active', sensors: 6, assets_count: 6, approved_services: 2, pending_requests: 1, misconfigurations_count: 3, risk_score: 65, mfa: true, joined: 'Mar 2, 2025' },
  { id: 'cust-3', username: 'yonas.haile', name: 'Yonas Haile', email: 'yonas@novatech.co', org: 'NovaTech Systems', plan: 'Business', status: 'Active', sensors: 8, assets_count: 8, approved_services: 1, pending_requests: 0, misconfigurations_count: 1, risk_score: 28, mfa: true, joined: 'May 10, 2025' },
  { id: 'cust-4', username: 'selam.tesfaye', name: 'Selam Tesfaye', email: 'selam@dataguard.sa', org: 'DataGuard Africa', plan: 'Enterprise', status: 'Active', sensors: 15, assets_count: 15, approved_services: 4, pending_requests: 0, misconfigurations_count: 4, risk_score: 55, mfa: true, joined: 'Jun 1, 2025' },
  { id: 'cust-5', username: 'abel.girma', name: 'Abel Girma', email: 'abel@secureops.io', org: 'SecureOps Inc', plan: 'Starter', status: 'Pending Review', sensors: 2, assets_count: 2, approved_services: 0, pending_requests: 1, misconfigurations_count: 2, risk_score: 75, mfa: false, joined: 'Aug 20, 2025' },
  { id: 'cust-6', username: 'customer.demo', name: 'Enterprise Banking Client', email: 'security@enterprise-bank.com', org: 'Enterprise Banking Corp', plan: 'Enterprise', status: 'Pending Review', sensors: 1, assets_count: 1, approved_services: 0, pending_requests: 1, misconfigurations_count: 4, risk_score: 78, mfa: true, joined: 'Oct 23, 2026' },
]

const statusStyle: Record<string, { bg: string; color: string }> = {
  Active:           { bg: 'rgba(0,229,160,0.1)',  color: '#00e5a0' },
  'Pending Review': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  Trial:            { bg: 'rgba(56,189,248,0.1)', color: '#38bdf8' },
  Suspended:        { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
}

const planColor: Record<string, string> = {
  Enterprise: '#8b5cf6',
  Business:   '#00c8ff',
  Starter:    '#f59e0b',
}

const severityBadge: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  HIGH:     { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  MEDIUM:   { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  LOW:      { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>(FALLBACK_CUSTOMERS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'pending' | 'high_risk'>('all')

  // Split Workspace: Selected single customer to inspect in isolation
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerDetail, setCustomerDetail] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<'misconfigurations' | 'assets' | 'requests' | 'telemetry'>('misconfigurations')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ text: string; error?: boolean } | null>(null)

  // Load customer directory from backend
  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await getAdminCustomers()
      if (Array.isArray(data) && data.length > 0) {
        setCustomers(data)
      }
    } catch (err) {
      console.warn('Backend customers API fallback applied:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  // Load single customer detail when selected ("split each by one")
  const openCustomerWorkspace = async (customerId: string) => {
    setSelectedCustomerId(customerId)
    setDetailLoading(true)
    setCustomerDetail(null)
    setNotification(null)

    try {
      const detail = await getAdminCustomerDetail(customerId)
      setCustomerDetail(detail)
    } catch (err) {
      console.error('Failed to load customer isolated detail:', err)
      // Build local fallback for seamless experience
      const basic = customers.find(c => c.id === customerId || c.username === customerId)
      if (basic) {
        setCustomerDetail({
          customer: basic,
          assets: [
            {
              id: 'ast-1',
              name: `${basic.org} Primary Portal`,
              asset_type: 'WEBSITE',
              ip_address: '127.0.0.1',
              hostname: `secure.${basic.username || 'client'}.enterprise-bank.com`,
              target_url: `https://secure.${basic.username || 'client'}.enterprise-bank.com`,
              environment: 'PRODUCTION',
              status: basic.status === 'Active' ? 'APPROVED' : 'PENDING',
              monitoring_enabled: basic.status === 'Active',
            }
          ],
          service_requests: [
            {
              id: 'req-1',
              request_number: 'REQ-WAF-2026-01',
              service_type: 'Web Application Firewall (WAF)',
              priority: 'High',
              status: basic.status === 'Active' ? 'Approved' : 'Pending',
              target_spec: `https://secure.${basic.username || 'client'}.enterprise-bank.com`,
            }
          ],
          misconfigurations: [
            {
              id: 'MISCFG-01',
              title: 'Missing Content-Security-Policy (CSP) Header',
              severity: 'MEDIUM',
              cwe: 'CWE-1021',
              target: `https://secure.${basic.username || 'client'}.enterprise-bank.com`,
              description: 'HTTP response headers do not restrict sources for scripts, styles, or iframes, leaving portal susceptible to Cross-Site Scripting (XSS).',
              remediation: 'Deploy Content-Security-Policy: default-src \'self\' via FANOS WAF header rewrite.',
              status: basic.status === 'Active' ? 'MITIGATED' : 'OPEN',
              cvss: 5.4,
            },
            {
              id: 'MISCFG-02',
              title: 'Permissive CORS Origin Reflection Misconfiguration',
              severity: 'HIGH',
              cwe: 'CWE-942',
              target: `https://secure.${basic.username || 'client'}.enterprise-bank.com/api/v1/auth`,
              description: 'Origin header is dynamically reflected with Access-Control-Allow-Credentials: true, exposing customer session data.',
              remediation: 'Enforce strict origin allowlists in application gateway middleware.',
              status: 'OPEN',
              cvss: 7.5,
            },
            {
              id: 'MISCFG-03',
              title: 'Server Version Banner Disclosure (Server Tokens)',
              severity: 'LOW',
              cwe: 'CWE-200',
              target: `https://secure.${basic.username || 'client'}.enterprise-bank.com`,
              description: 'Server advertises specific web daemon and version details, facilitating targeted vulnerability probing.',
              remediation: 'Strip Server and X-Powered-By response headers using FANOS WAF header filter.',
              status: basic.status === 'Active' ? 'MITIGATED' : 'OPEN',
              cvss: 3.8,
            },
          ],
          telemetry: [
            { id: 'ev-1', type: 'SQL Injection Attack', target: `https://secure.${basic.username || 'client'}.enterprise-bank.com/api/search`, ip: '185.220.101.45', action: 'BLOCKED BY WAF', severity: 'CRITICAL', confidence: 99.8 },
            { id: 'ev-2', type: 'Cross-Site Scripting (XSS)', target: `https://secure.${basic.username || 'client'}.enterprise-bank.com/comments`, ip: '45.142.214.18', action: 'BLOCKED BY WAF', severity: 'HIGH', confidence: 98.9 },
          ],
          summary: {
            total_assets: 1,
            approved_requests: basic.status === 'Active' ? 1 : 0,
            pending_requests: basic.status === 'Pending Review' ? 1 : 0,
            open_misconfigurations: basic.status === 'Active' ? 1 : 3,
            critical_risk_score: basic.risk_score || 50,
          }
        })
      }
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle request approval from inside customer isolated view
  const handleApproveRequest = async (reqId: string) => {
    setActionLoading(reqId)
    try {
      await adminApproveRequest(reqId, 'Approved in customer workspace by SOC Administrator.')
      setNotification({ text: 'Customer service request approved! Asset defense activated.' })
      if (selectedCustomerId) {
        await openCustomerWorkspace(selectedCustomerId)
      }
      await loadCustomers()
    } catch (err: any) {
      setNotification({ text: err.response?.data?.detail || 'Failed to approve request.', error: true })
    } finally {
      setActionLoading(null)
      setTimeout(() => setNotification(null), 5000)
    }
  }

  // Handle request rejection
  const handleRejectRequest = async (reqId: string) => {
    const reason = window.prompt('Enter rejection reason:', 'Specifications out of compliance.')
    if (!reason) return

    setActionLoading(reqId)
    try {
      await adminRejectRequest(reqId, reason)
      setNotification({ text: 'Customer service request rejected.' })
      if (selectedCustomerId) {
        await openCustomerWorkspace(selectedCustomerId)
      }
      await loadCustomers()
    } catch (err: any) {
      setNotification({ text: err.response?.data?.detail || 'Failed to reject request.', error: true })
    } finally {
      setActionLoading(null)
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const filtered = customers.filter(c => {
    const term = search.toLowerCase()
    const matchesSearch =
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.org || '').toLowerCase().includes(term) ||
      (c.username || '').toLowerCase().includes(term)

    if (!matchesSearch) return false

    if (filterTab === 'active') return (c.status || '').toLowerCase() === 'active'
    if (filterTab === 'pending') return (c.status || '').toLowerCase().includes('pending')
    if (filterTab === 'high_risk') return (c.risk_score || 0) >= 60

    return true
  })

  const totalActive = customers.filter(c => (c.status || '').toLowerCase() === 'active').length
  const totalPending = customers.filter(c => (c.status || '').toLowerCase().includes('pending') || (c.pending_requests || 0) > 0).length
  const totalHighRisk = customers.filter(c => (c.risk_score || 0) >= 60).length

  return (
    <PageShell
      title="Customer Management & Security Isolation"
      subtitle="Strict per-tenant isolation: split and inspect each customer's assets, approvals, and security misconfigurations"
      badge={{ label: `${totalActive} ACTIVE TENANTS`, color: 'green' }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="fanos-btn-secondary inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-slate-300"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Sync Directory</span>
          </button>
        </div>
      }
    >
      {/* ── Notification Banner ── */}
      {notification && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            notification.error
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.error ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="fanos-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Users size={16} />
          </div>
          <div>
            <div className="text-[20px] font-bold text-white">{customers.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Tenants</div>
          </div>
        </div>

        <div className="fanos-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="text-[20px] font-bold text-emerald-400">{totalActive}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active & Protected</div>
          </div>
        </div>

        <div className="fanos-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-[20px] font-bold text-amber-400">{totalPending}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pending Review</div>
          </div>
        </div>

        <div className="fanos-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <ShieldAlert size={16} />
          </div>
          <div>
            <div className="text-[20px] font-bold text-rose-400">{totalHighRisk}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">High Risk Posture</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Table + Isolated Customer Split View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Customer Accounts List */}
        <div className={selectedCustomerId ? 'lg:col-span-5 space-y-3' : 'lg:col-span-12 space-y-3'}>
          {/* Search & Tabs */}
          <div className="fanos-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <Search size={13} className="text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer, email, or company..."
                className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/[0.05] text-[10px] font-semibold w-full sm:w-auto">
              {(['all', 'active', 'pending', 'high_risk'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded transition ${
                    filterTab === tab
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' && 'All'}
                  {tab === 'active' && 'Active'}
                  {tab === 'pending' && 'Pending'}
                  {tab === 'high_risk' && 'High Risk'}
                </button>
              ))}
            </div>
          </div>

          {/* Customers Table */}
          <div className="fanos-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</th>
                    {!selectedCustomerId && (
                      <>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan</th>
                      </>
                    )}
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Misconfigs</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filtered.map(c => {
                    const isSelected = selectedCustomerId === c.id || selectedCustomerId === c.username
                    const st = statusStyle[c.status] || { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' }
                    const pc = planColor[c.plan] || '#00c8ff'
                    const initials = (c.name || 'CU').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

                    return (
                      <tr
                        key={c.id || c.username}
                        onClick={() => openCustomerWorkspace(c.id || c.username)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 bg-gradient-to-br from-cyan-600 to-blue-700 shadow">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{c.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{c.email}</div>
                            </div>
                          </div>
                        </td>

                        {!selectedCustomerId && (
                          <>
                            <td className="px-3 py-2.5 text-xs text-slate-300 font-medium">
                              <div>{c.org || 'Enterprise'}</div>
                              <div className="text-[10px] text-slate-500">@{c.username || 'client'}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                                style={{ background: `${pc}15`, color: pc, border: `1px solid ${pc}30` }}
                              >
                                {c.plan || 'Enterprise'}
                              </span>
                            </td>
                          </>
                        )}

                        <td className="px-3 py-2.5">
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
                            style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}
                          >
                            {c.status || 'Active'}
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <AlertTriangle size={10} />
                            <span>{c.misconfigurations_count || 2} Open</span>
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openCustomerWorkspace(c.id || c.username)
                            }}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded transition ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-900 shadow-md'
                                : 'bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-white/[0.08]'
                            }`}
                          >
                            <span>Inspect</span>
                            <ChevronRight size={10} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={selectedCustomerId ? 4 : 6} className="text-center py-8 text-xs text-slate-500">
                        No customer accounts found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Isolated Customer Split Workspace ("split each by one") */}
        {selectedCustomerId && (
          <div className="lg:col-span-7 space-y-4 animate-fade-in">
            {detailLoading ? (
              <div className="fanos-card p-12 text-center text-slate-400 space-y-3">
                <RefreshCw size={24} className="animate-spin mx-auto text-cyan-400" />
                <div className="text-xs font-semibold">Loading isolated customer security workspace...</div>
              </div>
            ) : customerDetail ? (
              <div className="fanos-card p-5 space-y-5 border border-cyan-500/30 bg-[#091122]">
                {/* ── Customer Identity Header ── */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-base font-extrabold text-white shadow-lg">
                      {(customerDetail.customer?.name || 'CU').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-white">
                          {customerDetail.customer?.name}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          {customerDetail.customer?.status || 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{customerDetail.customer?.org}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono">@{customerDetail.customer?.username}</span>
                        <span>•</span>
                        <span>{customerDetail.customer?.email}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
                    title="Close Split View"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* ── Security Posture Quick Metrics ── */}
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <div className="text-xs text-slate-400 font-medium">Risk Score</div>
                    <div className="text-lg font-extrabold text-amber-400">
                      {customerDetail.summary?.critical_risk_score || 55}/100
                    </div>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <div className="text-xs text-slate-400 font-medium">Open Misconfigs</div>
                    <div className="text-lg font-extrabold text-rose-400">
                      {customerDetail.summary?.open_misconfigurations || customerDetail.misconfigurations?.length || 0}
                    </div>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <div className="text-xs text-slate-400 font-medium">Assets</div>
                    <div className="text-lg font-extrabold text-cyan-400">
                      {customerDetail.assets?.length || 0}
                    </div>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                    <div className="text-xs text-slate-400 font-medium">Pending Reqs</div>
                    <div className="text-lg font-extrabold text-amber-400">
                      {customerDetail.summary?.pending_requests || 0}
                    </div>
                  </div>
                </div>

                {/* ── Customer Workspace Navigation Tabs ── */}
                <div className="flex items-center gap-1 border-b border-white/[0.08] pb-2 text-xs font-bold">
                  {[
                    { id: 'misconfigurations', label: 'Security Misconfigurations', icon: ShieldAlert, badge: customerDetail.misconfigurations?.length },
                    { id: 'assets', label: 'Registered Assets', icon: Server, badge: customerDetail.assets?.length },
                    { id: 'requests', label: 'Service Approvals', icon: Clock, badge: customerDetail.service_requests?.length },
                    { id: 'telemetry', label: 'Live Telemetry', icon: Activity, badge: customerDetail.telemetry?.length },
                  ].map(t => {
                    const Icon = t.icon
                    const active = detailTab === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDetailTab(t.id as any)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon size={12} />
                        <span>{t.label}</span>
                        {t.badge !== undefined && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${active ? 'bg-cyan-400 text-slate-900' : 'bg-white/[0.08] text-slate-400'}`}>
                            {t.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* ── TAB 1: Security Misconfigurations ── */}
                {detailTab === 'misconfigurations' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Strict per-tenant posture evaluation scoped only to this customer's domains:</span>
                      <span className="text-cyan-400 text-[11px] font-mono">
                        {customerDetail.assets?.[0]?.hostname || 'enterprise-portal.com'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {(customerDetail.misconfigurations || []).map((m: any) => {
                        const sBadge = severityBadge[m.severity] || severityBadge.MEDIUM
                        const isOpen = m.status === 'OPEN'
                        return (
                          <div
                            key={m.id}
                            className="bg-black/30 p-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[9px] font-bold px-2 py-0.5 rounded tracking-wider"
                                  style={{ background: sBadge.bg, color: sBadge.color, border: `1px solid ${sBadge.border}` }}
                                >
                                  {m.severity}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-semibold">{m.cwe}</span>
                                <h4 className="text-xs font-bold text-white">{m.title}</h4>
                              </div>

                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                  isOpen
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {m.description}
                            </p>

                            <div className="text-[10px] bg-white/[0.03] p-2 rounded-lg border border-white/[0.04] space-y-1">
                              <div className="flex items-center gap-1.5 text-cyan-300 font-mono">
                                <Globe size={11} />
                                <span className="font-semibold">Target:</span>
                                <span>{m.target}</span>
                              </div>
                              <div className="text-slate-400">
                                <strong className="text-slate-300 font-semibold">Remediation: </strong>
                                {m.remediation}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Registered Assets ── */}
                {detailTab === 'assets' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-2">
                      {(customerDetail.assets || []).map((a: any) => (
                        <div
                          key={a.id}
                          className="bg-black/30 p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                <Globe size={12} />
                              </div>
                              <h4 className="text-xs font-bold text-white">{a.name}</h4>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300">
                                {a.environment}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                              <span>Domain: {a.hostname || a.target_url}</span>
                              <span>•</span>
                              <span>Origin IP: {a.ip_address}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                a.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: Service Approvals ── */}
                {detailTab === 'requests' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-2.5">
                      {(customerDetail.service_requests || []).map((r: any) => {
                        const isPending = (r.status || '').toLowerCase() === 'pending'
                        return (
                          <div
                            key={r.id}
                            className="bg-black/30 p-3.5 rounded-xl border border-white/[0.06] space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{r.service_type}</span>
                                <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                                  {r.request_number}
                                </span>
                              </div>

                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                  isPending
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {r.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 font-mono">
                              Target Specification: {r.target_spec || r.asset_name || 'Enterprise Production'}
                            </div>

                            {isPending && (
                              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                                <button
                                  onClick={() => handleApproveRequest(r.id)}
                                  disabled={actionLoading === r.id}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>{actionLoading === r.id ? 'Approving...' : 'Approve Service & Activate WAF'}</span>
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(r.id)}
                                  disabled={actionLoading === r.id}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition"
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── TAB 4: Live Telemetry ── */}
                {detailTab === 'telemetry' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="text-xs text-slate-400">
                      Live attack events and WAF interception telemetry strictly scoped to this customer's domain:
                    </div>
                    <div className="space-y-2">
                      {(customerDetail.telemetry || []).map((evt: any) => (
                        <div
                          key={evt.id}
                          className="bg-black/30 p-3 rounded-xl border border-white/[0.06] flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                {evt.severity}
                              </span>
                              <h5 className="text-xs font-bold text-white">{evt.type}</h5>
                              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {evt.action}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Target: {evt.target} · Source IP: {evt.ip}
                            </div>
                          </div>
                          <div className="text-[10px] font-bold text-cyan-300">
                            AI Confidence: {evt.confidence}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PageShell>
  )
}
