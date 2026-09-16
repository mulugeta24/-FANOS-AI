import type {
  DashboardKPIs, ThreatActivityPoint, SecurityEvent, Incident,
  AttackDistributionItem, AIEngineStatus, Sensor, ResponseAction,
  PreventionStatus, WebSecurityStats, RiskDistributionItem,
} from '@/types'

export const mockKPIs: DashboardKPIs = {
  critical_threats: 7,    critical_change: '+12%',
  active_incidents: 24,   incidents_today: 5,
  blocked_threats:  156,  blocked_change: '+18%',
  security_events:  8421, events_change: '+23%',
  ai_accuracy: 99.84,     ai_f1_score: 99.85,
  system_health: 98.7,    sensors_online: 12, sensors_total: 12,
}

export const mockThreatActivity: ThreatActivityPoint[] = [
  { time: '00:00', network: 12, web: 8,  system: 3, blocked: 18 },
  { time: '02:00', network: 18, web: 12, system: 5, blocked: 28 },
  { time: '04:00', network: 8,  web: 6,  system: 2, blocked: 14 },
  { time: '06:00', network: 22, web: 15, system: 7, blocked: 38 },
  { time: '08:00', network: 45, web: 32, system: 12, blocked: 72 },
  { time: '10:00', network: 68, web: 48, system: 18, blocked: 110 },
  { time: '12:00', network: 92, web: 65, system: 24, blocked: 148 },
  { time: '14:00', network: 78, web: 55, system: 20, blocked: 128 },
  { time: '16:00', network: 105, web: 72, system: 28, blocked: 172 },
  { time: '18:00', network: 88, web: 62, system: 22, blocked: 145 },
  { time: '20:00', network: 65, web: 45, system: 16, blocked: 108 },
  { time: '22:00', network: 42, web: 30, system: 10, blocked: 72 },
  { time: '24:00', network: 28, web: 20, system: 7,  blocked: 48 },
]

export const mockAttackDistribution: AttackDistributionItem[] = [
  { name: 'SQL Injection',  value: 24, color: '#ef4444' },
  { name: 'XSS',            value: 18, color: '#f97316' },
  { name: 'Brute Force',    value: 16, color: '#f59e0b' },
  { name: 'DDoS',           value: 14, color: '#8b5cf6' },
  { name: 'Port Scan',      value: 12, color: '#3b82f6' },
  { name: 'SSRF',           value: 7,  color: '#00c8ff' },
  { name: 'Path Traversal', value: 5,  color: '#00e5a0' },
  { name: 'Other',          value: 4,  color: '#4a6080' },
]

export const mockEvents: SecurityEvent[] = [
  { id: 'EVT-001', severity: 'CRITICAL', attack_type: 'SQL Injection',      source_ip: '192.168.56.10', target: '/login',           ai_confidence: 98.7, risk_score: 96, status: 'BLOCKED',       timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 'EVT-002', severity: 'HIGH',     attack_type: 'Brute Force',         source_ip: '192.168.56.21', target: '/admin/login',     ai_confidence: 97.1, risk_score: 88, status: 'BLOCKED',       timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'EVT-003', severity: 'HIGH',     attack_type: 'Port Scan',           source_ip: '192.168.56.31', target: 'Internal Network', ai_confidence: 99.2, risk_score: 84, status: 'BLOCKED',       timestamp: new Date(Date.now() - 480000).toISOString() },
  { id: 'EVT-004', severity: 'MEDIUM',   attack_type: 'Suspicious URI',      source_ip: '192.168.56.42', target: '/search',          ai_confidence: 91.4, risk_score: 64, status: 'MONITORED',     timestamp: new Date(Date.now() - 720000).toISOString() },
  { id: 'EVT-005', severity: 'LOW',      attack_type: 'Anomalous Traffic',   source_ip: '192.168.56.55', target: 'Web Server',       ai_confidence: 82.3, risk_score: 38, status: 'ALERT',         timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: 'EVT-006', severity: 'HIGH',     attack_type: 'XSS Attempt',         source_ip: '10.0.0.44',     target: '/comment',         ai_confidence: 95.8, risk_score: 80, status: 'BLOCKED',       timestamp: new Date(Date.now() - 1020000).toISOString() },
  { id: 'EVT-007', severity: 'CRITICAL', attack_type: 'Command Injection',   source_ip: '172.16.0.88',   target: '/api/exec',        ai_confidence: 99.1, risk_score: 98, status: 'BLOCKED',       timestamp: new Date(Date.now() - 1200000).toISOString() },
  { id: 'EVT-008', severity: 'MEDIUM',   attack_type: 'SSRF',                source_ip: '192.168.1.100', target: '/fetch?url=',      ai_confidence: 88.5, risk_score: 62, status: 'INVESTIGATING', timestamp: new Date(Date.now() - 1380000).toISOString() },
]

