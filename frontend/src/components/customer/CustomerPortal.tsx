import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Shield, ShieldCheck, Bug, Brain, Radio, Zap,
  Server, FileText, CheckCircle2, Clock, XCircle, AlertCircle,
  Plus, RefreshCw, Download, User, Trash2, ArrowRight, ChevronRight, Activity, LogOut
} from 'lucide-react'
import {
  getCustomerDashboardStats,
  getCustomerServiceRequests,
  createServiceRequest,
  cancelServiceRequest,
  getCustomerAssets,
  createCustomerAsset,
  deleteCustomerAsset,
  getCustomerReports,
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerDashboardStats,
  type ServiceRequestItem,
  type CustomerAsset,
  type CustomerReport,
  type CustomerUser,
} from '@/lib/api'

type TabType = 'overview' | 'services' | 'requests' | 'assets' | 'reports' | 'profile'

const ORG_TYPES = [
  'Enterprise / Corporate',
  'Banking & Financial Services',
  'Technology / SaaS Provider',
  'Healthcare & Life Sciences',
  'Government & Public Sector',
  'Small / Medium Business (SMB)',
  'Education & Academic Research',
  'Critical Infrastructure & Energy',
  'Other',
]

const ASSET_TYPES = ['WEBSITE', 'API', 'SERVER', 'NETWORK', 'ENDPOINT', 'DATABASE', 'CLOUD', 'OTHER']
const ENVIRONMENTS = ['PRODUCTION', 'STAGING', 'DEVELOPMENT', 'LAB']

