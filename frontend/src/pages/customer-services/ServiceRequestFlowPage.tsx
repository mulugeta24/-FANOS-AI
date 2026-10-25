import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck, Radio, Bug, Brain, Bell,
  ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle,
  Server,
  ChevronRight, RefreshCw, FileText
} from 'lucide-react'
import {
  getCustomerAssets,
  getServiceAuthorizations,
  submitWafRequest,
  submitIdsRequest,
  submitScannerRequest,
  submitUrlDetectionRequest,
  submitIncidentResponseRequest,
  type CustomerAsset,
  type ServiceAuthorizationItem,
} from '@/lib/api'

interface ServiceRequestFlowPageProps {
  forcedServiceId?: string
}

const SERVICE_CONFIGS: Record<string, {
  id: string
  name: string
  shortName: string
  category: string
  headline: string
  description: string
  icon: any
  accentColor: string
  badgeText: string
  assetTypePrompt: string
}> = {
  waf: {
    id: 'waf',
    name: 'Web Application Firewall (WAF)',
    shortName: 'WAF',
    category: 'WAF',
    headline: 'Reverse Proxy Defense & OWASP CRS v3.3 Inspection',
    description: 'Inspect HTTP requests, query strings, headers, and payloads against OWASP Core Rule Set v3.3. Prevent SQL Injection, XSS, Path Traversal, and Automated Bad Bots.',
    icon: ShieldCheck,
    accentColor: '#00e5a0',
    badgeText: 'Active Defense',
    assetTypePrompt: 'WEBSITE',
  },
  ids: {
    id: 'ids',
    name: 'Network Intrusion Detection System (IDS)',
    shortName: 'IDS',
    category: 'NETWORK_IDS',
    headline: 'Suricata Deep Packet Inspection & Anomaly Flow Telemetry',
    description: 'Monitor authorized enterprise subnets and network taps in real-time. Detect port scans, brute-force SSH/RDP attempts, exploit payloads, and lateral movement.',
    icon: Radio,
    accentColor: '#38bdf8',
    badgeText: 'Suricata 7.0 + Zeek',
    assetTypePrompt: 'NETWORK',
  },
  'vulnerability-scanner': {
    id: 'vulnerability-scanner',
    name: 'Web Vulnerability Scanner',
    shortName: 'Scanner',
    category: 'SCANNER',
    headline: 'Full-Spectrum Automated DAST Crawler & Vulnerability Assessment',
    description: 'Automated crawler detecting OWASP Top 10 vulnerabilities, SQL Injection, XSS, SSRF, exposed environment files, and missing security headers.',
    icon: Bug,
    accentColor: '#00c8ff',
    badgeText: 'OWASP DAST Engine',
    assetTypePrompt: 'WEBSITE',
  },
  'url-detection': {
    id: 'url-detection',
    name: 'Malicious URL Detection',
    shortName: 'URL Detection',
    category: 'AI_DETECTION',
    headline: 'AI XGBoost Real-Time Phishing & Malware Classification',
    description: 'High-accuracy XGBoost machine learning model (99.8% benchmark accuracy) analyzing lexical, structural, and domain features to identify threats.',
    icon: Brain,
    accentColor: '#a855f7',
    badgeText: '99.8% AI Classifier',
    assetTypePrompt: 'WEBSITE',
  },
  'incident-response': {
    id: 'incident-response',
    name: 'Security Incident Response',
    shortName: 'Incident Response',
    category: 'INCIDENT_RESPONSE',
    headline: '24/7 SOC Threat Containment, Quarantine & Analyst Response',
    description: 'Submit urgent cybersecurity incidents for SOC analysis, automated IP containment, and rapid incident triage across enterprise assets.',
    icon: Bell,
    accentColor: '#f59e0b',
    badgeText: 'SOC Triage',
    assetTypePrompt: 'OTHER',
  },
}

