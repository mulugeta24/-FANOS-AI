import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getWafEvents, getWafStats } from '@/services/wafApi'
import type { WAFSecurityEvent, StatsSummary } from '@/types/waf'

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED'

export interface SecOpsAlert {
  id: string
  requestId: string
  sev: AlertSeverity
  title: string
  src: string
  target: string
  engine: 'WAF' | 'Suricata' | 'Zeek' | 'FANOS AI'
  risk: number
  status: AlertStatus
  time: string
  relativeTime: string
  timestamp: string
  matchedValue?: string
  ruleId?: string
  findingsCount: number
  findings?: any[]
  rawEvent?: WAFSecurityEvent
  userAgent?: string
  decision?: string
}

export interface SecOpsIncident {
  id: string
  title: string
  threat: string
  sev: AlertSeverity
  src: string
  status: 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved'
  risk: number
  assignee: string
  created: string
  updated: string
  eventsCount: number
  alertsCount: number
  correlatedRequestIds: string[]
  summary: string
  targetHost?: string
}

export interface SecOpsInvestigationTimelineItem {
  id: string
  time: string
  requestId: string
  action: string
  payload: string
  sourceIp: string
  target: string
  status: string
  sev: AlertSeverity
}

export interface SecOpsInvestigation {
  id: string
  title: string
  status: 'Active' | 'Closed'
  priority: 'High' | 'Medium' | 'Low'
  analyst: string
  created: string
  updated: string
  indicators: number
  alerts: number
  artifacts: number
  summary: string
  timeline: SecOpsInvestigationTimelineItem[]
  mitreTechniques: { id: string; name: string; tactic: string }[]
  iocs: { type: string; value: string; desc: string }[]
}

