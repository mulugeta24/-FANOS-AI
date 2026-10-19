/**
 * Security Operations — Alerts
 * Live security alerts from WAF, Suricata, Zeek, and FANOS AI engine.
 */
import { Bell, Search, Filter, Eye, CheckCircle2, RefreshCw, Radio, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/components/ui/PageShell'
import { useSecOpsAlerts } from '@/context/SecOpsAlertContext'
import AlertDetailModal from '@/components/secops/AlertDetailModal'

const sevStyle: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  HIGH:     { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM:   { bg: 'rgba(0,200,255,0.10)',  color: '#00c8ff' },
  LOW:      { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
  INFO:     { bg: 'rgba(255,255,255,0.06)',color: '#6b7280' },
}

const engineColor: Record<string, string> = {
  WAF:        '#00e5a0',
  Suricata:   '#00c8ff',
  Zeek:       '#8b5cf6',
  'FANOS AI': '#00c8ff',
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  NEW:          { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  ACKNOWLEDGED: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  INVESTIGATING:{ bg: 'rgba(0,200,255,0.12)',  color: '#00c8ff' },
  RESOLVED:     { bg: 'rgba(0,229,160,0.12)',  color: '#00e5a0' },
}

export default function SecOpsAlerts() {
  const navigate = useNavigate()
  const {
    alerts,
    loading,
    isLive,
    setIsLive,
    refresh,
    acknowledgeAlert,
    resolveAlert,
    newAlertsCount,
    selectedAlert,
    setSelectedAlert,
  } = useSecOpsAlerts()

  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState<string>('ALL')

  const filtered = alerts.filter(a => {
    const matchSev = sevFilter === 'ALL' || a.sev === sevFilter
    const q = search.toLowerCase()
    const matchStr =
      !search ||
      a.title.toLowerCase().includes(q) ||
      a.src.includes(q) ||
      a.target.toLowerCase().includes(q) ||
      a.engine.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      (a.requestId && a.requestId.toLowerCase().includes(q))
    return matchSev && matchStr
  })

  const counts = {
    CRITICAL: alerts.filter(a => a.sev === 'CRITICAL').length,
    HIGH:     alerts.filter(a => a.sev === 'HIGH').length,
    MEDIUM:   alerts.filter(a => a.sev === 'MEDIUM').length,
    LOW:      alerts.filter(a => a.sev === 'LOW').length,
  }

  return (
    <>
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
        />
      )}

      <PageShell
        title="Alerts"
        subtitle="Real-time security alerts correlated across WAF, Suricata, Zeek, and FANOS AI"
        badge={{ label: `${newAlertsCount} NEW`, color: 'red' }}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
              style={{
                background: isLive ? 'rgba(0,229,160,0.1)' : 'rgba(255,255,255,0.05)',
                color: isLive ? '#00e5a0' : '#8fa3bf',
                border: `1px solid ${isLive ? 'rgba(0,229,160,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <Radio size={12} className={isLive ? 'animate-pulse' : ''} />
              {isLive ? 'LIVE STREAM: ON' : 'PAUSED'}
            </button>
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="fanos-btn text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      >
        {/* Severity summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(sevFilter === s ? 'ALL' : s)}
              className="fanos-card p-3.5 text-left transition-all cursor-pointer hover:border-white/20"
              style={{
                borderColor: sevFilter === s ? sevStyle[s].color : undefined,
                background: sevFilter === s ? `${sevStyle[s].bg}` : undefined,
              }}
            >
              <div className="text-[24px] font-extrabold" style={{ color: sevStyle[s].color }}>
                {counts[s]}
              </div>
              <div className="text-[11px] text-fanos-muted mt-0.5 font-medium flex items-center justify-between">
                <span>{s}</span>
                {s === 'CRITICAL' && counts[s] > 0 && (
                  <span className="w-2 h-2 rounded-full bg-fanos-red animate-pulse" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="fanos-card p-3 flex items-center gap-2.5 flex-wrap">
          <Search size={13} className="text-fanos-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search alerts by title, IP, target URI, request ID, or engine…"
            className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={11} className="text-fanos-dim mr-1" />
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button
                key={f}
                onClick={() => setSevFilter(f)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded transition-all cursor-pointer"
                style={{
                  background: sevFilter === f ? 'rgba(0,200,255,0.18)' : 'rgba(255,255,255,0.04)',
                  color: sevFilter === f ? '#00c8ff' : '#6b7280',
                  border: `1px solid ${sevFilter === f ? 'rgba(0,200,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="fanos-card overflow-hidden">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Bell size={13} className="text-fanos-red animate-pulse" />
              Real-Time Alert Feed
            </div>
            <span className="text-[11px] text-fanos-dim font-medium">
              Showing {filtered.length} of {alerts.length} total alerts
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/20 border-b border-white/[0.06]">
                  {['Severity', 'Alert Title & ID', 'Source IP', 'Target Host / Path', 'Engine', 'Risk', 'Status', 'Time', 'Actions'].map(h => (
                    <th key={h} className="px-3.5 py-3 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(a => {
                  const ss = sevStyle[a.sev] || sevStyle.INFO
                  const es = statusStyle[a.status] ?? { bg: 'rgba(255,255,255,0.04)', color: '#6b7280' }
                  const ec = engineColor[a.engine] ?? '#6b7280'
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAlert(a)}
                      className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                    >
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded"
                          style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.color}30` }}
                        >
                          {a.sev}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="text-[12px] font-medium text-white max-w-[260px] truncate group-hover:text-fanos-accent transition-colors">
                          {a.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-fanos-dim font-mono">{a.id}</span>
                          {a.requestId && a.requestId !== '—' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-fanos-dim border border-white/[0.06]">
                              {a.requestId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-fanos-muted whitespace-nowrap">
                        {a.src}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-fanos-dim max-w-[180px] truncate" title={a.target}>
                        {a.target}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${ec}15`, color: ec, border: `1px solid ${ec}30` }}
                        >
                          {a.engine}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className="text-[12px] font-bold"
                          style={{ color: a.risk >= 75 ? '#ef4444' : a.risk >= 50 ? '#f59e0b' : '#00c8ff' }}
                        >
                          {a.risk}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className="text-[9px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: es.bg, color: es.color, border: `1px solid ${es.color}30` }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[10px] text-fanos-dim whitespace-nowrap">
                        <div>{a.relativeTime}</div>
                        <div className="text-[9px] opacity-60">{a.time}</div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedAlert(a)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded transition-all cursor-pointer"
                            style={{ background: 'rgba(0,200,255,.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.25)' }}
                          >
                            <Eye size={10} /> View
                          </button>
                          {a.status === 'NEW' ? (
                            <button
                              onClick={() => acknowledgeAlert(a.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer hover:bg-emerald-500/20"
                              style={{ background: 'rgba(0,229,160,.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,.25)' }}
                            >
                              <CheckCircle2 size={10} /> Ack
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate('/secops/investigations')}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer hover:bg-purple-500/20"
                              style={{ background: 'rgba(139,92,246,.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.25)' }}
                            >
                              <ExternalLink size={10} /> Case
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PageShell>
    </>
  )
}
