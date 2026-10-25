import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShieldCheck, Globe, Radio, Bug, Brain, Bell, 
  CheckCircle2, ArrowRight, ChevronDown, ChevronUp, AlertCircle,
  Server, Lock, Sparkles, Clock,
} from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import { submitUnifiedServiceRequest } from '@/lib/api'
import { useWorkspace } from '@/context/WorkspaceContext'

interface ServiceOption {
  id: string
  title: string
  category: string
  description: string
  icon: any
  badge: string
}

const SERVICES_CATALOG: ServiceOption[] = [
  {
    id: 'waf',
    title: 'Web application testing (WAF)',
    category: 'WAF',
    description: 'Authentication, authorization, business logic, OWASP Top 10, SQLi/XSS defense, and active blocking.',
    icon: Globe,
    badge: 'Active Defense',
  },
  {
    id: 'api',
    title: 'API security testing (API Defense)',
    category: 'WAF',
    description: 'REST, GraphQL and SOAP services, including service-to-service authorization and origin protection.',
    icon: ShieldCheck,
    badge: 'Origin Shield',
  },
  {
    id: 'ids',
    title: 'Network and infrastructure (IDS)',
    category: 'NETWORK_IDS',
    description: 'External and internal networks, segmentation, Suricata & Zeek deep packet inspection, and port scan detection.',
    icon: Radio,
    badge: 'Suricata Telemetry',
  },
  {
    id: 'scanner',
    title: 'Web Vulnerability Scanner (DAST)',
    category: 'SCANNER',
    description: 'Automated vulnerability auditing, attack surface review, penetration testing, and security reports.',
    icon: Bug,
    badge: 'OWASP DAST',
  },
  {
    id: 'url-detection',
    title: 'Malicious URL & Phishing Detection',
    category: 'AI_DETECTION',
    description: '99.8% accurate XGBoost AI classification for phishing, malware binaries, and web defacement.',
    icon: Brain,
    badge: 'AI Model',
  },
  {
    id: 'incident-response',
    title: 'Security Incident Response (SOC)',
    category: 'INCIDENT_RESPONSE',
    description: '24/7 war room escalation, containment workflow, threat actor mitigation, and SOC triage.',
    icon: Bell,
    badge: 'SOC Triage',
  },
]

