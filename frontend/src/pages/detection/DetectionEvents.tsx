import { useState, useMemo } from 'react'
import {
  Zap,
  Search,
  Download,
  RefreshCw,
  X,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useLiveEvents } from '@/hooks/useDashboard'
import { SecurityEvent } from '@/types'
import { severityClass, statusClass, riskColor, timeAgo } from '@/lib/utils'

export default function DetectionEvents() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [sensorFilter, setSensorFilter] = useState<string>('ALL')
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [copied, setCopied] = useState(false)

  const queryParams = useMemo(() => {
    return {
      limit: 100,
      severity: severityFilter === 'ALL' ? undefined : severityFilter,
      sensor_source: sensorFilter === 'ALL' ? undefined : sensorFilter,
      search: search.trim() ? search.trim() : undefined,
    }
  }, [severityFilter, sensorFilter, search])

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLiveEvents(queryParams)

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCSV = () => {
    if (!events.length) return
    const headers = [
      'Event ID',
      'Created At',
      'Severity',
      'Attack Type',
      'Source IP',
      'Target',
      'Sensor Source',
      'Risk Score',
      'AI Confidence (%)',
      'Status',
    ]
    const rows = events.map((e) => [
      e.id,
      e.created_at || e.timestamp || '',
      e.severity,
      `"${(e.attack_type || '').replace(/"/g, '""')}"`,
      e.source_ip,
      `"${(e.target || '').replace(/"/g, '""')}"`,
      e.sensor_source || 'fanos-ai',
      e.risk_score,
      e.ai_confidence,
      e.status,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `fanos_events_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <PageShell
      title="Detection Events"
      subtitle="Real-time security telemetry from Suricata IDS, Zeek collectors, and ML anomaly models"
      badge={{
        label: `${events.length} TELEMETRY RECORDS`,
        color: isError ? 'red' : 'blue',
      }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition"
            title="Refresh stream"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin text-fanos-accent' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={!events.length}
            className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition disabled:opacity-40"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      {/* Search and Filters Bar */}
      <div className="bg-[#12161f]/80 backdrop-blur border border-white/[0.08] rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by IP address, signature, target..."
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
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-lg border border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold text-gray-400 px-2 flex items-center gap-1">
              <Filter size={10} /> Sev:
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                  severityFilter === s
                    ? 'bg-fanos-accent/20 text-fanos-accent border border-fanos-accent/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-lg border border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold text-gray-400 px-2">Source:</span>
            {['ALL', 'suricata', 'fanos-ai'].map((src) => (
              <button
                key={src}
                onClick={() => setSensorFilter(src)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition uppercase ${
                  sensorFilter === src
                    ? 'bg-fanos-accent/20 text-fanos-accent border border-fanos-accent/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 flex items-center justify-between text-red-400 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-red-400 shrink-0" />
            <span>
              Failed to load live security events from backend API: {(error as Error)?.message || 'Connection refused'}.
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded border border-red-500/30 transition text-xs font-medium"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title flex items-center gap-2">
            <Zap size={14} className="text-fanos-accent" />
            <span>Telemetry Ingestion Stream</span>
            {isFetching && <span className="text-[10px] text-fanos-dim animate-pulse">(updating...)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="dot-green" />
            <span className="text-[11px] font-mono text-fanos-dim">DB & SENSOR CONNECTED</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                {[
                  'Event ID',
                  'Timestamp',
                  'Severity',
                  'Attack Type / Signature',
                  'Source IP',
                  'Target / Destination',
                  'Sensor Source',
                  'AI Confidence',
                  'Risk',
                  'Status',
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-3.5 py-3 text-center text-xs text-fanos-dim">
                      Loading real-time telemetry...
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-fanos-dim text-xs">
                    <ShieldAlert size={28} className="mx-auto mb-2 text-gray-600 opacity-60" />
                    No security events found matching current criteria.
                  </td>
                </tr>
              ) : (
                events.map((e) => {
                  const eventTime = e.created_at || e.timestamp
                  return (
                    <tr
                      key={String(e.id)}
                      onClick={() => setSelectedEvent(e)}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    >
                      <td className="px-3.5 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap group-hover:underline">
                        {String(e.id).slice(0, 8)}
                      </td>
                      <td className="px-3.5 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">
                        {eventTime ? timeAgo(new Date(eventTime)) : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={severityClass(e.severity)}>{e.severity}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-fanos-text font-medium whitespace-nowrap max-w-[200px] truncate" title={e.attack_type}>
                        {e.attack_type}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-amber-300 whitespace-nowrap">
                        {e.source_ip}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-fanos-muted max-w-[180px] truncate" title={e.target}>
                        {e.target}
                      </td>
                      <td className="px-3.5 py-2.5 text-[10px] font-mono text-cyan-400 whitespace-nowrap uppercase">
                        {e.sensor_source || 'fanos-ai'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-fanos-accent"
                              style={{ width: `${Math.min(100, Math.max(0, e.ai_confidence))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-fanos-text">
                            {e.ai_confidence.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-3.5 py-2.5 text-[12px] font-bold font-mono ${riskColor(e.risk_score)}`}>
                        {e.risk_score}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={statusClass(e.status)}>{e.status}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-white/[0.04] flex justify-between items-center text-[10px] text-fanos-dim">
          <span>
            Displaying {events.length} ingested security records {severityFilter !== 'ALL' && `(${severityFilter})`}
          </span>
          <span className="text-gray-500">Click any row to inspect deep packet & payload evidence</span>
        </div>
      </div>

      {/* Event Details Modal / Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <span className={severityClass(selectedEvent.severity)}>{selectedEvent.severity}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedEvent.attack_type}</h3>
                  <p className="text-[11px] font-mono text-fanos-dim">Event ID: {selectedEvent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Flow Visualizer */}
              <div className="bg-[#0a0d14] rounded-xl p-4 border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Source Host</span>
                  <span className="font-mono text-amber-300 text-sm font-medium">{selectedEvent.source_ip}</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <span className="text-[10px] uppercase font-mono text-fanos-dim mb-1">
                    {selectedEvent.sensor_source || 'NETWORK'}
                  </span>
                  <div className="flex items-center gap-1 text-fanos-accent">
                    <div className="w-8 h-px bg-fanos-accent/40" />
                    <ArrowRight size={14} />
                    <div className="w-8 h-px bg-fanos-accent/40" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Destination Target</span>
                  <span className="font-mono text-cyan-300 text-sm font-medium">{selectedEvent.target}</span>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Risk Score</span>
                  <span className={`text-base font-bold font-mono ${riskColor(selectedEvent.risk_score)}`}>
                    {selectedEvent.risk_score} / 100
                  </span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">AI Confidence</span>
                  <span className="text-base font-bold font-mono text-fanos-accent">
                    {selectedEvent.ai_confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Mitigation Status</span>
                  <span className="mt-1 inline-block"><span className={statusClass(selectedEvent.status)}>{selectedEvent.status}</span></span>
                </div>
                <div className="bg-[#0a0d14] p-3 rounded-lg border border-white/[0.05]">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">Detected At</span>
                  <span className="text-xs font-mono text-gray-300 block mt-1 truncate" title={selectedEvent.created_at || selectedEvent.timestamp}>
                    {selectedEvent.created_at || selectedEvent.timestamp ? new Date(selectedEvent.created_at || selectedEvent.timestamp || '').toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              {/* Raw Payload / Evidence Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                    Telemetry Evidence Payload
                  </span>
                  <button
                    onClick={() =>
                      handleCopyPayload(
                        selectedEvent.raw_payload || JSON.stringify(selectedEvent, null, 2)
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-fanos-accent hover:text-white transition"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Payload'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#080a0f] border border-white/[0.06] rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto max-h-56 leading-relaxed">
                  {selectedEvent.raw_payload || JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/[0.08] flex justify-end bg-black/20">
              <button
                onClick={() => setSelectedEvent(null)}
                className="fanos-btn px-4 py-1.5 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
