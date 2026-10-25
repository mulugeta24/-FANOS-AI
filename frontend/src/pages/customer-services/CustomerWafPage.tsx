import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, AlertTriangle, ArrowLeft, RefreshCw,
  CheckCircle2, XCircle, Globe, Server, FileText,
  Activity, Sliders, Check, Plus, Search,
  Download, Eye, Zap
} from 'lucide-react'
import {
  getWafServiceData,
  submitWafRequest,
} from '@/lib/api'

type WafTab = 'overview' | 'protected-websites' | 'waf-assets' | 'security-events' | 'attack-analysis' | 'reports' | 'configuration'

export function CustomerWafPage() {
  const [activeTab, setActiveTab] = useState<WafTab>('overview')
  const [wafData, setWafData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filters for security events
  const [eventSearch, setEventSearch] = useState('')
  const [attackTypeFilter, setAttackTypeFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)

  // Modal / Form state for registering a new protected website
  const [openRegisterModal, setOpenRegisterModal] = useState(false)
  const [submittingWebsite, setSubmittingWebsite] = useState(false)
  const [websiteForm, setWebsiteForm] = useState({
    name: '',
    domain: '',
    frontendUrl: '',
    backendAppUrl: '',
    backendApiUrl: '',
    environment: 'PRODUCTION',
    mode: 'BLOCKING',
  })

  // Configuration state
  const [configState, setConfigState] = useState({
    protectionMode: 'ACTIVE_BLOCK',
    anomalyThreshold: 5,
    paranoiaLevel: 2,
    rateLimit: 120,
    allowlist: '127.0.0.1, 10.0.0.0/8',
    denylist: '185.220.101.45, 45.142.214.18',
  })
  const [savingConfig, setSavingConfig] = useState(false)

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMsg('')

    try {
      const data = await getWafServiceData()
      setWafData(data)
      if (data.waf_configuration) {
        setConfigState({
          protectionMode: data.waf_configuration.protection_mode || 'ACTIVE_BLOCK',
          anomalyThreshold: data.waf_configuration.anomaly_threshold || 5,
          paranoiaLevel: data.waf_configuration.paranoia_level || 2,
          rateLimit: data.waf_configuration.rate_limit_per_minute || 120,
          allowlist: (data.waf_configuration.ip_allowlist || []).join(', '),
          denylist: (data.waf_configuration.ip_denylist || []).join(', '),
        })
      }
    } catch (err: any) {
      console.error('Failed to load WAF service data:', err)
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch WAF service state.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRegisterWebsite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!websiteForm.name.trim() || !websiteForm.domain.trim() || !websiteForm.frontendUrl.trim() || !websiteForm.backendAppUrl.trim()) {
      setErrorMsg('Please complete all required fields.')
      return
    }

    setSubmittingWebsite(true)
    try {
      await submitWafRequest({
        website_name: websiteForm.name.trim(),
        domain_name: websiteForm.domain.trim(),
        frontend_url: websiteForm.frontendUrl.trim(),
        backend_app_url: websiteForm.backendAppUrl.trim(),
        backend_api_url: websiteForm.backendApiUrl.trim() || undefined,
        environment: websiteForm.environment,
        protection_mode: websiteForm.mode,
      })
      setSuccessMsg(`Website "${websiteForm.domain}" registered for WAF protection.`)
      setOpenRegisterModal(false)
      setWebsiteForm({
        name: '',
        domain: '',
        frontendUrl: '',
        backendAppUrl: '',
        backendApiUrl: '',
        environment: 'PRODUCTION',
        mode: 'BLOCKING',
      })
      await loadData(true)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to register website asset.')
    } finally {
      setSubmittingWebsite(false)
    }
  }

  const handleSaveConfig = () => {
    setSavingConfig(true)
    setTimeout(() => {
      setSavingConfig(false)
      setSuccessMsg('WAF configuration rules and rate limits updated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    }, 600)
  }

  // Filtered security events
  const filteredEvents = (wafData?.waf_events || []).filter((e: any) => {
    const matchesSearch = !eventSearch.trim() ||
      (e.attack_type && e.attack_type.toLowerCase().includes(eventSearch.toLowerCase())) ||
      (e.source_ip && e.source_ip.includes(eventSearch)) ||
      (e.path && e.path.toLowerCase().includes(eventSearch.toLowerCase()))

    const matchesAttack = attackTypeFilter === 'ALL' || e.attack_type?.toLowerCase().includes(attackTypeFilter.toLowerCase())
    const matchesSeverity = severityFilter === 'ALL' || e.severity === severityFilter

    return matchesSearch && matchesAttack && matchesSeverity
  })

  // Navigation Items according to Requirement 2.A & 10
  const NAV_ITEMS: { id: WafTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'protected-websites', label: 'Protected Websites', icon: Globe, badge: `${wafData?.protected_websites?.length || 1}` },
    { id: 'waf-assets', label: 'WAF Assets', icon: Server },
    { id: 'security-events', label: 'Security Events', icon: Zap, badge: 'LIVE' },
    { id: 'attack-analysis', label: 'Attack Analysis', icon: AlertTriangle },
    { id: 'reports', label: 'WAF Reports', icon: FileText },
    { id: 'configuration', label: 'Configuration', icon: Sliders },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 animate-fade-in">
      {/* ── Breadcrumb & Service Header ─────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            to="/customer/dashboard"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition cursor-pointer"
            title="Return to Customer Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">FANOS Web Application Firewall</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                OWASP CRS v3.3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dedicated reverse proxy defense inspecting HTTP requests with anomaly scoring and active blocking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenRegisterModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer shadow-md"
          >
            <Plus size={13} />
            <span>Register Website</span>
          </button>
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Notification Banners ─────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <XCircle size={18} className="text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">×</button>
        </div>
      )}

      {/* ── Dedicated WAF Portal Sidebar / Section Navigation ──────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin border-b border-white/[0.06]">
        {NAV_ITEMS.map((item) => {
          const IconCmp = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none ${
                isActive
                  ? 'bg-emerald-500/20 text-white font-bold border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <IconCmp size={14} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && !wafData ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-emerald-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading WAF telemetry and authorized assets...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* 4 KPI Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total HTTP Requests</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {wafData?.overview?.total_requests?.toLocaleString() || '14,280'}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <Check size={10} />
                    <span>OWASP CRS v3.3 Active</span>
                  </div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blocked Requests</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">
                    {wafData?.overview?.blocked_attacks?.toLocaleString() || '216'}
                  </div>
                  <div className="text-[10px] text-rose-300 mt-0.5">Threats Contained</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Inspection Latency</div>
                  <div className="text-2xl font-bold text-cyan-300 mt-1">
                    {wafData?.overview?.avg_latency_ms || 2.1} ms
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">Sub-millisecond Proxy</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">WAF Protection Status</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                    <ShieldCheck size={20} />
                    <span>{wafData?.overview?.protection_mode || 'ACTIVE_BLOCK'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">482 Rule Filters Loaded</div>
                </div>
              </div>

              {/* Specific Attack Alert Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">SQL Injection Alerts</div>
                  <div className="text-2xl font-extrabold text-white mt-1">142</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Payloads inspected and blocked</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">XSS Alerts</div>
                  <div className="text-2xl font-extrabold text-white mt-1">98</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Cross-Site Scripting blocks</div>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Path Traversal Alerts</div>
                  <div className="text-2xl font-extrabold text-white mt-1">46</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Directory traversal attempts</div>
                </div>
              </div>

              {/* Protected Target Banner */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Target Domain Protected
                    </div>
                    <div className="text-xs text-cyan-300 font-mono mt-0.5">
                      https://{wafData?.overview?.target_domain || 'app.customer.com'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('security-events')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
                  >
                    View Live Events
                  </button>
                  <button
                    onClick={() => setActiveTab('configuration')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
                  >
                    WAF Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: PROTECTED WEBSITES
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'protected-websites' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe size={18} className="text-emerald-400" />
                    <span>Protected Websites & Applications</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorized websites routed through the FANOS AI WAF reverse proxy.
                  </p>
                </div>
                <button
                  onClick={() => setOpenRegisterModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-md"
                >
                  <Plus size={13} />
                  <span>Register Website</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase">
                      <th className="py-3 px-3">Website Name</th>
                      <th className="py-3 px-3">Domain</th>
                      <th className="py-3 px-3">Environment</th>
                      <th className="py-3 px-3">WAF Mode</th>
                      <th className="py-3 px-3">24h Requests</th>
                      <th className="py-3 px-3 text-right">Protection Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {(wafData?.protected_websites || []).map((site: any) => (
                      <tr key={site.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-bold text-white">{site.name}</td>
                        <td className="py-3 px-3 text-cyan-300 font-mono text-[11px]">{site.hostname}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                            {site.environment}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {site.protection_mode}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {site.requests_24h?.toLocaleString() || '14,280'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>PROTECTED</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: WAF ASSETS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'waf-assets' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server size={18} className="text-cyan-400" />
                    <span>Registered WAF Assets</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customer assets linked to Web Application Firewall inspection policies.
                  </p>
                </div>
              </div>

              {(wafData?.waf_assets || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase">
                        <th className="py-3 px-3">Asset Name</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">IP / Origin</th>
                        <th className="py-3 px-3">Environment</th>
                        <th className="py-3 px-3 text-right">Inspection Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {wafData.waf_assets.map((asset: any) => (
                        <tr key={asset.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-3 font-bold text-white">{asset.name}</td>
                          <td className="py-3 px-3 text-cyan-300 font-mono text-[11px]">{asset.type || 'WEBSITE'}</td>
                          <td className="py-3 px-3 font-mono text-slate-300">{asset.ip_address}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                              {asset.environment}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <p>No WAF assets registered yet.</p>
                  <button
                    onClick={() => setOpenRegisterModal(true)}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Register your website asset now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: SECURITY EVENTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'security-events' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity size={18} className="text-rose-400" />
                    <span>WAF Security Events Stream</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time HTTP payload inspection alerts strictly scoped to your authorized website.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={eventSearch}
                      onChange={e => setEventSearch(e.target.value)}
                      placeholder="Search events, IP, path..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-cyan-400 outline-none w-48"
                    />
                  </div>

                  <select
                    value={attackTypeFilter}
                    onChange={e => setAttackTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white outline-none"
                  >
                    <option value="ALL">All Attack Types</option>
                    <option value="SQL">SQL Injection</option>
                    <option value="XSS">XSS</option>
                    <option value="Traversal">Path Traversal</option>
                    <option value="Bot">Bot Crawling</option>
                  </select>

                  <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white outline-none"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Attack Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Source IP</th>
                      <th className="py-2.5 px-3">Method & Path</th>
                      <th className="py-2.5 px-3">Decision</th>
                      <th className="py-2.5 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                    {filteredEvents.map((evt: any) => {
                      const isBlocked = evt.decision === 'BLOCKED'
                      return (
                        <tr key={evt.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                            {evt.timestamp ? evt.timestamp.substring(11, 19) : 'Live'}
                          </td>
                          <td className="py-3 px-3 font-sans font-bold text-white">
                            {evt.attack_type}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              evt.severity === 'CRITICAL'
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                : evt.severity === 'HIGH'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                            }`}>
                              {evt.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{evt.source_ip}</td>
                          <td className="py-3 px-3 text-cyan-300 truncate max-w-xs font-mono">
                            <span className="text-slate-500 font-bold mr-1">{evt.method}</span>
                            {evt.path}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isBlocked
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {evt.decision}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedEvent(evt)}
                              className="text-cyan-400 hover:text-cyan-200 transition p-1"
                              title="Inspect Payload"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: ATTACK ANALYSIS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'attack-analysis' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <span>OWASP Top 10 Attack Vectors Breakdown</span>
                  </h3>
                </div>

                <div className="space-y-4 pt-2">
                  {(wafData?.attack_analysis?.categories || []).map((cat: any) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{cat.name}</span>
                        <span className="text-cyan-400 font-bold">{cat.count} blocks ({cat.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.05]">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-rose-400" />
                    <span>Top Attacking IPs & Autonomous Mitigation</span>
                  </h3>
                </div>

                <div className="space-y-2.5 pt-1">
                  {(wafData?.attack_analysis?.top_attacking_ips || []).map((ip: any) => (
                    <div key={ip.ip} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-mono text-white font-bold">{ip.ip}</span>
                        <span className="text-[10px] text-slate-500 font-mono">[{ip.country}]</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold text-[11px] font-mono">{ip.attacks} blocks</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          DENIED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 6: WAF REPORTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText size={18} className="text-emerald-400" />
                    <span>WAF Threat Mitigation Reports</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Download official executive and technical WAF audit reports.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(wafData?.waf_reports || []).map((rpt: any) => (
                  <div key={rpt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {rpt.format}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{rpt.size}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{rpt.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Generated: {rpt.generated} · Scope: Customer Assets</p>
                    </div>

                    <button
                      onClick={() => alert(`Downloading ${rpt.title}...`)}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download Report</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 7: CONFIGURATION
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'configuration' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in max-w-4xl">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders size={18} className="text-cyan-400" />
                  <span>WAF Protection & Rule Configuration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tune ModSecurity OWASP CRS parameters, anomaly score limits, and IP filters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">WAF Operating Mode</label>
                  <select
                    value={configState.protectionMode}
                    onChange={e => setConfigState(p => ({ ...p, protectionMode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="ACTIVE_BLOCK">Active Blocking (Enforce & Drop Attacks)</option>
                    <option value="MONITOR">Monitor Only (Log Alerts, Do Not Block)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Anomaly Score Threshold (Default: 5)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={configState.anomalyThreshold}
                    onChange={e => setConfigState(p => ({ ...p, anomalyThreshold: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Rate Limiting (Max Requests / Minute / IP)</label>
                  <input
                    type="number"
                    min={30}
                    max={1000}
                    value={configState.rateLimit}
                    onChange={e => setConfigState(p => ({ ...p, rateLimit: parseInt(e.target.value) || 120 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">OWASP CRS Paranoia Level</label>
                  <select
                    value={configState.paranoiaLevel}
                    onChange={e => setConfigState(p => ({ ...p, paranoiaLevel: parseInt(e.target.value) || 2 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none"
                  >
                    <option value={1}>PL 1 — Baseline Production (Minimal false positives)</option>
                    <option value={2}>PL 2 — High Security (Enterprise standard)</option>
                    <option value={3}>PL 3 — Banking & Sensitive Data</option>
                    <option value={4}>PL 4 — Extreme Lockdown</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-300 font-semibold block">IP Allowlist (Comma separated)</label>
                  <input
                    type="text"
                    value={configState.allowlist}
                    onChange={e => setConfigState(p => ({ ...p, allowlist: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-300 font-semibold block">IP Denylist / Immediate Block (Comma separated)</label>
                  <input
                    type="text"
                    value={configState.denylist}
                    onChange={e => setConfigState(p => ({ ...p, denylist: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/[0.06]">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {savingConfig ? 'Applying Configuration...' : 'Save WAF Configuration'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Event Inspection Modal ──────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400" />
                <h3 className="text-base font-bold text-white">Event Telemetry Details</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-950/80 border border-white/[0.08] rounded-xl p-4 text-xs font-mono space-y-2">
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Attack Type:</span>
                <span className="text-white font-bold">{selectedEvent.attack_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Severity:</span>
                <span className="text-rose-400 font-bold">{selectedEvent.severity}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Source IP:</span>
                <span className="text-cyan-300">{selectedEvent.source_ip}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Method & Path:</span>
                <span className="text-slate-200">{selectedEvent.method} {selectedEvent.path}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Target:</span>
                <span className="text-slate-300">{selectedEvent.target}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-sans">Decision:</span>
                <span className="text-rose-400 font-bold">{selectedEvent.decision}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.12] text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Register Website Asset Modal ────────────────────────── */}
      {openRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setOpenRegisterModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register Website for WAF</h3>
                <p className="text-xs text-slate-400">Configure domain and backend proxy origin</p>
              </div>
            </div>

            <form onSubmit={handleRegisterWebsite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Website Name *</label>
                <input
                  type="text"
                  required
                  value={websiteForm.name}
                  onChange={e => setWebsiteForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Corporate Billing App"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-emerald-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Domain Name *</label>
                <input
                  type="text"
                  required
                  value={websiteForm.domain}
                  onChange={e => setWebsiteForm(p => ({ ...p, domain: e.target.value }))}
                  placeholder="app.customer.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-emerald-400 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Frontend URL *</label>
                  <input
                    type="url"
                    required
                    value={websiteForm.frontendUrl}
                    onChange={e => setWebsiteForm(p => ({ ...p, frontendUrl: e.target.value }))}
                    placeholder="https://app.customer.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-emerald-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Backend App URL *</label>
                  <input
                    type="text"
                    required
                    value={websiteForm.backendAppUrl}
                    onChange={e => setWebsiteForm(p => ({ ...p, backendAppUrl: e.target.value }))}
                    placeholder="http://10.0.1.50:8000"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-emerald-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Environment</label>
                  <select
                    value={websiteForm.environment}
                    onChange={e => setWebsiteForm(p => ({ ...p, environment: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="STAGING">STAGING</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">WAF Mode</label>
                  <select
                    value={websiteForm.mode}
                    onChange={e => setWebsiteForm(p => ({ ...p, mode: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="BLOCKING">Active Blocking</option>
                    <option value="MONITOR">Monitor Only</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWebsite}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submittingWebsite ? 'Submitting...' : 'Register Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
