import {
  ShieldAlert, Clock, Globe,
  CheckCircle2, Search, ExternalLink, X, Terminal, FileCode, Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { SecOpsAlert } from '@/context/SecOpsAlertContext'

interface AlertDetailModalProps {
  alert: SecOpsAlert
  onClose: () => void
  onAcknowledge?: (alertId: string) => void
  onResolve?: (alertId: string) => void
}

const sevStyles: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  HIGH:     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  MEDIUM:   { bg: 'rgba(0,200,255,0.12)',  color: '#00c8ff', border: 'rgba(0,200,255,0.25)' },
  LOW:      { bg: 'rgba(107,114,128,0.12)',color: '#9ca3af', border: 'rgba(107,114,128,0.25)' },
  INFO:     { bg: 'rgba(255,255,255,0.06)',color: '#6b7280', border: 'rgba(255,255,255,0.1)' },
}

export default function AlertDetailModal({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
}: AlertDetailModalProps) {
  const navigate = useNavigate()
  const sStyle = sevStyles[alert.sev] || sevStyles.INFO

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl fanos-card rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: '#0d1527' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-black/20">
          <div className="flex items-center gap-2.5">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
              style={{ background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}` }}
            >
              {alert.sev}
            </span>
            <span className="text-[12px] font-mono text-fanos-dim">{alert.id}</span>
            {alert.requestId && alert.requestId !== '—' && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-fanos-accent border border-white/[0.06]">
                {alert.requestId}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-fanos-dim hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Title & Engine banner */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-white leading-snug">{alert.title}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-fanos-muted">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-fanos-dim" />
                  {alert.time} ({alert.relativeTime})
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-fanos-green font-semibold">
                  <ShieldAlert size={12} />
                  Engine: {alert.engine}
                </span>
                <span>·</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    background: alert.status === 'NEW' ? 'rgba(239,68,68,0.12)' : 'rgba(0,229,160,0.12)',
                    color: alert.status === 'NEW' ? '#ef4444' : '#00e5a0',
                  }}
                >
                  {alert.status}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-[9px] uppercase tracking-wider text-fanos-dim font-bold">Risk Score</div>
              <div
                className="text-[26px] font-black leading-none mt-0.5"
                style={{ color: alert.risk >= 75 ? '#ef4444' : alert.risk >= 50 ? '#f59e0b' : '#00c8ff' }}
              >
                {alert.risk}
                <span className="text-[12px] font-normal text-fanos-dim">/100</span>
              </div>
            </div>
          </div>

          {/* Target & Source Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-black/25 border border-white/[0.05]">
            <div>
              <div className="text-[10px] uppercase font-bold text-fanos-dim mb-1 flex items-center gap-1.5">
                <Globe size={11} className="text-fanos-accent" /> Target Asset & URI
              </div>
              <div className="font-mono text-[12px] text-white break-all">{alert.target}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-fanos-dim mb-1 flex items-center gap-1.5">
                <Terminal size={11} className="text-fanos-accent" /> Source IP Address
              </div>
              <div className="font-mono text-[12px] text-white flex items-center gap-2">
                <span>{alert.src}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-fanos-dim font-sans">
                  {alert.src.startsWith('127.') || alert.src.startsWith('192.168.') || alert.src.startsWith('10.') ? 'Local/Internal' : 'External'}
                </span>
              </div>
            </div>
          </div>

          {/* Attack Findings Breakdown */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-fanos-dim">
              Security Findings & Signature Matches
            </div>

            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2.5">
              {alert.matchedValue && (
                <div>
                  <div className="text-[10px] text-fanos-dim mb-0.5">Matched Payload String:</div>
                  <div className="font-mono text-[11px] px-2.5 py-1.5 rounded bg-black/40 text-fanos-red border border-red-500/20 break-all">
                    {alert.matchedValue}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-fanos-dim">Rule ID:</span>{' '}
                  <span className="font-mono text-fanos-accent">{alert.ruleId || 'FW-WAF-001'}</span>
                </div>
                <div>
                  <span className="text-fanos-dim">Decision:</span>{' '}
                  <span className="font-bold text-fanos-red">BLOCK (HTTP 403 Forbidden)</span>
                </div>
                <div>
                  <span className="text-fanos-dim">User-Agent:</span>{' '}
                  <span className="font-mono text-fanos-muted truncate inline-block max-w-[180px] align-bottom">
                    {alert.userAgent || 'curl'}
                  </span>
                </div>
                <div>
                  <span className="text-fanos-dim">Findings Count:</span>{' '}
                  <span className="text-white font-semibold">{alert.findingsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MITRE ATT&CK & Remediation */}
          <div className="p-3 rounded-lg bg-blue-500/[0.05] border border-blue-500/20">
            <div className="text-[11px] font-bold text-fanos-accent flex items-center gap-1.5 mb-1">
              <FileCode size={12} /> MITRE ATT&CK Mapping & Mitigation
            </div>
            <p className="text-[11px] text-fanos-muted leading-relaxed">
              Mapped to <strong className="text-white">T1190 (Exploit Public-Facing Application)</strong>.
              Payload attempted UNION query manipulation to bypass authentication or extract backend schema.
              WAF active blocking is enforced. Parameterized prepared statements recommended for web origin.
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-black/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {onAcknowledge && alert.status === 'NEW' && (
              <button
                onClick={() => {
                  onAcknowledge(alert.id)
                  onClose()
                }}
                className="fanos-btn bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 text-[11px] py-1.5 px-3"
              >
                <Check size={12} /> Acknowledge
              </button>
            )}
            {onResolve && alert.status !== 'RESOLVED' && (
              <button
                onClick={() => {
                  onResolve(alert.id)
                  onClose()
                }}
                className="fanos-btn bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-[11px] py-1.5 px-3"
              >
                <CheckCircle2 size={12} /> Mark Resolved
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose()
                navigate('/secops/events')
              }}
              className="fanos-btn text-[11px] py-1.5 px-3"
            >
              <ExternalLink size={11} /> Raw Event Stream
            </button>
            <button
              onClick={() => {
                onClose()
                navigate('/secops/investigations')
              }}
              className="fanos-btn bg-fanos-accent/20 text-fanos-accent border border-fanos-accent/40 hover:bg-fanos-accent/30 text-[11px] py-1.5 px-3"
            >
              <Search size={11} /> Investigate Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
