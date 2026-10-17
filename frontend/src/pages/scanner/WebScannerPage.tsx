/**
 * FANOS AI — Enterprise Web Vulnerability Scanner (DAST & Recon Engine)
 * ====================================================================
 * Dedicated cybersecurity assessment studio for automated scope-controlled
 * web vulnerability scanning, OWASP Top 10 auditing, infrastructure mapping,
 * technology fingerprinting, interactive UI analysis, and executive PDF/JSON reporting.
 */
import { useState, useEffect, useMemo } from 'react'
import {
  Globe, Shield, AlertTriangle, CheckCircle, RefreshCw, Lock, Bug,
  FileText, Download, Clock, ExternalLink, Search, ChevronDown,
  ChevronRight, Terminal, Activity, Copy, Check, ShieldAlert,
  AlertOctagon, Play, StopCircle, ArrowUpRight, Database,
  Cpu, Server, Code, Eye, Flame, ShieldCheck, Zap
} from 'lucide-react'
import {
  validateScannerTarget, startScannerJob, getScannerJobs, getScannerJobDetails,
  getScannerJobFindings, getScannerJobAssets, getScannerJobUrls, getScannerJobTechnologies,
  cancelScannerJob, downloadScannerPdfReport, downloadScannerJsonReport
} from '@/lib/api'

interface ScanJobSummary {
  id: string
  target_url: string
  target_domain?: string
  status: string
  progress: number
  current_phase?: string
  duration_seconds?: number
  created_at?: string
  stats?: {
    assets?: number
    urls?: number
    apis?: number
    technologies?: number
    critical?: number
    high?: number
    medium?: number
    low?: number
    informational?: number
  }
}

interface FindingItem {
  id: string
  title: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
  confidence?: string
  category?: string
  affected_asset?: string
  affected_url?: string
  http_method?: string
  parameter?: string
  description?: string
  impact?: string
  remediation?: string
  references?: Array<{ title: string; url: string }>
  evidence?: any
  scanner_module?: string
  status?: string
}

interface AssetRecord {
  id?: number
  asset_type: string
  asset_value: string
  metadata?: any
}

interface TechnologyRecord {
  id?: number
  category: string
  name: string
  version?: string
  confidence?: string
  metadata?: any
}

interface UrlRecord {
  id?: number
  url: string
  status_code: number
  content_type?: string
  response_time_ms?: number
  in_scope?: boolean
}

const SEVERITY_CONFIG = {
  Critical: {
    bg: 'bg-red-500/10 border-red-500/30 text-red-400',
    badge: 'bg-red-500 text-white',
    pill: 'border-red-500/40 text-red-400 bg-red-950/20',
    bar: 'bg-red-500',
    border: 'border-l-red-500',
  },
  High: {
    bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    badge: 'bg-orange-500 text-white',
    pill: 'border-orange-500/40 text-orange-400 bg-orange-950/20',
    bar: 'bg-orange-500',
    border: 'border-l-orange-500',
  },
  Medium: {
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    badge: 'bg-amber-500 text-slate-900',
    pill: 'border-amber-500/40 text-amber-400 bg-amber-950/20',
    bar: 'bg-amber-500',
    border: 'border-l-amber-500',
  },
  Low: {
    bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    badge: 'bg-blue-500 text-white',
    pill: 'border-blue-500/40 text-blue-400 bg-blue-950/20',
    bar: 'bg-blue-500',
    border: 'border-l-blue-500',
  },
  Informational: {
    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    badge: 'bg-emerald-500 text-slate-900',
    pill: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20',
    bar: 'bg-emerald-500',
    border: 'border-l-emerald-500',
  },
}

