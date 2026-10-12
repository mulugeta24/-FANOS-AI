/**
 * Security Operations → Network Security → Suricata
 * Live Suricata IDS/IPS — telemetry, signature alerts, and EVE JSON analysis.
 */
import { useState, useMemo } from 'react'
import {
  Shield, AlertTriangle, Activity, Search,
  RefreshCw, Filter, Terminal, Copy, Check,
  X, Code,
} from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useSuricataEvents, useSuricataStats, useSystemHealth, useRefreshAll } from '@/hooks/useDashboard'
import { severityClass, statusClass, riskColor } from '@/lib/utils'
import type { SecurityEvent } from '@/types'

const TABS = ['Live Alerts', 'Overview', 'Raw EVE Logs'] as const
type Tab = typeof TABS[number]

export default function SuricataPage() {
  const [tab, setTab] = useState<Tab>('Live Alerts')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SURICATA' | 'ML_FLOW'>('ALL')
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: rawEvents = [], isFetching: eventsFetching } = useSuricataEvents(100, 24)
  const { data: stats } = useSuricataStats(24)
  const { data: health } = useSystemHealth()
  const refreshAll = useRefreshAll()

  // Filter events
  const filteredEvents = useMemo(() => {
    return rawEvents.filter(ev => {
      // Severity filter
      if (severityFilter !== 'ALL' && ev.severity.toUpperCase() !== severityFilter) {
        return false
      }
      // Source filter
      if (sourceFilter === 'SURICATA' && ev.sensor_source === 'fanos-ml-flow-experimental') {
        return false
      }
      if (sourceFilter === 'ML_FLOW' && ev.sensor_source !== 'fanos-ml-flow-experimental') {
        return false
      }
      // Search term
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchesTerm =
          ev.source_ip.toLowerCase().includes(term) ||
          ev.target.toLowerCase().includes(term) ||
          ev.attack_type.toLowerCase().includes(term) ||
          (ev.id && String(ev.id).toLowerCase().includes(term))
        if (!matchesTerm) return false
      }
      return true
    })
  }, [rawEvents, severityFilter, sourceFilter, search])

  // Aggregate category counts from real events
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    rawEvents.forEach(ev => {
      const cat = ev.attack_type || 'Unclassified'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [rawEvents])

  // Copy raw payload helper
  const handleCopyPayload = (payload: any) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse raw payload safely for modal
  const parsedModalPayload = useMemo(() => {
    if (!selectedEvent?.raw_payload) return null
    try {
      return JSON.parse(selectedEvent.raw_payload)
    } catch {
      return selectedEvent.raw_payload
    }
  }, [selectedEvent])

  const totalCount = stats?.total_events ?? rawEvents.length
  const alertCount = stats?.alerts ?? rawEvents.filter(e => e.status === 'ALERT').length
  const criticalCount = stats?.critical ?? rawEvents.filter(e => e.severity === 'CRITICAL').length
  const highCount = stats?.high ?? rawEvents.filter(e => e.severity === 'HIGH').length
  const isCollectorActive = health?.suricata === 'active'

  return (
    <PageShell
      title="Suricata — Network IDS/IPS"
      subtitle="Live network telemetry streaming from Suricata sensor at 192.168.56.101"
      badge={{
        label: isCollectorActive ? 'STREAMING' : 'IDLE',
        color: isCollectorActive ? 'green' : 'orange',
      }}
      actions={
        <button
          onClick={() => refreshAll()}
          className="fanos-btn flex items-center gap-1.5 text-[11px]"
          title="Refresh Suricata events"
        >
          <RefreshCw size={11} className={eventsFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      {/* ── Engine Info Bar ──────────────────────────────── */}
      <div className="fanos-card p-4 flex items-center gap-5 flex-wrap">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[16px] font-black flex-shrink-0"
          style={{ background: 'rgba(0,200,255,0.12)', border: '1px solid rgba(0,200,255,0.3)', color: '#00c8ff' }}
        >
          S
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white">Suricata IDS/IPS Engine</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{
                background: isCollectorActive ? 'rgba(0,229,160,0.1)' : 'rgba(245,158,11,0.1)',
                color: isCollectorActive ? '#00e5a0' : '#f59e0b',
                border: `1px solid ${isCollectorActive ? 'rgba(0,229,160,0.3)' : 'rgba(245,158,11,0.3)'}`,
              }}
            >
              {isCollectorActive ? 'Active Stream' : 'Idle'}
            </span>
          </div>
          <div className="text-[11px] text-fanos-muted mt-0.5">
            Collector Agent: Ubuntu VM (192.168.56.101) · Emerging Threats Ruleset
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <div className="text-[18px] font-bold text-white">{totalCount.toLocaleString()}</div>
            <div className="text-[9px] text-fanos-dim uppercase tracking-wider">Events (24h)</div>
          </div>
          <div className="text-center">
            <div className="text-[18px] font-bold text-fanos-accent">{alertCount.toLocaleString()}</div>
            <div className="text-[9px] text-fanos-dim uppercase tracking-wider">Alerts Raised</div>
          </div>
          <div className="text-center">
            <div className="text-[18px] font-bold text-red-400">{criticalCount}</div>
            <div className="text-[9px] text-fanos-dim uppercase tracking-wider">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-[18px] font-bold text-amber-400">{highCount}</div>
            <div className="text-[9px] text-fanos-dim uppercase tracking-wider">High Risk</div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────── */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
            style={{
              background: tab === t ? 'rgba(0,200,255,0.15)' : 'transparent',
              color:      tab === t ? '#00c8ff' : '#8fa3bf',
              border:     tab === t ? '1px solid rgba(0,200,255,0.3)' : '1px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Live Alerts ───────────────────────────── */}
      {tab === 'Live Alerts' && (
        <div className="space-y-3">
          {/* Filter Toolbar */}
          <div className="fanos-card p-3 flex items-center justify-between gap-3 flex-wrap">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 flex-1 min-w-[220px]">
              <Search size={13} className="text-fanos-dim flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by source IP, target, or signature..."
                className="bg-transparent text-[12px] text-white outline-none w-full placeholder:text-fanos-dim"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-fanos-dim hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Severity Filter Chips */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-fanos-dim mr-1 flex items-center gap-1">
                <Filter size={10} /> Severity:
              </span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                    severityFilter === sev
                      ? 'bg-fanos-accent text-fanos-bg font-bold'
                      : 'bg-white/[0.04] text-fanos-muted hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Source Classification Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-fanos-dim mr-1">Source:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'SURICATA', label: 'IDS Signature' },
                { id: 'ML_FLOW', label: 'ML Flow' },
              ].map(src => (
                <button
                  key={src.id}
                  onClick={() => setSourceFilter(src.id as any)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                    sourceFilter === src.id
                      ? 'bg-white/[0.15] text-white'
                      : 'bg-white/[0.04] text-fanos-dim hover:text-white'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          {/* Events Table */}
          <div className="fanos-card overflow-hidden">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title">
                <Shield size={13} className="text-fanos-accent" />
                Live Ingested Telemetry
              </div>
              <span className="text-[11px] text-fanos-dim">
                Showing {filteredEvents.length} of {rawEvents.length} events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/10 border-b border-white/[0.05]">
                    {['TIME', 'SOURCE IP', 'DESTINATION', 'THREAT / SIGNATURE', 'SEVERITY', 'AI CONFIDENCE', 'RISK', 'STATUS', 'SOURCE', 'ACTION'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <Activity size={24} className="text-fanos-dim mx-auto mb-2" />
                        <div className="text-[12px] font-semibold text-white">No Matching Security Events</div>
                        <div className="text-[11px] text-fanos-muted mt-0.5">
                          {search ? 'Try adjusting your search query or filters.' : 'Awaiting live events from the Suricata collector.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map(ev => {
                      const timeStr = ev.created_at
                        ? new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                        : 'Just now'
                      const isMlFlow = ev.sensor_source === 'fanos-ml-flow-experimental'

                      return (
                        <tr
                          key={String(ev.id)}
                          onClick={() => setSelectedEvent(ev)}
                          className="hover:bg-white/[0.025] transition-colors cursor-pointer"
                        >
                          {/* Time */}
                          <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim whitespace-nowrap">
                            {timeStr}
                          </td>

                          {/* Source IP */}
                          <td className="px-3 py-2.5 font-mono text-[11px] text-fanos-accent font-medium whitespace-nowrap">
                            {ev.source_ip}
                          </td>

                          {/* Target */}
                          <td className="px-3 py-2.5 font-mono text-[11px] text-fanos-muted whitespace-nowrap">
                            {ev.target}
                          </td>

                          {/* Threat / Signature */}
                          <td className="px-3 py-2.5 text-[11px] text-white font-medium max-w-[220px] truncate">
                            {ev.attack_type}
                          </td>

                          {/* Severity */}
                          <td className="px-3 py-2.5">
                            <span className={severityClass(ev.severity)}>{ev.severity}</span>
                          </td>

                          {/* AI Confidence */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-8 h-1 rounded-full bg-white/[0.07] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, ev.ai_confidence)}%`,
                                    background: 'linear-gradient(90deg,#8b5cf6,#00c8ff)',
                                  }}
                                />
                              </div>
                              <span className="font-mono text-[10px] text-fanos-muted">
                                {ev.ai_confidence ? ev.ai_confidence.toFixed(1) : '—'}%
                              </span>
                            </div>
                          </td>

                          {/* Risk */}
                          <td className={`px-3 py-2.5 font-bold text-[11px] ${riskColor(ev.risk_score)}`}>
                            {ev.risk_score}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5">
                            <span className={statusClass(ev.status)}>{ev.status}</span>
                          </td>

                          {/* Source Type Pill */}
                          <td className="px-3 py-2.5">
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{
                                background: isMlFlow ? 'rgba(139,92,246,0.12)' : 'rgba(0,200,255,0.1)',
                                color: isMlFlow ? '#a78bfa' : '#00c8ff',
                                border: `1px solid ${isMlFlow ? 'rgba(139,92,246,0.25)' : 'rgba(0,200,255,0.25)'}`,
                              }}
                            >
                              {isMlFlow ? 'ML Flow' : 'Suricata IDS'}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="px-3 py-2.5">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedEvent(ev)
                              }}
                              className="fanos-btn text-[9px] py-0.5 px-2 flex items-center gap-1"
                            >
                              <Code size={10} /> View
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 border-t border-white/[0.04] text-[10px] text-fanos-dim flex justify-between items-center">
              <span>Streaming from Ubuntu VM collector · Auto-refreshes every 6 seconds</span>
              <span>Total records: {rawEvents.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Overview ──────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Severity Breakdown */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title">
                <AlertTriangle size={13} className="text-amber-400" />
                Alert Severity Distribution
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Critical', count: criticalCount, color: '#ef4444' },
                { label: 'High',     count: highCount,     color: '#f97316' },
                { label: 'Medium',   count: stats?.medium ?? rawEvents.filter(e => e.severity === 'MEDIUM').length, color: '#f59e0b' },
                { label: 'Low/Info', count: (stats?.low ?? 0) + rawEvents.filter(e => e.severity === 'LOW' || e.severity === 'INFO').length, color: '#00c8ff' },
              ].map(s => {
                const pct = totalCount > 0 ? Math.round((s.count / totalCount) * 100) : 0
                return (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-fanos-muted">{s.label}</span>
                      <span className="font-bold text-white">
                        {s.count} <span className="text-fanos-dim font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title">
                <Activity size={13} className="text-fanos-accent" />
                Detected Attack Categories
              </div>
            </div>
            <div className="p-4 space-y-2">
              {categoryCounts.length === 0 ? (
                <div className="text-[11px] text-fanos-muted py-6 text-center">No categories observed yet.</div>
              ) : (
                categoryCounts.slice(0, 6).map(([cat, cnt]) => (
                  <div key={cat} className="flex items-center justify-between py-1 border-b border-white/[0.04] last:border-0">
                    <span className="text-[11px] text-fanos-text truncate max-w-[240px]">{cat}</span>
                    <span className="text-[11px] font-mono font-bold text-fanos-accent">{cnt}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Architecture & Telemetry Card */}
          <div className="fanos-card md:col-span-2">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title">
                <Terminal size={13} className="text-fanos-green" />
                Suricata Telemetry Pipeline Architecture
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white mb-1">1. EVE Ingestion Agent</div>
                <p className="text-[11px] text-fanos-muted leading-relaxed">
                  Ubuntu VM service tails <code className="text-fanos-accent">/var/log/suricata/eve.json</code> and forwards alerts via HTTP POST to <code className="text-fanos-accent">/api/v1/suricata/events</code>.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white mb-1">2. FANOS AI Prediction</div>
                <p className="text-[11px] text-fanos-muted leading-relaxed">
                  FastAPI backend processes each alert through the XGBoost ML model (<code className="text-fanos-purple">16D_CHAMPION</code>) to compute independent risk scores and anomaly predictions.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white mb-1">3. PostgreSQL Persistence</div>
                <p className="text-[11px] text-fanos-muted leading-relaxed">
                  Events are persisted to PostgreSQL <code className="text-emerald-400">security_events</code> with full raw payload JSON for auditability and incident generation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Raw EVE Logs ──────────────────────────── */}
      {tab === 'Raw EVE Logs' && (
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Code size={13} className="text-fanos-accent" />
              Raw EVE Log Stream
            </div>
            <span className="text-[11px] text-fanos-dim">
              Recent {rawEvents.length} payloads
            </span>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
            {rawEvents.length === 0 ? (
              <div className="py-12 text-center text-fanos-muted text-[12px]">
                No raw EVE records ingested yet.
              </div>
            ) : (
              rawEvents.map(ev => {
                let parsed: any = null
                try {
                  parsed = ev.raw_payload ? JSON.parse(ev.raw_payload) : null
                } catch {
                  parsed = ev.raw_payload
                }

                return (
                  <div key={String(ev.id)} className="p-4 hover:bg-white/[0.015] transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={severityClass(ev.severity)}>{ev.severity}</span>
                        <span className="font-mono text-[11px] text-white font-bold">{ev.attack_type}</span>
                        <span className="text-[11px] text-fanos-dim font-mono">
                          {ev.source_ip} → {ev.target}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-fanos-dim">
                          {ev.created_at ? new Date(ev.created_at).toISOString() : '—'}
                        </span>
                        <button
                          onClick={() => handleCopyPayload(parsed || ev)}
                          className="fanos-btn text-[9px] py-1 px-2 flex items-center gap-1"
                          title="Copy JSON"
                        >
                          <Copy size={9} /> Copy
                        </button>
                      </div>
                    </div>

                    <pre
                      className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-[10px] font-mono text-cyan-200 overflow-x-auto max-h-[160px]"
                    >
                      {parsed ? JSON.stringify(parsed, null, 2) : JSON.stringify(ev, null, 2)}
                    </pre>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Event Detail Modal ───────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl rounded-xl border border-white/[0.12] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            style={{ background: '#0c1527' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-fanos-accent" />
                <div>
                  <div className="text-[13px] font-bold text-white flex items-center gap-2">
                    Event Details · {String(selectedEvent.id).slice(0, 8)}
                    <span className={severityClass(selectedEvent.severity)}>{selectedEvent.severity}</span>
                  </div>
                  <div className="text-[10px] text-fanos-dim font-mono">
                    {selectedEvent.created_at ? new Date(selectedEvent.created_at).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-fanos-dim hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">Source IP</span>
                  <span className="font-mono font-bold text-fanos-accent text-[12px]">{selectedEvent.source_ip}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">Target / Destination</span>
                  <span className="font-mono text-white text-[12px] truncate block">{selectedEvent.target}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">AI Confidence</span>
                  <span className="font-bold text-purple-400 text-[12px]">
                    {selectedEvent.ai_confidence ? selectedEvent.ai_confidence.toFixed(1) : '—'}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-fanos-dim text-[10px] block">Risk Score</span>
                  <span className={`font-bold text-[12px] ${riskColor(selectedEvent.risk_score)}`}>
                    {selectedEvent.risk_score} / 100
                  </span>
                </div>
              </div>

              {/* Threat Classification */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-fanos-dim uppercase block">Threat / Attack Type</span>
                  <span className="text-[13px] font-bold text-white">{selectedEvent.attack_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-fanos-dim uppercase block text-right">Detection Source</span>
                  <span className="text-[12px] font-semibold text-fanos-accent">
                    {selectedEvent.sensor_source === 'fanos-ml-flow-experimental' ? 'ML Flow Inference' : 'Suricata IDS'}
                  </span>
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-fanos-muted flex items-center gap-1.5">
                    <Code size={12} /> Raw Telemetry Payload (EVE JSON)
                  </span>
                  <button
                    onClick={() => handleCopyPayload(parsedModalPayload || selectedEvent)}
                    className="fanos-btn text-[10px] py-0.5 px-2 flex items-center gap-1"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre
                  className="p-3 rounded-lg bg-black/50 border border-white/[0.08] text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-[220px]"
                >
                  {parsedModalPayload ? JSON.stringify(parsedModalPayload, null, 2) : JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/[0.08] flex justify-end bg-white/[0.02]">
              <button
                onClick={() => setSelectedEvent(null)}
                className="fanos-btn text-[11px] px-4 py-1.5"
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

