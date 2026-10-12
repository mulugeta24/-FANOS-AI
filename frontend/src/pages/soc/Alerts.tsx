import { useState, useMemo } from 'react'
import {
  Bell,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  X,
  ArrowUpRight,
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useLiveEvents, useCreateIncident } from '@/hooks/useDashboard'
import { severityClass, riskColor, timeAgo } from '@/lib/utils'
import type { SecurityEvent, Severity } from '@/types'

export default function Alerts() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [selectedAlert, setSelectedAlert] = useState<SecurityEvent | null>(null)
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set())
  const [escalatingAlert, setEscalatingAlert] = useState<SecurityEvent | null>(null)
  const [escalateSuccess, setEscalateSuccess] = useState(false)

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLiveEvents({
    limit: 100,
    severity: severityFilter === 'ALL' ? undefined : severityFilter,
    search: search.trim() ? search.trim() : undefined,
  })

  const createIncidentMutation = useCreateIncident()

  // Filter alerts by search & severity
  const alerts = useMemo(() => {
    return events.map((e) => {
      const isAck = acknowledgedIds.has(String(e.id))
      return {
        ...e,
        alertStatus: isAck ? 'ACKNOWLEDGED' : (e.status === 'BLOCKED' ? 'BLOCKED' : 'NEW'),
      }
    })
  }, [events, acknowledgedIds])

  const newCount = alerts.filter((a) => a.alertStatus === 'NEW').length
  const ackCount = alerts.filter((a) => a.alertStatus === 'ACKNOWLEDGED').length
  const blockedCount = alerts.filter((a) => a.alertStatus === 'BLOCKED').length

  const handleAck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setAcknowledgedIds((prev) => new Set(prev).add(id))
  }

  const handleEscalateToIncident = async (alert: SecurityEvent) => {
    try {
      await createIncidentMutation.mutateAsync({
        title: `${alert.attack_type} Detected on ${alert.target}`,
        threat: alert.attack_type,
        severity: alert.severity as Severity,
        source_ip: alert.source_ip,
        status: 'Open',
        risk_score: alert.risk_score,
        assigned_to: 'SOC Analyst',
        description: `Escalated from real-time alert ${alert.id}. Sensor source: ${alert.sensor_source || 'fanos-ai'}. AI Confidence: ${alert.ai_confidence}%.`,
      })
      setAcknowledgedIds((prev) => new Set(prev).add(String(alert.id)))
      setEscalateSuccess(true)
      setTimeout(() => {
        setEscalateSuccess(false)
        setEscalatingAlert(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to escalate alert to incident:', err)
    }
  }

  return (
    <PageShell
      title="Security Alerts"
      subtitle="Prioritized alerts stream directly ingested from Suricata IDS and anomaly detection"
      badge={{ label: `${newCount} ACTIVE ALERTS`, color: 'red' }}
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin text-fanos-accent' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'New Alerts', value: newCount, color: '#ef4444' },
          { label: 'Acknowledged', value: ackCount, color: '#f59e0b' },
          { label: 'Automated Blocked', value: blockedCount, color: '#10b981' },
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
            placeholder="Search alert signature, target, source IP..."
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

        {/* Severity Filter Chips */}
        <div className="flex items-center gap-1.5 bg-[#0a0d14] p-1 rounded-lg border border-white/[0.06] text-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 px-2 flex items-center gap-1">
            <Filter size={10} /> Sev:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                severityFilter === s
                  ? 'bg-fanos-accent/20 text-fanos-accent border border-fanos-accent/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 flex items-center justify-between text-red-400 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-red-400 shrink-0" />
            <span>Failed to load live alerts from backend: {(error as Error)?.message}.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded border border-red-500/30 transition text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Alerts Table */}
      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title flex items-center gap-2">
            <Bell size={14} className="text-fanos-accent" />
            <span>Prioritized Alert Queue</span>
            {isFetching && <span className="text-[10px] text-fanos-dim animate-pulse">(updating...)</span>}
          </div>
          <span className="text-[11px] font-mono text-fanos-dim">{alerts.length} TELEMETRY ALERTS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                {[
                  'Alert ID',
                  'Severity',
                  'Signature / Title',
                  'Source IP',
                  'Target',
                  'Risk',
                  'Status',
                  'Time',
                  'Actions',
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
                    <td colSpan={9} className="px-4 py-3 text-center text-xs text-fanos-dim">
                      Loading alert queue...
                    </td>
                  </tr>
                ))
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-fanos-dim text-xs">
                    <ShieldCheck size={28} className="mx-auto mb-2 text-gray-600 opacity-60" />
                    No security alerts matching current criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr
                    key={String(a.id)}
                    onClick={() => setSelectedAlert(a)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-3.5 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap group-hover:underline">
                      {String(a.id).slice(0, 8)}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={severityClass(a.severity)}>{a.severity}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-fanos-text font-semibold max-w-[220px] truncate" title={a.attack_type}>
                      {a.attack_type}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-amber-300 whitespace-nowrap">
                      {a.source_ip}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-fanos-muted max-w-[150px] truncate" title={a.target}>
                      {a.target}
                    </td>
                    <td className={`px-3.5 py-2.5 text-[12px] font-bold font-mono ${riskColor(a.risk_score)}`}>
                      {a.risk_score}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${
                          a.alertStatus === 'ACKNOWLEDGED'
                            ? 'bg-amber-500/10 text-fanos-amber border border-amber-500/25'
                            : a.alertStatus === 'BLOCKED'
                            ? 'bg-emerald-500/10 text-fanos-green border border-emerald-500/25'
                            : 'bg-red-500/10 text-fanos-red border border-red-500/25'
                        }`}
                      >
                        {a.alertStatus}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">
                      {a.created_at || a.timestamp ? timeAgo(new Date(a.created_at || a.timestamp || '')) : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedAlert(a)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-fanos-accent/10 text-fanos-accent border border-fanos-accent/30 hover:bg-fanos-accent/20 transition"
                        >
                          <Eye size={10} />
                          <span>View</span>
                        </button>
                        {a.alertStatus !== 'ACKNOWLEDGED' && (
                          <button
                            onClick={(e) => handleAck(String(a.id), e)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
                          >
                            <CheckCircle2 size={10} />
                            <span>Ack</span>
                          </button>
                        )}
                        <button
                          onClick={() => setEscalatingAlert(a)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition"
                          title="Promote this alert to a formal incident"
                        >
                          <ArrowUpRight size={10} />
                          <span>Case</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert View Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-white/[0.1] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2.5">
                <span className={severityClass(selectedAlert.severity)}>{selectedAlert.severity}</span>
                <h3 className="text-sm font-semibold text-white">{selectedAlert.attack_type}</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Source Host</span>
                  <span className="text-xs font-mono text-amber-300 font-semibold block mt-1">{selectedAlert.source_ip}</span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Target Asset</span>
                  <span className="text-xs font-mono text-cyan-300 font-semibold block mt-1">{selectedAlert.target}</span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Sensor Source</span>
                  <span className="text-xs font-mono text-white uppercase block mt-1">{selectedAlert.sensor_source || 'fanos-ai'}</span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">AI Model Confidence</span>
                  <span className="text-xs font-mono text-fanos-accent font-semibold block mt-1">{selectedAlert.ai_confidence}%</span>
                </div>
              </div>

              {selectedAlert.raw_payload && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Raw Telemetry</span>
                  <pre className="p-3 bg-[#080a0f] border border-white/[0.06] rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto max-h-48">
                    {selectedAlert.raw_payload}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-white/[0.08] flex justify-between bg-black/20">
              <button
                onClick={() => {
                  const target = selectedAlert
                  setSelectedAlert(null)
                  setEscalatingAlert(target)
                }}
                className="fanos-btn bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-xs py-1.5 px-3 flex items-center gap-1.5 transition"
              >
                <ArrowUpRight size={12} />
                <span>Promote to Incident Case</span>
              </button>
              <button
                onClick={() => setSelectedAlert(null)}
                className="fanos-btn px-4 py-1.5 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Confirmation Modal */}
      {escalatingAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-purple-400" />
              <span>Promote Alert to Active Incident Case</span>
            </h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Create a formal SOC incident case for <strong className="text-white">{escalatingAlert.attack_type}</strong> from <span className="font-mono text-amber-300">{escalatingAlert.source_ip}</span>?
            </p>

            {escalateSuccess ? (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} />
                <span>Case successfully created in PostgreSQL!</span>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setEscalatingAlert(null)}
                className="fanos-btn px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEscalateToIncident(escalatingAlert)}
                disabled={createIncidentMutation.isPending || escalateSuccess}
                className="fanos-btn bg-purple-500/20 border-purple-500/50 text-purple-200 hover:bg-purple-500/30 px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition"
              >
                {createIncidentMutation.isPending ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Creating Case...</span>
                  </>
                ) : (
                  <span>Confirm Promotion</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
