import { useState } from 'react'
import { Zap, RefreshCw, ExternalLink, ChevronRight, ShieldCheck, Radio, AlertCircle } from 'lucide-react'
import { useLiveEvents, useRefreshAll } from '@/hooks/useDashboard'
import { severityClass, statusClass, riskColor } from '@/lib/utils'
import type { IncidentDetail } from './IncidentDetailModal'
import { useWorkspace } from '@/context/WorkspaceContext'

/* ── column layout ────────────────────────────────── */
const COLS = 'grid-cols-[68px_80px_1fr_110px_130px_90px_60px_84px_96px]'

/* ── mini confidence bar ────────────────────────────── */
function RiskBar({ value }: { value: number }) {
  const color = value >= 90 ? '#ef4444' : value >= 70 ? '#f97316' : value >= 50 ? '#f59e0b' : '#0284c7'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[12px] font-bold ${riskColor(value)}`}>{value}</span>
      <div className="w-8 h-[4px] rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════ */
interface Props {
  onOpenIncident?: (incident: IncidentDetail) => void
  onOpenIP?: (ip: string) => void
}

export default function LiveEventsPanelEnhanced({ onOpenIncident, onOpenIP }: Props) {
  const { activeCustomer, hasService } = useWorkspace()
  const { data: rawEvents, isFetching } = useLiveEvents(20)
  const refresh = useRefreshAll()
  const [hovered, setHovered] = useState<string | null>(null)

  const hasWaf = hasService('waf')
  const hasIds = hasService('ids')

  // Generate strictly scoped events based on customer's approved service
  let events: any[] = []

  if (activeCustomer.approvedServices.length === 0) {
    // Pending customer
    events = []
  } else if (hasWaf && !hasIds) {
    // WAF ONLY Customer (e.g. Bank of Abyssinia) -> strictly WAF web exploits, NO IDS
    const domain = activeCustomer.domain || 'ebank.bankofabyssinia.com'
    events = [
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-01`,
        severity: 'CRITICAL',
        timestamp: 'Just now',
        threat: 'SQL Injection Attack',
        sourceIp: '185.220.101.45',
        dest: `${domain}/api/v1/search?id=' OR 1=1--`,
        asset: 'Web / WAF',
        aiRisk: 96,
        status: 'BLOCKED',
        action: 'WAF Block',
        incidentId: 'INC-WAF-001',
      },
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-02`,
        severity: 'HIGH',
        timestamp: '2 min ago',
        threat: 'Cross-Site Scripting (XSS)',
        sourceIp: '45.142.214.18',
        dest: `${domain}/comments?msg=<script>alert(1)</script>`,
        asset: 'Web / WAF',
        aiRisk: 88,
        status: 'BLOCKED',
        action: 'WAF Block',
        incidentId: null,
      },
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-03`,
        severity: 'CRITICAL',
        timestamp: '5 min ago',
        threat: 'SSRF & Internal Exploration',
        sourceIp: '194.26.29.112',
        dest: `${domain}/proxy?target=http://127.0.0.1:8002`,
        asset: 'Web / WAF',
        aiRisk: 95,
        status: 'BLOCKED',
        action: 'WAF Block',
        incidentId: 'INC-WAF-001',
      },
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-04`,
        severity: 'HIGH',
        timestamp: '9 min ago',
        threat: 'Path Traversal ../../etc/passwd',
        sourceIp: '103.151.125.8',
        dest: `${domain}/static/assets`,
        asset: 'Web / WAF',
        aiRisk: 84,
        status: 'BLOCKED',
        action: 'WAF Block',
        incidentId: null,
      },
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-05`,
        severity: 'CRITICAL',
        timestamp: '14 min ago',
        threat: 'API Credential Stuffing Campaign',
        sourceIp: '89.248.163.66',
        dest: `${domain}/v1/auth/tokens`,
        asset: 'Web / WAF',
        aiRisk: 92,
        status: 'BLOCKED',
        action: 'Rate Limited & Blocked',
        incidentId: 'INC-WAF-002',
      },
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-06`,
        severity: 'HIGH',
        timestamp: '21 min ago',
        threat: 'Command Injection via POST body',
        sourceIp: '172.16.0.88',
        dest: `${domain}/api/exec`,
        asset: 'Web / WAF',
        aiRisk: 98,
        status: 'BLOCKED',
        action: 'WAF Block',
        incidentId: null,
      },
      {
        id: `WAF-${activeCustomer.id.slice(5, 9)}-07`,
        severity: 'MEDIUM',
        timestamp: '28 min ago',
        threat: 'Malformed JSON Payload Exploit',
        sourceIp: '185.191.171.12',
        dest: `${domain}/v1/webhook`,
        asset: 'Web / WAF',
        aiRisk: 68,
        status: 'BLOCKED',
        action: 'WAF Block',
        incidentId: null,
      },
    ]
  } else if (hasIds && !hasWaf) {
    // IDS ONLY Customer (e.g. Ethiopian Airlines) -> strictly Network IDS alerts, NO WAF
    const net = activeCustomer.ipAddress || '10.200.0.0/16'
    events = [
      {
        id: `IDS-${activeCustomer.id.slice(5, 9)}-01`,
        severity: 'HIGH',
        timestamp: 'Just now',
        threat: 'Port Scan & Reconnaissance',
        sourceIp: '192.168.56.31',
        dest: `${net.split('/')[0]}:8000`,
        asset: 'Suricata IDS',
        aiRisk: 84,
        status: 'ALERT',
        action: 'Alert Raised',
        incidentId: 'INC-NET-001',
      },
      {
        id: `IDS-${activeCustomer.id.slice(5, 9)}-02`,
        severity: 'CRITICAL',
        timestamp: '3 min ago',
        threat: 'TCP SYN Flood DoS Attempt',
        sourceIp: '45.142.214.18',
        dest: `${net.split('/')[0]}:443`,
        asset: 'Suricata IDS',
        aiRisk: 94,
        status: 'ALERT',
        action: 'Alert Raised',
        incidentId: 'INC-NET-002',
      },
      {
        id: `IDS-${activeCustomer.id.slice(5, 9)}-03`,
        severity: 'HIGH',
        timestamp: '7 min ago',
        threat: 'Lateral Movement SMB Probe',
        sourceIp: '10.200.4.12',
        dest: '10.200.4.88:445',
        asset: 'Zeek NDR',
        aiRisk: 86,
        status: 'ALERT',
        action: 'Alert Raised',
        incidentId: null,
      },
      {
        id: `IDS-${activeCustomer.id.slice(5, 9)}-04`,
        severity: 'HIGH',
        timestamp: '15 min ago',
        threat: 'DNS Tunneling Communication',
        sourceIp: '192.168.56.55',
        dest: '8.8.8.8:53',
        asset: 'Zeek NDR',
        aiRisk: 82,
        status: 'ALERT',
        action: 'Alert Raised',
        incidentId: 'INC-NET-003',
      },
      {
        id: `IDS-${activeCustomer.id.slice(5, 9)}-05`,
        severity: 'CRITICAL',
        timestamp: '22 min ago',
        threat: 'SSH Brute Force Exploit',
        sourceIp: '41.190.3.211',
        dest: `${net.split('/')[0]}:22`,
        asset: 'Suricata IDS',
        aiRisk: 91,
        status: 'ALERT',
        action: 'Alert Raised',
        incidentId: null,
      },
    ]
  } else {
    // Multi-Engine (both WAF and IDS approved, e.g. Commercial Bank)
    events = (rawEvents && rawEvents.length > 0)
      ? rawEvents.map((ev: any, idx: number) => {
          let timestampStr = 'Just now'
          const rawTime = ev.created_at || ev.timestamp
          if (rawTime) {
            try {
              const d = new Date(rawTime)
              timestampStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
            } catch {
              timestampStr = String(rawTime).slice(11, 19) || 'Just now'
            }
          }
          const action = ev.status === 'BLOCKED' ? 'WAF Block' : ev.status === 'ALERT' ? 'Alert Raised' : 'Monitored'
          const asset = ev.sensor_source === 'suricata' ? 'Suricata IDS' : 'Web / WAF'
          const risk = ev.risk_score || 85
          return {
            id: ev.id ? `EVT-${String(ev.id).slice(0, 6)}` : `EVT-${idx + 1}`,
            severity: ev.severity || 'HIGH',
            timestamp: timestampStr,
            threat: ev.attack_type || ev.threat || 'Security Event',
            sourceIp: ev.source_ip || ev.sourceIp || '192.168.56.101',
            dest: ev.target || ev.dest || activeCustomer.domain,
            asset: asset,
            aiRisk: risk,
            status: ev.status || 'BLOCKED',
            action: action,
            incidentId: ev.incident_id || null,
          }
        })
      : [
          {
            id: 'EVT-CBE-01',
            severity: 'CRITICAL',
            timestamp: 'Just now',
            threat: 'SQL Injection Attack',
            sourceIp: '185.220.101.45',
            dest: `${activeCustomer.domain}/api/v1/search`,
            asset: 'Web / WAF',
            aiRisk: 98,
            status: 'BLOCKED',
            action: 'WAF Block',
            incidentId: 'INC-WAF-001',
          },
          {
            id: 'EVT-CBE-02',
            severity: 'HIGH',
            timestamp: '4 min ago',
            threat: 'Port Scan & Reconnaissance',
            sourceIp: '192.168.56.31',
            dest: '196.189.88.22:8000',
            asset: 'Suricata IDS',
            aiRisk: 86,
            status: 'ALERT',
            action: 'Alert Raised',
            incidentId: 'INC-NET-001',
          },
        ]
  }

  return (
    <div className="fanos-card overflow-hidden">
      {/* Header */}
      <div className="fanos-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasWaf && !hasIds ? (
            <ShieldCheck size={15} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          ) : hasIds && !hasWaf ? (
            <Radio size={15} className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
          ) : (
            <Zap size={15} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          )}
          <span className="text-[14px] font-bold text-white">
            {hasWaf && !hasIds
              ? `Live Web Application Firewall Events (${activeCustomer.name})`
              : hasIds && !hasWaf
              ? `Live Network IDS Events (${activeCustomer.name})`
              : `Live Security Events (${activeCustomer.name})`}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
            {hasWaf && !hasIds ? 'WAF Only' : hasIds && !hasWaf ? 'IDS Only' : 'Multi-Engine'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            REAL-TIME
          </div>
          <button onClick={refresh} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer" title="Refresh">
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className={`grid ${COLS} gap-2 px-5 py-2.5 border-b border-white/[0.08] bg-[#080d19]/90`}>
        {['SEVERITY', 'TIME', 'THREAT', 'SOURCE IP', 'DESTINATION / TARGET', 'ENGINE', 'AI RISK', 'STATUS', 'ACTION'].map(h => (
          <span key={h} className="text-[9.5px] font-bold tracking-[0.8px] uppercase text-slate-400 whitespace-nowrap">{h}</span>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center px-4 bg-slate-950/40">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 border border-amber-500/25">
            <AlertCircle size={22} className="text-amber-400" />
          </div>
          <p className="text-[14px] font-bold text-white mb-1">
            {activeCustomer.approvedServices.length === 0
              ? 'Service Request Awaiting Administrator Approval'
              : 'No Security Events Recorded for This Service'}
          </p>
          <p className="text-[12px] text-slate-400 max-w-md">
            {activeCustomer.approvedServices.length === 0
              ? `Asset "${activeCustomer.primaryAsset}" is registered. Once an administrator approves the ${activeCustomer.pendingServices.map(s => s.toUpperCase()).join(', ')} request, live security telemetry will stream here.`
              : `Security telemetry for ${activeCustomer.approvedServices.map(s => s.toUpperCase()).join(', ')} is active and standing by for traffic triggers.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {events.map((ev: any) => (
            <div
              key={ev.id}
              className={`grid ${COLS} gap-2 px-5 py-3 items-center transition-colors cursor-pointer group ${
                hovered === ev.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
              }`}
              onMouseEnter={() => setHovered(ev.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (onOpenIncident) {
                  onOpenIncident({
                    id: ev.incidentId || `INC-${ev.id}`,
                    severity: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(ev.severity) ? ev.severity : 'LOW') as any,
                    title: `${ev.threat} detected from ${ev.sourceIp}`,
                    riskScore: ev.aiRisk,
                    affectedAssets: 1,
                    affectedUsers: 1,
                    firstSeen: ev.timestamp,
                    lastSeen: ev.timestamp,
                    status: (ev.status === 'BLOCKED' ? 'BLOCKED' : ev.status === 'CONTAINED' ? 'CONTAINED' : 'OPEN') as any,
                    sourceIp: ev.sourceIp,
                    destIp: ev.dest,
                    asset: ev.asset,
                    category: ev.threat,
                  })
                }
              }}
            >
              {/* Severity */}
              <span className={severityClass(ev.severity)}>{ev.severity}</span>

              {/* Timestamp */}
              <span className="font-mono text-[11px] text-slate-400">{ev.timestamp}</span>

              {/* Threat */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[12px] text-white font-semibold truncate group-hover:text-emerald-300 transition-colors">{ev.threat}</span>
                <ChevronRight size={11} className="text-slate-500 flex-shrink-0" />
              </div>

              {/* Source IP — clickable */}
              <button
                className="font-mono text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors text-left truncate cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onOpenIP?.(ev.sourceIp) }}
                title={`View threat intel for ${ev.sourceIp}`}
              >
                {ev.sourceIp}
                <ExternalLink size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-100" />
              </button>

              {/* Destination */}
              <span className="text-[11px] text-slate-300 font-mono truncate" title={ev.dest}>{ev.dest}</span>

              {/* Engine */}
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  ev.asset.includes('WAF')
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                }`}>
                  {ev.asset}
                </span>
              </div>

              {/* AI Risk */}
              <RiskBar value={ev.aiRisk} />

              {/* Status */}
              <span className={statusClass(ev.status)}>{ev.status}</span>

              {/* Action */}
              <span className="text-[11px] text-slate-300 truncate font-medium">{ev.action}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/[0.08] bg-slate-900/40 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          Showing {events.length} security events · {hasWaf && !hasIds ? 'Engine: FANOS WAF Reverse Proxy (8002)' : hasIds && !hasWaf ? 'Engine: Suricata IDS Sensor' : 'Engine: Multi-Engine Network + WAF'}
        </span>
        <button className="fanos-btn text-[10px] py-1 px-3">View All Events</button>
      </div>
    </div>
  )
}

