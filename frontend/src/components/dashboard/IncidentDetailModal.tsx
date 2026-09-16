import { useState } from 'react'
import {
  X, AlertOctagon, Clock, Shield, User, Server, Brain,
  ChevronRight, CheckCircle, Zap, Lock,
  Network, Terminal, ShieldAlert, Activity, Target,
  ExternalLink, Play, StopCircle, Wifi, FileSearch, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ───────── types ───────── */
export interface IncidentDetail {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  riskScore: number
  affectedAssets: number
  affectedUsers: number
  firstSeen: string
  lastSeen: string
  status: 'CONTAINED' | 'INVESTIGATING' | 'BLOCKED' | 'OPEN'
  sourceIp: string
  destIp: string
  asset: string
  category: string
}

/* ───────── mock data for incident INC-2026-004821 ───────── */
const TIMELINE = [
  { time: '00:14:22', icon: Terminal,    label: 'Suspicious PowerShell execution',      detail: 'powershell.exe -enc JABjAGwAaQBlAG4AdA...',     color: '#f59e0b' },
  { time: '00:14:25', icon: Lock,        label: 'Credential access detected',            detail: 'LSASS memory read via MiniDumpWriteDump()',      color: '#f97316' },
  { time: '00:14:29', icon: Network,     label: 'Lateral movement detected',             detail: 'SMB connection to 10.0.2.18, 10.0.2.31',        color: '#f97316' },
  { time: '00:14:31', icon: ShieldAlert, label: 'Encryption behavior detected',          detail: 'Mass file rename: .docx → .locked (312 files)', color: '#ef4444' },
  { time: '00:14:32', icon: Zap,         label: 'FANOS AI raised CRITICAL alert',        detail: 'Risk score: 98/100 — Ransomware pattern match', color: '#00c8ff' },
  { time: '00:14:33', icon: Shield,      label: 'Endpoint isolated',                     detail: 'Endpoint-23 network isolation via EDR API',     color: '#00e5a0' },
  { time: '00:14:34', icon: ShieldAlert, label: 'Malicious IP blocked',                  detail: '185.220.101.47 added to global blocklist',      color: '#00e5a0' },
  { time: '00:14:41', icon: CheckCircle, label: 'Threat contained',                      detail: 'Ransomware execution halted — 3 assets quarantined', color: '#00e5a0' },
]

const MITRE_TACTICS: { tactic: string; techniques: { id: string; name: string; matched: boolean }[] }[] = [
  {
    tactic: 'Initial Access',
    techniques: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', matched: false },
      { id: 'T1078',     name: 'Valid Accounts',           matched: false },
    ],
  },
  {
    tactic: 'Execution',
    techniques: [
      { id: 'T1059.001', name: 'PowerShell',               matched: true  },
      { id: 'T1047',     name: 'WMI',                      matched: false },
    ],
  },
  {
    tactic: 'Credential Access',
    techniques: [
      { id: 'T1003.001', name: 'LSASS Memory',             matched: true  },
      { id: 'T1110',     name: 'Brute Force',               matched: false },
    ],
  },
  {
    tactic: 'Lateral Movement',
    techniques: [
      { id: 'T1021.002', name: 'SMB/Windows Admin Shares',  matched: true  },
      { id: 'T1534',     name: 'Internal Spearphishing',    matched: false },
    ],
  },
  {
    tactic: 'Collection',
    techniques: [
      { id: 'T1074.001', name: 'Local Data Staging',        matched: true  },
    ],
  },
  {
    tactic: 'Impact',
    techniques: [
      { id: 'T1486',     name: 'Data Encrypted for Impact', matched: true  },
      { id: 'T1490',     name: 'Inhibit System Recovery',   matched: false },
    ],
  },
]

const IOC_LIST = [
  { type: 'IP',     value: '185.220.101.47', reputation: 'Malicious', confidence: 99, source: 'AbuseIPDB + FANOS TI' },
  { type: 'HASH',   value: 'a3f1b2c9...d7e4', reputation: 'Ransomware', confidence: 97, source: 'VirusTotal (62/72)' },
  { type: 'DOMAIN', value: 'c2.darknet-pay.ru', reputation: 'C2 Server', confidence: 95, source: 'OTX + Shodan' },
  { type: 'HASH',   value: 'b8e2a1f6...91c3', reputation: 'Loader',    confidence: 91, source: 'MalwareBazaar' },
  { type: 'URL',    value: 'hxxp://185.220[.]101[.]47/r.exe', reputation: 'Payload Delivery', confidence: 98, source: 'URLhaus' },
]