export default function WebScannerPage() {
  // ── Input & Configuration State ─────────────────────────────
  const [targetUrl, setTargetUrl] = useState('https://example.com')
  const [scanProfile, setScanProfile] = useState<'fast' | 'standard' | 'deep'>('standard')
  const [allowPrivate, setAllowPrivate] = useState(false)
  const [operatorName, setOperatorName] = useState('SOC Security Analyst')
  const [maxDepth, setMaxDepth] = useState(2)
  const [maxUrls, setMaxUrls] = useState(30)
  const [showAdvancedScope, setShowAdvancedScope] = useState(false)

  // ── Target Pre-Flight Validation ────────────────────────────
  const [isValidatingTarget, setIsValidatingTarget] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    normalized_url?: string
    domain?: string
    resolved_ips?: string[]
    scheme?: string
    error?: string
  } | null>(null)

  // ── Active Scan State ───────────────────────────────────────
  const [isLaunching, setIsLaunching] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<ScanJobSummary | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // ── Analysis Results Data ───────────────────────────────────
  const [activeTab, setActiveTab] = useState<'findings' | 'assets' | 'technologies' | 'urls' | 'attacks' | 'history'>('findings')
  const [findings, setFindings] = useState<FindingItem[]>([])
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [technologies, setTechnologies] = useState<TechnologyRecord[]>([])
  const [crawledUrls, setCrawledUrls] = useState<UrlRecord[]>([])
  const [recentJobs, setRecentJobs] = useState<ScanJobSummary[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // ── Filtering & UI Interaction ──────────────────────────────
  const [searchFilter, setSearchFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [isDownloadingJson, setIsDownloadingJson] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Initial load: Fetch recent scan jobs
  useEffect(() => {
    loadRecentJobs()
  }, [])

  const loadRecentJobs = async () => {
    try {
      const jobs = await getScannerJobs(30)
      setRecentJobs(jobs || [])
      // If no active job yet and jobs exist, select the most recent one
      if (!activeJobId && jobs && jobs.length > 0) {
        selectJob(jobs[0].id)
      }
    } catch (err) {
      console.error('Failed to load recent scan jobs:', err)
    }
  }

  // Select a job to inspect
  const selectJob = async (jobId: string) => {
    setActiveJobId(jobId)
    setLoadingData(true)
    try {
      const [jobData, fData, aData, tData, uData] = await Promise.all([
        getScannerJobDetails(jobId).catch(() => null),
        getScannerJobFindings(jobId).catch(() => []),
        getScannerJobAssets(jobId).catch(() => []),
        getScannerJobTechnologies(jobId).catch(() => []),
        getScannerJobUrls(jobId).catch(() => []),
      ])

      if (jobData) {
        setActiveJob(jobData)
        if (jobData.target_url) setTargetUrl(jobData.target_url)
      }
      setFindings(fData || [])
      setAssets(aData || [])
      setTechnologies(tData || [])
      setCrawledUrls(uData || [])
    } catch (err) {
      console.error('Error loading job details:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // Polling for active running job
  useEffect(() => {
    if (!activeJobId) return
    if (activeJob && (activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cancelled')) {
      return
    }

    const interval = setInterval(async () => {
      try {
        const details = await getScannerJobDetails(activeJobId)
        if (details) {
          setActiveJob(details)
          if (details.status === 'completed' || details.status === 'failed' || details.status === 'cancelled') {
            // Scan finished: Refresh all sub-tables
            selectJob(activeJobId)
            loadRecentJobs()
            clearInterval(interval)
          }
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJobId, activeJob?.status])

  // SSRF Pre-flight Validation
  const handleValidateTarget = async () => {
    if (!targetUrl.trim()) return
    setIsValidatingTarget(true)
    setValidationResult(null)
    setStatusMessage(null)
    try {
      const res = await validateScannerTarget(targetUrl.trim(), allowPrivate)
      setValidationResult(res)
    } catch (err: any) {
      setValidationResult({
        valid: false,
        error: err.response?.data?.detail || 'Target validation failed.',
      })
    } finally {
      setIsValidatingTarget(false)
    }
  }

  // Launch Assessment Scan
  const handleStartScan = async () => {
    if (!targetUrl.trim()) return
    setIsLaunching(true)
    setStatusMessage(null)
    setValidationResult(null)

    const depth = scanProfile === 'deep' ? 4 : scanProfile === 'standard' ? 2 : 1
    const urls = scanProfile === 'deep' ? 80 : scanProfile === 'standard' ? 30 : 15

    try {
      const res = await startScannerJob({
        target_url: targetUrl.trim(),
        allow_private: allowPrivate,
        authorized_by: operatorName || 'Security Analyst',
        scope_config: {
          max_depth: maxDepth || depth,
          max_urls: maxUrls || urls,
          concurrency: scanProfile === 'deep' ? 10 : 5,
          allow_subdomains: false,
          allow_active_probes: true,
          allow_private: allowPrivate,
        },
      })

      const newJobId = res.job_id
      setActiveJobId(newJobId)
      setActiveJob({
        id: newJobId,
        target_url: res.target || targetUrl.trim(),
        status: res.status || 'pending',
        progress: 5,
        current_phase: 'Validating Scope & Initializing',
        stats: { assets: 0, urls: 0, apis: 0, technologies: 0, critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
      })
      setStatusMessage(`Assessment job ${newJobId} successfully queued and initialized.`)
      // Reset tables for new scan
      setFindings([])
      setAssets([])
      setTechnologies([])
      setCrawledUrls([])
      setActiveTab('findings')
      loadRecentJobs()
    } catch (err: any) {
      setStatusMessage(`Scan launch failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsLaunching(false)
    }
  }

  // Cancel Running Scan
  const handleCancelScan = async () => {
    if (!activeJobId) return
    setIsCancelling(true)
    try {
      await cancelScannerJob(activeJobId)
      setStatusMessage(`Scan job ${activeJobId} cancellation requested.`)
      selectJob(activeJobId)
    } catch (err: any) {
      console.error('Cancel error:', err)
    } finally {
      setIsCancelling(false)
    }
  }

  // Download PDF Report
  const handleDownloadPdf = async () => {
    if (!activeJobId) return
    setIsDownloadingPdf(true)
    try {
      await downloadScannerPdfReport(activeJobId, activeJob?.target_domain || 'target')
    } catch (err: any) {
      console.error('PDF download error:', err)
      alert(`Could not generate PDF report: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Download JSON Report
  const handleDownloadJson = async () => {
    if (!activeJobId) return
    setIsDownloadingJson(true)
    try {
      await downloadScannerJsonReport(activeJobId, activeJob?.target_domain || 'target')
    } catch (err: any) {
      console.error('JSON export error:', err)
      alert(`Could not export JSON report: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsDownloadingJson(false)
    }
  }

  // Copy helper
  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Categories list for filtering
  const categories = useMemo(() => {
    const set = new Set<string>()
    findings.forEach((f) => {
      if (f.category) set.add(f.category)
    })
    return Array.from(set)
  }, [findings])

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter !== 'all' && f.severity?.toLowerCase() !== severityFilter.toLowerCase()) {
        return false
      }
      if (categoryFilter !== 'all' && f.category !== categoryFilter) {
        return false
      }
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase()
        const matchTitle = f.title?.toLowerCase().includes(query)
        const matchDesc = f.description?.toLowerCase().includes(query)
        const matchAsset = f.affected_asset?.toLowerCase().includes(query)
        const matchCat = f.category?.toLowerCase().includes(query)
        return matchTitle || matchDesc || matchAsset || matchCat
      }
      return true
    })
  }, [findings, severityFilter, categoryFilter, searchFilter])

  // Dynamic statistics
  const currentStats = useMemo(() => {
    if (activeJob?.stats) {
      return {
        critical: activeJob.stats.critical ?? 0,
        high: activeJob.stats.high ?? 0,
        medium: activeJob.stats.medium ?? 0,
        low: activeJob.stats.low ?? 0,
        informational: activeJob.stats.informational ?? 0,
        assets: activeJob.stats.assets ?? assets.length,
        urls: activeJob.stats.urls ?? crawledUrls.length,
        technologies: activeJob.stats.technologies ?? technologies.length,
      }
    }
    // Calculate from local findings array
    let crit = 0, hi = 0, med = 0, lo = 0, info = 0
    findings.forEach((f) => {
      const s = f.severity?.toLowerCase()
      if (s === 'critical') crit++
      else if (s === 'high') hi++
      else if (s === 'medium') med++
      else if (s === 'low') lo++
      else info++
    })
    return {
      critical: crit,
      high: hi,
      medium: med,
      low: lo,
      informational: info,
      assets: assets.length,
      urls: crawledUrls.length,
      technologies: technologies.length,
    }
  }, [activeJob?.stats, findings, assets.length, crawledUrls.length, technologies.length])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fanos-accent mb-1">
            <Bug className="w-4 h-4 text-purple-400" />
            <span>Fanos CyberSec • Enterprise Dynamic Application Security Testing</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Web Security & Vulnerability Scanner
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              DAST Engine v2.4
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Automated reconnaissance, OWASP Top 10 vulnerability assessment, SQLi, XSS, CSRF verification, TLS cryptanalysis, and executive reporting.
          </p>
        </div>

        {/* Engine status pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">DAST Engine:</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SSRF Guard:</span>
            <span className="text-cyan-400 font-bold">STRICT (RFC 1918)</span>
          </div>
        </div>
      </div>

      {/* ── SCAN CONFIGURATION & LAUNCH CONSOLE ───────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Target Specification & Scope Configuration</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedScope(!showAdvancedScope)}
            className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>{showAdvancedScope ? 'Hide Advanced Options' : 'Configure Advanced Scope & Audits'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedScope ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Target URL Input Bar */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Authorized Target URL or Endpoint
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:ring-1 focus:ring-purple-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleValidateTarget}
                disabled={isValidatingTarget || !targetUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isValidatingTarget ? <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> : <Lock className="w-4 h-4 text-purple-400" />}
                <span>SSRF Pre-Flight Check</span>
              </button>
            </div>
          </div>

          {/* SSRF Pre-flight Callout */}
          {validationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                validationResult.valid
                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                  : 'bg-red-950/30 border-red-800/80 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {validationResult.valid ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertOctagon className="w-4 h-4 text-red-400" />}
                <span>
                  {validationResult.valid
                    ? `Scope Approved: ${validationResult.normalized_url} (Domain: ${validationResult.domain}, Resolved IPs: ${validationResult.resolved_ips?.join(', ') || 'OK'})`
                    : `Scope Rejected: ${validationResult.error || 'Prohibited address range or invalid URL schema.'}`}
                </span>
              </div>
              {validationResult.valid && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded">
                  SSRF Protection Safe
                </span>
              )}
            </div>
          )}

          {/* Scan Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setScanProfile('fast')
                setMaxDepth(1)
                setMaxUrls(15)
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                scanProfile === 'fast'
                  ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">⚡ Fast Reconnaissance</span>
                {scanProfile === 'fast' && <span className="w-2 h-2 rounded-full bg-purple-400" />}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                Crawl Depth 1 • Top 15 URLs • HTTP Security Headers, SSL/TLS, and Tech Stack Fingerprinting.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanProfile('standard')
                setMaxDepth(2)
                setMaxUrls(35)
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                scanProfile === 'standard'
                  ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">🎯 Standard DAST Vulnerability</span>
                {scanProfile === 'standard' && <span className="w-2 h-2 rounded-full bg-purple-400" />}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                Crawl Depth 2 • 35 URLs • SQLi Error Detection, XSS, CSRF Forms, Mixed Content, and Info Exposure.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanProfile('deep')
                setMaxDepth(4)
                setMaxUrls(80)
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                scanProfile === 'deep'
                  ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">🛡️ Comprehensive Security Audit</span>
                {scanProfile === 'deep' && <span className="w-2 h-2 rounded-full bg-purple-400" />}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                Crawl Depth 4 • 80 URLs • Concurrency 10 • Exhaustive Payloads, CRLF, Open Redirects & APIs.
              </div>
            </button>
          </div>

          {/* Advanced Scope Drawer */}
          {showAdvancedScope && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-purple-400" />
                <span>Scope Tuning & Engine Parameters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Max Crawl Depth</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Endpoints to Audit</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxUrls}
                    onChange={(e) => setMaxUrls(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Authorized Operator</label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {/* Attack Vector Badges Preview */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 mb-2">Automated Vulnerability Checks In Scope:</div>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ SQL Injection (Error-Based)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Reflected Cross-Site Scripting (XSS)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Missing Anti-CSRF Tokens on Forms</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Mixed Content (HTTP on HTTPS)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ SSL/TLS Expiry, Protocols & SAN Mismatches</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Security Headers (CSP, HSTS, XFO, XCTO, Referrer, Permissions)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Debug Endpoints (/info.php, /.env, /.git)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Internal IP Leakage (RFC 1918)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ CRLF / Response Splitting Indicators</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Permissive CORS Policies (*)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Cookie Flags (HttpOnly, Secure, SameSite)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Open Redirect Parameters</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-700/50 text-purple-300">✓ Missing Rate Limiting Headers</span>
                </div>
              </div>
            </div>
          )}

          {/* Scan Action Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowPrivate}
                onChange={(e) => setAllowPrivate(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Allow Localhost / Lab Internal Range Scanning (Authorized Testing Only)</span>
            </label>

            <button
              type="button"
              onClick={handleStartScan}
              disabled={isLaunching || !targetUrl.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLaunching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>Launch Assessment Scan</span>
            </button>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/60 text-purple-300 text-xs font-mono">
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* ── ACTIVE SCAN JOB EXECUTION HUB ────────────────────────── */}
      {activeJob && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-purple-900/40 shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-start md:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base">Scan Job: {activeJob.id}</span>
                  <button
                    onClick={() => copyText(activeJob.id, 'job_id')}
                    className="text-slate-500 hover:text-white transition-colors"
                    title="Copy Job ID"
                  >
                    {copiedKey === 'job_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>Target: <strong className="text-slate-200">{activeJob.target_url}</strong></span>
                  {activeJob.duration_seconds !== undefined && activeJob.duration_seconds > 0 && (
                    <span className="text-slate-500">• Duration: {activeJob.duration_seconds}s</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status and Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase font-mono flex items-center gap-1.5 ${
                  activeJob.status === 'completed'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : activeJob.status === 'failed'
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                    : activeJob.status === 'cancelled'
                    ? 'bg-slate-700/30 border border-slate-600 text-slate-400'
                    : 'bg-purple-500/15 border border-purple-500/30 text-purple-300 animate-pulse'
                }`}
              >
                {activeJob.status === 'running' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {activeJob.status} ({activeJob.progress || 0}%)
              </span>

              {/* Cancel Button when running */}
              {activeJob.status === 'running' && (
                <button
                  type="button"
                  onClick={handleCancelScan}
                  disabled={isCancelling}
                  className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}

              {/* REPORT DOWNLOAD BUTTONS (Key user requirement!) */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                title="Download Executive PDF Security Assessment Report"
              >
                {isDownloadingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>Generate & Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={isDownloadingJson}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export complete assessment audit in JSON format"
              >
                {isDownloadingJson ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Multi-Phase Progress Tracker */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>Phase: <strong className="text-white font-mono">{activeJob.current_phase || 'Active'}</strong></span>
              </span>
              <span className="font-mono text-purple-300 font-bold">{activeJob.progress || 0}% Complete</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(activeJob.progress || 5, 5)}%` }}
              />
            </div>
          </div>

          {/* Severity & Metrics Scoreboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1 text-center">
            {/* Critical */}
            <button
              onClick={() => {
                setActiveTab('findings')
                setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')
              }}
              className={`p-3 rounded-xl border transition-all text-left ${
                severityFilter === 'critical' ? 'ring-2 ring-red-500 bg-red-950/40 border-red-500' : 'bg-slate-950/70 border-slate-800 hover:border-red-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Critical</div>
              <div className="text-xl font-extrabold text-red-500 mt-0.5">{currentStats.critical}</div>
            </button>

            {/* High */}
            <button
              onClick={() => {
                setActiveTab('findings')
                setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')
              }}
              className={`p-3 rounded-xl border transition-all text-left ${
                severityFilter === 'high' ? 'ring-2 ring-orange-500 bg-orange-950/40 border-orange-500' : 'bg-slate-950/70 border-slate-800 hover:border-orange-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">High</div>
              <div className="text-xl font-extrabold text-orange-500 mt-0.5">{currentStats.high}</div>
            </button>

            {/* Medium */}
            <button
              onClick={() => {
                setActiveTab('findings')
                setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')
              }}
              className={`p-3 rounded-xl border transition-all text-left ${
                severityFilter === 'medium' ? 'ring-2 ring-amber-500 bg-amber-950/40 border-amber-500' : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Medium</div>
              <div className="text-xl font-extrabold text-amber-400 mt-0.5">{currentStats.medium}</div>
            </button>

            {/* Low */}
            <button
              onClick={() => {
                setActiveTab('findings')
                setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')
              }}
              className={`p-3 rounded-xl border transition-all text-left ${
                severityFilter === 'low' ? 'ring-2 ring-blue-500 bg-blue-950/40 border-blue-500' : 'bg-slate-950/70 border-slate-800 hover:border-blue-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Low</div>
              <div className="text-xl font-extrabold text-blue-400 mt-0.5">{currentStats.low}</div>
            </button>

            {/* Informational */}
            <button
              onClick={() => {
                setActiveTab('findings')
                setSeverityFilter(severityFilter === 'informational' ? 'all' : 'informational')
              }}
              className={`p-3 rounded-xl border transition-all text-left ${
                severityFilter === 'informational' ? 'ring-2 ring-emerald-500 bg-emerald-950/40 border-emerald-500' : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Informational</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{currentStats.informational}</div>
            </button>

            {/* Assets */}
            <button
              onClick={() => setActiveTab('assets')}
              className={`p-3 rounded-xl border transition-all text-left ${
                activeTab === 'assets' ? 'ring-2 ring-purple-500 bg-purple-950/40 border-purple-500' : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assets</div>
              <div className="text-xl font-extrabold text-white mt-0.5">{currentStats.assets}</div>
            </button>

            {/* Endpoints */}
            <button
              onClick={() => setActiveTab('urls')}
              className={`p-3 rounded-xl border transition-all text-left ${
                activeTab === 'urls' ? 'ring-2 ring-cyan-500 bg-cyan-950/40 border-cyan-500' : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Endpoints</div>
              <div className="text-xl font-extrabold text-cyan-400 mt-0.5">{currentStats.urls}</div>
            </button>

            {/* Technologies */}
            <button
              onClick={() => setActiveTab('technologies')}
              className={`p-3 rounded-xl border transition-all text-left ${
                activeTab === 'technologies' ? 'ring-2 ring-purple-500 bg-purple-950/40 border-purple-500' : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/50'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Tech Stack</div>
              <div className="text-xl font-extrabold text-purple-400 mt-0.5">{currentStats.technologies}</div>
            </button>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE SECURITY ANALYSIS DASHBOARD (TABS) ────────── */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('findings')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'findings'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security Findings ({findings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'assets'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Discovered Assets ({assets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('technologies')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'technologies'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Technology Stack ({technologies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('urls')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'urls'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Crawled Endpoints ({crawledUrls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attacks')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'attacks'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Attack Vectors & Capabilities</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Past Assessments ({recentJobs.length})</span>
          </button>
        </div>

        {/* ── TAB 1: DETAILED SECURITY FINDINGS ────────────────────── */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by vulnerability title, asset, category..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="informational">Informational</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {(severityFilter !== 'all' || categoryFilter !== 'all' || searchFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSeverityFilter('all')
                      setCategoryFilter('all')
                      setSearchFilter('')
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Findings List */}
            {loadingData ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-2" />
                <p className="text-xs">Loading discovered security findings...</p>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <h3 className="text-sm font-bold text-white">No Vulnerabilities Match Current Filters</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting the severity filter or search parameters, or run a deeper audit profile.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFindings.map((f, idx) => {
                  const isExpanded = expandedFindingId === f.id
                  const sevStyle = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.Informational

                  return (
                    <div
                      key={f.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-slate-900/95 border-purple-500/50 shadow-xl'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Card Header Bar */}
                      <div
                        onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}
                        className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-start md:items-center gap-3">
                          <span className={`px-2.5 py-1 rounded text-[11px] font-extrabold uppercase font-mono ${sevStyle.badge}`}>
                            {f.severity}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                              <h4 className="text-sm font-bold text-white hover:text-purple-300 transition-colors">
                                {f.title}
                              </h4>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-3">
                              <span>Asset: <strong className="text-slate-300">{f.affected_asset || 'Target Host'}</strong></span>
                              {f.category && <span>Category: <strong className="text-purple-300">{f.category}</strong></span>}
                              {f.confidence && <span>Confidence: <strong className="text-slate-300">{f.confidence}</strong></span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {f.id}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90 text-purple-400' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Expandable Technical Details Drawer */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-4 text-xs">
                          {/* 1. Technical Analysis */}
                          <div>
                            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Technical Analysis</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed font-sans">
                              {f.description || 'No detailed technical explanation provided.'}
                            </p>
                          </div>

                          {/* 2. Security Impact */}
                          <div>
                            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Security Impact Assessment</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed font-sans">
                              {f.impact || 'Assessment indicates minimal direct exploitation risk without auxiliary chaining.'}
                            </p>
                          </div>

                          {/* 3. Remediation Guidance */}
                          <div>
                            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Remediation Recommendation</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                              {f.remediation || 'Apply industry baseline web server hardening and CSP.'}
                            </div>
                          </div>

                          {/* 4. Observed Technical Evidence */}
                          {f.evidence && (
                            <div>
                              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                                <Code className="w-3.5 h-3.5 text-purple-400" />
                                <span>Observed Technical Evidence</span>
                              </div>
                              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-purple-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                                {typeof f.evidence === 'object' ? JSON.stringify(f.evidence, null, 2) : String(f.evidence)}
                              </pre>
                            </div>
                          )}

                          {/* 5. Standards & Compliance References */}
                          {f.references && f.references.length > 0 && (
                            <div>
                              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                <span>Standards & Compliance References</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {f.references.map((ref, rIdx) => (
                                  <a
                                    key={rIdx}
                                    href={ref.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-blue-300 hover:text-blue-200 text-[11px] flex items-center gap-1.5 transition-colors"
                                  >
                                    <span>{ref.title}</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DISCOVERED ASSETS & INFRASTRUCTURE ─────────────── */}
        {activeTab === 'assets' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Mapped Infrastructure & Attack Surface Assets</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Assets Discovered: <strong className="text-white">{assets.length}</strong>
                </p>
              </div>
            </div>

            {assets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No infrastructure assets mapped for this scan yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Asset Type</th>
                      <th className="p-3">Observed Value / Endpoint</th>
                      <th className="p-3">Metadata</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {assets.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-bold uppercase text-[10px]">
                            {a.asset_type}
                          </span>
                        </td>
                        <td className="p-3 text-white font-medium break-all max-w-md">
                          {a.asset_value}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] truncate max-w-xs">
                          {a.metadata ? JSON.stringify(a.metadata) : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => copyText(a.asset_value, `asset_${idx}`)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Copy asset value"
                          >
                            {copiedKey === `asset_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DETECTED TECHNOLOGY STACK ──────────────────────── */}
        {activeTab === 'technologies' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Detected Software, Frameworks & Web Servers</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Fingerprinted application components and server stack versions.
              </p>
            </div>

            {technologies.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No distinct technologies identified for this target.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {technologies.map((t, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                        {t.category || 'Component'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                        {t.confidence || 'Confirmed'}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      <span>{t.name}</span>
                      {t.version && (
                        <span className="text-xs font-mono font-normal text-cyan-400">
                          v{t.version}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: CRAWLED ENDPOINTS & FORMS ──────────────────────── */}
        {activeTab === 'urls' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Crawled Application URLs & Endpoints ({crawledUrls.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scope-controlled crawler crawl tree with HTTP status response codes and latency.
              </p>
            </div>

            {crawledUrls.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No endpoints crawled yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Crawled URL</th>
                      <th className="p-3">Content Type</th>
                      <th className="p-3">Latency</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {crawledUrls.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.status_code >= 200 && u.status_code < 300
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : u.status_code >= 300 && u.status_code < 400
                                ? 'bg-blue-500/20 text-blue-400'
                                : u.status_code >= 400 && u.status_code < 500
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            HTTP {u.status_code || 0}
                          </span>
                        </td>
                        <td className="p-3 text-white font-mono break-all max-w-md">
                          {u.url}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {u.content_type || 'text/html'}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {u.response_time_ms ? `${u.response_time_ms}ms` : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => copyText(u.url, `url_${idx}`)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Copy URL"
                          >
                            {copiedKey === `url_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: ATTACK VECTORS & SCANNER MATRIX ────────────────── */}
        {activeTab === 'attacks' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>DAST Vulnerability Coverage & Attack Verification Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Professional Bug Bounty & Penetration Testing assessment modules executed by Fanos AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Injection */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-red-400" />
                    <span>SQL Injection (SQLi) Audit</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-800/40">
                    CWE-89 • OWASP A03
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Fuzzes query parameters and input forms with non-destructive syntax probes. Evaluates HTTP response payloads against known signatures for MySQL, PostgreSQL, Oracle, SQLite, and Microsoft SQL Server error disclosure.
                </p>
              </div>

              {/* XSS */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Code className="w-4 h-4 text-orange-400" />
                    <span>Cross-Site Scripting (Reflected & DOM XSS)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-800/40">
                    CWE-79 • OWASP A03
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Injects unique harmless canary markup tags into GET/POST parameters to detect unescaped HTML reflection, script context breakouts, and missing context-aware sanitization.
                </p>
              </div>

              {/* CSRF & Forms */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Cross-Site Request Forgery (CSRF) & Form Auditing</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                    CWE-352 • OWASP A01
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Inspects all HTML POST forms across crawled pages for cryptographically secure anti-CSRF token fields, SameSite cookie policies, and checks for unencrypted plaintext credential transmission over HTTP.
                </p>
              </div>

              {/* Mixed Content */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Mixed Content & Subresource Integrity</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                    CWE-311 • MDN
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Audits HTTPS pages for scripts, stylesheets, images, and iframes requested over plaintext HTTP, preventing Man-in-the-Middle script injection and browser security degradation.
                </p>
              </div>

              {/* TLS / SSL */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span>TLS / SSL Cryptographic Analysis</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-800/40">
                    CWE-295 • RFC 8996
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Performs direct socket handshakes inspecting certificate expiration timelines, CA chain trustworthiness, Subject Alternative Name (SAN) coverage, and flags deprecated TLS 1.0/1.1 protocols.
                </p>
              </div>

              {/* Security Headers */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>HTTP Security Headers & Defense-in-Depth</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                    CWE-1021 • RFC 6797
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Evaluates Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options (Clickjacking), X-Content-Type-Options (MIME sniffing), Referrer-Policy, and modern Permissions-Policy headers.
                </p>
              </div>

              {/* Information Exposure */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Information Leakage & Sensitive Endpoints</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40">
                    CWE-200 • CWE-552
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Probes for exposed debug scripts (/info.php, /phpinfo.php), sensitive files (/.env, /.git/HEAD), internal RFC 1918 private IP disclosure, exposed email addresses, and stack traces.
                </p>
              </div>

              {/* Rate Limiting */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Rate Limiting & Abuse Prevention</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-800/40">
                    RFC 6585 • OWASP
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Inspects response headers for standard rate limiting indicators (X-RateLimit-Limit, Retry-After, RateLimit-Limit) to protect sensitive endpoints from brute force and denial of service.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 6: SCAN HISTORY & PREVIOUS ASSESSMENTS ───────────── */}
        {activeTab === 'history' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Previous Security Assessments Archive</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect historical scan results, re-evaluate findings, or download past executive PDF reports.
                </p>
              </div>
              <button
                type="button"
                onClick={loadRecentJobs}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh List</span>
              </button>
            </div>

            {recentJobs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No past scan assessments found in database.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Target URL</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Severity Breakdown</th>
                      <th className="p-3">Created</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {recentJobs.map((j) => {
                      const isCurrent = j.id === activeJobId
                      const st = j.stats || {}

                      return (
                        <tr
                          key={j.id}
                          className={`transition-colors ${isCurrent ? 'bg-purple-950/20' : 'hover:bg-slate-800/40'}`}
                        >
                          <td className="p-3 font-bold text-white">
                            {j.id}
                          </td>
                          <td className="p-3 text-slate-300 break-all max-w-xs">
                            {j.target_url}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                j.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : j.status === 'failed'
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-purple-500/15 text-purple-300'
                              }`}
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">
                            {j.duration_seconds ? `${j.duration_seconds}s` : '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <span className="text-red-400">{st.critical ?? 0}C</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-orange-400">{st.high ?? 0}H</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-amber-400">{st.medium ?? 0}M</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-blue-400">{st.low ?? 0}L</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => selectJob(j.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  isCurrent
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {isCurrent ? 'Viewing' : 'Inspect'}
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadScannerPdfReport(j.id, j.target_domain)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors"
                                title="Download PDF Report"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
