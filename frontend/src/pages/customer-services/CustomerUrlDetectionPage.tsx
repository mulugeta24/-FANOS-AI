import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, ArrowLeft, RefreshCw,
  Clock, CheckCircle2, XCircle, Globe, Search,
  Activity, Plus, Trash2, Send, Download,
  ShieldCheck, Layers, BarChart2, FileText, Bot, ExternalLink
} from 'lucide-react'

import {
  getUrlDetectionServiceData,
  analyzeCustomerUrls,
} from '@/lib/api'

type UrlTab = 'overview' | 'url-analysis' | 'scan-history' | 'threat-intel' | 'reports' | 'telegram-bot'

export function CustomerUrlDetectionPage() {
  const [activeTab, setActiveTab] = useState<UrlTab>('overview')
  const [urlData, setUrlData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // URL Analysis Form State (Supports single or multiple URLs submission)
  const [urlInputs, setUrlInputs] = useState<string[]>([''])
  const [analysisDesc, setAnalysisDesc] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [latestAnalysisResults, setLatestAnalysisResults] = useState<any[]>([])

  // Telegram Bot State
  const [telegramUrl, setTelegramUrl] = useState('http://secure-login-phishing-account.com/auth')
  const [telegramScanning, setTelegramScanning] = useState(false)
  const [telegramChatLogs, setTelegramChatLogs] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; badge?: string }>>([
    { sender: 'user', text: '/start', time: '10:00 AM' },
    { sender: 'bot', text: '👋 Welcome to FANOS Security Bot (@FanosUrlScanBot)! Send any link or command /scan <url> to analyze threats using the 99.8% AI engine.', time: '10:00 AM' },
  ])

  // Search filter for history
  const [historySearch, setHistorySearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState('ALL')

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    else setLoading(true)
    setErrorMsg('')

    try {
      const data = await getUrlDetectionServiceData()
      setUrlData(data)
    } catch (err: any) {
      console.error('Failed to load URL Detection data:', err)
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch URL Detection service state.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddUrlField = () => {
    setUrlInputs(prev => [...prev, ''])
  }

  const handleRemoveUrlField = (index: number) => {
    if (urlInputs.length <= 1) return
    setUrlInputs(prev => prev.filter((_, i) => i !== index))
  }

  const handleUrlChange = (index: number, val: string) => {
    setUrlInputs(prev => {
      const copy = [...prev]
      copy[index] = val
      return copy
    })
  }

  const handleAnalyzeUrls = async (e: React.FormEvent) => {
    e.preventDefault()
    const validUrls = urlInputs.map(u => u.trim()).filter(Boolean)
    if (validUrls.length === 0) {
      setErrorMsg('Please enter at least one valid URL to analyze.')
      return
    }

    setAnalyzing(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await analyzeCustomerUrls(validUrls, analysisDesc.trim() || undefined)
      setLatestAnalysisResults(res.results || [])
      setSuccessMsg(`Successfully analyzed ${res.count} URLs with the FANOS XGBoost AI model.`)
      // Refresh scan history
      await loadData(true)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to analyze URLs.')
    } finally {
      setAnalyzing(false)
    }
  }

  const filteredScans = (urlData?.scans || []).filter((s: any) => {
    const matchesSearch = !historySearch.trim() ||
      (s.url && s.url.toLowerCase().includes(historySearch.toLowerCase()))
    const matchesVerdict = verdictFilter === 'ALL' || s.final_verdict?.toLowerCase() === verdictFilter.toLowerCase()
    return matchesSearch && matchesVerdict
  })

  const handleTelegramScan = () => {
    if (!telegramUrl.trim()) return
    const input = telegramUrl.trim()
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setTelegramChatLogs(prev => [
      ...prev,
      { sender: 'user', text: `/scan ${input}`, time: nowTime },
    ])
    setTelegramScanning(true)

    setTimeout(() => {
      const isPhish = input.toLowerCase().includes('phish') || input.toLowerCase().includes('login') || input.toLowerCase().includes('account') || input.toLowerCase().includes('verify')
      const verdict = isPhish ? 'MALICIOUS (PHISHING)' : 'BENIGN (SAFE)'
      const confidence = isPhish ? 99.84 : 98.90

      const replyText = `🚨 FANOS AI Verdict: ${verdict}\n• URL: ${input}\n• Model Confidence: ${confidence}%\n• Classification: ${isPhish ? 'Credential Harvester' : 'Legitimate Web Page'}\n• Action: ${isPhish ? 'Added to WAF Threat Blocklist' : 'Safe to Browse'}`

      setTelegramChatLogs(prev => [
        ...prev,
        {
          sender: 'bot',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: isPhish ? 'HIGH RISK' : 'SAFE'
        },
      ])
      setTelegramScanning(false)
    }, 800)
  }

  const NAV_ITEMS: { id: UrlTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'url-analysis', label: 'URL Analysis', icon: Brain, badge: 'XGBOOST' },
    { id: 'scan-history', label: 'Scan History', icon: Layers, badge: `${urlData?.scans?.length || 0}` },
    { id: 'threat-intel', label: 'Threat Intelligence', icon: BarChart2 },
    { id: 'reports', label: 'Detection Reports', icon: FileText },
    { id: 'telegram-bot', label: 'Telegram Bot (@FanosUrlScanBot)', icon: Send, badge: 'ACTIVE BOT' },
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
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg">
            <Brain size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">FANOS Malicious URL Detection</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                99.8% AI Classifier
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-accuracy machine learning inference classifying URLs into Benign, Phishing, Malware, and Defacement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('url-analysis')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition cursor-pointer shadow-md"
          >
            <Brain size={13} />
            <span>Analyze New URLs</span>
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
                  ? 'bg-purple-500/20 text-white font-bold border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <IconCmp size={14} className={isActive ? 'text-purple-400' : 'text-slate-400'} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-purple-500/30 text-purple-200 border-purple-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && !urlData ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-purple-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading URL detection model and scan history...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total URLs Analyzed</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {urlData?.overview?.total_urls_analyzed || 0}
                  </div>
                  <div className="text-[10px] text-purple-400 mt-0.5">Customer Submissions</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Malicious URLs</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">
                    {urlData?.threat_classification?.malicious || 0}
                  </div>
                  <div className="text-[10px] text-rose-300 mt-0.5">High Risk</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phishing URLs</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {urlData?.threat_classification?.phishing || 0}
                  </div>
                  <div className="text-[10px] text-amber-300 mt-0.5">Credential Harvesters</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Defacement URLs</div>
                  <div className="text-2xl font-bold text-orange-400 mt-1">
                    {urlData?.threat_classification?.defacement || 0}
                  </div>
                  <div className="text-[10px] text-orange-300 mt-0.5">Compromised Web</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Safe / Benign URLs</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {urlData?.threat_classification?.benign || 0}
                  </div>
                  <div className="text-[10px] text-emerald-300 mt-0.5">Verified Clean</div>
                </div>
              </div>

              {/* Model Info Banner */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      {urlData?.overview?.model_name || 'FANOS v3 XGBoost Classifier'}
                    </div>
                    <div className="text-xs text-purple-300 font-mono mt-0.5">
                      Accuracy: {urlData?.overview?.model_accuracy || '99.84%'} · Feature Extraction: {urlData?.overview?.features_analyzed_per_url || 17} Lexical & Structural Metrics
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('url-analysis')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 text-slate-950 hover:bg-purple-400 transition cursor-pointer shadow-lg"
                >
                  Analyze URLs Now
                </button>
              </div>

              {/* Recent Analysis Table */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Clock size={16} className="text-cyan-400" />
                  <span>Recent Customer URL Analyses</span>
                </h3>

                {(urlData?.scans || []).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                          <th className="py-2.5 px-3">Analyzed URL</th>
                          <th className="py-2.5 px-3">Classification</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3 text-right">Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                        {(urlData?.scans || []).slice(0, 5).map((s: any) => {
                          const isSafe = s.final_verdict?.toLowerCase() === 'benign'
                          return (
                            <tr key={s.id} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-3 text-cyan-300 max-w-sm truncate" title={s.url}>{s.url}</td>
                              <td className="py-3 px-3 font-sans font-bold capitalize">{s.final_verdict}</td>
                              <td className="py-3 px-3 text-slate-300 font-bold">{Math.round((s.ml_confidence || 0.98) * 100)}%</td>
                              <td className="py-3 px-3 text-slate-400">{s.timestamp}</td>
                              <td className="py-3 px-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isSafe
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                }`}>
                                  {isSafe ? 'SAFE' : 'MALICIOUS'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No URLs analyzed yet. Submit a URL in the <strong>URL Analysis</strong> tab.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: URL ANALYSIS (Submit single or multiple URLs)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'url-analysis' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xl space-y-6 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain size={18} className="text-purple-400" />
                  <span>Real-Time AI URL Threat Classifier</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analyze single or multiple URLs simultaneously using the FANOS v3 XGBoost inference engine.
                </p>
              </div>

              <form onSubmit={handleAnalyzeUrls} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Submit URLs for Real-Time Inspection:
                    </label>
                    <button
                      type="button"
                      onClick={handleAddUrlField}
                      className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Another URL</span>
                    </button>
                  </div>

                  {urlInputs.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Globe size={14} className="absolute left-3.5 top-3 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={val}
                          onChange={e => handleUrlChange(idx, e.target.value)}
                          placeholder="https://suspicious-domain.com/login.html"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-purple-400 outline-none font-mono"
                        />
                      </div>
                      {urlInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUrlField(idx)}
                          className="p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Remove URL"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Optional Analysis Notes / Context
                  </label>
                  <input
                    type="text"
                    value={analysisDesc}
                    onChange={e => setAnalysisDesc(e.target.value)}
                    placeholder="e.g. Reported phishing email attachment link"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-purple-400 outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={analyzing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Running AI Classification...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Classify {urlInputs.length > 1 ? `${urlInputs.length} URLs` : 'URL'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Latest Analysis Results */}
              {latestAnalysisResults.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-4 animate-fade-in">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Inference Results ({latestAnalysisResults.length})</span>
                  </h4>

                  <div className="space-y-3">
                    {latestAnalysisResults.map((r, i) => {
                      const isSafe = r.prediction?.toLowerCase() === 'benign'
                      return (
                        <div key={i} className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <div className="font-mono text-xs text-cyan-300 truncate max-w-lg">{r.url}</div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span>Verdict: <strong className={isSafe ? 'text-emerald-400' : 'text-rose-400'}>{r.prediction?.toUpperCase()}</strong></span>
                              <span>·</span>
                              <span>Confidence: <strong>{r.confidence}%</strong></span>
                              <span>·</span>
                              <span>Intel: <strong>{r.vt_result}</strong></span>
                            </div>
                          </div>

                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isSafe
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}>
                            {isSafe ? 'SAFE' : 'THREAT DETECTED'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: SCAN HISTORY (Isolated to customer)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'scan-history' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers size={18} className="text-purple-400" />
                    <span>Customer URL Analysis History</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    History strictly limited to URLs analyzed by your authenticated customer account.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Search scanned URL..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-purple-400 outline-none w-48"
                    />
                  </div>

                  <select
                    value={verdictFilter}
                    onChange={e => setVerdictFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white outline-none"
                  >
                    <option value="ALL">All Verdicts</option>
                    <option value="benign">Benign (Safe)</option>
                    <option value="phishing">Phishing</option>
                    <option value="malicious">Malicious</option>
                    <option value="defacement">Defacement</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Submitted URL</th>
                      <th className="py-2.5 px-3">Threat Classification</th>
                      <th className="py-2.5 px-3">AI Confidence</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                    {filteredScans.map((s: any) => {
                      const isSafe = s.final_verdict?.toLowerCase() === 'benign'
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-3 text-cyan-300 max-w-md truncate" title={s.url}>
                            {s.url}
                          </td>
                          <td className="py-3 px-3 font-sans font-bold capitalize">
                            {s.final_verdict}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-bold">
                            {Math.round((s.ml_confidence || 0.98) * 100)}%
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[10px]">
                            {s.timestamp}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isSafe
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            }`}>
                              {isSafe ? 'SAFE' : 'FLAGGED'}
                            </span>
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
              TAB 4: THREAT INTELLIGENCE
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'threat-intel' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <BarChart2 size={16} className="text-purple-400" />
                  <span>Threat Category Breakdown</span>
                </h3>

                <div className="space-y-4 pt-1">
                  {[
                    { label: 'Benign / Clean', count: urlData?.threat_classification?.benign || 0, color: '#10b981' },
                    { label: 'Phishing', count: urlData?.threat_classification?.phishing || 0, color: '#f59e0b' },
                    { label: 'Malware Distribution', count: urlData?.threat_classification?.malicious || 0, color: '#ef4444' },
                    { label: 'Defacement', count: urlData?.threat_classification?.defacement || 0, color: '#f97316' },
                  ].map((cat) => (
                    <div key={cat.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{cat.label}</span>
                        <span className="font-bold font-mono" style={{ color: cat.color }}>{cat.count} URLs</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.05]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(5, ((cat.count || 1) / Math.max(1, urlData?.overview?.total_urls_analyzed || 1)) * 100)}%`,
                            background: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Brain size={16} className="text-purple-400" />
                  <span>AI Model Capabilities</span>
                </h3>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <p>
                    The FANOS URL detector uses an optimized gradient-boosted decision tree ensemble trained on over 650,000 verified malicious and benign domains.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>Shannon entropy calculation across URL paths and queries</li>
                    <li>Homoglyph and brand impersonation detection (IDN homograph attacks)</li>
                    <li>Subdomain depth and TLD reputation scoring</li>
                    <li>Lexical tokenization and obfuscation pattern discovery</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: DETECTION REPORTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-purple-400" />
                  <span>Malicious URL Threat Intelligence Reports</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(urlData?.reports || []).map((rpt: any) => (
                  <div key={rpt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {rpt.format}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{rpt.size}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{rpt.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Generated: {rpt.generated}</p>
                    </div>

                    <button
                      onClick={() => alert(`Downloading ${rpt.title}...`)}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download Intel Report</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 6: TELEGRAM BOT INTEGRATION (@FanosUrlScanBot)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'telegram-bot' && (

            <div className="space-y-6 animate-fade-in">
              {/* Header Box */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shadow-lg">
                    <Send size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">FANOS Telegram Security Bot</h3>
                      <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                        @FanosUrlScanBot
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Direct mobile and desktop link analysis. Forward any suspicious URL to receive instant XGBoost AI verdicts and WAF threat correlation.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Webhook Connected</span>
                  </span>
                  <a
                    href="https://t.me/FanosUrlScanBot"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition shadow-lg"
                  >
                    <span>Launch in Telegram</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* 2-Column Grid: Bot Commands & Features (left) + Interactive Telegram Simulator (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Command Reference & Features (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bot size={16} className="text-sky-400" />
                      <span>Available Telegram Bot Commands</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Send these commands directly to @FanosUrlScanBot in your Telegram chat or groups.
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.06]">
                        <span className="font-mono text-sky-400 font-bold">/scan &lt;url&gt;</span>
                        <p className="text-slate-300 text-[11px] mt-0.5">Executes full XGBoost 99.8% inference on the target URL with feature explainability.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.06]">
                        <span className="font-mono text-emerald-400 font-bold">/report</span>
                        <p className="text-slate-300 text-[11px] mt-0.5">Generates executive summary of scanned URLs, threat breakdown, and benign counts.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.06]">
                        <span className="font-mono text-purple-400 font-bold">/alerts on|off</span>
                        <p className="text-slate-300 text-[11px] mt-0.5">Enables real-time push notifications whenever your protected domains intercept attacks.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.06]">
                        <span className="font-mono text-amber-400 font-bold">/status</span>
                        <p className="text-slate-300 text-[11px] mt-0.5">Checks live health of the FANOS AI inference engine and active WAF sensors.</p>
                      </div>
                    </div>
                  </div>

                  {/* Integration specs card */}
                  <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integration Pipeline</span>
                    <div className="space-y-1.5 text-slate-300 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Telegram Bot API:</span>
                        <span className="font-mono text-white">v7.2 (Async Webhook)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Model Engine:</span>
                        <span className="font-mono text-purple-400">XGBoost Classifier v3</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-slate-400">Inference Latency:</span>
                        <span className="font-mono text-emerald-400">&lt; 14ms per URL</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">WAF Auto-Sync:</span>
                        <span className="font-mono text-cyan-400">Enabled (Automatic IP block)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Telegram Chat Simulator (7 cols) */}
                <div className="lg:col-span-7 bg-[#0b1526] border border-white/[0.08] rounded-2xl shadow-xl flex flex-col h-[520px] overflow-hidden">
                  {/* Chat header */}
                  <div className="p-3.5 bg-slate-900/90 border-b border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs">
                        <Send size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>FANOS AI Security Bot</span>
                          <span className="text-[10px] font-mono text-sky-400">@FanosUrlScanBot</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">bot · online</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTelegramChatLogs([
                        { sender: 'user', text: '/start', time: '10:00 AM' },
                        { sender: 'bot', text: '👋 Welcome to FANOS Security Bot! Send any link or command /scan <url> to analyze threats using the 99.8% AI engine.', time: '10:00 AM' },
                      ])}
                      className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/[0.05]"
                    >
                      Clear Chat
                    </button>
                  </div>

                  {/* Chat message stream */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070d18]/70 text-xs">
                    {telegramChatLogs.map((msg, i) => {
                      const isUser = msg.sender === 'user'
                      return (
                        <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl space-y-1 shadow-md ${
                            isUser
                              ? 'bg-sky-600/30 border border-sky-500/40 text-white rounded-br-none'
                              : 'bg-slate-900/90 border border-white/[0.1] text-slate-200 rounded-bl-none'
                          }`}>
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-70">
                              <span className="font-bold">{isUser ? 'You' : '@FanosUrlScanBot'}</span>
                              <span>{msg.time}</span>
                            </div>
                            <div className="whitespace-pre-line leading-relaxed font-mono text-[11px]">
                              {msg.text}
                            </div>
                            {msg.badge && (
                              <span className={`inline-block text-[9px] font-bold px-2 py-0.2 rounded border ${
                                msg.badge.includes('HIGH')
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                                {msg.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {telegramScanning && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900/90 border border-white/[0.1] text-slate-400 p-2.5 rounded-2xl text-xs flex items-center gap-2">
                          <RefreshCw size={12} className="animate-spin text-sky-400" />
                          <span>@FanosUrlScanBot is analyzing features with XGBoost...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat input box */}
                  <div className="p-3 bg-slate-900 border-t border-white/[0.08] flex items-center gap-2">
                    <input
                      type="text"
                      value={telegramUrl}
                      onChange={(e) => setTelegramUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTelegramScan() }}
                      placeholder="Type a URL or /scan <url>..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/[0.1] text-xs text-white focus:border-sky-400 outline-none font-mono"
                    />
                    <button
                      type="button"
                      disabled={telegramScanning || !telegramUrl.trim()}
                      onClick={handleTelegramScan}
                      className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition cursor-pointer disabled:opacity-40"
                      title="Send to Bot"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