export default function ServiceRequestFlowPage({ forcedServiceId }: ServiceRequestFlowPageProps) {
  const { serviceType } = useParams<{ serviceType?: string }>()
  const navigate = useNavigate()

  const activeServiceId = forcedServiceId || serviceType || 'waf'
  const serviceConfig = SERVICE_CONFIGS[activeServiceId] || SERVICE_CONFIGS.waf
  const Icon = serviceConfig.icon

  // Workflow steps: 1 = Form & Asset details, 2 = Review & Confirm, 3 = Completed / Status
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Customer registered assets for reuse
  const [existingAssets, setExistingAssets] = useState<CustomerAsset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string>('NEW')
  const [currentAuth, setCurrentAuth] = useState<ServiceAuthorizationItem | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // WAF Form Fields
  const [wafForm, setWafForm] = useState({
    websiteName: '',
    domainName: '',
    frontendUrl: '',
    backendAppUrl: '',
    backendApiUrl: '',
    environment: 'PRODUCTION',
    protectionMode: 'BLOCKING',
  })

  // IDS Form Fields
  const [idsForm, setIdsForm] = useState({
    organizationName: '',
    networkName: '',
    networkCidr: '10.100.0.0/24',
    sensorName: 'Sensor-Node-01',
    sensorIp: '10.100.0.15',
    environment: 'PRODUCTION',
    monitoringDescription: '',
  })

  // Vulnerability Scanner Form Fields
  const [scannerForm, setScannerForm] = useState({
    websiteName: '',
    domain: '',
    targetUrl: '',
    applicationName: '',
    environment: 'PRODUCTION',
    backendApiUrl: '',
    authorized: false,
  })

  // URL Detection Form Fields
  const [urlForm, setUrlForm] = useState({
    organizationName: '',
    targetDomains: '',
    environment: 'PRODUCTION',
    description: '',
  })

  // Incident Response Form Fields
  const [irForm, setIrForm] = useState({
    organizationName: '',
    primaryContact: '',
    criticalScope: '',
    environment: 'PRODUCTION',
    severity: 'High',
    incidentCategory: 'Unauthorized Access',
    description: '',
  })

  // Submitted request result
  const [createdRequest, setCreatedRequest] = useState<any | null>(null)

  const loadInitialData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [assetsRes, authRes] = await Promise.allSettled([
        getCustomerAssets(),
        getServiceAuthorizations(),
      ])

      if (assetsRes.status === 'fulfilled') {
        setExistingAssets(assetsRes.value)
      }
      if (authRes.status === 'fulfilled') {
        const auth = authRes.value.authorizations[activeServiceId]
        if (auth) {
          setCurrentAuth(auth)
          if (auth.status === 'PENDING' || auth.status === 'APPROVED') {
            // Already has request, populate info
            setCreatedRequest({
              request_number: auth.request_number || 'REQ-' + activeServiceId.toUpperCase(),
              status: auth.status,
              created_at: auth.created_at,
              target_spec: auth.target_spec,
              admin_notes: auth.admin_notes,
            })
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load asset context:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [activeServiceId])

  // Handle Asset Reuse Selection
  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId)
    if (assetId === 'NEW') return

    const asset = existingAssets.find(a => a.id === assetId)
    if (!asset) return

    const cleanDomain = (asset.hostname || asset.target_url || '').replace(/^https?:\/\//, '').split('/')[0]

    // Pre-populate specific form
    if (activeServiceId === 'waf') {
      setWafForm(prev => ({
        ...prev,
        websiteName: asset.name,
        domainName: cleanDomain || asset.name.toLowerCase().replace(/\s+/g, '-') + '.com',
        frontendUrl: asset.target_url || `https://${cleanDomain || 'app.customer.com'}`,
        backendAppUrl: asset.ip_address ? `http://${asset.ip_address}:8000` : 'http://127.0.0.1:8000',
        environment: asset.environment || 'PRODUCTION',
      }))
    } else if (activeServiceId === 'ids') {
      setIdsForm(prev => ({
        ...prev,
        networkName: asset.name,
        networkCidr: asset.target_url || '10.100.0.0/24',
        sensorIp: asset.ip_address || '10.100.0.15',
        environment: asset.environment || 'PRODUCTION',
      }))
    } else if (activeServiceId === 'vulnerability-scanner') {
      setScannerForm(prev => ({
        ...prev,
        websiteName: asset.name,
        domain: cleanDomain || asset.name.toLowerCase().replace(/\s+/g, '-') + '.com',
        targetUrl: asset.target_url || `https://${cleanDomain || 'app.customer.com'}`,
        applicationName: asset.name,
        environment: asset.environment || 'PRODUCTION',
      }))
    } else if (activeServiceId === 'url-detection') {
      setUrlForm(prev => ({
        ...prev,
        targetDomains: cleanDomain || asset.name,
        environment: asset.environment || 'PRODUCTION',
      }))
    } else if (activeServiceId === 'incident-response') {
      setIrForm(prev => ({
        ...prev,
        criticalScope: asset.name + ' (' + (asset.target_url || asset.ip_address) + ')',
        environment: asset.environment || 'PRODUCTION',
      }))
    }
  }

  // Validation
  const validateForm = () => {
    setErrorMsg('')
    if (activeServiceId === 'waf') {
      if (!wafForm.websiteName.trim()) { setErrorMsg('Website Name is required.'); return false }
      if (!wafForm.domainName.trim()) { setErrorMsg('Domain Name is required.'); return false }
      if (!wafForm.frontendUrl.trim() || !wafForm.frontendUrl.startsWith('http')) {
        setErrorMsg('Valid Frontend URL (https://...) is required.'); return false
      }
      if (!wafForm.backendAppUrl.trim() || !wafForm.backendAppUrl.startsWith('http')) {
        setErrorMsg('Valid Backend Application URL is required.'); return false
      }
    } else if (activeServiceId === 'ids') {
      if (!idsForm.networkName.trim()) { setErrorMsg('Network Name is required.'); return false }
      if (!idsForm.networkCidr.trim() || !idsForm.networkCidr.includes('/')) {
        setErrorMsg('Valid Network CIDR (e.g. 10.100.0.0/24) is required.'); return false
      }
      if (!idsForm.sensorIp.trim()) { setErrorMsg('Sensor IP address is required.'); return false }
    } else if (activeServiceId === 'vulnerability-scanner') {
      if (!scannerForm.websiteName.trim()) { setErrorMsg('Website Name is required.'); return false }
      if (!scannerForm.domain.trim()) { setErrorMsg('Domain Name is required.'); return false }
      if (!scannerForm.targetUrl.trim() || !scannerForm.targetUrl.startsWith('http')) {
        setErrorMsg('Valid Target URL is required.'); return false
      }
      if (!scannerForm.authorized) {
        setErrorMsg('You must certify authorization to conduct vulnerability scans on this target.'); return false
      }
    } else if (activeServiceId === 'url-detection') {
      if (!urlForm.targetDomains.trim()) { setErrorMsg('Target Domain or scope is required.'); return false }
    } else if (activeServiceId === 'incident-response') {
      if (!irForm.criticalScope.trim()) { setErrorMsg('Critical Scope / Affected Target is required.'); return false }
      if (!irForm.description.trim()) { setErrorMsg('Incident description is required.'); return false }
    }
    return true
  }

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setStep(2)
  }

  const handleSubmitRequest = async () => {
    setSubmitting(true)
    setErrorMsg('')

    try {
      let res: any = null
      if (activeServiceId === 'waf') {
        res = await submitWafRequest({
          website_name: wafForm.websiteName.trim(),
          domain_name: wafForm.domainName.trim(),
          frontend_url: wafForm.frontendUrl.trim(),
          backend_app_url: wafForm.backendAppUrl.trim(),
          backend_api_url: wafForm.backendApiUrl.trim() || undefined,
          environment: wafForm.environment,
          protection_mode: wafForm.protectionMode,
        })
      } else if (activeServiceId === 'ids') {
        res = await submitIdsRequest({
          organization_name: idsForm.organizationName.trim() || 'Enterprise Customer',
          network_name: idsForm.networkName.trim(),
          network_cidr: idsForm.networkCidr.trim(),
          sensor_name: idsForm.sensorName.trim(),
          sensor_ip: idsForm.sensorIp.trim(),
          environment: idsForm.environment,
          monitoring_description: idsForm.monitoringDescription.trim(),
        })
      } else if (activeServiceId === 'vulnerability-scanner') {
        res = await submitScannerRequest({
          website_name: scannerForm.websiteName.trim(),
          domain: scannerForm.domain.trim(),
          target_url: scannerForm.targetUrl.trim(),
          application_name: scannerForm.applicationName.trim() || scannerForm.websiteName.trim(),
          environment: scannerForm.environment,
          backend_api_url: scannerForm.backendApiUrl.trim() || undefined,
          authorized: scannerForm.authorized,
        })
      } else if (activeServiceId === 'url-detection') {
        res = await submitUrlDetectionRequest({
          organization_name: urlForm.organizationName.trim() || 'Enterprise Customer',
          target_domains: urlForm.targetDomains.trim(),
          environment: urlForm.environment,
          description: urlForm.description.trim() || undefined,
        })
      } else if (activeServiceId === 'incident-response') {
        res = await submitIncidentResponseRequest({
          organization_name: irForm.organizationName.trim() || 'Enterprise Customer',
          primary_contact: irForm.primaryContact.trim() || undefined,
          critical_scope: irForm.criticalScope.trim(),
          environment: irForm.environment,
          description: `Severity: ${irForm.severity} | Category: ${irForm.incidentCategory} | Scope: ${irForm.criticalScope} | Notes: ${irForm.description}`,
        })
      }

      setCreatedRequest(res)
      setSuccessMsg(`Service request ${res?.request_number || ''} submitted successfully! Status: Pending Review`)
      setStep(3)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit service request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/[0.1] flex items-center justify-center">
          <RefreshCw size={22} className="animate-spin text-cyan-400" />
        </div>
        <div className="text-xs font-mono">Loading security service specifications...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100 animate-fade-in my-4">
      {/* ── Top Header & Breadcrumb ───────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/customer/dashboard"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition cursor-pointer"
            title="Return to Customer Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: `${serviceConfig.accentColor}18`,
              color: serviceConfig.accentColor,
              border: `1px solid ${serviceConfig.accentColor}35`,
            }}
          >
            <Icon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{serviceConfig.name}</h1>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                style={{
                  background: `${serviceConfig.accentColor}15`,
                  color: serviceConfig.accentColor,
                  borderColor: `${serviceConfig.accentColor}30`,
                }}
              >
                {serviceConfig.badgeText}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">{serviceConfig.headline}</p>
              {currentAuth?.status && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                  Current Status: {currentAuth.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Progress Steps */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
            step === 1 ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-bold' : 'bg-slate-900 border-white/[0.05] text-slate-500'
          }`}>
            <span>1. Asset Details</span>
          </div>
          <ChevronRight size={12} className="text-slate-600" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
            step === 2 ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-bold' : 'bg-slate-900 border-white/[0.05] text-slate-500'
          }`}>
            <span>2. Review</span>
          </div>
          <ChevronRight size={12} className="text-slate-600" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
            step === 3 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-slate-900 border-white/[0.05] text-slate-500'
          }`}>
            <span>3. Submission</span>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <XCircle size={18} className="text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">×</button>
        </div>
      )}

      {/* ── Success Banner ──────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">×</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 1: SERVICE SPECIFICATIONS & ASSET INPUT
         ══════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Service Description Box */}
          <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-60 h-60 opacity-15 rounded-full blur-3xl pointer-events-none"
              style={{ background: serviceConfig.accentColor }}
            />
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} style={{ color: serviceConfig.accentColor }} />
              <span>Service Description & Enterprise Scope</span>
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {serviceConfig.description}
            </p>
          </div>

          {/* Asset Selection / Reuse Section */}
          <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server size={16} className="text-cyan-400" />
                  <span>Customer Target Asset</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select an existing registered asset or enter a new asset specification for this request.
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                Asset Reuse Enabled
              </span>
            </div>

            {existingAssets.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Choose from Registered Customer Assets:
                </label>
                <select
                  value={selectedAssetId}
                  onChange={e => handleAssetSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                >
                  <option value="NEW">+ Register New Asset for this Request</option>
                  {existingAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.hostname || a.target_url || a.ip_address} ({a.asset_type}) [{a.environment}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Service-Specific Asset Form */}
            <form onSubmit={handleProceedToReview} className="space-y-4 pt-2">
              {/* ── A. WAF FORM ───────────────────────────── */}
              {activeServiceId === 'waf' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Website Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={wafForm.websiteName}
                        onChange={e => setWafForm(p => ({ ...p, websiteName: e.target.value }))}
                        placeholder="e.g. Corporate Customer Portal"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Domain Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={wafForm.domainName}
                        onChange={e => setWafForm(p => ({ ...p, domainName: e.target.value }))}
                        placeholder="e.g. secure.customer-app.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Frontend URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={wafForm.frontendUrl}
                        onChange={e => setWafForm(p => ({ ...p, frontendUrl: e.target.value }))}
                        placeholder="https://secure.customer-app.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Backend Application URL (Origin) *
                      </label>
                      <input
                        type="text"
                        required
                        value={wafForm.backendAppUrl}
                        onChange={e => setWafForm(p => ({ ...p, backendAppUrl: e.target.value }))}
                        placeholder="http://10.0.1.50:8000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Backend API URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={wafForm.backendApiUrl}
                        onChange={e => setWafForm(p => ({ ...p, backendApiUrl: e.target.value }))}
                        placeholder="http://10.0.1.50:8000/api"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Environment
                      </label>
                      <select
                        value={wafForm.environment}
                        onChange={e => setWafForm(p => ({ ...p, environment: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      >
                        <option value="PRODUCTION">PRODUCTION</option>
                        <option value="STAGING">STAGING</option>
                        <option value="DEVELOPMENT">DEVELOPMENT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        WAF Protection Mode
                      </label>
                      <select
                        value={wafForm.protectionMode}
                        onChange={e => setWafForm(p => ({ ...p, protectionMode: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      >
                        <option value="BLOCKING">Active Blocking (Recommended)</option>
                        <option value="MONITOR">Monitor Only (Log Alerts)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── B. IDS FORM ───────────────────────────── */}
              {activeServiceId === 'ids' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={idsForm.organizationName}
                        onChange={e => setIdsForm(p => ({ ...p, organizationName: e.target.value }))}
                        placeholder="Enterprise Customer Organization"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Network Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={idsForm.networkName}
                        onChange={e => setIdsForm(p => ({ ...p, networkName: e.target.value }))}
                        placeholder="e.g. Enterprise Corporate DMZ"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Network CIDR *
                      </label>
                      <input
                        type="text"
                        required
                        value={idsForm.networkCidr}
                        onChange={e => setIdsForm(p => ({ ...p, networkCidr: e.target.value }))}
                        placeholder="10.100.0.0/24"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Sensor IP Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={idsForm.sensorIp}
                        onChange={e => setIdsForm(p => ({ ...p, sensorIp: e.target.value }))}
                        placeholder="10.100.0.15"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Environment
                      </label>
                      <select
                        value={idsForm.environment}
                        onChange={e => setIdsForm(p => ({ ...p, environment: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      >
                        <option value="PRODUCTION">PRODUCTION</option>
                        <option value="STAGING">STAGING</option>
                        <option value="LAB">LAB</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      Monitoring Scope & Description
                    </label>
                    <textarea
                      rows={2}
                      value={idsForm.monitoringDescription}
                      onChange={e => setIdsForm(p => ({ ...p, monitoringDescription: e.target.value }))}
                      placeholder="Specify monitored subnets, mirror ports, or Suricata inspection details..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ── C. SCANNER FORM ───────────────────────── */}
              {activeServiceId === 'vulnerability-scanner' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Website / Target Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={scannerForm.websiteName}
                        onChange={e => setScannerForm(p => ({ ...p, websiteName: e.target.value }))}
                        placeholder="e.g. Banking Portal Target"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Domain Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={scannerForm.domain}
                        onChange={e => setScannerForm(p => ({ ...p, domain: e.target.value }))}
                        placeholder="app.customer.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Target URL (Scan Endpoint) *
                      </label>
                      <input
                        type="url"
                        required
                        value={scannerForm.targetUrl}
                        onChange={e => setScannerForm(p => ({ ...p, targetUrl: e.target.value }))}
                        placeholder="https://app.customer.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Application Name
                      </label>
                      <input
                        type="text"
                        value={scannerForm.applicationName}
                        onChange={e => setScannerForm(p => ({ ...p, applicationName: e.target.value }))}
                        placeholder="Customer Web Application"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="authConfirm"
                      checked={scannerForm.authorized}
                      onChange={e => setScannerForm(p => ({ ...p, authorized: e.target.checked }))}
                      className="mt-0.5 rounded text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="authConfirm" className="text-xs text-slate-300 cursor-pointer">
                      <strong>Authorization Certification:</strong> I certify that our organization owns or is explicitly authorized to execute security vulnerability assessments and crawlers against this target asset.
                    </label>
                  </div>
                </div>
              )}

              {/* ── D. URL DETECTION FORM ─────────────────── */}
              {activeServiceId === 'url-detection' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={urlForm.organizationName}
                        onChange={e => setUrlForm(p => ({ ...p, organizationName: e.target.value }))}
                        placeholder="Enterprise Customer"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Target Domains / URL Scope *
                      </label>
                      <input
                        type="text"
                        required
                        value={urlForm.targetDomains}
                        onChange={e => setUrlForm(p => ({ ...p, targetDomains: e.target.value }))}
                        placeholder="e.g. corporate-domain.com, mail.corporate-domain.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      Threat Intelligence Feeds & Scope Description
                    </label>
                    <textarea
                      rows={2}
                      value={urlForm.description}
                      onChange={e => setUrlForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Specify phishing feeds, suspicious URL sources, or AI detection requirements..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ── E. INCIDENT RESPONSE FORM ─────────────── */}
              {activeServiceId === 'incident-response' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Organization / Primary Contact
                      </label>
                      <input
                        type="text"
                        value={irForm.primaryContact}
                        onChange={e => setIrForm(p => ({ ...p, primaryContact: e.target.value }))}
                        placeholder="Security Operations Contact (Phone / Email)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Affected Scope / Assets *
                      </label>
                      <input
                        type="text"
                        required
                        value={irForm.criticalScope}
                        onChange={e => setIrForm(p => ({ ...p, criticalScope: e.target.value }))}
                        placeholder="e.g. Production Payment Gateway & Database"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Initial Severity Rating
                      </label>
                      <select
                        value={irForm.severity}
                        onChange={e => setIrForm(p => ({ ...p, severity: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      >
                        <option value="Critical">CRITICAL — Active Breach / Data Loss</option>
                        <option value="High">HIGH — Compromised Asset / Lateral Threat</option>
                        <option value="Medium">MEDIUM — Suspicious Activity / Port Probes</option>
                        <option value="Low">LOW — Policy Violation / Minor Anomaly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        Incident Category
                      </label>
                      <select
                        value={irForm.incidentCategory}
                        onChange={e => setIrForm(p => ({ ...p, incidentCategory: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                      >
                        <option value="Web Application Attack">Web Application Attack</option>
                        <option value="Malware">Malware</option>
                        <option value="Phishing">Phishing</option>
                        <option value="Unauthorized Access">Unauthorized Access</option>
                        <option value="Network Intrusion">Network Intrusion</option>
                        <option value="Suspicious Activity">Suspicious Activity</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      Incident Summary & Scope *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={irForm.description}
                      onChange={e => setIrForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the security event, observed indicators of compromise (IOCs), and required response assistance..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white text-xs focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => navigate('/customer/dashboard')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 transition shadow-lg cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${serviceConfig.accentColor}, #00c8ff)`,
                  }}
                >
                  <span>Review Request Details</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 2: REVIEW & CONFIRMATION
         ══════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="border-b border-white/[0.06] pb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              Step 2 of 3 · Verification
            </span>
            <h2 className="text-xl font-bold text-white mt-1">Review Service Request Specifications</h2>
            <p className="text-xs text-slate-400 mt-1">
              Please verify your submitted asset specifications before saving the request for SOC review.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-white/[0.08] rounded-2xl p-5 space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400 font-sans">Service:</span>
              <span className="text-white font-bold">{serviceConfig.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400 font-sans">Security Engine:</span>
              <span className="text-cyan-400">{serviceConfig.headline}</span>
            </div>

            {activeServiceId === 'waf' && (
              <>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Website Name:</span>
                  <span className="text-white">{wafForm.websiteName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Domain:</span>
                  <span className="text-cyan-300">{wafForm.domainName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Frontend URL:</span>
                  <span className="text-slate-300">{wafForm.frontendUrl}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Backend Origin:</span>
                  <span className="text-slate-300">{wafForm.backendAppUrl}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Mode:</span>
                  <span className="text-emerald-400 font-bold">{wafForm.protectionMode}</span>
                </div>
              </>
            )}

            {activeServiceId === 'ids' && (
              <>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Network Name:</span>
                  <span className="text-white">{idsForm.networkName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Network CIDR:</span>
                  <span className="text-cyan-300">{idsForm.networkCidr}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Sensor IP:</span>
                  <span className="text-slate-300">{idsForm.sensorIp}</span>
                </div>
              </>
            )}

            {activeServiceId === 'vulnerability-scanner' && (
              <>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Target Endpoint:</span>
                  <span className="text-cyan-300">{scannerForm.targetUrl}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Domain:</span>
                  <span className="text-white">{scannerForm.domain}</span>
                </div>
              </>
            )}

            {activeServiceId === 'url-detection' && (
              <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Monitored Domains:</span>
                <span className="text-cyan-300">{urlForm.targetDomains}</span>
              </div>
            )}

            {activeServiceId === 'incident-response' && (
              <>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Severity:</span>
                  <span className="text-rose-400 font-bold">{irForm.severity}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Scope:</span>
                  <span className="text-white">{irForm.criticalScope}</span>
                </div>
              </>
            )}

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-sans">Initial Status:</span>
              <span className="text-amber-400 font-bold">Pending Review (Gated)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
            <strong>Notice:</strong> Submitting this request creates a formal service ticket with status <em>Pending Review</em>. Administrator authorization is required before live engine operations or dedicated dashboards are unlocked.
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Edit</span>
            </button>

            <button
              onClick={handleSubmitRequest}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 transition shadow-lg cursor-pointer disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${serviceConfig.accentColor}, #00c8ff)`,
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Submitting to Backend...</span>
                </>
              ) : (
                <>
                  <span>Submit Request to Administrator</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 3: SUBMISSION RESULT & REQUEST STATUS
         ══════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 opacity-15 rounded-full blur-3xl pointer-events-none"
            style={{ background: serviceConfig.accentColor }}
          />

          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg">
            <Clock size={32} />
          </div>

          <div className="max-w-md mx-auto space-y-2 relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Status: Pending Review
            </span>
            <h2 className="text-2xl font-bold text-white">Service Request Submitted</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your request for <strong>{serviceConfig.name}</strong> has been registered in the backend and routed to the SOC Administrator for review.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-slate-950/80 border border-white/[0.08] rounded-2xl p-4 text-left text-xs font-mono space-y-2">
            <div className="flex justify-between py-1 border-b border-white/[0.05]">
              <span className="text-slate-400 font-sans">Request Number:</span>
              <span className="text-amber-400 font-bold">{createdRequest?.request_number || 'REQ-' + activeServiceId.toUpperCase()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.05]">
              <span className="text-slate-400 font-sans">Service:</span>
              <span className="text-white">{serviceConfig.name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400 font-sans">Review Status:</span>
              <span className="text-amber-400">Under Administrator Review</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button
              onClick={() => navigate('/customer/service-requests')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.15] transition cursor-pointer"
            >
              View Service Requests
            </button>

            <button
              onClick={() => navigate('/customer/dashboard')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer shadow-lg"
            >
              Return to Central Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
