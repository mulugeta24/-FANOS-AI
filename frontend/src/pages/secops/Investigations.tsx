/**
 * Security Operations — Investigations
 * Threat hunting, active forensic investigation workspace, and incident timeline correlation.
 */
import {
  Search, Clock, CheckCircle2, Eye, GitBranch, RefreshCw,
  X, ExternalLink
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/components/ui/PageShell'
import { useSecOpsAlerts, type SecOpsInvestigation } from '@/context/SecOpsAlertContext'

const priorityStyle: Record<string, { bg: string; color: string }> = {
  High:   { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444' },
  Medium: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
  Low:    { bg: 'rgba(107,114,128,0.08)',color: '#9ca3af' },
}

const statusStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  Active: { bg: 'rgba(0,200,255,0.08)', color: '#00c8ff', icon: <Clock size={10} /> },
  Closed: { bg: 'rgba(0,229,160,0.08)', color: '#00e5a0', icon: <CheckCircle2 size={10} /> },
}

export default function Investigations() {
  const navigate = useNavigate()
  const { investigations, loading, refresh } = useSecOpsAlerts()

  const [search, setSearch] = useState('')
  const [selectedTimelineInv, setSelectedTimelineInv] = useState<SecOpsInvestigation | null>(null)
  const [selectedMitreInv, setSelectedMitreInv] = useState<SecOpsInvestigation | null>(null)

  const filtered = investigations.filter(inv => {
    const q = search.toLowerCase()
    return (
      !search ||
      inv.title.toLowerCase().includes(q) ||
      inv.summary.toLowerCase().includes(q) ||
      inv.analyst.toLowerCase().includes(q) ||
      inv.id.toLowerCase().includes(q)
    )
  })

  const activeCount = investigations.filter(i => i.status === 'Active').length
  const closedCount = investigations.filter(i => i.status === 'Closed').length
  const analystCount = [...new Set(investigations.map(i => i.analyst))].filter(a => a !== 'Unassigned').length

  return (
    <>
      {/* ── Timeline Forensics Modal ────────────────────────────── */}
      {selectedTimelineInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-3xl fanos-card rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            style={{ background: '#0d1527' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-black/20">
              <div className="flex items-center gap-2.5">
                <Clock size={14} className="text-fanos-accent" />
                <h3 className="text-[14px] font-bold text-white">
                  Attack Chronology & Telemetry Timeline — {selectedTimelineInv.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTimelineInv(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-fanos-dim hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <h4 className="text-[13px] font-bold text-white mb-1">{selectedTimelineInv.title}</h4>
                <p className="text-[11px] text-fanos-muted leading-relaxed">{selectedTimelineInv.summary}</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-fanos-dim uppercase tracking-wider">
                  Correlated Chronological Attack Events ({selectedTimelineInv.timeline.length})
                </div>

                {selectedTimelineInv.timeline.length > 0 ? (
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                    {selectedTimelineInv.timeline.map((item, idx) => (
                      <div key={item.id || idx} className="relative group">
                        <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-fanos-red border-2 border-[#0d1527]" />
                        <div className="p-3 rounded-lg bg-black/30 border border-white/[0.05] hover:border-white/15 transition-all">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-white font-mono">{item.time}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.05] text-fanos-accent border border-white/[0.06]">
                                {item.requestId}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                                {item.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-fanos-dim font-mono">{item.sourceIp}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-fanos-text mb-1">{item.action}</div>
                          <div className="text-[10px] font-mono bg-black/40 px-2.5 py-1.5 rounded text-fanos-red border border-red-500/20 break-all">
                            {item.payload}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-fanos-dim p-4 text-center">No individual timeline events logged yet.</div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-white/[0.08] bg-black/30 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedTimelineInv(null)
                  navigate('/secops/events')
                }}
                className="fanos-btn text-[11px] py-1.5 px-3 cursor-pointer"
              >
                <ExternalLink size={11} /> Open in Security Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MITRE ATT&CK Mapping Modal ─────────────────────────── */}
      {selectedMitreInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-2xl fanos-card rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{ background: '#0d1527' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-black/20">
              <div className="flex items-center gap-2.5">
                <GitBranch size={14} className="text-purple-400" />
                <h3 className="text-[14px] font-bold text-white">MITRE ATT&CK Matrix & IoCs — {selectedMitreInv.id}</h3>
              </div>
              <button
                onClick={() => setSelectedMitreInv(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-fanos-dim hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <h4 className="text-[12px] font-bold text-fanos-dim uppercase mb-2">Mapped MITRE ATT&CK Techniques</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedMitreInv.mitreTechniques.map(mt => (
                    <div key={mt.id} className="p-3 rounded-lg bg-purple-500/[0.06] border border-purple-500/20 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-purple-400">{mt.id}</span>
                          <span className="text-[12px] font-semibold text-white">{mt.name}</span>
                        </div>
                        <div className="text-[10px] text-fanos-dim mt-0.5">Tactic: {mt.tactic}</div>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                        CONFIRMED
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-fanos-dim uppercase mb-2">Indicators of Compromise (IoCs)</h4>
                <div className="space-y-2">
                  {selectedMitreInv.iocs.map((ioc, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-black/25 border border-white/[0.05] flex items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="text-fanos-dim">{ioc.type}:</span>{' '}
                        <span className="font-mono text-white font-semibold">{ioc.value}</span>
                        <div className="text-[10px] text-fanos-dim mt-0.5">{ioc.desc}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                        THREAT
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-white/[0.08] bg-black/30 flex justify-end">
              <button
                onClick={() => setSelectedMitreInv(null)}
                className="fanos-btn text-[11px] py-1.5 px-4 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PageShell
        title="Investigations"
        subtitle="Active threat hunting, forensic telemetry correlation, and attack attribution workspace"
        badge={{ label: `${activeCount} ACTIVE`, color: 'blue' }}
        actions={
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="fanos-btn text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh Telemetry
          </button>
        }
      >
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Investigations', count: activeCount,    color: '#00c8ff' },
            { label: 'Closed Cases',          count: closedCount,    color: '#00e5a0' },
            { label: 'Lead Analysts',         count: analystCount,   color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="fanos-card p-4">
              <div className="text-[24px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] text-fanos-muted mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="fanos-card p-3 flex items-center gap-2.5">
          <Search size={13} className="text-fanos-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search investigations by title, IoC, analyst, or case ID…"
            className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"
          />
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map(inv => {
            const ps = priorityStyle[inv.priority]
            const ss = statusStyle[inv.status]
            return (
              <div key={inv.id} className="fanos-card p-4 hover:border-white/15 transition-all">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold text-fanos-dim font-mono">{inv.id}</span>
                      <h3 className="text-[14px] font-bold text-white">{inv.title}</h3>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}25` }}
                      >
                        {inv.priority}
                      </span>
                      {inv.id.includes('WAF') && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Active WAF Attack Stream
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-fanos-dim">
                      <span>Lead Analyst: {inv.analyst}</span>
                      <span>·</span>
                      <span>Created {inv.created}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={9} /> Updated {inv.updated}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.color}25` }}
                  >
                    {ss.icon} {inv.status}
                  </div>
                </div>

                <p className="text-[11px] text-fanos-muted mb-3 leading-relaxed">{inv.summary}</p>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-5 text-[10px] text-fanos-dim">
                    {[
                      { label: 'Indicators', value: inv.indicators },
                      { label: 'Alerts',     value: inv.alerts },
                      { label: 'Artifacts',  value: inv.artifacts },
                    ].map(m => (
                      <div key={m.label} className="flex flex-col items-center">
                        <span className="text-[15px] font-bold text-white">{m.value}</span>
                        <span className="text-[9px] uppercase tracking-wider">{m.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTimelineInv(inv)}
                      className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded transition-all cursor-pointer hover:bg-cyan-500/20"
                      style={{ background: 'rgba(0,200,255,0.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.25)' }}
                    >
                      <Eye size={10} /> View Attack Timeline
                    </button>
                    <button
                      onClick={() => setSelectedMitreInv(inv)}
                      className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded transition-all cursor-pointer hover:bg-purple-500/20"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      <GitBranch size={10} /> MITRE Map & IoCs
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </PageShell>
    </>
  )
}
