import { useState } from 'react'
import { Zap, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react'
import { useLiveEvents, useRefreshAll } from '@/hooks/useDashboard'
import { severityClass, statusClass, riskColor } from '@/lib/utils'
import type { IncidentDetail } from './IncidentDetailModal'

/* ── column layout ────────────────────────────────── */
const COLS = 'grid-cols-[68px_80px_1fr_110px_100px_76px_60px_84px_88px]'

/* ── mini confidence bar ────────────────────────────── */
function RiskBar({ value }: { value: number }) {
  const color = value >= 90 ? '#ef4444' : value >= 70 ? '#f97316' : value >= 50 ? '#f59e0b' : '#00c8ff'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[12px] font-bold ${riskColor(value)}`}>{value}</span>
      <div className="w-8 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

/* ── enhanced mock events (SOC-grade) ─────────────── */
export const LIVE_EVENTS = [
  {
    id: 'EVT-4821', severity: 'CRITICAL', timestamp: '00:14:32',
    threat: 'Ransomware Behavior',    sourceIp: '185.220.101.47',
    dest: '10.0.2.15',               asset: 'Endpoint-23',
    aiRisk: 98, status: 'CONTAINED', action: 'Endpoint Isolated',
    incidentId: 'INC-2026-004821',
  },
  {
    id: 'EVT-4820', severity: 'HIGH', timestamp: '00:13:41',
    threat: 'SQL Injection',          sourceIp: '102.213.85.44',
    dest: 'API-Gateway',              asset: 'Web/API',
    aiRisk: 94, status: 'BLOCKED',   action: 'WAF Block',
    incidentId: null,
  },
  {
    id: 'EVT-4819', severity: 'HIGH', timestamp: '00:12:09',
    threat: 'Brute Force',            sourceIp: '41.190.3.211',
    dest: 'VPN-Gateway',              asset: 'Identity',
    aiRisk: 91, status: 'BLOCKED',   action: 'IP Blocked',
    incidentId: null,
  },
  {
    id: 'EVT-4818', severity: 'HIGH', timestamp: '00:11:54',
    threat: 'XSS Attack',             sourceIp: '196.45.21.88',
    dest: '/app/profile',             asset: 'Web/API',
    aiRisk: 87, status: 'BLOCKED',   action: 'WAF Block',
    incidentId: null,
  },
  {
    id: 'EVT-4817', severity: 'MEDIUM', timestamp: '00:10:17',
    threat: 'Port Scan',              sourceIp: '91.108.4.15',
    dest: 'Network Segment A',        asset: 'Network',
    aiRisk: 64, status: 'MONITORED', action: 'Alerting',
    incidentId: null,
  },
  {
    id: 'EVT-4816', severity: 'HIGH', timestamp: '00:09:33',
    threat: 'Credential Stuffing',    sourceIp: '77.232.110.5',
    dest: '/auth/login',              asset: 'Identity',
    aiRisk: 82, status: 'BLOCKED',   action: 'Account Locked',
    incidentId: null,
  },
  {
    id: 'EVT-4815', severity: 'MEDIUM', timestamp: '00:08:12',
    threat: 'SSRF Attempt',           sourceIp: '103.56.144.20',
    dest: '/api/fetch',               asset: 'Web/API',
    aiRisk: 58, status: 'BLOCKED',   action: 'WAF Block',
    incidentId: null,
  },
  {
    id: 'EVT-4814', severity: 'LOW', timestamp: '00:07:05',
    threat: 'Anomalous Traffic',      sourceIp: '10.0.4.22',
    dest: 'Cloud-Storage',            asset: 'Cloud',
    aiRisk: 35, status: 'ALERT',     action: 'Alerting',
    incidentId: null,
  },
]

/* ── mock incident for INC-2026-004821 ────────────── */
export const CRITICAL_INCIDENT: IncidentDetail = {
  id:             'INC-2026-004821',
  severity:       'CRITICAL',
  title:          'Ransomware Behavior Detected — LockBit Pattern',
  riskScore:      98,
  affectedAssets: 3,
  affectedUsers:  2,
  firstSeen:      '00:14:22',
  lastSeen:       '00:14:41',
  status:         'CONTAINED',
  sourceIp:       '185.220.101.47',
  destIp:         '10.0.2.15',
  asset:          'Endpoint-23',
  category:       'Ransomware / Lateral Movement',
}

/* ═══════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════ */
interface Props {
  onOpenIncident?: (incident: IncidentDetail) => void
  onOpenIP?: (ip: string) => void
}

export default function LiveEventsPanelEnhanced({ onOpenIncident, onOpenIP }: Props) {
  const { isFetching } = useLiveEvents(20)
  const refresh = useRefreshAll()
  const [hovered, setHovered] = useState<string | null>(null)

  const events = LIVE_EVENTS

  return (
    <div className="fanos-card">
      {/* Header */}
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Zap size={13} className="text-fanos-accent" />
          Live Security Events
        </div>
        <div className="flex items-center gap-2">
          <div style={{
            background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)',
            borderRadius: '20px', padding: '3px 8px',
            fontSize: '10px', fontWeight: 600, color: '#00e5a0',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span className="dot-green" />
            REAL-TIME
          </div>
          <button onClick={refresh} className="text-fanos-dim hover:text-fanos-muted transition-colors" title="Refresh">
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className={`grid ${COLS} gap-2 px-4 py-2 border-b border-white/[0.04] bg-black/10`}>
        {['SEVERITY', 'TIME', 'THREAT', 'SOURCE IP', 'DESTINATION', 'ASSET', 'AI RISK', 'STATUS', 'ACTION'].map(h => (
          <span key={h} className="text-[10px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</span>
        ))}
      </div>

      <div className="divide-y divide-white/[0.03]">
        {events.map(ev => (
          <div
            key={ev.id}
            className={`grid ${COLS} gap-2 px-4 py-2.5 items-center transition-colors cursor-pointer ${
              hovered === ev.id ? 'bg-white/[0.025]' : 'hover:bg-white/[0.015]'
            }`}
            onMouseEnter={() => setHovered(ev.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (ev.incidentId && onOpenIncident) onOpenIncident(CRITICAL_INCIDENT)
            }}
          >
            {/* Severity */}
            <span className={severityClass(ev.severity)}>{ev.severity}</span>

            {/* Timestamp */}
            <span className="font-mono text-[11px] text-fanos-dim">{ev.timestamp}</span>

            {/* Threat */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[12px] text-fanos-text font-medium truncate">{ev.threat}</span>
              {ev.incidentId && (
                <ChevronRight size={10} className="text-fanos-accent flex-shrink-0" />
              )}
            </div>

            {/* Source IP — clickable */}
            <button
              className="font-mono text-[11px] text-fanos-accent hover:text-white flex items-center gap-1 transition-colors text-left truncate"
              onClick={(e) => { e.stopPropagation(); onOpenIP?.(ev.sourceIp) }}
              title={`View threat intel for ${ev.sourceIp}`}
            >
              {ev.sourceIp}
              <ExternalLink size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-100" />
            </button>

            {/* Destination */}
            <span className="text-[11px] text-fanos-muted truncate">{ev.dest}</span>

            {/* Asset */}
            <span className="text-[11px] text-fanos-muted truncate">{ev.asset}</span>

            {/* AI Risk */}
            <RiskBar value={ev.aiRisk} />

            {/* Status */}
            <span className={statusClass(ev.status)}>{ev.status}</span>

            {/* Action */}
            <span className="text-[11px] text-fanos-dim truncate">{ev.action}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[11px] text-fanos-dim">
          Showing {events.length} most recent events · 1,284 events/sec
        </span>
        <button className="fanos-btn text-[10px] py-1 px-2.5">View All Events</button>
      </div>
    </div>
  )
}