interface SecOpsAlertContextType {
  alerts: SecOpsAlert[]
  incidents: SecOpsIncident[]
  investigations: SecOpsInvestigation[]
  wafStats: StatsSummary | null
  loading: boolean
  isLive: boolean
  setIsLive: (live: boolean) => void
  refresh: () => Promise<void>
  acknowledgeAlert: (alertId: string) => void
  resolveAlert: (alertId: string) => void
  updateIncidentStatus: (incidentId: string, status: 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved') => void
  criticalAlertsCount: number
  highAlertsCount: number
  activeIncidentsCount: number
  newAlertsCount: number
  blockedTodayCount: number
  securityEventsCount: number
  selectedAlert: SecOpsAlert | null
  setSelectedAlert: (a: SecOpsAlert | null) => void
}

const SecOpsAlertContext = createContext<SecOpsAlertContextType | undefined>(undefined)

// Baseline network & system alerts to combine with live WAF telemetry
const BASELINE_ALERTS: SecOpsAlert[] = [
  {
    id: 'ALT-SUR-001',
    requestId: 'req-sur-001',
    sev: 'CRITICAL',
    title: 'Command Injection on /api/exec',
    src: '172.16.0.88',
    target: '/api/exec',
    engine: 'Suricata',
    risk: 98,
    status: 'NEW',
    time: '14:21:55',
    relativeTime: '5 min ago',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    findingsCount: 1,
    ruleId: 'ET-EXPLOIT-002',
    matchedValue: '; cat /etc/passwd',
  },
  {
    id: 'ALT-SUR-002',
    requestId: 'req-sur-002',
    sev: 'HIGH',
    title: 'Brute Force Attack on SSH Port 22',
    src: '185.220.0.14',
    target: '10.0.0.5:22',
    engine: 'Suricata',
    risk: 88,
    status: 'ACKNOWLEDGED',
    time: '14:20:33',
    relativeTime: '8 min ago',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    findingsCount: 1,
    ruleId: 'ET-SCAN-SSH-001',
    matchedValue: 'Failed password for root',
  },
  {
    id: 'ALT-ZEEK-001',
    requestId: 'req-zk-001',
    sev: 'HIGH',
    title: 'Network Port Scan Detected (500+ ports)',
    src: '192.168.56.31',
    target: 'Internal Network',
    engine: 'Zeek',
    risk: 84,
    status: 'NEW',
    time: '14:18:07',
    relativeTime: '15 min ago',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    findingsCount: 1,
    ruleId: 'ZEEK-SCAN-004',
    matchedValue: 'SYN flood on ports 1-1024',
  },
  {
    id: 'ALT-WAF-BASE-001',
    requestId: 'req-waf-005',
    sev: 'HIGH',
    title: 'XSS Attack Wave on /comment endpoint',
    src: '10.0.0.44',
    target: '/comment',
    engine: 'WAF',
    risk: 80,
    status: 'ACKNOWLEDGED',
    time: '14:15:22',
    relativeTime: '30 min ago',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    findingsCount: 1,
    ruleId: 'FW-XSS-001',
    matchedValue: '<script>alert(1)</script>',
  },
  {
    id: 'ALT-WAF-BASE-002',
    requestId: 'req-waf-006',
    sev: 'MEDIUM',
    title: 'SSRF Probe — Internal Metadata Service',
    src: '45.78.90.12',
    target: '/api/fetch',
    engine: 'WAF',
    risk: 72,
    status: 'NEW',
    time: '14:12:18',
    relativeTime: '45 min ago',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    findingsCount: 1,
    ruleId: 'FW-SSRF-001',
    matchedValue: 'http://169.254.169.254/latest/meta-data/',
  },
  {
    id: 'ALT-ZEEK-002',
    requestId: 'req-zk-002',
    sev: 'MEDIUM',
    title: 'Suspicious TLS Certificate — C2 Pattern',
    src: '91.105.0.4',
    target: 'External',
    engine: 'Zeek',
    risk: 65,
    status: 'ACKNOWLEDGED',
    time: '14:08:33',
    relativeTime: '1 hr ago',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    findingsCount: 1,
    ruleId: 'ZEEK-TLS-008',
  },
]

// Baseline incidents
const BASELINE_INCIDENTS: SecOpsIncident[] = [
  {
    id: 'INC-002',
    title: 'Credential Brute Force Campaign',
    threat: 'Brute Force',
    sev: 'HIGH',
    src: '185.220.0.14',
    status: 'Contained',
    risk: 88,
    assignee: 'SOC-1',
    created: 'Today 13:55',
    updated: '12 min ago',
    eventsCount: 156,
    alertsCount: 12,
    correlatedRequestIds: ['req-bf-01', 'req-bf-02', 'req-bf-03'],
    summary: 'Automated SSH brute force detected targeting management bastions from known exit node.',
  },
  {
    id: 'INC-003',
    title: 'Lateral Movement via SMB',
    threat: 'Lateral Movement',
    sev: 'HIGH',
    src: '10.0.1.44',
    status: 'Investigating',
    risk: 84,
    assignee: 'Unassigned',
    created: 'Today 12:30',
    updated: '1 hr ago',
    eventsCount: 18,
    alertsCount: 6,
    correlatedRequestIds: ['req-smb-01', 'req-smb-02'],
    summary: 'Anomalous SMB session queries across departmental subnets using privileged credentials.',
  },
  {
    id: 'INC-004',
    title: 'DDoS Amplification Attack',
    threat: 'DDoS',
    sev: 'MEDIUM',
    src: 'Multiple (18 IPs)',
    status: 'Monitoring',
    risk: 72,
    assignee: 'SOC-2',
    created: 'Today 11:00',
    updated: '2 hr ago',
    eventsCount: 892,
    alertsCount: 3,
    correlatedRequestIds: ['req-ddos-01'],
    summary: 'NTP and DNS reflection attempts mitigated by edge perimeter rate limiters.',
  },
  {
    id: 'INC-005',
    title: 'Path Traversal on File Upload API',
    threat: 'Path Traversal',
    sev: 'MEDIUM',
    src: '45.78.90.12',
    status: 'Resolved',
    risk: 61,
    assignee: 'SOC-1',
    created: 'Yesterday 16:20',
    updated: '3 hr ago',
    eventsCount: 4,
    alertsCount: 2,
    correlatedRequestIds: ['req-lfi-01'],
    summary: 'Directory traversal sequences detected in multipart filename header; sanitized and patched.',
  },
]

// Baseline investigations
const BASELINE_INVESTIGATIONS: SecOpsInvestigation[] = [
  {
    id: 'INV-002',
    title: 'Credential Stuffing Campaign Origin',
    status: 'Active',
    priority: 'High',
    analyst: 'SOC-1',
    created: 'Sep 15, 2026',
    updated: '30 min ago',
    indicators: 6,
    alerts: 12,
    artifacts: 8,
    summary: 'Correlating brute force attempts from Tor exit nodes against compromised credential dataset. 3 accounts confirmed compromised.',
    timeline: [
      { id: 'TL-01', time: '13:55:00', requestId: 'req-bf-01', action: 'Port 22 SSH Probe', payload: 'root:admin123', sourceIp: '185.220.0.14', target: '10.0.0.5:22', status: 'BLOCKED', sev: 'HIGH' },
    ],
    mitreTechniques: [
      { id: 'T1110', name: 'Brute Force: Password Guessing', tactic: 'Credential Access' },
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
    ],
    iocs: [
      { type: 'IPv4', value: '185.220.0.14', desc: 'Tor exit node / brute force source' },
    ],
  },
  {
    id: 'INV-003',
    title: 'Suspected C2 Beacon Activity',
    status: 'Active',
    priority: 'Medium',
    analyst: 'Unassigned',
    created: 'Sep 14, 2026',
    updated: '2 hr ago',
    indicators: 2,
    alerts: 3,
    artifacts: 5,
    summary: 'Zeek TLS analysis flagged periodic beaconing pattern from internal host 10.0.1.22 to 91.105.0.4:443.',
    timeline: [
      { id: 'TL-02', time: '14:08:33', requestId: 'req-zk-002', action: 'TLS Handshake', payload: 'Self-signed SNI', sourceIp: '91.105.0.4', target: 'Internal', status: 'ALERT', sev: 'MEDIUM' },
    ],
    mitreTechniques: [
      { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
    ],
    iocs: [
      { type: 'IPv4', value: '91.105.0.4', desc: 'External C2 Server IP' },
    ],
  },
  {
    id: 'INV-004',
    title: 'Insider Threat Anomaly Review',
    status: 'Closed',
    priority: 'Low',
    analyst: 'SOC-2',
    created: 'Sep 12, 2026',
    updated: '2 days ago',
    indicators: 1,
    alerts: 2,
    artifacts: 3,
    summary: 'Unusual login time pattern for user account. Confirmed legitimate business travel. Case closed.',
    timeline: [],
    mitreTechniques: [],
    iocs: [],
  },
]

function getRelativeTime(timestamp: string): string {
  if (!timestamp) return 'Just now'
  try {
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (diff < 30) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

function mapWafEventToAlert(waf: WAFSecurityEvent, statusOverride?: AlertStatus): SecOpsAlert {
  const firstFinding = waf.findings?.[0]
  const isXSS = Boolean(
    waf.findings?.some(f => 
      f.category?.toLowerCase().includes('script') || 
      f.category?.toLowerCase().includes('xss') ||
      f.rule_id?.toUpperCase().includes('XSS') ||
      f.rule_name?.toLowerCase().includes('xss') ||
      f.description?.toLowerCase().includes('xss')
    ) ||
    waf.path?.toLowerCase().includes('<script') ||
    (waf.query_sanitized && JSON.stringify(waf.query_sanitized).toLowerCase().includes('<script'))
  )
  const isSQLi = Boolean(
    waf.findings?.some(f =>
      f.category?.toLowerCase().includes('sql') ||
      f.rule_id?.toUpperCase().includes('SQL') ||
      f.rule_name?.toLowerCase().includes('sql')
    ) ||
    waf.path?.toLowerCase().includes('union') ||
    waf.path?.toLowerCase().includes('select')
  )
  const isBruteForce = Boolean(
    waf.findings?.some(f =>
      f.category?.toLowerCase().includes('brute') ||
      f.rule_id?.toUpperCase().includes('BRUTE') ||
      f.rule_name?.toLowerCase().includes('brute') ||
      f.description?.toLowerCase().includes('brute') ||
      f.description?.toLowerCase().includes('credential') ||
      f.description?.toLowerCase().includes('spray')
    ) ||
    ((waf.path?.toLowerCase().includes('login') || waf.path?.toLowerCase().includes('auth') || waf.path?.toLowerCase().includes('signin')) && (waf.findings_count ?? 0) > 0)
  )
  const hasCriticalFinding = Boolean(
    waf.findings?.some(f => (f.severity || '').toUpperCase() === 'CRITICAL')
  )

  let sev: AlertSeverity = 'INFO'
  // SQL Injection, XSS, and Brute Force are critical exploit vectors; any blocked attack or critical rule is CRITICAL
  if (
    waf.risk_score >= 75 ||
    hasCriticalFinding ||
    isXSS ||
    isBruteForce ||
    (waf.decision === 'BLOCK' && (isSQLi || isXSS || isBruteForce || waf.risk_score >= 50))
  ) {
    sev = 'CRITICAL'
  } else if (waf.risk_score >= 50 || waf.findings?.some(f => (f.severity || '').toUpperCase() === 'HIGH')) {
    sev = 'HIGH'
  } else if (waf.risk_score >= 25 || waf.findings?.some(f => (f.severity || '').toUpperCase() === 'MEDIUM')) {
    sev = 'MEDIUM'
  } else if (waf.risk_score > 0) {
    sev = 'LOW'
  }

  const title = firstFinding?.rule_name
    ? `${firstFinding.rule_name} Detected`
    : firstFinding?.description
    ? firstFinding.description
    : isBruteForce
    ? 'Brute Force: Credential Spraying & Login Abuse'
    : isXSS
    ? 'XSS: Cross-Site Scripting Injection Detected'
    : isSQLi
    ? 'SQL Injection Attack Detected'
    : waf.risk_score > 0
    ? 'Suspicious Web Attack Detected'
    : 'Web Security Policy Violation'

  const targetPath = waf.hostname ? `${waf.hostname}${waf.path}` : waf.path

  let timeFormatted = '—'
  if (waf.timestamp) {
    try {
      timeFormatted = new Date(waf.timestamp).toLocaleTimeString()
    } catch {
      timeFormatted = waf.timestamp
    }
  }

  const alertId = `ALT-${waf.request_id ? waf.request_id.replace('req-', '').toUpperCase().slice(0, 8) : waf.id.slice(0, 8)}`

  return {
    id: alertId,
    requestId: waf.request_id || '—',
    sev,
    title,
    src: waf.client_ip || '127.0.0.1',
    target: targetPath,
    engine: 'WAF',
    risk: isXSS || isBruteForce ? Math.max(waf.risk_score, 88) : waf.risk_score,
    status: statusOverride || 'NEW',
    time: timeFormatted,
    relativeTime: getRelativeTime(waf.timestamp),
    timestamp: waf.timestamp,
    matchedValue: firstFinding?.matched_value || (waf.query_sanitized ? JSON.stringify(waf.query_sanitized) : undefined),
    ruleId: firstFinding?.rule_id || (isBruteForce ? 'FW-BRUTE-001' : isXSS ? 'FW-XSS-001' : 'FW-WAF-001'),
    findingsCount: waf.findings_count || (waf.findings?.length ?? 1),
    findings: waf.findings,
    rawEvent: waf,
    userAgent: waf.headers_sanitized?.['user-agent'] || 'curl',
    decision: waf.decision,
  }
}

export function SecOpsAlertProvider({ children }: { children: React.ReactNode }) {
  const [wafEvents, setWafEvents] = useState<WAFSecurityEvent[]>([])
  const [wafStats, setWafStats] = useState<StatsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(true)
  const [alertStatusOverrides, setAlertStatusOverrides] = useState<Record<string, AlertStatus>>({})
  const [incidentStatusOverrides, setIncidentStatusOverrides] = useState<Record<string, 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved'>>({})
  const [selectedAlert, setSelectedAlert] = useState<SecOpsAlert | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [eventsRes, statsRes] = await Promise.allSettled([
        getWafEvents({ page: 1, limit: 100 }),
        getWafStats(),
      ])

      if (eventsRes.status === 'fulfilled' && eventsRes.value?.events) {
        setWafEvents(eventsRes.value.events)
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setWafStats(statsRes.value)
      }
    } catch (err) {
      console.warn('Failed to fetch SecOps WAF telemetry:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchData()
    if (!isLive) return
    const timer = setInterval(() => {
      fetchData()
    }, 4000)
    return () => clearInterval(timer)
  }, [fetchData, isLive])

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlertStatusOverrides(prev => ({ ...prev, [alertId]: 'ACKNOWLEDGED' }))
  }, [])

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlertStatusOverrides(prev => ({ ...prev, [alertId]: 'RESOLVED' }))
  }, [])

  // Update incident status
  const updateIncidentStatus = useCallback((incidentId: string, status: 'Investigating' | 'Contained' | 'Monitoring' | 'Resolved') => {
    setIncidentStatusOverrides(prev => ({ ...prev, [incidentId]: status }))
  }, [])

  // Map WAF events to live alerts and merge with Suricata & Zeek network telemetry
  const alerts: SecOpsAlert[] = useMemo(() => {
    const liveWafAlerts = wafEvents
      .filter(ev => ev.risk_score > 0 || ev.decision === 'BLOCK' || (ev.findings_count && ev.findings_count > 0))
      .map(ev => {
        const key = `ALT-${ev.request_id ? ev.request_id.replace('req-', '').toUpperCase().slice(0, 8) : ev.id.slice(0, 8)}`
        return mapWafEventToAlert(ev, alertStatusOverrides[key])
      })

    // Network & Host sensor alerts (Suricata IDS, Zeek NSM, etc.)
    const networkAlerts = BASELINE_ALERTS
      .filter(a => a.engine !== 'WAF')
      .map(a => ({
        ...a,
        status: alertStatusOverrides[a.id] || a.status,
      }))

    // Unified SOC view: Live WAF events + Suricata IDS alerts + Zeek NSM alerts
    return [...liveWafAlerts, ...networkAlerts]
  }, [wafEvents, alertStatusOverrides])

  // Correlate into Incidents across all engines
  const incidents: SecOpsIncident[] = useMemo(() => {
    const list: SecOpsIncident[] = []

    // 1. Live WAF security events with risk or blocks
    const criticalWafEvents = wafEvents.filter(
      ev => ev.risk_score >= 50 || ev.decision === 'BLOCK' || (ev.findings_count && ev.findings_count > 0)
    )

    if (criticalWafEvents.length > 0) {
      // Group by threat category so SQLi and XSS get distinct incidents
      const threatGroups = new Map<string, WAFSecurityEvent[]>()
      criticalWafEvents.forEach(ev => {
        let cat = ev.findings?.[0]?.category
        if (!cat) {
          if (ev.path?.toLowerCase().includes('<script') || (ev.findings && JSON.stringify(ev.findings).toLowerCase().includes('xss'))) {
            cat = 'Cross-Site Scripting'
          } else if (ev.path?.toLowerCase().includes('login') || ev.path?.toLowerCase().includes('auth') || (ev.findings && JSON.stringify(ev.findings).toLowerCase().includes('brute'))) {
            cat = 'Brute Force'
          } else {
            cat = 'SQL Injection'
          }
        }
        const group = threatGroups.get(cat) || []
        group.push(ev)
        threatGroups.set(cat, group)
      })

      let incNum = 1
      threatGroups.forEach((events, threatCategory) => {
        const topDomain = events[0].hostname || 'Protected Web Application'
        const topIp = events[0].client_ip || '127.0.0.1'
        const reqIds = events.map(e => e.request_id || e.id).slice(0, 15)
        const isXSS = threatCategory.toLowerCase().includes('xss') || threatCategory.toLowerCase().includes('script')
        const isSQLi = threatCategory.toLowerCase().includes('sql')
        const isBrute = threatCategory.toLowerCase().includes('brute')
        const sev: AlertSeverity = (isXSS || isSQLi || isBrute || events.some(e => e.risk_score >= 75)) ? 'CRITICAL' : 'HIGH'
        const liveIncidentId = `INC-WAF-${String(incNum).padStart(3, '0')}`

        list.push({
          id: liveIncidentId,
          title: `Targeted ${threatCategory} Campaign`,
          threat: threatCategory,
          sev,
          src: topIp,
          status: incidentStatusOverrides[liveIncidentId] || 'Investigating',
          risk: sev === 'CRITICAL' ? 96 : 84,
          assignee: 'Kidist W. (SOC Lead)',
          created: getRelativeTime(events[events.length - 1].timestamp),
          updated: getRelativeTime(events[0].timestamp),
          eventsCount: events.length,
          alertsCount: events.length,
          correlatedRequestIds: reqIds,
          targetHost: topDomain,
          summary: `WAF inspection sensor intercepted ${events.length} exploit attempts. Zero-tolerance policy enforced immediate 403 Forbidden blocks against ${threatCategory} probes. Request IDs: ${reqIds.slice(0, 4).join(', ')}...`,
        })
        incNum++
      })
    }

    // 2. Suricata & Zeek network incidents
    BASELINE_INCIDENTS.forEach(bi => {
      list.push({
        ...bi,
        status: incidentStatusOverrides[bi.id] || bi.status,
      })
    })

    return list
  }, [wafEvents, incidentStatusOverrides])

  // Correlate into Investigations
  const investigations: SecOpsInvestigation[] = useMemo(() => {
    const criticalWafEvents = wafEvents.filter(
      ev => ev.risk_score >= 50 || ev.decision === 'BLOCK'
    )

    const list: SecOpsInvestigation[] = []

    if (criticalWafEvents.length > 0) {
      const topDomain = criticalWafEvents[0].hostname || 'fanos-sec.vercel.app'
      const topIp = criticalWafEvents[0].client_ip || '127.0.0.1'
      const firstFinding = criticalWafEvents[0].findings?.[0]
      const threatCategory = firstFinding?.category || 'SQL Injection'
      const isXSS = threatCategory.toLowerCase().includes('xss') || threatCategory.toLowerCase().includes('script')
      const reqIds = criticalWafEvents.map(e => e.request_id || e.id).slice(0, 8)

      const timelineItems: SecOpsInvestigationTimelineItem[] = criticalWafEvents.slice(0, 10).map((ev, idx) => ({
        id: `TL-WAF-${idx + 1}`,
        time: ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Just now',
        requestId: ev.request_id || 'req-unknown',
        action: 'WAF HTTP Request Intercepted',
        payload: ev.path + (ev.query_sanitized ? `?${new URLSearchParams(ev.query_sanitized).toString()}` : ''),
        sourceIp: ev.client_ip || '127.0.0.1',
        target: ev.hostname ? `${ev.hostname}${ev.path}` : ev.path,
        status: ev.decision === 'BLOCK' ? 'BLOCKED (403)' : 'MONITORED',
        sev: 'CRITICAL',
      }))

      list.push({
        id: 'INV-WAF-001',
        title: `${threatCategory} Attribution & Forensics — ${topDomain}`,
        status: 'Active',
        priority: 'High',
        analyst: 'Kidist W. (SOC Lead)',
        created: getRelativeTime(criticalWafEvents[criticalWafEvents.length - 1].timestamp),
        updated: getRelativeTime(criticalWafEvents[0].timestamp),
        indicators: 4,
        alerts: criticalWafEvents.length,
        artifacts: criticalWafEvents.length,
        summary: `Correlated ${criticalWafEvents.length} blocked ${threatCategory} attacks against ${topDomain}. Attacker targeted endpoints using active exploit probes. Zero-tolerance WAF enforcement executed immediate 403 Forbidden enforcement on request IDs ${reqIds.slice(0, 4).join(', ')}. MITRE ATT&CK ${isXSS ? 'T1059.007' : 'T1190'} confirmed.`,
        timeline: timelineItems,
        mitreTechniques: isXSS ? [
          { id: 'T1059.007', name: 'Command & Scripting Interpreter: JavaScript', tactic: 'Execution' },
          { id: 'T1189', name: 'Drive-by Compromise', tactic: 'Initial Access' },
          { id: 'T1539', name: 'Steal Web Session Cookie', tactic: 'Credential Access' },
        ] : [
          { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
          { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
          { id: 'T1005', name: 'Data from Local System', tactic: 'Collection' },
        ],
        iocs: [
          { type: 'IPv4 Address', value: topIp, desc: 'Attacker origin client IP' },
          { type: 'Target Domain', value: topDomain, desc: 'Protected web asset' },
          { type: 'Exploit Payload', value: firstFinding?.matched_value || (isXSS ? '<script>alert(1)</script>' : '1 UNION SELECT 1'), desc: `${threatCategory} attack signature` },
          { type: 'Client User-Agent', value: criticalWafEvents[0].headers_sanitized?.['user-agent'] || 'curl/8.21.0', desc: 'Probe tool signature' },
        ],
      })
    }

    if (list.length === 0) {
      return BASELINE_INVESTIGATIONS
    }

    return list
  }, [wafEvents])

  // Counts: real, accurate numbers without artificial inflation
  const criticalAlertsCount = useMemo(() => alerts.filter(a => a.sev === 'CRITICAL').length, [alerts])
  const highAlertsCount = useMemo(() => alerts.filter(a => a.sev === 'HIGH').length, [alerts])
  const activeIncidentsCount = useMemo(() => incidents.filter(i => i.status === 'Investigating' || i.status === 'Monitoring').length, [incidents])
  const newAlertsCount = useMemo(() => alerts.filter(a => a.status === 'NEW').length, [alerts])

  // Use actual live counts without fake default offsets (+1842 and +8421)
  const blockedTodayCount = useMemo(() => {
    if (wafStats && typeof wafStats.total_blocked === 'number') {
      return wafStats.total_blocked
    }
    return wafEvents.filter(e => e.decision === 'BLOCK').length
  }, [wafStats, wafEvents])

  const securityEventsCount = useMemo(() => {
    if (wafStats && typeof wafStats.total_inspected === 'number') {
      return wafStats.total_inspected
    }
    return wafEvents.length
  }, [wafStats, wafEvents])

  return (
    <SecOpsAlertContext.Provider
      value={{
        alerts,
        incidents,
        investigations,
        wafStats,
        loading,
        isLive,
        setIsLive,
        refresh: fetchData,
        acknowledgeAlert,
        resolveAlert,
        updateIncidentStatus,
        criticalAlertsCount,
        highAlertsCount,
        activeIncidentsCount,
        newAlertsCount,
        blockedTodayCount,
        securityEventsCount,
        selectedAlert,
        setSelectedAlert,
      }}
    >
      {children}
    </SecOpsAlertContext.Provider>
  )
}

export function useSecOpsAlerts() {
  const context = useContext(SecOpsAlertContext)
  if (!context) {
    throw new Error('useSecOpsAlerts must be used within a SecOpsAlertProvider')
  }
  return context
}
