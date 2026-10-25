import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, AlertTriangle, ArrowLeft, RefreshCw,
  Clock, CheckCircle2, XCircle, FileText, Activity,
  Plus, Search, Download, ShieldAlert,
  Layers, UserCheck
} from 'lucide-react'
import {
  getIncidentResponseServiceData,
  submitCustomerIncident,
} from '@/lib/api'

type IncidentTab = 'overview' | 'report-incident' | 'my-incidents' | 'investigation' | 'response-status' | 'reports'

export function CustomerIncidentResponsePage() {
  const [activeTab, setActiveTab] = useState<IncidentTab>('overview')
  const [incidentData, setIncidentData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Report Incident Form
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    affectedAsset: '',
    incidentCategory: 'Unauthorized Access',
    severity: 'High',
    detectionTime: new Date().toISOString().slice(0, 16),
    description: '',
  })
  const [submittingIncident, setSubmittingIncident] = useState(false)

  // Incident Investigation Detail modal
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null)

  // Incident Filter
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMsg('')

    try {
      const data = await getIncidentResponseServiceData()
      setIncidentData(data)
    } catch (err: any) {
      console.error('Failed to load Incident Response data:', err)
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch Incident Response service state.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incidentForm.title.trim() || !incidentForm.affectedAsset.trim() || !incidentForm.description.trim()) {
      setErrorMsg('Please complete all required fields.')
      return
    }

    setSubmittingIncident(true)
    setErrorMsg('')
    try {
      await submitCustomerIncident({
        title: incidentForm.title.trim(),
        affected_target: incidentForm.affectedAsset.trim(),
        incident_type: incidentForm.incidentCategory,
        severity: incidentForm.severity,
        detection_time: incidentForm.detectionTime,
        description: incidentForm.description.trim(),
      })
      setSuccessMsg('Security incident submitted successfully. SOC team alerted.')
      setIncidentForm({
        title: '',
        affectedAsset: '',
        incidentCategory: 'Unauthorized Access',
        severity: 'High',
        detectionTime: new Date().toISOString().slice(0, 16),
        description: '',
      })
      await loadData(true)
      setActiveTab('my-incidents')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit incident.')
    } finally {
      setSubmittingIncident(false)
    }
  }

  const filteredIncidents = (incidentData?.my_incidents || []).filter((inc: any) => {
    const matchesSearch = !searchFilter.trim() ||
      (inc.title && inc.title.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (inc.source_ip && inc.source_ip.toLowerCase().includes(searchFilter.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || inc.status?.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const NAV_ITEMS: { id: IncidentTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'report-incident', label: 'Report Incident', icon: AlertTriangle, badge: 'NEW' },
    { id: 'my-incidents', label: 'My Incidents', icon: Layers, badge: `${incidentData?.my_incidents?.length || 0}` },
    { id: 'investigation', label: 'Incident Investigation', icon: Search },
    { id: 'response-status', label: 'Response Status', icon: ShieldAlert },
    { id: 'reports', label: 'Incident Reports', icon: FileText },
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
            <Bell size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">FANOS Security Incident Response</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                24/7 SOC Triage
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Submit security events, track automated IP containment, and collaborate directly with FANOS SOC analysts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('report-incident')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-md"
          >
            <Plus size={13} />
            <span>Report Incident</span>
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
                  ? 'bg-amber-500/20 text-white font-bold border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <IconCmp size={14} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && !incidentData ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-amber-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading incident response operations...</p>
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
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Incidents</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {incidentData?.overview?.total_incidents || 0}
                  </div>
                  <div className="text-[10px] text-amber-400 mt-0.5">Reported Cases</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Open Incidents</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {incidentData?.overview?.open_incidents || 0}
                  </div>
                  <div className="text-[10px] text-amber-300 mt-0.5">Awaiting Triage</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Critical Incidents</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">
                    {((incidentData?.my_incidents || []).filter((i: any) => i.severity === 'CRITICAL')).length}
                  </div>
                  <div className="text-[10px] text-rose-300 mt-0.5">High Urgency</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Investigating</div>
                  <div className="text-2xl font-bold text-cyan-300 mt-1">
                    {incidentData?.investigation_status?.investigating || 0}
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">Analyst Assigned</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Resolved Incidents</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {incidentData?.overview?.resolved_incidents || 0}
                  </div>
                  <div className="text-[10px] text-emerald-300 mt-0.5">Contained & Closed</div>
                </div>
              </div>

              {/* SLA & Response Team Bar */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      {incidentData?.overview?.soc_team || 'FANOS AI 24/7 Rapid Response Team'}
                    </div>
                    <div className="text-xs text-amber-300 font-mono mt-0.5">
                      Average Mean Time to Respond (MTTR): {incidentData?.overview?.average_mttr || '18 minutes'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('report-incident')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-lg"
                >
                  Submit Incident Report
                </button>
              </div>

              {/* My Incidents Preview */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Clock size={16} className="text-cyan-400" />
                  <span>Recent Security Incidents</span>
                </h3>

                {(incidentData?.my_incidents || []).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Severity</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Affected Asset</th>
                          <th className="py-2.5 px-3">Reported</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {(incidentData?.my_incidents || []).map((inc: any) => (
                          <tr key={inc.id} className="hover:bg-white/[0.02] transition cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                            <td className="py-3 px-3 font-bold text-white">{inc.title}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                inc.severity === 'CRITICAL'
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                  : inc.severity === 'HIGH'
                                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              }`}>
                                {inc.severity}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{inc.threat}</td>
                            <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">{inc.source_ip}</td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">{inc.created_at}</td>
                            <td className="py-3 px-3 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                {inc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No security incidents reported. Click <strong>Report Incident</strong> if suspicious activity is detected.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: REPORT INCIDENT
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'report-incident' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xl space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-white/[0.06] pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <span>Report Cybersecurity Incident</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submit critical events directly to the FANOS AI SOC team for triage and automated containment.
                </p>
              </div>

              <form onSubmit={handleSubmitIncident} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Incident Title *</label>
                  <input
                    type="text"
                    required
                    value={incidentForm.title}
                    onChange={e => setIncidentForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Unusual Outbound Traffic on Database Server"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Affected Asset / Target *</label>
                    <input
                      type="text"
                      required
                      value={incidentForm.affectedAsset}
                      onChange={e => setIncidentForm(p => ({ ...p, affectedAsset: e.target.value }))}
                      placeholder="e.g. 10.0.1.25 / db-internal.customer.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-amber-400 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Incident Category</label>
                    <select
                      value={incidentForm.incidentCategory}
                      onChange={e => setIncidentForm(p => ({ ...p, incidentCategory: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-amber-400 outline-none"
                    >
                      <option value="Malware">Malware</option>
                      <option value="Phishing">Phishing</option>
                      <option value="Unauthorized Access">Unauthorized Access</option>
                      <option value="Web Application Attack">Web Application Attack</option>
                      <option value="Network Intrusion">Network Intrusion</option>
                      <option value="Suspicious Activity">Suspicious Activity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Severity Level</label>
                    <select
                      value={incidentForm.severity}
                      onChange={e => setIncidentForm(p => ({ ...p, severity: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-amber-400 outline-none"
                    >
                      <option value="Critical">CRITICAL — High Data Breach Risk</option>
                      <option value="High">HIGH — Compromised Node / Active Probe</option>
                      <option value="Medium">MEDIUM — Suspicious Activity / Port Scan</option>
                      <option value="Low">LOW — Minor Policy Anomaly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Observed Detection Time</label>
                    <input
                      type="datetime-local"
                      value={incidentForm.detectionTime}
                      onChange={e => setIncidentForm(p => ({ ...p, detectionTime: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Detailed Event Description *</label>
                  <textarea
                    rows={4}
                    required
                    value={incidentForm.description}
                    onChange={e => setIncidentForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the sequence of suspicious actions, affected user accounts, anomalous logs, or payload evidence..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingIncident}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {submittingIncident ? 'Submitting to SOC...' : 'Submit Incident Report'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: MY INCIDENTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'my-incidents' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers size={18} className="text-amber-400" />
                    <span>Customer Security Incidents</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Track investigation status and administrator response for your reported incidents.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      placeholder="Search title, asset..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-amber-400 outline-none w-48"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Affected Asset</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredIncidents.map((inc: any) => (
                      <tr
                        key={inc.id}
                        className="hover:bg-white/[0.02] transition cursor-pointer"
                        onClick={() => setSelectedIncident(inc)}
                      >
                        <td className="py-3 px-3 font-bold text-white">{inc.title}</td>
                        <td className="py-3 px-3 text-slate-300">{inc.threat}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                              : inc.severity === 'HIGH'
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          }`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">{inc.source_ip}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">{inc.created_at}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {inc.status}
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
              TAB 4: INCIDENT INVESTIGATION
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'investigation' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search size={18} className="text-cyan-400" />
                  <span>SOC Investigation & Containment Workflows</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Triage Step 1</div>
                  <h4 className="text-sm font-bold text-white">Automated Evidence Capture</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Suricata network flow dumps and WAF HTTP transaction logs matching the affected asset are correlated.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Triage Step 2</div>
                  <h4 className="text-sm font-bold text-white">Threat Containment</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Malicious IP blocking rules and host quarantine playbooks deployed across perimeter firewalls.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Triage Step 3</div>
                  <h4 className="text-sm font-bold text-white">Analyst Debrief & Closeout</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Formal incident closeout notes and post-incident compliance reports issued to customer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: RESPONSE STATUS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'response-status' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-emerald-400" />
                  <span>Active Containment Actions</span>
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white">Automated Malicious IP Quarantine</span>
                    <p className="text-slate-400">Suspicious external sources targeting your scope are immediately synced with WAF denylist.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ENABLED
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white">SOC Analyst Notification Pipeline</span>
                    <p className="text-slate-400">High & Critical incidents trigger real-time alerts to the on-call security response center.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 6: REPORTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-amber-400" />
                  <span>Incident Response Audit Reports</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(incidentData?.reports || []).map((rpt: any) => (
                  <div key={rpt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {rpt.format}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{rpt.size}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{rpt.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Generated: {rpt.generated}</p>
                    </div>

                    <button
                      onClick={() => alert(`Downloading ${rpt.title}...`)}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download Incident Log</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Incident Details Modal ──────────────────────────────── */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-amber-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">{selectedIncident.title}</h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-950/80 border border-white/[0.08] rounded-xl p-4 text-xs font-mono space-y-2">
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Severity:</span>
                <span className="text-rose-400 font-bold">{selectedIncident.severity}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Category:</span>
                <span className="text-white">{selectedIncident.threat}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Affected Scope:</span>
                <span className="text-cyan-300">{selectedIncident.source_ip}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Status:</span>
                <span className="text-amber-400">{selectedIncident.status}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-sans block mb-1">Description:</span>
                <p className="text-slate-200 font-sans leading-relaxed">{selectedIncident.description}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.12] text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