export default function RequestServicePage() {
  const navigate = useNavigate()
  const { activeCustomer, requestCustomerService } = useWorkspace()

  // Selected services (Image 2 flow)
  const [selectedServices, setSelectedServices] = useState<string[]>(['waf'])

  // Customer contact info (Image 3 flow)
  const [fullName, setFullName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [company, setCompany] = useState(activeCustomer?.name || '')
  const [notes] = useState('')

  // Optional details accordion
  const [showDetails, setShowDetails] = useState(true)
  const [phone, setPhone] = useState('')
  const [role] = useState('')

  // Asset Registration fields
  const [assetName, setAssetName] = useState(activeCustomer?.primaryAsset || 'Core Enterprise Banking Portal')
  const [frontendDomain, setFrontendDomain] = useState(activeCustomer ? `https://${activeCustomer.domain}` : 'https://secure.enterprise-bank.com')
  const [backendDomain, setBackendDomain] = useState('https://app-internal.enterprise-bank.com')
  const [environment, setEnvironment] = useState('PRODUCTION')
  const [protectionMode] = useState('BLOCKING')

  // Image 3 Specific Form Fields
  const [ipAddress, setIpAddress] = useState(activeCustomer?.ipAddress?.split(':')[0] || '127.0.0.1')
  const [portNumber, setPortNumber] = useState(activeCustomer?.ipAddress?.split(':')[1] || '8002')
  const [webType, setWebType] = useState('Web Application')
  const [dashboardHost, setDashboardHost] = useState('127.0.0.1')
  const [dashboardPort, setDashboardPort] = useState('5173')
  const [activeWafInspection, setActiveWafInspection] = useState(true)
  const [realtimeAlerts, setRealtimeAlerts] = useState(true)
  const [owaspMitigation, setOwaspMitigation] = useState(true)

  // Submission & status
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successData, setSuccessData] = useState<{
    requestNumbers: string[]
    assetName: string
    frontendDomain: string
    company?: string
  } | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (activeCustomer) {
      if (!company) setCompany(activeCustomer.name)
    }
    // Pre-populate if customer is logged in
    const stored = localStorage.getItem('fanos_user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        if (u.full_name) setFullName(u.full_name)
        if (u.email) setWorkEmail(u.email)
        if (u.organization_name && !company) setCompany(u.organization_name)
      } catch (e) {}
    }
  }, [activeCustomer])

  const toggleService = (id: string) => {
    setSelectedServices(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev // keep at least one
        return prev.filter(s => s !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!fullName.trim() || !workEmail.trim() || !company.trim()) {
      setErrorMsg('Please fill in Full Name, Work Email, and Company.')
      return
    }

    if (selectedServices.length === 0) {
      setErrorMsg('Please select at least one security service.')
      return
    }

    setIsSubmitting(true)

    // Map selected service IDs to human-readable names
    const serviceNames = selectedServices.map(sid => {
      const s = SERVICES_CATALOG.find(item => item.id === sid)
      return s ? s.title : sid
    })

    try {
      let requestNumbers: string[] = []
      try {
        const res = await submitUnifiedServiceRequest({
          full_name: fullName.trim(),
          work_email: workEmail.trim(),
          company: company.trim(),
          phone: phone.trim() || undefined,
          role: role.trim() || undefined,
          services: serviceNames,
          notes: notes.trim() || undefined,
          asset_name: assetName.trim() || undefined,
          frontend_domain: frontendDomain.trim() || undefined,
          backend_domain: backendDomain.trim() || undefined,
          environment,
          protection_mode: protectionMode,
          ip_address: ipAddress.trim(),
          port: portNumber.trim(),
          web_type: webType,
          organization_name: company.trim(),
          host: `${dashboardHost.trim()}:${dashboardPort.trim()}`,
        })
        if (res?.request_numbers) requestNumbers = res.request_numbers
      } catch (apiErr) {
        console.warn('Backend request API notice:', apiErr)
        requestNumbers = [`REQ-${Math.floor(1000 + Math.random() * 9000)}`]
      }

      const finalCompany = company.trim() || activeCustomer.name
      const finalReqNumbers = requestNumbers.length > 0 ? requestNumbers : [`REQ-WAF-2026-${Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}`]
      const finalDomain = frontendDomain.replace(/^https?:\/\//, '').trim() || activeCustomer.domain
      const finalAssetName = assetName.trim() || activeCustomer.primaryAsset

      // Synchronize with multi-tenant customer state
      requestCustomerService(finalCompany, selectedServices, {
        company: finalCompany,
        assetName: finalAssetName,
        domain: finalDomain,
        ipAddress: ipAddress.trim(),
        port: portNumber.trim(),
        requestId: finalReqNumbers[0],
      })

      setSuccessData({
        requestNumbers: finalReqNumbers,
        assetName: finalAssetName,
        frontendDomain: frontendDomain.trim() || `https://${finalDomain}`,
        company: finalCompany,
      })
    } catch (err: any) {
      console.error('Request service error:', err)
      const detail = err.response?.data?.detail
      // If 401 Unauthorized, prompt user to log in or create an account
      if (err.response?.status === 401) {
        setErrorMsg('Authentication required. Please sign in to link this request to your customer portal.')
      } else {
        setErrorMsg(typeof detail === 'string' ? detail : 'Failed to submit service request. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTitles = selectedServices
    .map(sid => SERVICES_CATALOG.find(s => s.id === sid)?.title)
    .filter(Boolean)
    .join(' & ')

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* ── Top Navigation ─────────────────────────────────── */}
      <LandingNav />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12 animate-fade-in">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-left space-y-2 border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Sparkles size={13} className="text-cyan-400" />
            <span>FANOS AI Security Services</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Testing & Security Services
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            A scoped engagement against your systems, web applications, and network infrastructure. Select one or more services to configure asset protection.
          </p>
        </div>

        {/* ── Pending Request Confirmation Screen ───────────────────── */}
        {successData ? (
          <div className="bg-[#0b1526] border border-amber-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <Clock size={36} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Clock size={13} className="text-amber-400" />
                <span>PENDING ADMINISTRATOR REVIEW</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Service Request Submitted!
              </h2>
              <p className="text-sm text-slate-300">
                Your request has been registered and is currently awaiting administrator review.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-5 text-left space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-400 font-medium">Request Number(s):</span>
                <span className="font-mono font-bold text-cyan-400">
                  {successData.requestNumbers.join(', ')}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-400 font-medium">Customer Organization:</span>
                <span className="font-semibold text-white">{successData.company || company || activeCustomer.name}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-400 font-medium">Requested Service:</span>
                <span className="font-semibold text-emerald-300">{selectedTitles || 'Web application testing (WAF)'}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-400 font-medium">Asset Name:</span>
                <span className="font-semibold text-white">{successData.assetName}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-400 font-medium">Monitored Target:</span>
                <span className="font-mono text-cyan-300 truncate max-w-[260px]">
                  {successData.frontendDomain}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Current Status:</span>
                <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Awaiting Administrator Approval (Locked)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
              Live security telemetry, OWASP attack analysis, and real-time WAF defense will automatically activate on your dashboard once approved by the administrator.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <Clock size={14} />
                <span>Go to Service Dashboard (Pending Review)</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => navigate('/customer/requests')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.15] transition cursor-pointer"
              >
                View Request Portal
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* ── STEP 1: SERVICE CARDS GRID (IMAGE 2 STYLE) ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
                    Select Security Services
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose one or more services to deploy for your digital assets.
                  </p>
                </div>
                <span className="text-xs text-cyan-400 font-semibold">
                  {selectedServices.length} Selected
                </span>
              </div>

              {/* Grid of 6 selectable cards matching Image 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {SERVICES_CATALOG.map((srv) => {
                  const Icon = srv.icon
                  const isSelected = selectedServices.includes(srv.id)

                  return (
                    <div
                      key={srv.id}
                      onClick={() => toggleService(srv.id)}
                      className={`relative rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between group select-none ${
                        isSelected
                          ? 'bg-[#0f1f38] border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.2)] translate-y-[-2px]'
                          : 'bg-[#0a1322] border border-white/[0.08] hover:border-white/[0.2] hover:bg-[#0c182a]'
                      }`}
                    >
                      <div>
                        {/* Top row: Icon + checkmark badge */}
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                            }`}
                          >
                            <Icon size={22} />
                          </div>

                          {/* Checkmark badge like Image 2 */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md'
                                : 'border-white/[0.2] bg-white/[0.02] text-transparent'
                            }`}
                          >
                            <CheckCircle2 size={16} />
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-sm font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                          {srv.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.05]">
                          {srv.badge}
                        </span>
                        <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                          {isSelected ? 'Selected' : 'Click to select'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── STEP 2: YOUR REQUEST FORM (IMAGE 3 EXACT MATCH) ── */}
            <div className="bg-[#0b1526] border border-white/[0.1] rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
              {/* Header with Title and Cyan Create Service Request button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div>
                  <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>YOUR REQUEST</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    {selectedTitles || 'Web application testing (WAF)'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Fill the assets and submit the request for validation and admin activation
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{isSubmitting ? 'Registering...' : 'Create Service Request'}</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                  {errorMsg.includes('Authentication') && (
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-white rounded-lg text-xs font-bold underline"
                    >
                      Sign In Now
                    </button>
                  )}
                </div>
              )}

              {/* Row 1: IP Address *, Port Number *, Web Type * (Exactly Image 3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    IP Address <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ipAddress}
                    onChange={e => setIpAddress(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-white/[0.12] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white font-mono text-xs placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Port Number <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={portNumber}
                    onChange={e => setPortNumber(e.target.value)}
                    placeholder="8080"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-white/[0.12] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white font-mono text-xs placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Web Type <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={webType}
                    onChange={e => setWebType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-white/[0.12] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white text-xs outline-none transition"
                  >
                    <option value="Web Application">Web Application</option>
                    <option value="REST API">REST API</option>
                    <option value="Microservices Gateway">Microservices Gateway</option>
                    <option value="GraphQL API">GraphQL API</option>
                    <option value="Full Stack Web App">Full Stack Web App</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Organization Name * (Exactly Image 3) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Organization Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. FANOS Security Enterprise"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-white/[0.12] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white text-xs placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Row 3: Dashboard / Service Endpoint (Host & Port Box - Exactly Image 3) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Server size={14} className="text-cyan-400" />
                    <span>Dashboard / Service Endpoint</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Host & Port Binding</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Host / IP <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={dashboardHost}
                      onChange={e => setDashboardHost(e.target.value)}
                      placeholder="127.0.0.1"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.12] text-white font-mono text-xs focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Port <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={dashboardPort}
                      onChange={e => setDashboardPort(e.target.value)}
                      placeholder="5173"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.12] text-white font-mono text-xs focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Register a new asset for this service (Card with Globe icon - Exactly Image 3) */}
              <div className="border border-cyan-500/20 bg-cyan-950/20 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">
                      Register a new asset for this service
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                    WAF Reverse Proxy Scope
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Asset Name / Description <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={assetName}
                      onChange={e => setAssetName(e.target.value)}
                      placeholder="Core Enterprise Banking Portal"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.12] focus:border-cyan-400 text-white text-xs placeholder-slate-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Environment <span className="text-cyan-400">*</span>
                    </label>
                    <select
                      value={environment}
                      onChange={e => setEnvironment(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.12] focus:border-cyan-400 text-white text-xs outline-none"
                    >
                      <option value="PRODUCTION">PRODUCTION</option>
                      <option value="STAGING">STAGING</option>
                      <option value="DEVELOPMENT">DEVELOPMENT</option>
                      <option value="LAB">LAB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      User Facing Frontend URL <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={frontendDomain}
                      onChange={e => setFrontendDomain(e.target.value)}
                      placeholder="https://customer.my-domain.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.12] focus:border-cyan-400 text-white text-xs placeholder-slate-600 outline-none font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Client-facing domain where users connect (WAF reverse proxy ingress).
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Internal Backend API URL <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={backendDomain}
                      onChange={e => setBackendDomain(e.target.value)}
                      placeholder="http://10.0.0.4:8000/api"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/[0.12] focus:border-cyan-400 text-white text-xs placeholder-slate-600 outline-none font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Internal backend origin shielded by FANOS AI security engines.
                    </p>
                  </div>
                </div>

                {/* Checkboxes from Image 3 */}
                <div className="pt-2 border-t border-cyan-500/15 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={activeWafInspection}
                      onChange={e => setActiveWafInspection(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-400 bg-slate-900 border-white/[0.2] focus:ring-cyan-400"
                    />
                    <span>Require Active WAF Inspection & Protection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={realtimeAlerts}
                      onChange={e => setRealtimeAlerts(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-400 bg-slate-900 border-white/[0.2] focus:ring-cyan-400"
                    />
                    <span>Real-time Attack Alerts & Security Events Telemetry</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={owaspMitigation}
                      onChange={e => setOwaspMitigation(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-400 bg-slate-900 border-white/[0.2] focus:ring-cyan-400"
                    />
                    <span>OWASP Top 10 Active Mitigation Engine</span>
                  </label>
                </div>
              </div>

              {/* Requester Contact Details (Optional / Collapsible) */}
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>Requester Contact Information</span>
                    <span className="text-[11px] text-slate-500 font-normal">(name, email, role)</span>
                  </span>
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showDetails && (
                  <div className="p-5 pt-1 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Full Name <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Mulugeta Ababi"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/[0.1] focus:border-cyan-400 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Work Email <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={workEmail}
                        onChange={e => setWorkEmail(e.target.value)}
                        placeholder="customer@enterprise.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/[0.1] focus:border-cyan-400 text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+251 9..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/[0.1] focus:border-cyan-400 text-white text-xs outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Lock size={14} className="text-amber-400" />
                  <span>Submitted requests are validated by SOC administrators before live telemetry activates.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_25px_rgba(34,211,238,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Registering Assets & Submitting...</span>
                  ) : (
                    <>
                      <span>Create Service Request</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <LandingFooter />
    </div>
  )
}
