// ──────────────────────────────────────────────
// FANOS AI — Core Type Definitions
// ──────────────────────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
export type EventStatus = 'BLOCKED' | 'MONITORED' | 'ALERT' | 'INVESTIGATING' | 'CONTAINED'
export type IncidentStatus = 'Investigating' | 'Contained' | 'Blocked' | 'Resolved' | 'Open'
export type SensorStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED'

// Dashboard KPIs
export interface DashboardKPIs {
  critical_threats:      number
  critical_change:       string
  active_incidents:      number
  incidents_today:       number
  blocked_threats:       number
  blocked_change:        string
  security_events:       number
  events_change:         string
  ai_accuracy:           number
  ai_f1_score:           number
  system_health:         number
  sensors_online:        number
  sensors_total:         number
}

// Threat Activity Chart
export interface ThreatActivityPoint {
  time:           string
  network:        number
  web:            number
  system:         number
  blocked:        number
}

// Security Event
export interface SecurityEvent {
  id:             string
  severity:       Severity
  attack_type:    string
  source_ip:      string
  target:         string
  ai_confidence:  number
  risk_score:     number
  status:         EventStatus
  timestamp:      string
}

// Incident
export interface Incident {
  id:             string
  threat:         string
  severity:       Severity
  source_ip:      string
  status:         IncidentStatus
  risk_score:     number
  assigned_to:    string
  created_at:     string
}

// Attack Distribution
export interface AttackDistributionItem {
  name:           string
  value:          number
  color:          string
}

// AI Engine
export interface AIEngineStatus {
  model_name:       string
  model_version:    string
  status:           string
  accuracy:         number
  precision:        number
  recall:           number
  f1_score:         number
  inference_ms:     number
  requests_per_sec: number
}

// Sensor
export interface Sensor {
  name:     string
  type:     string
  status:   SensorStatus
  events:   number
  uptime:   string
}

// Response Action
export interface ResponseAction {
  id:         string
  action:     string
  target:     string
  reason:     string
  timestamp:  string
}

// Risk Distribution
export interface RiskDistributionItem {
  label:  string
  count:  number
  color:  string
  max:    number
}

// Prevention Status
export interface PreventionStatus {
  active_blocking:  boolean
  blocked_ips:      number
  blocked_sessions: number
  waf_blocks:       number
  firewall_actions: number
  auto_response:    boolean
}

// Web Security
export interface WebSecurityStats {
  total_requests:     number
  suspicious:         number
  confirmed_findings: number
  critical_findings:  number
  high_findings:      number
  attack_types:       { name: string; count: number; color: string }[]
}

// Threat Correlation Node
export interface CorrelationNode {
  id:     string
  label:  string
  type:   string
  risk:   number
}
