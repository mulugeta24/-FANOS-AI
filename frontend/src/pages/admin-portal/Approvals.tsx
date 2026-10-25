import { useState, useEffect, useCallback } from 'react'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Layers,
  Globe,
  Radio,
  Bug,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  Building2,
  Sparkles,
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import {
  getAdminAllRequests,
  adminApproveRequest,
  adminRejectRequest,
  type ServiceRequestItem,
} from '@/lib/api'
import { useWorkspace } from '@/context/WorkspaceContext'

// Platform-level governance requests
const PLATFORM_APPROVALS = [
  {
    id: 'APR-001',
    displayId: 'APR-001',
    title: 'Enterprise Plan Upgrade',
    org: 'GlobalBank Group',
    type: 'Plan Change',
    urgency: 'High' as const,
    submitted: '2 hr ago',
    requestedBy: 'Tigist Bekele',
    details: 'Upgrade from Business to Enterprise — 6 additional sensors, SLA upgrade to 99.99%',
    isReal: false,
    category: 'Platform Governance',
  },
  {
    id: 'APR-002',
    displayId: 'APR-002',
    title: 'New Sensor Cluster Deploy',
    org: 'Acme Corporation',
    type: 'Deployment',
    urgency: 'High' as const,
    submitted: '5 hr ago',
    requestedBy: 'Hiwot Tadesse',
    details: 'Deploy 3 sensor nodes in AWS us-east-1 for datacenter zone B coverage',
    isReal: false,
    category: 'Platform Governance',
  },
  {
    id: 'APR-003',
    displayId: 'APR-003',
    title: 'Trial Period Extension',
    org: 'SecureOps Inc',
    type: 'Account Change',
    urgency: 'Low' as const,
    submitted: '1 day ago',
    requestedBy: 'Abel Girma',
    details: 'Extend 30-day trial by an additional 15 days — customer evaluating WAF features',
    isReal: false,
    category: 'Platform Governance',
  },
  {
    id: 'APR-004',
    displayId: 'APR-004',
    title: 'WAF Rule Set Update',
    org: 'NovaTech Systems',
    type: 'Security Config',
    urgency: 'Medium' as const,
    submitted: '1 day ago',
    requestedBy: 'Yonas Haile',
    details: 'Enable OWASP CRS v3.3 ruleset with custom API gateway rules',
    isReal: false,
    category: 'Platform Governance',
  },
  {
    id: 'APR-005',
    displayId: 'APR-005',
    title: 'API Key Generation',
    org: 'DataGuard Africa',
    type: 'Access Control',
    urgency: 'Low' as const,
    submitted: '2 days ago',
    requestedBy: 'Selam Tesfaye',
    details: 'Generate new production API key for SIEM integration (QRadar)',
    isReal: false,
    category: 'Platform Governance',
  },
]