const RESPONSE_ACTIONS = [
  { id: 'isolate',  label: 'Isolate Endpoint',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',  icon: Wifi,       destructive: true  },
  { id: 'block-ip', label: 'Block IP',                color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)', icon: ShieldAlert, destructive: true  },
  { id: 'kill-ses', label: 'Kill Session',            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)', icon: StopCircle,  destructive: true  },
  { id: 'dis-acct', label: 'Disable Account',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)', icon: User,        destructive: true  },
  { id: 'scan',     label: 'Run Security Scan',       color: '#00c8ff', bg: 'rgba(0,200,255,0.08)',  border: 'rgba(0,200,255,0.25)', icon: FileSearch,   destructive: false },
  { id: 'playbook', label: 'Create Response Playbook',color: '#00e5a0', bg: 'rgba(0,229,160,0.08)',  border: 'rgba(0,229,160,0.25)', icon: BookOpen,    destructive: false },
]

/* ───────── severity helpers ───────── */
const SEV_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#3b82f6',
}
const STATUS_COLORS: Record<string, { c: string; bg: string; bd: string }> = {
  CONTAINED:     { c: '#00e5a0', bg: 'rgba(0,229,160,0.1)',   bd: 'rgba(0,229,160,0.3)'   },
  INVESTIGATING: { c: '#f97316', bg: 'rgba(249,115,22,0.1)',  bd: 'rgba(249,115,22,0.3)'  },
  BLOCKED:       { c: '#00c8ff', bg: 'rgba(0,200,255,0.08)',  bd: 'rgba(0,200,255,0.25)'  },
  OPEN:          { c: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  bd: 'rgba(245,158,11,0.3)'  },
}

/* ───────── Tab ───────── */
type Tab = 'timeline' | 'ai' | 'mitre' | 'intel' | 'response'
const TABS: { id: Tab; label: string }[] = [
  { id: 'timeline', label: 'Attack Timeline' },
  { id: 'ai',       label: 'AI Investigation' },
  { id: 'mitre',    label: 'MITRE ATT&CK' },
  { id: 'intel',    label: 'Threat Intel' },
  { id: 'response', label: 'Response Actions' },
]

/* ═══════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════ */
interface Props {
  incident: IncidentDetail
  onClose: () => void
}