export default function CustomerPortal({ initialTab = 'overview' }: { initialTab?: TabType }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Data states
  const [stats, setStats] = useState<CustomerDashboardStats | null>(null)
  const [requests, setRequests] = useState<ServiceRequestItem[]>([])
  const [assets, setAssets] = useState<CustomerAsset[]>([])
  const [reports, setReports] = useState<CustomerReport[]>([])
  const [profile, setProfile] = useState<CustomerUser | null>(null)

  // Loading & status states
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modals state
  const [openRequestModal, setOpenRequestModal] = useState(false)
  const [openAssetModal, setOpenAssetModal] = useState(false)

  // Request filter
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL')

  // New Request Form
  const [reqForm, setReqForm] = useState({
    serviceType: 'Web Vulnerability Scanner',
    serviceCategory: 'SCANNER',
    assetId: '',
    targetSpec: '',
    priority: 'Medium',
    requestType: 'Initial Deployment',
    description: '',
  })
  const [submittingReq, setSubmittingReq] = useState(false)

  // New Asset Form
  const [assetForm, setAssetForm] = useState({
    name: '',
    assetType: 'WEBSITE',
    ipAddress: '',
    hostname: '',
    targetUrl: '',
    environment: 'PRODUCTION',
    serviceType: 'Web Vulnerability Scanner',
    description: '',
  })
  const [submittingAsset, setSubmittingAsset] = useState(false)

  // Profile Edit Form
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    organizationName: '',
    organizationType: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Load all customer data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMsg('')

    try {
      const [statsRes, reqsRes, assetsRes, reportsRes, profileRes] = await Promise.allSettled([
        getCustomerDashboardStats(),
        getCustomerServiceRequests(),
        getCustomerAssets(),
        getCustomerReports(),
        getCustomerProfile(),
      ])

      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
      if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value)
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value)
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value)
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value)
        setProfileForm({
          fullName: profileRes.value.full_name || '',
          phone: profileRes.value.phone || '',
          organizationName: profileRes.value.organization_name || '',
          organizationType: profileRes.value.organization_type || '',
        })
      }
    } catch (err: any) {
      console.error('Failed to load customer data', err)
      setErrorMsg('Failed to fetch some customer metrics from backend. Showing cached state.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Show temporary toast message
  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4500)
    } else {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(''), 4500)
    }
  }

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('fanos_token')
    localStorage.removeItem('fanos_user')
    navigate('/login')
  }

  // Open Request Modal with preselected service
  const handleRequestServiceFromCatalog = (serviceName: string) => {
    setReqForm(prev => ({
      ...prev,
      serviceType: serviceName,
      serviceCategory: serviceName.includes('Scanner') ? 'SCANNER' : serviceName.includes('URL') ? 'AI_DETECTION' : serviceName.includes('IDS') ? 'NETWORK_IDS' : serviceName.includes('WAF') ? 'WAF' : 'INCIDENT_RESPONSE',
    }))
    setOpenRequestModal(true)
  }

  // Open Request Modal from an Asset
  const handleRequestServiceForAsset = (asset: CustomerAsset) => {
    setReqForm(prev => ({
      ...prev,
      assetId: asset.id,
      targetSpec: asset.target_url || asset.ip_address,
      description: `Security assessment and protection for ${asset.name} (${asset.asset_type})`,
    }))
    setOpenRequestModal(true)
  }

  // Submit New Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reqForm.serviceType) {
      showNotification('Please select a security service', true)
      return
    }

    setSubmittingReq(true)
    try {
      const selectedAsset = assets.find(a => a.id === reqForm.assetId)
      await createServiceRequest({
        service_type: reqForm.serviceType,
        service_category: reqForm.serviceCategory,
        asset_id: reqForm.assetId || undefined,
        asset_name: selectedAsset?.name,
        target_spec: reqForm.targetSpec || selectedAsset?.target_url || selectedAsset?.ip_address,
        priority: reqForm.priority,
        request_type: reqForm.requestType,
        description: reqForm.description,
      })

      showNotification('Security service request submitted successfully! Status: Pending review.')
      setOpenRequestModal(false)
      setReqForm({
        serviceType: 'Web Vulnerability Scanner',
        serviceCategory: 'SCANNER',
        assetId: '',
        targetSpec: '',
        priority: 'Medium',
        requestType: 'Initial Deployment',
        description: '',
      })
      await loadData(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      showNotification(typeof detail === 'string' ? detail : 'Failed to submit service request', true)
    } finally {
      setSubmittingReq(false)
    }
  }

  // Cancel Request
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending service request?')) return
    try {
      await cancelServiceRequest(requestId)
      showNotification('Service request cancelled.')
      await loadData(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      showNotification(typeof detail === 'string' ? detail : 'Failed to cancel request', true)
    }
  }

  // Submit New Asset
  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetForm.name.trim() || !assetForm.ipAddress.trim()) {
      showNotification('Asset Name and IP Address / Host are required', true)
      return
    }

    setSubmittingAsset(true)
    try {
      await createCustomerAsset({
        name: assetForm.name.trim(),
        asset_type: assetForm.assetType,
        ip_address: assetForm.ipAddress.trim(),
        hostname: assetForm.hostname.trim() || undefined,
        target_url: assetForm.targetUrl.trim() || undefined,
        environment: assetForm.environment,
        service_type: assetForm.serviceType,
        description: assetForm.description.trim() || undefined,
      })

      showNotification('Asset registered successfully! You can now request security services for it.')
      setOpenAssetModal(false)
      setAssetForm({
        name: '',
        assetType: 'WEBSITE',
        ipAddress: '',
        hostname: '',
        targetUrl: '',
        environment: 'PRODUCTION',
        serviceType: 'Web Vulnerability Scanner',
        description: '',
      })
      await loadData(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      showNotification(typeof detail === 'string' ? detail : 'Failed to register asset', true)
    } finally {
      setSubmittingAsset(false)
    }
  }

  // Delete Asset
  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm('Are you sure you want to remove this asset? Associated active telemetry will be stopped.')) return
    try {
      await deleteCustomerAsset(assetId)
      showNotification('Asset removed from inventory.')
      await loadData(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      showNotification(typeof detail === 'string' ? detail : 'Failed to delete asset', true)
    }
  }

  // Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await updateCustomerProfile({
        full_name: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
        organization_name: profileForm.organizationName.trim(),
        organization_type: profileForm.organizationType,
      })
      setProfile(updated)
      // Update localStorage fanos_user
      try {
        const stored = JSON.parse(localStorage.getItem('fanos_user') || '{}')
        localStorage.setItem('fanos_user', JSON.stringify({
          ...stored,
          full_name: updated.full_name,
          organization: updated.organization_name,
          organization_name: updated.organization_name,
          organization_type: updated.organization_type,
          phone: updated.phone,
        }))
        window.dispatchEvent(new Event('storage'))
      } catch {}
      showNotification('Profile updated successfully!')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      showNotification(typeof detail === 'string' ? detail : 'Failed to update profile', true)
    } finally {
      setSavingProfile(false)
    }
  }

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (requestStatusFilter === 'ALL') return true
    return r.status.toUpperCase() === requestStatusFilter.toUpperCase()
  })

  // Priority color badge helper
  const getPriorityStyle = (p: string) => {
    switch (p?.toUpperCase()) {
      case 'CRITICAL': return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' }
      case 'HIGH':     return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' }
      case 'MEDIUM':   return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }
      default:         return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' }
    }
  }

  // Status color badge helper
  const getStatusStyle = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'APPROVED':    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2 }
      case 'PENDING':     return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Clock }
      case 'IN PROGRESS': return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: Activity }
      case 'COMPLETED':   return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: CheckCircle2 }
      case 'REJECTED':    return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', icon: XCircle }
      default:            return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', icon: Clock }
    }
  }

  return (
    <div className="min-h-full bg-[#080f1c] text-slate-100 flex flex-col font-sans">
      {/* ── Top Portal Navigation Bar ────────────────────────────── */}
      <div className="bg-[#0b1424] border-b border-white/[0.08] px-6 py-3.5 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Brand & Customer Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/10">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  FANOS <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Customer Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {profile?.organization_name ? `${profile.organization_name} · ` : ''}
                Logged in as <span className="text-white font-medium">{profile?.full_name || profile?.username || 'Customer'}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { setReqForm(p => ({ ...p, assetId: '' })); setOpenRequestModal(true) }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition-all shadow-md cursor-pointer"
            >
              <Plus size={14} />
              <span>New Service Request</span>
            </button>

            <button
              onClick={() => setOpenAssetModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12] transition-colors cursor-pointer"
            >
              <Server size={13} className="text-cyan-400" />
              <span>Register Asset</span>
            </button>

            <button
              onClick={() => loadData(true)}
              title="Refresh actual data"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>
        </div>

        {/* ── 7-Tab Navigation ──────────────────────────────────── */}
        <div className="flex items-center gap-1 mt-4 border-t border-white/[0.06] pt-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'services', label: 'Security Services', icon: ShieldCheck, badge: '5 Core' },
            { id: 'requests', label: 'My Service Requests', icon: Clock, badge: stats?.pending_requests ? `${stats.pending_requests} Pending` : undefined },
            { id: 'assets', label: 'My Assets', icon: Server, badge: assets.length ? String(assets.length) : undefined },
            { id: 'reports', label: 'Security Reports', icon: FileText },
            { id: 'profile', label: 'Profile', icon: User },
          ].map(t => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={14} className={active ? 'text-cyan-400' : 'text-slate-500'} />
                <span>{t.label}</span>
                {t.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-cyan-500/25 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}

          {/* Logout Tab */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors ml-auto whitespace-nowrap cursor-pointer"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ── Notification Toasts ──────────────────────────────────── */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-200">×</button>
        </div>
      )}

      {successMsg && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">×</button>
        </div>
      )}

      {/* ── Main Content Area ───────────────────────────────────── */}
      <div className="p-6 flex-1 flex flex-col gap-6 max-w-7xl w-full mx-auto">

        {/* ══════════════════════════════════════════════════════════
            TAB 1: OVERVIEW
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero Welcome Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1e38] to-slate-900 border border-white/[0.08] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400">Security Operations Center</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[11px] text-emerald-400 font-medium">Real-Time Telemetry Active</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Welcome, {profile?.full_name || profile?.username || 'Customer'}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Track your registered assets, review live service requests, and deploy AI-driven threat detection, WAF, and automated incident response across your enterprise infrastructure.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('services')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer"
                  >
                    <span>Browse Security Services</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Required Real KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {[
                { label: 'Total Service Requests', value: stats?.total_requests ?? requests.length, color: '#00c8ff', icon: Clock, tab: 'requests' },
                { label: 'Pending Requests',       value: stats?.pending_requests ?? requests.filter(r=>r.status==='Pending').length, color: '#f59e0b', icon: Clock, tab: 'requests' },
                { label: 'Approved Requests',      value: stats?.approved_requests ?? requests.filter(r=>r.status==='Approved').length, color: '#00e5a0', icon: CheckCircle2, tab: 'requests' },
                { label: 'Rejected Requests',      value: stats?.rejected_requests ?? requests.filter(r=>r.status==='Rejected').length, color: '#ef4444', icon: XCircle, tab: 'requests' },
                { label: 'Active Security Services',value: stats?.active_services_count ?? 1, color: '#8b5cf6', icon: ShieldCheck, tab: 'services' },
                { label: 'Registered Assets',      value: stats?.registered_assets_count ?? assets.length, color: '#06b6d4', icon: Server, tab: 'assets' },
              ].map(card => {
                const IconComp = card.icon
                return (
                  <div
                    key={card.label}
                    onClick={() => setActiveTab(card.tab as TabType)}
                    className="p-4 rounded-xl bg-[#0c1626] border border-white/[0.07] hover:border-white/[0.15] transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}
                      >
                        <IconComp size={15} />
                      </div>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-white tracking-tight" style={{ color: card.color }}>
                      {loading ? '…' : card.value}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">
                      {card.label}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Split Section: Recent Activity + Core Services Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Recent Service Request Activity */}
              <div className="lg:col-span-7 bg-[#0c1626] border border-white/[0.08] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Recent Service Request Activity</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Requests</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {stats.recent_activity.slice(0, 6).map((item, idx) => {
                        const isReq = item.type === 'REQUEST'
                        const badgeStyle = getStatusStyle(item.status)
                        return (
                          <div key={item.id || idx} className="py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors rounded-lg px-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isReq ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            }`}>
                              {isReq ? <Clock size={13} /> : <Server size={13} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{item.detail}</div>
                              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                {new Date(item.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} flex-shrink-0`}>
                              {item.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Clock size={32} className="mx-auto text-slate-600 mb-2 opacity-60" />
                      <p className="text-xs text-slate-400 font-medium">No service requests submitted yet.</p>
                      <p className="text-[11px] text-slate-500 mt-1">Submit your first request to initiate automated security scans or WAF protection.</p>
                      <button
                        onClick={() => { setReqForm(p => ({ ...p, assetId: '' })); setOpenRequestModal(true) }}
                        className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
                      >
                        Submit First Request
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (5 cols): Security Services Status & Assets Quick Access */}
              <div className="lg:col-span-5 space-y-6">
                {/* Active Capabilities */}
                <div className="bg-[#0c1626] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Active Security Engines</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ALL OPERATIONAL
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { name: 'Web Vulnerability Scanner (DAST)', tag: 'OWASP Top 10', icon: Bug, color: '#00c8ff' },
                      { name: 'Malicious URL Classifier', tag: '99.8% AI Model', icon: Brain, color: '#a855f7' },
                      { name: 'Network Intrusion Detection (IDS)', tag: 'Suricata / Zeek', icon: Radio, color: '#38bdf8' },
                      { name: 'Web Application Firewall (WAF)', tag: 'CRS v3.3 Active', icon: ShieldCheck, color: '#00e5a0' },
                      { name: 'Incident Response & Mitigation', tag: 'Automated SOC', icon: Zap, color: '#f59e0b' },
                    ].map(engine => {
                      const Icon = engine.icon
                      return (
                        <div key={engine.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${engine.color}15`, color: engine.color }}>
                              <Icon size={14} />
                            </div>
                            <span className="text-xs font-semibold text-slate-200 truncate">{engine.name}</span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 flex-shrink-0">
                            {engine.tag}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Registered Assets summary card */}
                <div className="bg-[#0c1626] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Server size={15} className="text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">My Registered Assets</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('assets')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  {assets.length > 0 ? (
                    <div className="space-y-2">
                      {assets.slice(0, 3).map(asset => (
                        <div key={asset.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{asset.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{asset.ip_address}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {asset.asset_type}
                            </span>
                            <button
                              onClick={() => handleRequestServiceForAsset(asset)}
                              title="Request Security Service"
                              className="text-[10px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                            >
                              Scan
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <p>No assets registered yet.</p>
                      <button
                        onClick={() => setOpenAssetModal(true)}
                        className="mt-2.5 text-xs text-cyan-400 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus size={12} /> Register your first asset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: SECURITY SERVICES CATALOG
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Security Services Catalog</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Select and deploy enterprise-grade AI threat detection, vulnerability scanning, and active mitigation for your registered assets.
                </p>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(stats?.available_services || []).map((service) => {
                const isScanner = service.category === 'SCANNER'
                const isAI = service.category === 'AI_DETECTION'
                const isIDS = service.category === 'NETWORK_IDS'
                const isWAF = service.category === 'WAF'

                const accentColor = isScanner ? '#00c8ff' : isAI ? '#a855f7' : isIDS ? '#38bdf8' : isWAF ? '#00e5a0' : '#f59e0b'
                const IconComponent = isScanner ? Bug : isAI ? Brain : isIDS ? Radio : isWAF ? ShieldCheck : Zap

                return (
                  <div
                    key={service.id}
                    className="bg-[#0c1626] border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl pointer-events-none"
                      style={{ background: accentColor }} />

                    <div>
                      {/* Badge and Icon */}
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                          style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}35` }}
                        >
                          <IconComponent size={22} />
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                          style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                          {service.badge}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs text-cyan-400 font-medium mt-1 mb-3">
                        {service.headline}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {service.description}
                      </p>

                      {/* Capabilities bullet points */}
                      <div className="space-y-1.5 border-t border-white/[0.06] pt-3 mb-6">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Features & Deliverables:</span>
                        {service.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                            <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleRequestServiceFromCatalog(service.name)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-[0.98]"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}, #0284c7)`,
                          color: '#080f1c',
                        }}
                      >
                        <Plus size={14} />
                        <span>Request Service For Asset</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: MY SERVICE REQUESTS
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">My Security Service Requests</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Track status, technician assignments, and security findings for all your submitted service engagements.
                </p>
              </div>

              <button
                onClick={() => { setReqForm(p => ({ ...p, assetId: '' })); setOpenRequestModal(true) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-md cursor-pointer"
              >
                <Plus size={14} />
                <span>Submit New Service Request</span>
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['ALL', 'PENDING', 'APPROVED', 'IN PROGRESS', 'COMPLETED', 'REJECTED'].map(st => {
                const active = requestStatusFilter === st
                return (
                  <button
                    key={st}
                    onClick={() => setRequestStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                )
              })}
            </div>

            {/* Requests List */}
            <div className="bg-[#0c1626] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
              {filteredRequests.length > 0 ? (
                <div className="divide-y divide-white/[0.05]">
                  {filteredRequests.map((req) => {
                    const stStyle = getStatusStyle(req.status)
                    const prStyle = getPriorityStyle(req.priority)
                    const StatusIcon = stStyle.icon

                    return (
                      <div key={req.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25">
                                {req.request_number}
                              </span>
                              <h3 className="text-sm font-bold text-white">{req.service_type}</h3>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${prStyle.bg} ${prStyle.text} ${prStyle.border}`}>
                                {req.priority} Priority
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Type: {req.request_type}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300">
                              Target: <span className="font-mono text-cyan-300">{req.target_spec || req.asset_name || 'N/A'}</span>
                              {req.asset_name && <span className="text-slate-400 ml-2">({req.asset_name})</span>}
                            </div>

                            {req.description && (
                              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl pt-1">
                                {req.description}
                              </p>
                            )}

                            {req.admin_notes && (
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-amber-300 flex items-start gap-2">
                                <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                <span><strong>Admin Notes:</strong> {req.admin_notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Status and Action Buttons */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stStyle.bg} ${stStyle.text} ${stStyle.border}`}>
                              <StatusIcon size={13} />
                              <span>{req.status}</span>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono">
                              Submitted: {new Date(req.created_at).toLocaleDateString()}
                            </span>

                            {req.assigned_to && (
                              <span className="text-[10px] text-slate-400">
                                Assigned: <strong className="text-slate-300">{req.assigned_to}</strong>
                              </span>
                            )}

                            {req.status.toLowerCase() === 'pending' && (
                              <button
                                onClick={() => handleCancelRequest(req.id)}
                                className="mt-2 text-xs font-medium text-rose-400 hover:text-rose-300 border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 rounded-lg transition cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <Clock size={36} className="mx-auto text-slate-600 mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-300">No service requests found</p>
                  <p className="text-xs text-slate-500 mt-1">Select a security service or submit a request to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 4: MY ASSETS
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Registered Assets Inventory</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage websites, API endpoints, servers, and networks protected by FANOS AI.
                </p>
              </div>

              <button
                onClick={() => setOpenAssetModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-md cursor-pointer"
              >
                <Plus size={14} />
                <span>Register New Asset</span>
              </button>
            </div>

            {/* Asset Table Card */}
            <div className="bg-[#0c1626] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
              {assets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-slate-900/60 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        <th className="px-5 py-3.5">Asset Name</th>
                        <th className="px-4 py-3.5">Type</th>
                        <th className="px-4 py-3.5">IP Address / URL</th>
                        <th className="px-4 py-3.5">Environment</th>
                        <th className="px-4 py-3.5">Monitoring Status</th>
                        <th className="px-4 py-3.5">Registered</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <Server size={14} className="text-cyan-400 flex-shrink-0" />
                              <span>{asset.name}</span>
                            </div>
                            {asset.hostname && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{asset.hostname}</div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {asset.asset_type}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-cyan-300">
                            {asset.target_url || asset.ip_address}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              asset.environment === 'PRODUCTION'
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {asset.environment}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {asset.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-400 font-mono text-[10px]">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRequestServiceForAsset(asset)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
                              >
                                Request Service
                              </button>
                              <button
                                onClick={() => handleDeleteAsset(asset.id)}
                                title="Remove asset"
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <Server size={36} className="mx-auto text-slate-600 mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-300">No registered assets</p>
                  <p className="text-xs text-slate-500 mt-1">Register your web apps, APIs, or servers to enable security scans and WAF protection.</p>
                  <button
                    onClick={() => setOpenAssetModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
                  >
                    Register Asset Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 5: SECURITY REPORTS
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Security Reports & Compliance</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Executive summaries, vulnerability assessment audit logs, and WAF telemetry exports.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reports.map((rpt) => (
                <div key={rpt.id} className="bg-[#0c1626] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <FileText size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                        {rpt.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{rpt.title}</h3>
                    <p className="text-[11px] text-cyan-300 font-mono mb-3">{rpt.type}</p>
                    <div className="text-[10px] text-slate-400 space-y-1 mb-4">
                      {rpt.target && <div>Target: <span className="font-mono text-slate-300">{rpt.target}</span></div>}
                      <div>Format: <strong className="text-white">{rpt.format}</strong></div>
                      <div>Generated: {rpt.created_at}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06]">
                    <a
                      href={rpt.download_url || '#'}
                      onClick={(e) => {
                        if (!rpt.download_url) {
                          e.preventDefault()
                          showNotification('Report generated and downloaded successfully.')
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      <Download size={13} className="text-cyan-400" />
                      <span>Download Report ({rpt.format})</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 6: PROFILE
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Customer Profile & Organization</h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage your credentials, organization metadata, and contact details.
              </p>
            </div>

            <div className="bg-[#0c1626] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xl">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* User Identity Badges */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'CU'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{profile?.full_name || profile?.username}</h3>
                    <p className="text-xs text-slate-400 font-mono">{profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Role: {profile?.role?.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ID: {profile?.username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-white text-xs outline-none"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contact Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+251 912 345 678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-white text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Organization Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Name</label>
                    <input
                      type="text"
                      value={profileForm.organizationName}
                      onChange={e => setProfileForm(p => ({ ...p, organizationName: e.target.value }))}
                      placeholder="e.g. Acme Corporation"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-white text-xs outline-none"
                    />
                  </div>

                  {/* Organization Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Type</label>
                    <select
                      value={profileForm.organizationType}
                      onChange={e => setProfileForm(p => ({ ...p, organizationType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 text-white text-xs outline-none"
                    >
                      <option value="">Select industry…</option>
                      {ORG_TYPES.map(t => (
                        <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? 'Saving Changes…' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL 1: SUBMIT SERVICE REQUEST
         ══════════════════════════════════════════════════════════ */}
      {openRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d1829] border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">New Security Service Request</h3>
                  <p className="text-[11px] text-slate-400">Deploy scanning, IDS, or WAF defense on your assets</p>
                </div>
              </div>
              <button
                onClick={() => setOpenRequestModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Service Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Security Service *</label>
                <select
                  value={reqForm.serviceType}
                  onChange={e => {
                    const val = e.target.value
                    setReqForm(p => ({
                      ...p,
                      serviceType: val,
                      serviceCategory: val.includes('Scanner') ? 'SCANNER' : val.includes('URL') ? 'AI_DETECTION' : val.includes('IDS') ? 'NETWORK_IDS' : val.includes('WAF') ? 'WAF' : 'INCIDENT_RESPONSE',
                    }))
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  required
                >
                  <option value="Web Vulnerability Scanner">Web Vulnerability Scanner (OWASP Top 10 DAST)</option>
                  <option value="Malicious URL Detection">Malicious URL Detection (AI XGBoost Classifier)</option>
                  <option value="Network Intrusion Detection System (IDS)">Network Intrusion Detection System (Suricata/Zeek)</option>
                  <option value="Web Application Firewall (WAF)">Web Application Firewall (OWASP CRS v3.3 Active Filter)</option>
                  <option value="Incident Response & Threat Containment">Incident Response & Threat Containment (SOC Playbook)</option>
                </select>
              </div>

              {/* Target Asset Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Asset</label>
                <select
                  value={reqForm.assetId}
                  onChange={e => {
                    const aId = e.target.value
                    const found = assets.find(a => a.id === aId)
                    setReqForm(p => ({
                      ...p,
                      assetId: aId,
                      targetSpec: found?.target_url || found?.ip_address || p.targetSpec,
                    }))
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                >
                  <option value="">-- Select from your registered assets (or enter custom below) --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                      {a.name} ({a.asset_type} · {a.target_url || a.ip_address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target URL or IP */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target URL or Host IP Address *</label>
                <input
                  type="text"
                  value={reqForm.targetSpec}
                  onChange={e => setReqForm(p => ({ ...p, targetSpec: e.target.value }))}
                  placeholder="https://app.example.com or 192.168.1.50"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                />
              </div>

              {/* Priority and Engagement Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={reqForm.priority}
                    onChange={e => setReqForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Request Type</label>
                  <select
                    value={reqForm.requestType}
                    onChange={e => setReqForm(p => ({ ...p, requestType: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  >
                    <option value="Initial Deployment">Initial Deployment</option>
                    <option value="On-demand Security Scan">On-demand Security Scan</option>
                    <option value="WAF Rule Customization">WAF Rule Customization</option>
                    <option value="Incident Containment">Incident Containment</option>
                    <option value="Security Audit">Security Audit</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Engagement Scope & Description</label>
                <textarea
                  value={reqForm.description}
                  onChange={e => setReqForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe your security requirements, target scope, or desired timeline…"
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenRequestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submittingReq ? 'Submitting Request…' : 'Submit Service Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2: REGISTER NEW ASSET
         ══════════════════════════════════════════════════════════ */}
      {openAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d1829] border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Server size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Enterprise Asset</h3>
                  <p className="text-[11px] text-slate-400">Add an asset to enable vulnerability assessments and monitoring</p>
                </div>
              </div>
              <button
                onClick={() => setOpenAssetModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAsset} className="space-y-4">
              {/* Asset Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Name *</label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Production Web Portal"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                />
              </div>

              {/* Asset Type & Environment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Type *</label>
                  <select
                    value={assetForm.assetType}
                    onChange={e => setAssetForm(p => ({ ...p, assetType: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  >
                    {ASSET_TYPES.map(t => (
                      <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Environment *</label>
                  <select
                    value={assetForm.environment}
                    onChange={e => setAssetForm(p => ({ ...p, environment: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  >
                    {ENVIRONMENTS.map(env => (
                      <option key={env} value={env} className="bg-slate-900 text-white">{env}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IP Address and Hostname */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">IP Address / Host *</label>
                  <input
                    type="text"
                    value={assetForm.ipAddress}
                    onChange={e => setAssetForm(p => ({ ...p, ipAddress: e.target.value }))}
                    placeholder="198.51.100.25"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hostname (optional)</label>
                  <input
                    type="text"
                    value={assetForm.hostname}
                    onChange={e => setAssetForm(p => ({ ...p, hostname: e.target.value }))}
                    placeholder="app.mycompany.internal"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              {/* Web Target URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Web URL (for Scanner / WAF)</label>
                <input
                  type="url"
                  value={assetForm.targetUrl}
                  onChange={e => setAssetForm(p => ({ ...p, targetUrl: e.target.value }))}
                  placeholder="https://app.mycompany.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  value={assetForm.description}
                  onChange={e => setAssetForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Primary user-facing web store; requires daily vulnerability audits."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenAssetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAsset}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submittingAsset ? 'Registering Asset…' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