const urgencyStyle: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
  High:     { bg: 'rgba(239,68,68,0.08)', color: '#ef4444' },
  Medium:   { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
  Low:      { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
}

interface UnifiedApprovalItem {
  id: string
  displayId: string
  title: string
  org: string
  type: string
  urgency: 'Critical' | 'High' | 'Medium' | 'Low'
  submitted: string
  requestedBy: string
  details: string
  targetSpec?: string
  status: 'Pending' | 'Approved' | 'Rejected'
  isReal: boolean
  category: string
  adminNotes?: string
  resolvedAt?: string
  rawRequest?: ServiceRequestItem
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Recent'
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin} min ago`
    if (diffHour < 24) return `${diffHour} hr ago`
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  } catch {
    return dateString
  }
}

function getServiceIcon(title: string, category: string) {
  const t = (title + ' ' + category).toLowerCase()
  if (t.includes('waf') || t.includes('firewall')) return <Globe size={13} className="text-cyan-400" />
  if (t.includes('ids') || t.includes('sensor') || t.includes('intrusion')) return <Radio size={13} className="text-emerald-400" />
  if (t.includes('scanner') || t.includes('vulnerability')) return <Bug size={13} className="text-purple-400" />
  if (t.includes('url') || t.includes('phishing')) return <Zap size={13} className="text-amber-400" />
  return <Layers size={13} className="text-fanos-accent" />
}

export default function Approvals() {
  const { customers, approveCustomerService, rejectCustomerService } = useWorkspace()
  const [realRequests, setRealRequests] = useState<ServiceRequestItem[]>([])
  const [platformDecisions, setPlatformDecisions] = useState<Record<string, 'approved' | 'rejected'>>(() => {
    try {
      const saved = localStorage.getItem('fanos_platform_approval_decisions')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null)
  const [filterTab, setFilterTab] = useState<'all' | 'customer' | 'platform'>('all')
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({})

  // Fetch real customer requests from backend
  const loadRequests = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true)
    try {
      const data = await getAdminAllRequests()
      setRealRequests(data)
      setFeedback((prev) => (prev?.error ? null : prev))
    } catch (err: any) {
      console.error('Failed to load admin service requests:', err)
      if (!isSilent) {
        if (err.response?.status === 403) {
          setFeedback({ text: 'Access Restricted: Administrative privileges required to manage service approvals.', error: true })
        } else {
          setFeedback({ text: 'Unable to reach backend service requests API. Check that the backend server is running on port 8000.', error: true })
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])


  // Initial load + Real-time live polling every 5 seconds
  useEffect(() => {
    loadRequests()
    const interval = setInterval(() => {
      loadRequests(true)
    }, 5000)
    return () => clearInterval(interval)
  }, [loadRequests])

  // Convert real requests to unified items
  const tenantPendingItems: UnifiedApprovalItem[] = customers
    .filter((c) => c.pendingServices.length > 0)
    .map((c) => {
      const pNames = c.pendingServices.map((s) => (s === 'waf' ? 'WAF Web Application Firewall' : s.toUpperCase())).join(' & ')
      return {
        id: c.id,
        displayId: c.lastRequestId || `REQ-${c.pendingServices[0]?.toUpperCase() || 'WAF'}-2026`,
        title: `${pNames} Security Deployment`,
        org: c.name,
        type: 'Customer Security Service Request',
        urgency: 'Critical' as const,
        submitted: 'Pending Review',
        requestedBy: `${c.name} Security Lead`,
        details: `Deployment request for ${pNames} protecting ${c.primaryAsset} (${c.domain} / ${c.ipAddress})`,
        targetSpec: `${c.domain} (${c.ipAddress})`,
        status: 'Pending' as const,
        isReal: true,
        category: 'Customer Request',
      }
    })
    .filter((tItem) => !realRequests.some((r) => r.request_number === tItem.displayId))

  const backendRealItems: UnifiedApprovalItem[] = realRequests.map((r) => {
    const rawStatus = (r.status || 'Pending').toLowerCase()
    let mappedStatus: 'Pending' | 'Approved' | 'Rejected' = 'Pending'
    if (rawStatus === 'approved' || rawStatus === 'active') mappedStatus = 'Approved'
    else if (rawStatus === 'rejected' || rawStatus === 'declined' || rawStatus === 'cancelled') mappedStatus = 'Rejected'

    let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'High'
    if (r.priority === 'Critical') urgency = 'Critical'
    else if (r.priority === 'High') urgency = 'High'
    else if (r.priority === 'Medium') urgency = 'Medium'
    else if (r.priority === 'Low') urgency = 'Low'

    return {
      id: r.id,
      displayId: r.request_number || r.id.slice(0, 8),
      title: r.service_type || 'Security Service Request',
      org: r.organization_name || (r.username ? `@${r.username}` : 'Customer Organization'),
      type: r.service_category ? `${r.service_category} Service Request` : (r.request_type || 'Customer Request'),
      urgency,
      submitted: formatRelativeTime(r.created_at),
      requestedBy: r.customer_name || r.username || 'Customer',
      details: r.description || (r.target_spec ? `Target Asset: ${r.target_spec}` : 'Customer security service deployment'),
      targetSpec: r.target_spec,
      status: mappedStatus,
      isReal: true,
      category: 'Customer Request',
      adminNotes: r.admin_notes,
      resolvedAt: r.resolved_at,
      rawRequest: r,
    }
  })

  // Combine items: real customer requests appear first
  const realItems = [...tenantPendingItems, ...backendRealItems]

  // Convert platform items with decisions
  const platformItems: UnifiedApprovalItem[] = PLATFORM_APPROVALS.map((p) => {
    const d = platformDecisions[p.id]
    const status: 'Pending' | 'Approved' | 'Rejected' = d ? (d === 'approved' ? 'Approved' : 'Rejected') : 'Pending'
    return {
      ...p,
      status,
    }
  })

  // Combine items: real customer requests appear first
  const allItems = [...realItems, ...platformItems]

  // Filter based on tab
  const displayedItems = allItems.filter((item) => {
    if (filterTab === 'customer') return item.isReal
    if (filterTab === 'platform') return !item.isReal
    return true
  })

  const pending = displayedItems.filter((a) => a.status === 'Pending')
  const resolved = displayedItems.filter((a) => a.status !== 'Pending')

  const totalPendingAll = allItems.filter((a) => a.status === 'Pending').length
  const totalApprovedAll = allItems.filter((a) => a.status === 'Approved').length
  const totalRejectedAll = allItems.filter((a) => a.status === 'Rejected').length

  const handleApprove = async (item: UnifiedApprovalItem) => {
    setActionLoading(item.id)
    setFeedback(null)

    // Determine target service key
    const fullText = (item.title + ' ' + item.type + ' ' + item.category + ' ' + (item.details || '')).toLowerCase()
    const serviceKey = fullText.includes('waf') || fullText.includes('firewall') || fullText.includes('web')
      ? 'waf'
      : fullText.includes('ids') || fullText.includes('sensor') || fullText.includes('intrusion')
      ? 'ids'
      : fullText.includes('scanner') || fullText.includes('vulnerability')
      ? 'scanner'
      : fullText.includes('url') || fullText.includes('phishing')
      ? 'url-detection'
      : 'waf'

    // Synchronize tenant approved services
    const match = customers.find(c =>
      c.id === item.id ||
      c.name.toLowerCase().includes(item.org.toLowerCase()) ||
      item.org.toLowerCase().includes(c.name.toLowerCase())
    ) || customers[0]

    if (match) {
      approveCustomerService(match.id, serviceKey)
    }

    const notes = customNotes[item.id]?.trim() || `Approved by SOC Administrator on ${new Date().toLocaleDateString()}. Security service deployment authorized.`

    if (item.id.startsWith('cust-')) {
      setFeedback({ text: `Request ${item.displayId} (${item.org}) successfully approved! ${serviceKey.toUpperCase()} service unlocked for customer.` })
      setActionLoading(null)
      setTimeout(() => setFeedback(null), 5000)
      return
    }

    if (item.isReal) {
      try {
        await adminApproveRequest(item.id, notes)
        setFeedback({ text: `Request ${item.displayId} successfully approved! Service authorization granted.` })
        await loadRequests(true)
      } catch (err: any) {
        setFeedback({ text: err.response?.data?.detail || `Failed to approve request ${item.displayId}.`, error: true })
      } finally {
        setActionLoading(null)
        setTimeout(() => setFeedback(null), 5000)
      }
    } else {
      // Platform mock item
      const updated = { ...platformDecisions, [item.id]: 'approved' as const }
      setPlatformDecisions(updated)
      localStorage.setItem('fanos_platform_approval_decisions', JSON.stringify(updated))
      setFeedback({ text: `Platform request ${item.displayId} approved.` })
      setActionLoading(null)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleReject = async (item: UnifiedApprovalItem) => {
    const defaultReason = customNotes[item.id]?.trim() || window.prompt(
      `Please enter a rejection reason for ${item.displayId}:`,
      'Asset specifications or configuration out of scope.'
    )
    if (defaultReason === null) return

    setActionLoading(item.id)
    setFeedback(null)

    // Determine target service key
    const fullText = (item.title + ' ' + item.type + ' ' + item.category + ' ' + (item.details || '')).toLowerCase()
    const serviceKey = fullText.includes('waf') || fullText.includes('firewall') || fullText.includes('web')
      ? 'waf'
      : fullText.includes('ids') || fullText.includes('sensor') || fullText.includes('intrusion')
      ? 'ids'
      : fullText.includes('scanner') || fullText.includes('vulnerability')
      ? 'scanner'
      : fullText.includes('url') || fullText.includes('phishing')
      ? 'url-detection'
      : 'waf'

    // Synchronize tenant rejected services
    const match = customers.find(c =>
      c.name.toLowerCase().includes(item.org.toLowerCase()) ||
      item.org.toLowerCase().includes(c.name.toLowerCase()) ||
      c.id === item.id
    )
    if (match) {
      rejectCustomerService(match.id, serviceKey)
    }

    if (item.isReal) {
      try {
        await adminRejectRequest(item.id, defaultReason)
        setFeedback({ text: `Request ${item.displayId} rejected.` })
        await loadRequests(true)
      } catch (err: any) {
        setFeedback({ text: err.response?.data?.detail || `Failed to reject request ${item.displayId}.`, error: true })
      } finally {
        setActionLoading(null)
        setTimeout(() => setFeedback(null), 5000)
      }
    } else {
      // Platform mock item
      const updated = { ...platformDecisions, [item.id]: 'rejected' as const }
      setPlatformDecisions(updated)
      localStorage.setItem('fanos_platform_approval_decisions', JSON.stringify(updated))
      setFeedback({ text: `Platform request ${item.displayId} rejected.` })
      setActionLoading(null)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <PageShell
      title="Approvals"
      subtitle="Review and approve pending platform and customer service requests"
      badge={{ label: `${totalPendingAll} PENDING`, color: totalPendingAll > 0 ? 'orange' : 'green' }}
      actions={
        <div className="flex items-center gap-2">
          {/* Live Sync Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Real-Time Sync</span>
          </div>

          <button
            onClick={() => loadRequests()}
            disabled={refreshing}
            className="fanos-btn flex items-center gap-1.5 text-[11px]"
            title="Refresh requests list"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-fanos-cyan' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            feedback.error
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {feedback.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',  value: totalPendingAll,  color: '#f59e0b', icon: <Clock size={14} /> },
          { label: 'Approved', value: totalApprovedAll, color: '#00e5a0', icon: <CheckCircle2 size={14} /> },
          { label: 'Rejected', value: totalRejectedAll, color: '#ef4444', icon: <XCircle size={14} /> },
        ].map((s) => (
          <div key={s.label} className="fanos-card p-4 flex items-center gap-3">
            <span style={{ color: s.color }}>{s.icon}</span>
            <div>
              <div className="text-[20px] font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[10px] text-fanos-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Multi-Customer Tenant Provisioning & Service Approvals ── */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-[#0b1426] via-[#0d1830] to-[#0b1426] border border-cyan-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Customer Organization Service Provisioning & Approval
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                  Multi-Tenant Scoping
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Grant or revoke security engine access per customer. Approved services immediately unlock corresponding telemetry on the customer's dashboard.
              </p>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>Instant Reactive Dashboard Scoping</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {customers.map((c) => {
            const hasPendingWaf = c.pendingServices.includes('waf')
            const hasPendingIds = c.pendingServices.includes('ids')
            const hasPendingScanner = c.pendingServices.includes('scanner')
            const hasApprovedWaf = c.approvedServices.includes('waf')
            const hasApprovedIds = c.approvedServices.includes('ids')
            const hasApprovedScanner = c.approvedServices.includes('scanner')

            return (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.08] hover:border-white/[0.15] transition-all flex flex-col justify-between gap-3 shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-white leading-tight">{c.name}</h3>
                      <p className="text-[10px] font-mono text-cyan-400 mt-0.5">{c.domain}</p>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.05]">
                      {c.id}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-1">
                    Asset: <span className="text-slate-300 font-medium">{c.primaryAsset}</span>
                  </p>

                  {/* Active vs Pending badges */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    {c.approvedServices.length === 0 && c.pendingServices.length === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        No Services
                      </span>
                    )}

                    {c.approvedServices.map((srv) => (
                      <span
                        key={srv}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono"
                      >
                        <CheckCircle2 size={10} />
                        {srv.toUpperCase()}
                      </span>
                    ))}

                    {c.pendingServices.map((srv) => (
                      <span
                        key={srv}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono animate-pulse"
                      >
                        <Clock size={10} />
                        PENDING {srv.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 1-Click Action Buttons for this customer */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* WAF Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasApprovedWaf) {
                          rejectCustomerService(c.id, 'waf')
                          setFeedback({ text: `Revoked WAF access for ${c.name}.` })
                        } else {
                          approveCustomerService(c.id, 'waf')
                          setFeedback({ text: `Approved & Provisioned WAF for ${c.name}! Dashboard scoped to WAF.` })
                        }
                        setTimeout(() => setFeedback(null), 4000)
                      }}
                      className={`px-2 py-1 rounded font-mono font-bold transition cursor-pointer border ${
                        hasApprovedWaf
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                          : hasPendingWaf
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-emerald-500/20 hover:text-emerald-300'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.08]'
                      }`}
                      title={hasApprovedWaf ? 'Click to revoke WAF' : 'Click to approve & enable WAF'}
                    >
                      {hasApprovedWaf ? '✓ WAF Active' : hasPendingWaf ? 'Approve WAF' : '+ Enable WAF'}
                    </button>

                    {/* IDS Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasApprovedIds) {
                          rejectCustomerService(c.id, 'ids')
                          setFeedback({ text: `Revoked IDS access for ${c.name}.` })
                        } else {
                          approveCustomerService(c.id, 'ids')
                          setFeedback({ text: `Approved & Provisioned Network IDS for ${c.name}! Dashboard scoped to IDS.` })
                        }
                        setTimeout(() => setFeedback(null), 4000)
                      }}
                      className={`px-2 py-1 rounded font-mono font-bold transition cursor-pointer border ${
                        hasApprovedIds
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                          : hasPendingIds
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-sky-500/20 hover:text-sky-300'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.08]'
                      }`}
                      title={hasApprovedIds ? 'Click to revoke IDS' : 'Click to approve & enable IDS'}
                    >
                      {hasApprovedIds ? '✓ IDS Active' : hasPendingIds ? 'Approve IDS' : '+ Enable IDS'}
                    </button>

                    {/* Scanner Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasApprovedScanner) {
                          rejectCustomerService(c.id, 'scanner')
                          setFeedback({ text: `Revoked Scanner access for ${c.name}.` })
                        } else {
                          approveCustomerService(c.id, 'scanner')
                          setFeedback({ text: `Approved & Provisioned Web Scanner for ${c.name}!` })
                        }
                        setTimeout(() => setFeedback(null), 4000)
                      }}
                      className={`px-2 py-1 rounded font-mono font-bold transition cursor-pointer border ${
                        hasApprovedScanner
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                          : hasPendingScanner
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-purple-500/20 hover:text-purple-300'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.08]'
                      }`}
                      title={hasApprovedScanner ? 'Click to revoke Scanner' : 'Click to approve Scanner'}
                    >
                      {hasApprovedScanner ? '✓ DAST Active' : hasPendingScanner ? 'Approve DAST' : '+ Enable DAST'}
                    </button>

                    {/* URL Detection & Telegram Bot Toggle */}
                    {(() => {
                      const hasApprovedUrl = c.approvedServices.some(s => s.toLowerCase().includes('url'))
                      const hasPendingUrl = c.pendingServices.some(s => s.toLowerCase().includes('url'))
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (hasApprovedUrl) {
                              rejectCustomerService(c.id, 'url-detection')
                              setFeedback({ text: `Revoked URL & Telegram Bot access for ${c.name}.` })
                            } else {
                              approveCustomerService(c.id, 'url-detection')
                              setFeedback({ text: `Approved & Provisioned Malicious URL Detection & Telegram Bot (@FanosUrlScanBot) for ${c.name}!` })
                            }
                            setTimeout(() => setFeedback(null), 4000)
                          }}
                          className={`px-2 py-1 rounded font-mono font-bold transition cursor-pointer border ${
                            hasApprovedUrl
                              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                              : hasPendingUrl
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-fuchsia-500/20 hover:text-fuchsia-300'
                              : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.08]'
                          }`}
                          title={hasApprovedUrl ? 'Click to revoke URL Detection' : 'Click to approve URL Detection & Telegram Bot'}
                        >
                          {hasApprovedUrl ? '✓ URL & Bot Active' : hasPendingUrl ? 'Approve URL & Bot' : '+ Enable URL & Bot'}
                        </button>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'all'
              ? 'bg-fanos-accent/15 text-fanos-accent border border-fanos-accent/30'
              : 'text-fanos-muted hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          All Requests ({allItems.filter((a) => a.status === 'Pending').length})
        </button>

        <button
          onClick={() => setFilterTab('customer')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            filterTab === 'customer'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              : 'text-fanos-muted hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Globe size={11} />
          Customer Service Requests ({realItems.filter((a) => a.status === 'Pending').length})
        </button>

        <button
          onClick={() => setFilterTab('platform')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            filterTab === 'platform'
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
              : 'text-fanos-muted hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Layers size={11} />
          Platform Governance ({platformItems.filter((a) => a.status === 'Pending').length})
        </button>
      </div>

      {/* Pending Section */}
      <div className="fanos-card">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title">
            <AlertCircle size={13} className="text-fanos-amber" />
            <span>Awaiting Approval ({pending.length})</span>
          </div>
          {pending.length > 0 && (
            <span className="text-[10px] text-fanos-dim">
              Immediate action required by SOC Administrator
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-fanos-muted flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-cyan-400" />
            <span>Loading requests from database…</span>
          </div>
        ) : pending.length === 0 ? (
          <div className="py-12 text-center text-xs text-fanos-muted">
            <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-white">All requests are reviewed!</p>
            <p className="text-[11px] text-fanos-dim mt-1">No pending platform or customer service requests at this time.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {pending.map((a) => {
              const isActioning = actionLoading === a.id
              const isExpanded = !!expandedDetails[a.id]

              return (
                <div
                  key={a.id}
                  className={`px-4 py-3.5 transition-all ${
                    a.isReal
                      ? 'bg-cyan-950/[0.08] hover:bg-cyan-950/[0.15] border-l-2 border-l-cyan-400'
                      : 'hover:bg-white/[0.018]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Service Icon */}
                        {getServiceIcon(a.title, a.type)}

                        {/* Request ID */}
                        <span className="text-[11px] font-mono font-bold text-fanos-accent">
                          {a.displayId}
                        </span>

                        {/* Title */}
                        <span className="text-[13px] font-semibold text-white">
                          {a.title}
                        </span>

                        {/* Urgency Badge */}
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: urgencyStyle[a.urgency].bg,
                            color: urgencyStyle[a.urgency].color,
                            border: `1px solid ${urgencyStyle[a.urgency].color}25`,
                          }}
                        >
                          {a.urgency}
                        </span>

                        {/* Customer vs Platform Badge */}
                        {a.isReal ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                            Customer Request (Live)
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            Platform
                          </span>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 text-[10px] text-fanos-dim flex-wrap">
                        <span className="text-slate-300 font-medium">{a.org}</span>
                        <span>·</span>
                        <span className="text-cyan-400 font-medium">{a.type}</span>
                        <span>·</span>
                        <span>by <strong className="text-slate-200">{a.requestedBy}</strong></span>
                        <span>·</span>
                        <span>{a.submitted}</span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 self-start">
                      <button
                        onClick={() => handleApprove(a)}
                        disabled={isActioning}
                        className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50"
                        style={{
                          background: 'rgba(0,229,160,0.14)',
                          color: '#00e5a0',
                          border: '1px solid rgba(0,229,160,0.35)',
                        }}
                      >
                        {isActioning ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={11} />
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleReject(a)}
                        disabled={isActioning}
                        className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer hover:brightness-110 active:scale-95 disabled:opacity-50"
                        style={{
                          background: 'rgba(239,68,68,0.12)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)',
                        }}
                      >
                        <XCircle size={11} />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => toggleExpand(a.id)}
                        className="p-1.5 rounded-lg text-fanos-muted hover:text-white hover:bg-white/[0.05] transition"
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="text-[11px] text-fanos-muted mb-2 font-mono bg-black/20 p-2 rounded-lg border border-white/[0.04] break-all">
                    {a.details}
                  </div>

                  {/* Expanded Technical Specifications */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2 text-xs animate-fade-in">
                      {a.targetSpec && (
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                          <span className="text-slate-400 font-sans font-semibold block mb-0.5">Asset Target Specifications:</span>
                          <span className="text-slate-200 font-mono">{a.targetSpec}</span>
                        </div>
                      )}

                      {/* Optional custom notes field */}
                      <div className="flex items-center gap-2 pt-1">
                        <MessageSquare size={12} className="text-fanos-dim" />
                        <input
                          type="text"
                          placeholder="Optional review / deployment notes for customer…"
                          value={customNotes[a.id] || ''}
                          onChange={(e) => setCustomNotes({ ...customNotes, [a.id]: e.target.value })}
                          className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-fanos-dim flex-1 outline-none focus:border-cyan-500/40"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resolved Section */}
      {resolved.length > 0 && (
        <div className="fanos-card">
          <div className="fanos-panel-header flex items-center justify-between">
            <div className="fanos-panel-title">
              <CheckSquare size={13} className="text-fanos-green" />
              <span>Resolved ({resolved.length})</span>
            </div>
            <span className="text-[10px] text-fanos-dim">Historical approvals & rejections</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {resolved.map((a) => {
              const isApproved = a.status === 'Approved'

              return (
                <div
                  key={a.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.018] transition-colors flex-wrap"
                >
                  <div className={isApproved ? 'text-fanos-green' : 'text-fanos-red'}>
                    {isApproved ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-fanos-dim font-bold">{a.displayId}</span>
                      <span className="text-[12px] font-semibold text-white">{a.title}</span>
                      <span className="text-[10px] text-fanos-dim">· {a.org}</span>
                    </div>
                    {a.adminNotes && (
                      <div className="text-[10px] text-fanos-muted mt-0.5 italic">
                        Note: {a.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {a.status.toUpperCase()}
                    </span>

                    {!a.isReal && (
                      <button
                        onClick={() => {
                          const updated = { ...platformDecisions }
                          delete updated[a.id]
                          setPlatformDecisions(updated)
                          localStorage.setItem('fanos_platform_approval_decisions', JSON.stringify(updated))
                        }}
                        className="text-[9px] text-fanos-dim hover:text-fanos-accent transition"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PageShell>
  )
}
