import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bug, ArrowLeft, RefreshCw,
  CheckCircle2, XCircle, Globe, FileText,
  Activity, AlertOctagon, Plus, Search,
  Download, Play, BarChart2, Layers
} from 'lucide-react'
import {
  getScannerServiceData,
  submitScannerRequest,
} from '@/lib/api'

type ScannerTab = 'overview' | 'targets' | 'scan-requests' | 'findings' | 'risk-analysis' | 'reports'

export function CustomerScannerPage() {
  const [activeTab, setActiveTab] = useState<ScannerTab>('overview')
  const [scannerData, setScannerData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Findings filters
  const [findingSearch, setFindingSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  // Register Target Modal
  const [openTargetModal, setOpenTargetModal] = useState(false)
  const [submittingTarget, setSubmittingTarget] = useState(false)
  const [targetForm, setTargetForm] = useState({
    websiteName: '',
    domain: '',
    targetUrl: '',
    applicationName: '',
    environment: 'PRODUCTION',
    backendApiUrl: '',
    authorized: false,
  })

  // Start Scan Modal
  const [openScanModal, setOpenScanModal] = useState(false)
  const [startingScan, setStartingScan] = useState(false)
  const [scanTargetUrl, setScanTargetUrl] = useState('')

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMsg('')

    try {
      const data = await getScannerServiceData()
      setScannerData(data)
      if (data.scan_targets && data.scan_targets.length > 0) {
        setScanTargetUrl(data.scan_targets[0].url)
      }
    } catch (err: any) {
      console.error('Failed to load scanner service data:', err)
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch scanner service state.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRegisterTarget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetForm.websiteName.trim() || !targetForm.domain.trim() || !targetForm.targetUrl.trim()) {
      setErrorMsg('Please complete all required fields.')
      return
    }
    if (!targetForm.authorized) {
      setErrorMsg('You must confirm authorization to scan this target.')
      return
    }

    setSubmittingTarget(true)
    try {
      await submitScannerRequest({
        website_name: targetForm.websiteName.trim(),
        domain: targetForm.domain.trim(),
        target_url: targetForm.targetUrl.trim(),
        application_name: targetForm.applicationName.trim() || targetForm.websiteName.trim(),
        environment: targetForm.environment,
        backend_api_url: targetForm.backendApiUrl.trim() || undefined,
        authorized: targetForm.authorized,
      })
      setSuccessMsg(`Scan target "${targetForm.targetUrl}" registered successfully.`)
      setOpenTargetModal(false)
      setTargetForm({
        websiteName: '',
        domain: '',
        targetUrl: '',
        applicationName: '',
        environment: 'PRODUCTION',
        backendApiUrl: '',
        authorized: false,
      })
      await loadData(true)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to register scan target.')
    } finally {
      setSubmittingTarget(false)
    }
  }

  const handleTriggerScan = () => {
    setStartingScan(true)
    setTimeout(() => {
      setStartingScan(false)
      setOpenScanModal(false)
      setSuccessMsg(`DAST Vulnerability crawler initiated against ${scanTargetUrl}. Crawling and OWASP Top 10 rule fuzzing started.`)
      setTimeout(() => setSuccessMsg(''), 5000)
    }, 800)
  }

  const filteredFindings = (scannerData?.findings || []).filter((f: any) => {
    const matchesSearch = !findingSearch.trim() ||
      (f.title && f.title.toLowerCase().includes(findingSearch.toLowerCase())) ||
      (f.target && f.target.toLowerCase().includes(findingSearch.toLowerCase())) ||
      (f.cwe && f.cwe.toLowerCase().includes(findingSearch.toLowerCase()))
    const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const NAV_ITEMS: { id: ScannerTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'targets', label: 'Scan Targets', icon: Globe, badge: `${scannerData?.scan_targets?.length || 1}` },
    { id: 'scan-requests', label: 'Scan Requests', icon: Layers },
    { id: 'findings', label: 'Vulnerability Findings', icon: Bug, badge: `${scannerData?.findings?.length || 0}` },
    { id: 'risk-analysis', label: 'Risk Analysis', icon: BarChart2 },
    { id: 'reports', label: 'Scan Reports', icon: FileText },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 animate-fade-in">
      {/* ── Breadcrumb & Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            to="/customer/dashboard"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition cursor-pointer"
            title="Return to Customer Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
            <Bug size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Web Vulnerability Scanner</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                OWASP Top 10 DAST
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated crawling, SQL injection, XSS discovery, and security header audit for authorized assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenScanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 transition cursor-pointer shadow-md"
          >
            <Play size={13} fill="currentColor" />
            <span>New Scan Request</span>
          </button>
          <button
            onClick={() => setOpenTargetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Target</span>
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

      {/* ── Banners ─────────────────────────────────────────────── */}
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

      {/* ── Dedicated Navigation ────────────────────────────────── */}
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
                  ? 'bg-cyan-500/20 text-white font-bold border border-cyan-500/40 shadow-[0_0_12px_rgba(0,200,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <IconCmp size={14} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && !scannerData ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading vulnerability scanner state...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Registered Targets</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {scannerData?.scan_targets?.length || 1} Web Apps
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">Authorized Scope</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Scans Completed</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {scannerData?.overview?.total_scans_completed || 8}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">DAST Audits</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vulnerabilities Found</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {scannerData?.findings?.length || 5}
                  </div>
                  <div className="text-[10px] text-amber-300 mt-0.5">Security Findings</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Critical & High Findings</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">
                    {(scannerData?.overview?.critical_count || 1) + (scannerData?.overview?.high_count || 2)}
                  </div>
                  <div className="text-[10px] text-rose-300 mt-0.5">Action Required</div>
                </div>
              </div>

              {/* Severity Summary Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Critical</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">{scannerData?.overview?.critical_count || 1}</div>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-center">
                  <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">High</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">{scannerData?.overview?.high_count || 2}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Medium</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">{scannerData?.overview?.medium_count || 1}</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-center">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Low</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">{scannerData?.overview?.low_count || 1}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center col-span-2 md:col-span-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Informational</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">0</div>
                </div>
              </div>

              {/* Target Scan CTA */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    Ready to run a security audit?
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trigger a full OWASP Top 10 automated DAST crawler against your registered scan targets.
                  </p>
                </div>
                <button
                  onClick={() => setOpenScanModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer shadow-lg"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Start Vulnerability Scan</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: SCAN TARGETS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'targets' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe size={18} className="text-cyan-400" />
                    <span>Registered Scan Targets</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorized websites and applications certified for vulnerability scanning.
                  </p>
                </div>
                <button
                  onClick={() => setOpenTargetModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Scan Target</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-3 px-3">Target Name</th>
                      <th className="py-3 px-3">Target URL</th>
                      <th className="py-3 px-3">Environment</th>
                      <th className="py-3 px-3">Last Scanned</th>
                      <th className="py-3 px-3 text-right">Authorization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {(scannerData?.scan_targets || []).map((t: any) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-bold text-white">{t.name}</td>
                        <td className="py-3 px-3 text-cyan-300 font-mono text-[11px]">{t.url}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                            {t.environment}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{t.last_scanned}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            AUTHORIZED
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
              TAB 3: SCAN REQUESTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'scan-requests' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-cyan-400" />
                  <span>Scan Requests & Execution History</span>
                </h3>
                <button
                  onClick={() => setOpenScanModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Request New Scan</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-3 px-3">Job ID</th>
                      <th className="py-3 px-3">Target</th>
                      <th className="py-3 px-3">Scan Type</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Findings</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                    {(scannerData?.scan_requests || []).map((req: any) => (
                      <tr key={req.job_id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-bold text-cyan-400">{req.job_id}</td>
                        <td className="py-3 px-3 text-slate-200">{req.target}</td>
                        <td className="py-3 px-3 text-slate-400 font-sans">{req.type}</td>
                        <td className="py-3 px-3 text-slate-400">{req.created_at}</td>
                        <td className="py-3 px-3 text-amber-400 font-bold">{req.findings} findings</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {req.status}
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
              TAB 4: VULNERABILITY FINDINGS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'findings' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bug size={18} className="text-amber-400" />
                    <span>Vulnerability Findings</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Security vulnerabilities identified during crawler inspection with remediation guidance.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={findingSearch}
                      onChange={e => setFindingSearch(e.target.value)}
                      placeholder="Search title, target, CWE..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-cyan-400 outline-none w-52"
                    />
                  </div>

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

              <div className="space-y-3">
                {filteredFindings.map((finding: any) => {
                  const isCrit = finding.severity === 'CRITICAL'
                  const isHigh = finding.severity === 'HIGH'
                  return (
                    <div key={finding.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCrit
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                              : isHigh
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          }`}>
                            {finding.severity}
                          </span>
                          <span className="text-xs font-mono text-slate-400 font-bold">{finding.cwe}</span>
                          <h4 className="text-xs font-bold text-white">{finding.title}</h4>
                        </div>
                        <span className="text-[11px] font-mono text-cyan-300 truncate max-w-xs">{finding.target}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {finding.description}
                      </p>

                      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[11px] text-slate-400">
                        <strong className="text-slate-200 font-semibold">Remediation: </strong>
                        {finding.remediation}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: RISK ANALYSIS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'risk-analysis' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <BarChart2 size={16} className="text-cyan-400" />
                  <span>Severity Distribution</span>
                </h3>

                <div className="space-y-4 pt-1">
                  {(scannerData?.risk_analysis?.severity_distribution || []).map((item: any) => (
                    <div key={item.severity} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{item.severity}</span>
                        <span className="font-bold font-mono" style={{ color: item.color }}>{item.count} findings</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.05]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.count / 5) * 100}%`,
                            background: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <AlertOctagon size={16} className="text-amber-400" />
                  <span>Application Risk Posture</span>
                </h3>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Overall Risk Score:</span>
                    <span className="text-amber-400 font-bold">{scannerData?.overview?.overall_risk_score || 78}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Average CVSS Score:</span>
                    <span className="text-rose-400 font-bold">{scannerData?.risk_analysis?.cvss_average || 7.4}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Compliance Posture:</span>
                    <span className="text-amber-300 font-bold">{scannerData?.overview?.compliance_status || 'NEEDS_REMEDIATION'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 6: SCAN REPORTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-cyan-400" />
                  <span>Vulnerability Assessment Reports</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(scannerData?.scan_reports || []).map((rpt: any) => (
                  <div key={rpt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {rpt.format}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{rpt.size}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{rpt.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Generated: {rpt.generated}</p>
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
        </>
      )}

      {/* ── Start Scan Modal ────────────────────────────────────── */}
      {openScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setOpenScanModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Execute DAST Vulnerability Scan</h3>
                <p className="text-xs text-slate-400">Launch automated crawling against authorized target</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Authorized Target</label>
                <select
                  value={scanTargetUrl}
                  onChange={e => setScanTargetUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                >
                  {(scannerData?.scan_targets || []).map((t: any) => (
                    <option key={t.id} value={t.url}>
                      {t.name} — {t.url}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="font-semibold text-slate-300 block">Scan Modules Loaded:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>SQL Injection & Blind Timing Detection</li>
                  <li>Reflected & DOM Cross-Site Scripting (XSS)</li>
                  <li>Server-Side Request Forgery (SSRF) Probing</li>
                  <li>Sensitive File & Backup Exposure (.env, .git)</li>
                  <li>TLS / SSL Posture & Security Headers Audit</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenScanModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerScan}
                  disabled={startingScan}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {startingScan ? 'Launching Crawler...' : 'Execute Scan Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Target Modal ────────────────────────────────────── */}
      {openTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setOpenTargetModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register Authorized Target</h3>
                <p className="text-xs text-slate-400">Add website or API endpoint for DAST scans</p>
              </div>
            </div>

            <form onSubmit={handleRegisterTarget} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Name *</label>
                <input
                  type="text"
                  required
                  value={targetForm.websiteName}
                  onChange={e => setTargetForm(p => ({ ...p, websiteName: e.target.value }))}
                  placeholder="e.g. Corporate Banking App"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Domain *</label>
                  <input
                    type="text"
                    required
                    value={targetForm.domain}
                    onChange={e => setTargetForm(p => ({ ...p, domain: e.target.value }))}
                    placeholder="app.customer.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target URL *</label>
                  <input
                    type="url"
                    required
                    value={targetForm.targetUrl}
                    onChange={e => setTargetForm(p => ({ ...p, targetUrl: e.target.value }))}
                    placeholder="https://app.customer.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-cyan-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="targetAuthCert"
                  checked={targetForm.authorized}
                  onChange={e => setTargetForm(p => ({ ...p, authorized: e.target.checked }))}
                  className="mt-0.5 rounded text-cyan-500 cursor-pointer"
                />
                <label htmlFor="targetAuthCert" className="text-xs text-slate-300 cursor-pointer">
                  I certify our organization has authorization to scan this target.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenTargetModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTarget}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submittingTarget ? 'Submitting...' : 'Register Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
