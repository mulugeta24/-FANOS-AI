/**
 * Security Operations — Incidents
 * Full incident management view correlated across WAF, network sensors, and host telemetry.
 */
import { FileWarning, Plus, Eye, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/components/ui/PageShell'
import { useSecOpsAlerts, type SecOpsIncident } from '@/context/SecOpsAlertContext'

const sevStyle: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  HIGH:     { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  MEDIUM:   { bg: 'rgba(0,200,255,0.10)',  color: '#00c8ff' },
  LOW:      { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  Investigating: { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
  Contained:     { bg: 'rgba(0,229,160,0.08)',   color: '#00e5a0' },
  Monitoring:    { bg: 'rgba(0,200,255,0.08)',   color: '#00c8ff' },
  Resolved:      { bg: 'rgba(107,114,128,0.08)', color: '#6b7280' },
}

export default function SecOpsIncidents() {
  const navigate = useNavigate()
  const {
    incidents,
    loading,
    refresh,
    activeIncidentsCount,
    updateIncidentStatus,
  } = useSecOpsAlerts()

  const [selected, setSelected] = useState<SecOpsIncident | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filtered = incidents.filter(i => {
    if (statusFilter === 'ALL') return true
    return i.status.toLowerCase() === statusFilter.toLowerCase()
  })

  // Selected incident reference (keep up-to-date with context)
  const currentSelected = selected
    ? incidents.find(i => i.id === selected.id) || selected
    : null

  return (
    <PageShell
      title="Incidents"
      subtitle="Active and recent security incidents requiring investigation, correlation, and response"
      badge={{ label: `${activeIncidentsCount} ACTIVE`, color: 'red' }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="fanos-btn text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/secops/investigations')}
            className="fanos-btn bg-fanos-accent/15 text-fanos-accent border border-fanos-accent/30 text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={11} /> New Investigation
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Incident list */}
        <div className={currentSelected ? 'xl:col-span-2' : 'xl:col-span-3'}>
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Investigating', count: incidents.filter(i => i.status === 'Investigating').length, color: '#ef4444' },
              { label: 'Contained',     count: incidents.filter(i => i.status === 'Contained').length,     color: '#f59e0b' },
              { label: 'Monitoring',    count: incidents.filter(i => i.status === 'Monitoring').length,    color: '#00c8ff' },
              { label: 'Resolved',      count: incidents.filter(i => i.status === 'Resolved').length,      color: '#6b7280' },
            ].map(s => (
              <button
                key={s.label}
                onClick={() => setStatusFilter(statusFilter === s.label ? 'ALL' : s.label)}
                className="fanos-card p-3 text-left transition-all hover:border-white/20 cursor-pointer"
                style={{ borderColor: statusFilter === s.label ? s.color : undefined }}
              >
                <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[11px] text-fanos-muted font-medium">{s.label}</div>
              </button>
            ))}
          </div>

          <div className="fanos-card overflow-hidden">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title">
                <FileWarning size={13} className="text-fanos-amber" />
                Incident Registry
              </div>
              <span className="text-[11px] text-fanos-dim">
                {filtered.length} of {incidents.length} incidents
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/20 border-b border-white/[0.06]">
                    {['ID', 'Title & Threat', 'Severity', 'Source IP', 'Status', 'Risk', 'Assignee', 'Updated', 'Actions'].map(h => (
                      <th key={h} className="px-3.5 py-3 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(inc => {
                    const sv = sevStyle[inc.sev] ?? { bg: 'rgba(255,255,255,0.05)', color: '#6b7280' }
                    const st = statusStyle[inc.status] ?? { bg: 'rgba(255,255,255,0.05)', color: '#6b7280' }
                    const isSelected = currentSelected?.id === inc.id
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setSelected(isSelected ? null : inc)}
                        className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                        style={isSelected ? { background: 'rgba(0,200,255,0.05)' } : {}}
                      >
                        <td className="px-3.5 py-3 text-[10px] font-bold text-fanos-dim font-mono whitespace-nowrap">
                          {inc.id}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="text-[12px] font-medium text-white max-w-[220px] truncate group-hover:text-fanos-accent transition-colors">
                            {inc.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-fanos-dim">{inc.threat}</span>
                            {inc.id.includes('WAF') && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                WAF Telemetry
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded"
                            style={{ background: sv.bg, color: sv.color, border: `1px solid ${sv.color}30` }}
                          >
                            {inc.sev}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-fanos-muted whitespace-nowrap">
                          {inc.src}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className="text-[9px] font-semibold px-2 py-0.5 rounded"
                            style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}25` }}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td
                          className="px-3.5 py-3 text-[12px] font-bold whitespace-nowrap"
                          style={{ color: inc.risk >= 90 ? '#ef4444' : inc.risk >= 70 ? '#f59e0b' : '#00c8ff' }}
                        >
                          {inc.risk}
                        </td>
                        <td className="px-3.5 py-3 text-[11px] text-fanos-muted whitespace-nowrap">
                          {inc.assignee}
                        </td>
                        <td className="px-3.5 py-3 text-[10px] text-fanos-dim whitespace-nowrap">
                          {inc.updated}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelected(isSelected ? null : inc)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded cursor-pointer"
                              style={{ background: 'rgba(0,200,255,.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.25)' }}
                            >
                              <Eye size={10} /> View
                            </button>
                            <button
                              onClick={() => navigate('/secops/investigations')}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded cursor-pointer"
                              style={{ background: 'rgba(139,92,246,.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.25)' }}
                            >
                              <ExternalLink size={10} /> Hunt
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {currentSelected && (
          <div className="fanos-card flex flex-col gap-0 overflow-hidden">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title">
                <FileWarning size={13} className="text-fanos-amber" />
                Incident Detail
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[11px] text-fanos-dim hover:text-white transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-240px)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-fanos-dim font-mono">{currentSelected.id}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                    style={{
                      background: sevStyle[currentSelected.sev]?.bg,
                      color: sevStyle[currentSelected.sev]?.color,
                    }}
                  >
                    {currentSelected.sev}
                  </span>
                </div>
                <div className="text-[14px] font-bold text-white leading-snug">{currentSelected.title}</div>
              </div>

              {currentSelected.summary && (
                <p className="text-[11px] text-fanos-muted bg-white/[0.02] p-2.5 rounded border border-white/[0.06] leading-relaxed">
                  {currentSelected.summary}
                </p>
              )}

              {/* Status Update Controls */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-fanos-dim uppercase">Incident Workflow Status</span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {(['Investigating', 'Contained', 'Monitoring', 'Resolved'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => updateIncidentStatus(currentSelected.id, st)}
                      className="text-[10px] font-semibold py-1 px-2 rounded transition-all cursor-pointer text-left flex items-center justify-between"
                      style={{
                        background: currentSelected.status === st ? statusStyle[st].bg : 'rgba(255,255,255,0.03)',
                        color: currentSelected.status === st ? statusStyle[st].color : '#6b7280',
                        border: `1px solid ${currentSelected.status === st ? statusStyle[st].color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <span>{st}</span>
                      {currentSelected.status === st && <CheckCircle2 size={10} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Correlated Request IDs */}
              {currentSelected.correlatedRequestIds && currentSelected.correlatedRequestIds.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-fanos-dim uppercase">
                    Correlated Attack Request IDs ({currentSelected.correlatedRequestIds.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-black/20 rounded border border-white/[0.05]">
                    {currentSelected.correlatedRequestIds.map(reqId => (
                      <span
                        key={reqId}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-fanos-accent border border-white/[0.08]"
                      >
                        {reqId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {[
                { label: 'Threat Vector',    value: currentSelected.threat },
                { label: 'Source IP',        value: currentSelected.src },
                { label: 'Target Asset',     value: currentSelected.targetHost || 'fanos-sec.vercel.app' },
                { label: 'Risk Score',       value: String(currentSelected.risk) },
                { label: 'Lead Analyst',     value: currentSelected.assignee },
                { label: 'Created',          value: currentSelected.created },
                { label: 'Last Event Time',  value: currentSelected.updated },
                { label: 'Related Events',   value: `${currentSelected.eventsCount} telemetry hits` },
                { label: 'Related Alerts',   value: `${currentSelected.alertsCount} alerts triggered` },
              ].map(f => (
                <div key={f.label} className="flex items-start justify-between gap-2 border-b border-white/[0.04] pb-2 last:border-0 text-[11px]">
                  <span className="text-fanos-dim flex-shrink-0">{f.label}</span>
                  <span className="text-white font-medium text-right break-all">{f.value}</span>
                </div>
              ))}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => navigate('/secops/investigations')}
                  className="fanos-btn w-full justify-center text-[11px] py-2 cursor-pointer"
                  style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' }}
                >
                  <Eye size={12} /> Open Full Threat Investigation
                </button>
                <button
                  onClick={() => navigate('/secops/events')}
                  className="fanos-btn w-full justify-center text-[11px] py-2 cursor-pointer"
                >
                  <ExternalLink size={12} /> Filter Events by Source IP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
