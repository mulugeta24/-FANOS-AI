import { useState, useMemo } from 'react'
import {
  FileWarning,
  Plus,
  Eye,
  Search,
  Filter,
  RefreshCw,
  X,
  ShieldAlert,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useIncidents, useUpdateIncident, useCreateIncident } from '@/hooks/useDashboard'
import { severityClass, statusClass, riskColor, timeAgo } from '@/lib/utils'
import type { Incident, Severity } from '@/types'

export default function Incidents() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

  // Edit state in Drawer
  const [editStatus, setEditStatus] = useState<string>('')
  const [editAssigned, setEditAssigned] = useState<string>('')

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newThreat, setNewThreat] = useState('SQL Injection')
  const [newSeverity, setNewSeverity] = useState<Severity>('HIGH')
  const [newSourceIp, setNewSourceIp] = useState('')
  const [newRiskScore, setNewRiskScore] = useState<number>(85)
  const [newAssignedTo, setNewAssignedTo] = useState('SOC Analyst')
  const [newDescription, setNewDescription] = useState('')

  const {
    data: incidents = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useIncidents(statusFilter, search)

  const updateMutation = useUpdateIncident()
  const createMutation = useCreateIncident()

  // Real KPI metrics from fetched incidents
  const metrics = useMemo(() => {
    return {
      total: incidents.length,
      critical: incidents.filter((i) => i.severity === 'CRITICAL').length,
      high: incidents.filter((i) => i.severity === 'HIGH').length,
      investigating: incidents.filter((i) => i.status.toLowerCase() === 'investigating').length,
      contained: incidents.filter((i) => i.status.toLowerCase() === 'contained').length,
      resolved: incidents.filter((i) => i.status.toLowerCase() === 'resolved').length,
    }
  }, [incidents])

  const handleSelectIncident = (inc: Incident) => {
    setSelectedIncident(inc)
    setEditStatus(inc.status)
    setEditAssigned(inc.assigned_to || 'SOC Analyst')
    setActionSuccessMsg(null)
  }

  const handleSaveTriage = async () => {
    if (!selectedIncident) return
    try {
      await updateMutation.mutateAsync({
        id: selectedIncident.id,
        data: {
          status: editStatus,
          assigned_to: editAssigned,
        },
      })
      setSelectedIncident((prev) => (prev ? { ...prev, status: editStatus, assigned_to: editAssigned } : null))
      setActionSuccessMsg(`Incident ${selectedIncident.id.slice(0, 8)} updated successfully.`)
      setTimeout(() => setActionSuccessMsg(null), 3000)
    } catch (err) {
      console.error('Failed to update incident:', err)
    }
  }

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newSourceIp.trim()) return

    try {
      await createMutation.mutateAsync({
        title: newTitle.trim(),
        threat: newThreat,
        severity: newSeverity,
        source_ip: newSourceIp.trim(),
        status: 'Open',
        risk_score: newRiskScore,
        assigned_to: newAssignedTo,
        description: newDescription.trim() || undefined,
      })
      setIsCreateOpen(false)
      // reset form
      setNewTitle('')
      setNewSourceIp('')
      setNewDescription('')
    } catch (err) {
      console.error('Failed to create incident:', err)
    }
  }

  return (
    <PageShell
      title="Incident Response"
      subtitle="Persistent SOC case management and threat containment backed by PostgreSQL"
      badge={{
        label: `${metrics.investigating + (incidents.filter((i) => i.status.toLowerCase() === 'open').length)} ACTIVE CASES`,
        color: 'orange',
      }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition"
            title="Refresh incidents"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin text-fanos-accent' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="fanos-btn bg-fanos-accent/20 border-fanos-accent/50 text-fanos-accent hover:bg-fanos-accent/30 text-xs py-1.5 px-3 flex items-center gap-1.5 transition font-medium"
          >
            <Plus size={12} />
            <span>New Incident</span>
          </button>
        </div>
      }
    >
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Incidents', value: metrics.total, color: '#38bdf8' },
          { label: 'Critical Severity', value: metrics.critical, color: '#ef4444' },
          { label: 'High Severity', value: metrics.high, color: '#f97316' },
          { label: 'Investigating', value: metrics.investigating, color: '#eab308' },
          { label: 'Contained / Resolved', value: metrics.contained + metrics.resolved, color: '#10b981' },
        ].map((s) => (
          <div key={s.label} className="bg-[#12161f]/80 border border-white/[0.07] rounded-xl px-4 py-3 backdrop-blur shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{s.label}</div>
            <div className="text-2xl font-bold font-mono mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#12161f]/80 backdrop-blur border border-white/[0.08] rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        <div className="relative flex-1 max-w-md min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search incident title, threat, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d14] border border-white/[0.08] rounded-lg text-xs text-fanos-text placeholder:text-gray-500 focus:outline-none focus:border-fanos-accent transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 bg-[#0a0d14] p-1 rounded-lg border border-white/[0.06] text-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 px-2 flex items-center gap-1">
            <Filter size={10} /> Status:
          </span>
          {['ALL', 'Open', 'Investigating', 'Contained', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === st
                  ? 'bg-fanos-accent/20 text-fanos-accent border border-fanos-accent/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 flex items-center justify-between text-red-400 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-red-400 shrink-0" />
            <span>Failed to load incidents from PostgreSQL: {(error as Error)?.message || 'Database error'}.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded border border-red-500/30 transition text-xs font-medium"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Incidents Table */}
      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title flex items-center gap-2">
            <FileWarning size={14} className="text-fanos-accent" />
            <span>Incident Registry</span>
            {isFetching && <span className="text-[10px] text-fanos-dim animate-pulse">(syncing...)</span>}
          </div>
          <span className="text-[11px] font-mono text-fanos-dim">POSTGRESQL PERSISTENCE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                {[
                  'Case ID',
                  'Incident Title',
                  'Threat Category',
                  'Severity',
                  'Source IP',
                  'Status',
                  'Risk',
                  'Assigned Analyst',
                  'Detected',
                  'Action',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3.5 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-4 py-3 text-center text-xs text-fanos-dim">
                      Loading persistent incidents...
                    </td>
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-fanos-dim text-xs">
                    <ShieldCheck size={28} className="mx-auto mb-2 text-gray-600 opacity-60" />
                    No incidents found matching current status filter.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={String(inc.id)}
                    onClick={() => handleSelectIncident(inc)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-3.5 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap group-hover:underline">
                      {String(inc.id).slice(0, 8)}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-fanos-text font-semibold max-w-[220px] truncate" title={inc.title || inc.threat}>
                      {inc.title || inc.threat}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-fanos-muted whitespace-nowrap">
                      {inc.threat}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={severityClass(inc.severity)}>{inc.severity}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-amber-300 whitespace-nowrap">
                      {inc.source_ip}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={statusClass(inc.status)}>{inc.status}</span>
                    </td>
                    <td className={`px-3.5 py-2.5 text-[12px] font-bold font-mono ${riskColor(inc.risk_score)}`}>
                      {inc.risk_score}
                    </td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-muted whitespace-nowrap flex items-center gap-1.5 pt-3">
                      <User size={11} className="text-gray-500" />
                      <span>{inc.assigned_to || 'Unassigned'}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">
                      {timeAgo(new Date(inc.created_at))}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectIncident(inc)
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded bg-fanos-accent/10 text-fanos-accent border border-fanos-accent/30 hover:bg-fanos-accent/20 transition"
                      >
                        <Eye size={10} />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail & Triage Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <span className={severityClass(selectedIncident.severity)}>{selectedIncident.severity}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedIncident.title || selectedIncident.threat}
                  </h3>
                  <p className="text-[11px] font-mono text-fanos-dim">ID: {selectedIncident.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {actionSuccessMsg && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-300">
                  <CheckCircle2 size={14} />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Status & Attributes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Current Status</span>
                  <span className="mt-1 inline-block"><span className={statusClass(selectedIncident.status)}>{selectedIncident.status}</span></span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Threat Vector</span>
                  <span className="text-xs font-semibold text-white block mt-1">{selectedIncident.threat}</span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Adversary Source</span>
                  <span className="text-xs font-mono text-amber-300 block mt-1">{selectedIncident.source_ip}</span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Risk Assessment</span>
                  <span className={`text-sm font-bold font-mono block mt-1 ${riskColor(selectedIncident.risk_score)}`}>
                    {selectedIncident.risk_score} / 100
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-[#0a0d14] p-4 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5">
                  Analyst Notes & Description
                </span>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {selectedIncident.description || 'No detailed incident summary provided at creation.'}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-fanos-dim">
                  <Clock size={11} />
                  <span>Logged at {new Date(selectedIncident.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Triage / Workflow Action Panel */}
              <div className="p-4 bg-black/30 border border-white/[0.08] rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <AlertCircle size={14} className="text-fanos-accent" />
                  <span>Update Triage & Case Status</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Lifecycle State
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                    >
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Contained">Contained</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Assigned Investigator
                    </label>
                    <input
                      type="text"
                      value={editAssigned}
                      onChange={(e) => setEditAssigned(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveTriage}
                    disabled={updateMutation.isPending}
                    className="fanos-btn bg-fanos-accent/20 border-fanos-accent/40 text-fanos-accent hover:bg-fanos-accent/30 text-xs py-1.5 px-4 font-medium flex items-center gap-1.5 transition"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Updating Case...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        <span>Save Changes to Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.08] flex justify-end bg-black/20">
              <button
                onClick={() => setSelectedIncident(null)}
                className="fanos-btn px-4 py-1.5 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <FileWarning size={16} className="text-fanos-accent" />
                <h3 className="text-sm font-semibold text-white">Create New Security Case</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cobalt Strike Beaconing Detected"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Threat Category
                  </label>
                  <select
                    value={newThreat}
                    onChange={(e) => setNewThreat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                  >
                    <option value="SQL Injection">SQL Injection</option>
                    <option value="Brute Force">Brute Force</option>
                    <option value="Port Scan">Port Scan</option>
                    <option value="Command Injection">Command Injection</option>
                    <option value="XSS">Cross-Site Scripting</option>
                    <option value="DDoS Attack">DDoS Attack</option>
                    <option value="Ransomware Activity">Ransomware Activity</option>
                    <option value="Anomalous Flow">Anomalous Flow</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as Severity)}
                    className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Adversary Source IP *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.56.105"
                    value={newSourceIp}
                    onChange={(e) => setNewSourceIp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-fanos-accent transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Initial Risk Score (0-100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newRiskScore}
                    onChange={(e) => setNewRiskScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-fanos-accent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Assigned Lead
                </label>
                <input
                  type="text"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Investigation Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe observed network anomalies, Suricata alert IDs, or impacted assets..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-fanos-accent transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="fanos-btn px-4 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="fanos-btn bg-fanos-accent/20 border-fanos-accent/50 text-fanos-accent hover:bg-fanos-accent/30 px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <span>Create Incident</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