export const mockIncidents: Incident[] = [
  { id: 'INC-2026-001', threat: 'SQL Injection Campaign',   severity: 'CRITICAL', source_ip: '192.168.56.10', status: 'Investigating', risk_score: 96, assigned_to: 'SOC Analyst',   created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'INC-2026-002', threat: 'Credential Attack',         severity: 'HIGH',     source_ip: '192.168.56.21', status: 'Contained',    risk_score: 88, assigned_to: 'Security Team',  created_at: new Date(Date.now() - 480000).toISOString() },
  { id: 'INC-2026-003', threat: 'Network Reconnaissance',    severity: 'HIGH',     source_ip: '192.168.56.31', status: 'Blocked',      risk_score: 84, assigned_to: 'SOC Analyst',   created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'INC-2026-004', threat: 'Command Injection Attempt', severity: 'CRITICAL', source_ip: '172.16.0.88',   status: 'Investigating', risk_score: 98, assigned_to: 'M. Ababi',     created_at: new Date(Date.now() - 1200000).toISOString() },
  { id: 'INC-2026-005', threat: 'Cross-Site Scripting Wave', severity: 'HIGH',     source_ip: '10.0.0.44',    status: 'Contained',    risk_score: 80, assigned_to: 'Security Team',  created_at: new Date(Date.now() - 1800000).toISOString() },
]

export const mockAIEngine: AIEngineStatus = {
  model_name: 'FANOS-V3-XGBoost',
  model_version: 'v3.2.1',
  status: 'Production',
  accuracy: 99.84,
  precision: 99.87,
  recall: 99.84,
  f1_score: 99.85,
  inference_ms: 4.2,
  requests_per_sec: 2481,
}

export const mockSensors: Sensor[] = [
  { name: 'Suricata',       type: 'Network IDS',   status: 'ONLINE', events: 3241, uptime: '99.99%' },
  { name: 'Zeek',           type: 'Network NSM',   status: 'ONLINE', events: 1847, uptime: '99.97%' },
  { name: 'WAF',            type: 'Web Firewall',  status: 'ONLINE', events: 892,  uptime: '100%'   },
  { name: 'Wazuh',          type: 'Host IDS',      status: 'ONLINE', events: 2104, uptime: '99.95%' },
  { name: 'Network Sensor', type: 'Packet Capture',status: 'ONLINE', events: 4512, uptime: '99.98%' },
  { name: 'FANOS AI',       type: 'AI Engine',     status: 'ONLINE', events: 8421, uptime: '100%'   },
]

export const mockResponseActions: ResponseAction[] = [
  { id: 'ACT-001', action: 'Blocked IP',          target: '192.168.56.10',  reason: 'SQL Injection',   timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 'ACT-002', action: 'Blocked Session',     target: 'Session #84921', reason: 'Brute Force',     timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'ACT-003', action: 'WAF Rule Triggered',  target: 'Rule CRS-942100',reason: 'SQL Injection',   timestamp: new Date(Date.now() - 480000).toISOString() },
  { id: 'ACT-004', action: 'Firewall Rule Added', target: '192.168.56.31',  reason: 'Port Scan',       timestamp: new Date(Date.now() - 720000).toISOString() },
  { id: 'ACT-005', action: 'Blocked IP',          target: '172.16.0.88',    reason: 'Cmd Injection',   timestamp: new Date(Date.now() - 1200000).toISOString() },
]

export const mockPrevention: PreventionStatus = {
  active_blocking: true, blocked_ips: 128, blocked_sessions: 23,
  waf_blocks: 47, firewall_actions: 31, auto_response: true,
}

export const mockWebSecurity: WebSecurityStats = {
  total_requests: 12842, suspicious: 342, confirmed_findings: 67,
  critical_findings: 9, high_findings: 24,
  attack_types: [
    { name: 'SQL Injection',       count: 28, color: '#ef4444' },
    { name: 'XSS',                 count: 22, color: '#f97316' },
    { name: 'SSRF',                count: 8,  color: '#00c8ff' },
    { name: 'CSRF',                count: 5,  color: '#8b5cf6' },
    { name: 'IDOR / BOLA',         count: 4,  color: '#f59e0b' },
    { name: 'Path Traversal',      count: 6,  color: '#00e5a0' },
    { name: 'Command Injection',   count: 3,  color: '#3b82f6' },
    { name: 'File Upload',         count: 2,  color: '#a78bfa' },
    { name: 'Brute Force',         count: 18, color: '#fb923c' },
  ],
}

export const mockRiskDistribution: RiskDistributionItem[] = [
  { label: 'Critical', count: 7,   color: '#ef4444', max: 110 },
  { label: 'High',     count: 18,  color: '#f97316', max: 110 },
  { label: 'Medium',   count: 42,  color: '#f59e0b', max: 110 },
  { label: 'Low',      count: 86,  color: '#3b82f6', max: 110 },
  { label: 'Info',     count: 103, color: '#8b5cf6', max: 110 },
]