export default function IncidentDetailModal({ incident, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('timeline')
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set())

  const sevColor = SEV_COLORS[incident.severity] ?? '#60738e'
  const statusStyle = STATUS_COLORS[incident.status] ?? STATUS_COLORS.OPEN

  function handleAction(actionId: string, destructive: boolean) {
    if (destructive && confirmAction !== actionId) {
      setConfirmAction(actionId)
      return
    }
    setExecutedActions(prev => new Set(prev).add(actionId))
    setConfirmAction(null)
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-8 pb-8 px-4"
      style={{ background: 'rgba(4,8,18,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div
        className="relative w-full max-w-5xl flex flex-col rounded-xl overflow-hidden animate-fade-in"
        style={{
          background: '#0d1525',
          border: `1px solid ${sevColor}33`,
          boxShadow: `0 0 0 1px ${sevColor}1a, 0 32px 80px rgba(0,0,0,0.7)`,
          maxHeight: 'calc(100vh - 64px)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.07]"
          style={{ background: `linear-gradient(135deg, ${sevColor}08, transparent)` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Severity Icon */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${sevColor}15`, border: `1px solid ${sevColor}40` }}>
                <AlertOctagon size={18} style={{ color: sevColor }} />
              </div>
              <div>
                {/* Incident ID + severity */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-fanos-dim">{incident.id}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}35` }}>
                    {incident.severity}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color: statusStyle.c, background: statusStyle.bg, border: `1px solid ${statusStyle.bd}` }}>
                    {incident.status}
                  </span>
                </div>
                {/* Title */}
                <h2 className="text-[16px] font-bold text-white leading-snug">{incident.title}</h2>
                <p className="text-[12px] text-fanos-muted mt-0.5">{incident.category}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-fanos-dim hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-6 gap-3 mt-4">
            {[
              { icon: Target,   label: 'Risk Score',      value: `${incident.riskScore}/100`, color: sevColor },
              { icon: Server,   label: 'Affected Assets',  value: String(incident.affectedAssets),  color: '#f97316' },
              { icon: User,     label: 'Affected Users',   value: String(incident.affectedUsers),   color: '#f97316' },
              { icon: Clock,    label: 'First Seen',       value: incident.firstSeen,               color: '#00c8ff' },
              { icon: Clock,    label: 'Last Seen',        value: incident.lastSeen,                color: '#f59e0b' },
              { icon: Activity, label: 'Category',         value: incident.category,                color: '#8b5cf6' },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg px-3 py-2.5 flex flex-col gap-1"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5">
                  <stat.icon size={10} style={{ color: stat.color }} />
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-fanos-dim">{stat.label}</span>
                </div>
                <span className="text-[13px] font-bold text-white leading-none truncate"
                  style={stat.label === 'Risk Score' ? { color: sevColor } : undefined}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex-shrink-0 flex border-b border-white/[0.06]"
          style={{ background: 'rgba(0,0,0,0.2)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-[12px] font-semibold tracking-wide transition-all border-b-2',
                tab === t.id
                  ? 'text-white border-fanos-accent'
                  : 'text-fanos-dim border-transparent hover:text-fanos-muted'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* TIMELINE */}
          {tab === 'timeline' && (
            <div className="p-5">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[17px] top-4 bottom-4 w-px bg-white/[0.08]" />
                <div className="flex flex-col gap-0">
                  {TIMELINE.map((ev, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 mt-1"
                        style={{ background: `${ev.color}15`, border: `1px solid ${ev.color}40` }}>
                        <ev.icon size={14} style={{ color: ev.color }} />
                      </div>
                      <div className="flex-1 pb-5">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-[11px] font-semibold text-fanos-accent">{ev.time}</span>
                          <span className="text-[13px] font-semibold text-white">{ev.label}</span>
                        </div>
                        <div className="text-[11px] text-fanos-muted font-mono px-3 py-1.5 rounded"
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {ev.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI INVESTIGATION */}
          {tab === 'ai' && (
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="rounded-xl p-4"
                style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(0,200,255,0.06))', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
                    <Brain size={13} className="text-fanos-purple" />
                  </div>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-fanos-purple">FANOS AI Analysis</span>
                  <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,229,160,0.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.3)' }}>
                    ● HIGH CONFIDENCE
                  </span>
                </div>
                <p className="text-[13px] text-fanos-text leading-relaxed">
                  FANOS AI correlated <strong className="text-white">37 security events</strong> across {incident.affectedAssets} affected endpoints and {incident.affectedUsers} identities. The observed behavior is consistent with a <strong className="text-fanos-red">multi-stage ransomware campaign</strong> involving PowerShell-based execution, LSASS credential dumping, SMB-based lateral movement, and file encryption targeting the <span className="text-fanos-accent">Documents</span> and <span className="text-fanos-accent">Desktop</span> directories. The threat actor matches the <strong className="text-fanos-orange">LOCKBIT 3.0</strong> malware family with high confidence.
                </p>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Risk Score',        value: `${incident.riskScore}/100`, color: '#ef4444', sub: 'Critical severity' },
                  { label: 'AI Confidence',     value: '98.4%',                    color: '#8b5cf6', sub: 'F1: 99.85%' },
                  { label: 'Correlated Events', value: '37',                       color: '#00c8ff', sub: 'Across 3 assets' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-3 text-center"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="text-[22px] font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[11px] font-semibold text-fanos-text mt-0.5">{m.label}</div>
                    <div className="text-[10px] text-fanos-dim mt-0.5">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* MITRE summary */}
              <div className="rounded-lg p-4"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-dim mb-3">MITRE ATT&CK — Matched Techniques</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { tactic: 'Execution',         tech: 'T1059.001' },
                    { tactic: 'Credential Access', tech: 'T1003.001' },
                    { tactic: 'Lateral Movement',  tech: 'T1021.002' },
                    { tactic: 'Collection',        tech: 'T1074.001' },
                    { tactic: 'Impact',            tech: 'T1486'     },
                  ].map(t => (
                    <div key={t.tech} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <ChevronRight size={10} className="text-fanos-purple" />
                      <span className="text-[10px] font-semibold text-fanos-purple">{t.tactic}</span>
                      <span className="text-[9px] text-fanos-dim font-mono">({t.tech})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Note */}
              <div className="text-[10px] text-fanos-dim leading-relaxed px-3 py-2 rounded"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="text-fanos-amber font-semibold">⚠ DEMO MODE:</span> AI analysis scores represent system demonstration data.
                Connect a verified sensor network for production-grade threat scoring validated against your environment.
              </div>
            </div>
          )}

          {/* MITRE ATT&CK */}
          {tab === 'mitre' && (
            <div className="p-5">
              <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-dim mb-4">
                ATT&CK Technique Mapping — Incident {incident.id}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {MITRE_TACTICS.map(tac => (
                  <div key={tac.tactic} className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: 'rgba(0,0,0,0.4)', color: '#8fa3bf' }}>
                      {tac.tactic}
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {tac.techniques.map(t => (
                        <div key={t.id}
                          className={cn('flex items-center gap-2 px-3 py-2 transition-colors',
                            t.matched ? 'bg-violet-500/10' : 'hover:bg-white/[0.02]')}>
                          <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0',
                            t.matched ? 'bg-fanos-purple' : 'bg-white/20')} />
                          <div className="flex-1 min-w-0">
                            <div className={cn('text-[11px] font-medium truncate',
                              t.matched ? 'text-white' : 'text-fanos-dim')}>
                              {t.name}
                            </div>
                            <div className="text-[9px] font-mono text-fanos-dim">{t.id}</div>
                          </div>
                          {t.matched && (
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.35)' }}>
                              MATCHED
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* THREAT INTEL */}
          {tab === 'intel' && (
            <div className="p-5 space-y-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-dim mb-3">
                Indicators of Compromise (IOC)
              </div>
              <div className="space-y-2">
                {IOC_LIST.map((ioc, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'rgba(0,200,255,0.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.25)', minWidth: 46, textAlign: 'center' }}>
                      {ioc.type}
                    </span>
                    <span className="font-mono text-[12px] text-fanos-text flex-1 truncate">{ioc.value}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                      {ioc.reputation}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-10 h-[3px] rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${ioc.confidence}%`, background: '#ef4444' }} />
                      </div>
                      <span className="text-[11px] font-bold text-fanos-red">{ioc.confidence}%</span>
                    </div>
                    <span className="text-[10px] text-fanos-dim flex-shrink-0">{ioc.source}</span>
                    <button className="w-5 h-5 flex items-center justify-center text-fanos-dim hover:text-fanos-muted transition-colors flex-shrink-0">
                      <ExternalLink size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Threat Actor */}
              <div className="rounded-xl p-4 mt-4"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-red mb-3">Suspected Threat Actor</div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Malware Family', value: 'LockBit 3.0' },
                    { label: 'Threat Actor',   value: 'UNKNOWN / Ransomware-as-a-Service' },
                    { label: 'Campaign',       value: 'RaaS-Africa-2026-Q3' },
                    { label: 'First Observed', value: '2026-09-12' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-[10px] text-fanos-dim mb-0.5">{item.label}</div>
                      <div className="text-[12px] font-semibold text-fanos-text">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESPONSE ACTIONS */}
          {tab === 'response' && (
            <div className="p-5 space-y-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-fanos-dim mb-1">
                Automated & Manual Response
              </div>
              <div className="rounded-lg px-4 py-3 mb-4"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-[11px] text-fanos-amber">
                  ⚠ Destructive actions require authorization. Each action is logged in the audit trail.
                  Production deployments enforce role-based access control before any response action can be executed.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {RESPONSE_ACTIONS.map(action => {
                  const executed = executedActions.has(action.id)
                  const confirming = confirmAction === action.id
                  return (
                    <button key={action.id}
                      onClick={() => handleAction(action.id, action.destructive)}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-3 rounded-lg text-left transition-all duration-150',
                        executed ? 'opacity-60' : 'hover:brightness-125',
                        confirming ? 'ring-2 ring-offset-1 ring-offset-transparent' : '',
                      )}
                      style={{
                        background: executed ? 'rgba(0,229,160,0.08)' : action.bg,
                        border: `1px solid ${executed ? '#00e5a0' : confirming ? action.color : action.border}`,
                        color: executed ? '#00e5a0' : action.color,
                      }}
                    >
                      {executed
                        ? <CheckCircle size={14} style={{ color: '#00e5a0' }} />
                        : <action.icon size={14} />}
                      <div>
                        <div className="text-[12px] font-semibold">
                          {executed ? '✓ Executed' : confirming ? 'Click to confirm' : action.label}
                        </div>
                        {action.destructive && !executed && (
                          <div className="text-[9px] opacity-70 mt-0.5">
                            {confirming ? 'This action requires authorization' : 'Requires authorization'}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Playbook suggestion */}
              <div className="rounded-xl p-4 mt-2"
                style={{ background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Play size={12} className="text-fanos-accent" />
                  <span className="text-[11px] font-bold text-fanos-accent uppercase tracking-wide">Recommended Playbook</span>
                </div>
                <p className="text-[12px] text-fanos-muted">
                  <strong className="text-fanos-text">Ransomware Response Playbook v2.1</strong> — Isolate affected endpoints,
                  reset credentials, restore from last known-good backup, and conduct forensic analysis before re-joining the network.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
