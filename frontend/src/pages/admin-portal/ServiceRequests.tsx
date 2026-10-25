import { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Shield,
  Layers,
  User,
  MessageSquare,
  X,
  Check,
  Search,
  Bug,
  Radio,
  Globe,
  Zap,
  Filter,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/components/ui/PageShell'
import {
  getAdminAllRequests,
  adminApproveRequest,
  adminRejectRequest,
  adminUpdateNotes,
  type ServiceRequestItem,
} from '@/lib/api'

const priorityStyle: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  High:     { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
  Medium:   { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b' },
  Low:      { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
}

const statusStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  Pending:    { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', icon: <Clock size={10} /> },
  Approved:   { bg: 'rgba(0,229,160,0.08)',  color: '#00e5a0', icon: <CheckCircle2 size={10} /> },
  Active:     { bg: 'rgba(0,200,255,0.08)',  color: '#00c8ff', icon: <CheckCircle2 size={10} /> },
  Rejected:   { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444', icon: <XCircle size={10} /> },
  Cancelled:  { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af', icon: <XCircle size={10} /> },
  Completed:  { bg: 'rgba(139,92,246,0.08)', color: '#a78bfa', icon: <CheckCircle2 size={10} /> },
}

const SERVICE_TABS = [
  { id: 'ALL', label: 'All Services', icon: Layers },
  { id: 'WAF', label: 'WAF Requests', icon: Shield },
  { id: 'SCANNER', label: 'Vulnerability Scanner', icon: Bug },
  { id: 'IDS', label: 'Network IDS', icon: Radio },
  { id: 'URL', label: 'URL Detection', icon: Globe },
  { id: 'INCIDENT', label: 'Incident Response', icon: Zap },
]

export default function ServiceRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ServiceRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  // Filters & Search
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestItem | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    try {
      const data = await getAdminAllRequests()
      setRequests(data)
    } catch (err: any) {
      console.error('Failed to load admin service requests:', err)
      setMessage({ text: 'Could not load requests from backend.', error: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const openReviewModal = (req: ServiceRequestItem) => {
    setSelectedRequest(req)
    setReviewNotes(req.admin_notes || '')
  }

  const handleApprove = async (id: string, notes?: string) => {
    setActionLoading(id)
    try {
      await adminApproveRequest(id, notes || reviewNotes)
      setMessage({ text: 'Security service request successfully approved! Customer portal access unlocked.' })
      setSelectedRequest(null)
      await loadRequests()
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Approval failed.', error: true })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleReject = async (id: string, reason?: string) => {
    const finalReason = reason !== undefined ? reason : (reviewNotes || window.prompt('Please enter a rejection reason:', 'Target asset is currently out of approved demo scope.') || '')
    if (finalReason === null) return

    setActionLoading(id)
    try {
      await adminRejectRequest(id, finalReason)
      setMessage({ text: 'Security service request rejected.' })
      setSelectedRequest(null)
      await loadRequests()
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Rejection failed.', error: true })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleSaveNotesOnly = async (id: string) => {
    setActionLoading(id)
    try {
      await adminUpdateNotes(id, reviewNotes)
      setMessage({ text: 'Review notes updated successfully.' })
      setSelectedRequest(null)
      await loadRequests()
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to update notes.', error: true })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  // Filtered requests computation
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // Service filter
      if (selectedServiceCategory !== 'ALL') {
        const stype = (r.service_type || '').toUpperCase()
        const scat = (r.service_category || '').toUpperCase()
        if (selectedServiceCategory === 'WAF' && !stype.includes('WAF') && !scat.includes('WAF')) return false
        if (selectedServiceCategory === 'SCANNER' && !stype.includes('SCAN') && !stype.includes('VULN') && !scat.includes('SCAN')) return false
        if (selectedServiceCategory === 'IDS' && !stype.includes('IDS') && !stype.includes('INTRUSION') && !scat.includes('IDS') && !scat.includes('NETWORK')) return false
        if (selectedServiceCategory === 'URL' && !stype.includes('URL') && !stype.includes('AI') && !scat.includes('URL') && !scat.includes('DETECTION')) return false
        if (selectedServiceCategory === 'INCIDENT' && !stype.includes('INCIDENT') && !scat.includes('INCIDENT')) return false
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        const s = (r.status || '').toLowerCase()
        if (selectedStatus === 'Pending' && s !== 'pending') return false
        if (selectedStatus === 'Approved' && s !== 'approved' && s !== 'active') return false
        if (selectedStatus === 'Rejected' && s !== 'rejected') return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCust = (r.customer_name || '').toLowerCase().includes(q)
        const matchEmail = (r.customer_email || '').toLowerCase().includes(q)
        const matchNum = (r.request_number || r.id || '').toLowerCase().includes(q)
        const matchTarget = (r.target_spec || r.asset_name || '').toLowerCase().includes(q)
        const matchService = (r.service_type || '').toLowerCase().includes(q)
        if (!matchCust && !matchEmail && !matchNum && !matchTarget && !matchService) return false
      }

      return true
    })
  }, [requests, selectedServiceCategory, selectedStatus, searchQuery])

  // Counts
  const totalCount = requests.length
  const pendingCount = requests.filter(r => (r.status || '').toLowerCase() === 'pending').length
  const approvedCount = requests.filter(r => ['approved', 'active'].includes((r.status || '').toLowerCase())).length
  const rejectedCount = requests.filter(r => (r.status || '').toLowerCase() === 'rejected').length

  const getServiceBadge = (serviceType: string) => {
    const s = serviceType.toUpperCase()
    if (s.includes('WAF')) return { icon: Shield, color: '#00e5a0', bg: 'rgba(0,229,160,0.1)', border: 'rgba(0,229,160,0.25)', label: 'WAF' }
    if (s.includes('SCAN') || s.includes('VULN')) return { icon: Bug, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)', label: 'DAST Scanner' }
    if (s.includes('IDS') || s.includes('INTRUSION')) return { icon: Radio, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: 'Network IDS' }
    if (s.includes('URL')) return { icon: Globe, color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.25)', label: 'URL Threat' }
    return { icon: Zap, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Incident Response' }
  }

  return (
    <PageShell
      title="Customer Security Service Requests"
      subtitle="Centralized governance over customer service requests, asset authorization, and dedicated portal access"
      badge={{ label: `${pendingCount} PENDING REVIEW`, color: pendingCount > 0 ? 'orange' : 'green' }}
      actions={
        <div className="flex items-center gap-2">
          <button
            className="fanos-btn"
            onClick={loadRequests}
            title="Refresh requests"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="fanos-btn"
            onClick={() => navigate('/admin-portal/approvals')}
            style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
          >
            <ArrowRight size={11} />Go to Approvals
          </button>
        </div>
      }
    >
      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.error
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {message.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#0b1526]/80 border border-white/[0.06] rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Requests</span>
          <div className="text-xl font-bold text-white mt-1">{totalCount}</div>
          <span className="text-[10px] text-slate-500">Across 5 core security services</span>
        </div>
        <div className={`border rounded-xl p-3.5 ${
          pendingCount > 0
            ? 'bg-amber-500/[0.08] border-amber-500/30'
            : 'bg-[#0b1526]/80 border-white/[0.06]'
        }`}>
          <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
            <Clock size={11} /> Pending Review
          </span>
          <div className="text-xl font-bold text-amber-300 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-amber-400/70">Awaiting admin authorization</span>
        </div>
        <div className="bg-[#0b1526]/80 border border-white/[0.06] rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={11} /> Approved
          </span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{approvedCount}</div>
          <span className="text-[10px] text-slate-500">Portal access granted</span>
        </div>
        <div className="bg-[#0b1526]/80 border border-white/[0.06] rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 flex items-center gap-1.5">
            <XCircle size={11} /> Rejected
          </span>
          <div className="text-xl font-bold text-rose-400 mt-1">{rejectedCount}</div>
          <span className="text-[10px] text-slate-500">Denied or out-of-scope</span>
        </div>
      </div>

      {/* Service Filter Tabs (Section 8 Requirements) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        {SERVICE_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = selectedServiceCategory === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedServiceCategory(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer border ${
                isActive
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-200 shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={12} className={isActive ? 'text-purple-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Search & Status Pill Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer, email, request #, or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070b14]/90 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#070b14]/90 p-1 rounded-xl border border-white/[0.08]">
          <span className="text-[10px] text-slate-500 px-2 flex items-center gap-1 font-mono uppercase">
            <Filter size={10} /> Status:
          </span>
          {['ALL', 'Pending', 'Approved', 'Rejected'].map(s => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                selectedStatus === s
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Request Table Card */}
      <div className="fanos-card">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title">
            <ClipboardList size={13} className="text-purple-400" />
            <span>Security Service Requests ({filteredRequests.length} of {requests.length})</span>
          </div>
          <span className="text-[10px] text-fanos-dim font-mono">Strict Customer Data Isolation Enforced</span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-purple-400" />
            <span>Loading customer requests from backend…</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400">
            No service requests found matching the current filters.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredRequests.map(r => {
              const ps = priorityStyle[r.priority] || priorityStyle.Medium
              const ss = statusStyle[r.status] || statusStyle.Pending
              const isActioning = actionLoading === r.id
              const badge = getServiceBadge(r.service_type)
              const BadgeIcon = badge.icon

              return (
                <div key={r.id} className="px-4 py-3.5 hover:bg-white/[0.018] transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                          {r.request_number || r.id}
                        </span>
                        <span
                          className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                        >
                          <BadgeIcon size={11} />
                          {r.service_type}
                        </span>
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}25` }}
                        >
                          {r.priority} Priority
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 truncate max-w-sm">
                          {r.target_spec || r.asset_name || 'No Target Spec'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 mb-1 flex items-center gap-2">
                        <User size={12} className="text-purple-400 shrink-0" />
                        <span>Customer: <strong className="text-white">{r.customer_name}</strong> {r.customer_email ? `(${r.customer_email})` : ''}</span>
                        {r.organization_name && (
                          <span className="text-slate-500 font-mono text-[10px]">· {r.organization_name}</span>
                        )}
                      </div>

                      {r.description && (
                        <div className="text-[10px] text-slate-400 mt-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04] leading-relaxed font-mono">
                          {r.description}
                        </div>
                      )}

                      {r.admin_notes && (
                        <div className="text-[10px] text-amber-300/90 mt-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                          <MessageSquare size={11} className="text-amber-400 shrink-0" />
                          <span>Admin Review Notes: {r.admin_notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.color}25` }}
                      >
                        {ss.icon}
                        {r.status}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                      <button
                        onClick={() => openReviewModal(r)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye size={11} /> Inspect & Review
                      </button>
                    </div>
                  </div>

                  {r.status === 'Pending' && (
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.04]">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={isActioning}
                        className="text-[10px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                        style={{ background: 'rgba(0,229,160,0.12)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.3)' }}
                      >
                        <CheckCircle2 size={12} />
                        {isActioning ? 'Authorizing…' : 'Approve & Unlock Portal'}
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={isActioning}
                        className="text-[10px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        <XCircle size={12} />
                        Reject Request
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Review & Asset Modal (Section 8 Requirements) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Review Security Service Request</h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h4 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
                <User size={13} className="text-purple-400" /> Customer Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Customer Name</span>
                  <span className="font-semibold text-white">{selectedRequest.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address</span>
                  <span className="font-mono text-cyan-400">{selectedRequest.customer_email || 'customer@fanos.ai'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Request Number</span>
                  <span className="font-mono text-slate-300">{selectedRequest.request_number || selectedRequest.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Submission Date</span>
                  <span className="text-slate-300">{selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>
            </div>

            {/* Selected Service & Customer Assets */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h4 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
                <Layers size={13} className="text-purple-400" /> Security Service & Asset Configuration
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Security Service:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {selectedRequest.service_type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered Asset / Target:</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/30">
                    {selectedRequest.target_spec || selectedRequest.asset_name || 'Standard Scope'}
                  </span>
                </div>
                {selectedRequest.description && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500 block mb-1">Asset Configuration & Scope:</span>
                    <p className="text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono leading-relaxed">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-mono uppercase font-semibold text-amber-400">
                    {selectedRequest.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Administrator Review Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-300">
                Administrator Review Notes
              </label>
              <textarea
                rows={3}
                placeholder="Add review feedback, requirements, or reason for approval/rejection..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                These notes will be displayed to the customer in their service status card and audit history.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => handleSaveNotesOnly(selectedRequest.id)}
                disabled={actionLoading === selectedRequest.id}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
              >
                Save Notes Only
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id, reviewNotes)}
                disabled={actionLoading === selectedRequest.id}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition cursor-pointer"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleApprove(selectedRequest.id, reviewNotes)}
                disabled={actionLoading === selectedRequest.id}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} /> Approve & Authorize Service
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}

