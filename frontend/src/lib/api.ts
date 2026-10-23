import axios from 'axios'
import type {
  DashboardKPIs,
  ThreatActivityPoint,
  SecurityEvent,
  Incident,
  AttackDistributionItem,
  AIEngineStatus,
  Sensor,
  ResponseAction,
  PreventionStatus,
  BlockedIP,
  WebSecurityStats,
} from '@/types'

const BASE = '/api/v1'

const client = axios.create({
  baseURL: BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Intercept for auth token
client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('fanos_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ──────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────
export const getDashboardKPIs = (): Promise<DashboardKPIs> =>
  client.get('/dashboard/kpis').then((r) => r.data)

export const getThreatActivity = (hours = 24): Promise<ThreatActivityPoint[]> =>
  client.get(`/dashboard/threat-activity?hours=${hours}`).then((r) => r.data)

export const getAttackDistribution = (): Promise<AttackDistributionItem[]> =>
  client.get('/dashboard/attack-distribution').then((r) => r.data)

// ──────────────────────────────────────────────
// Events
// ──────────────────────────────────────────────
export interface LiveEventsParams {
  limit?: number
  severity?: string
  sensor_source?: string
  search?: string
}

export const getLiveEvents = (params?: number | LiveEventsParams): Promise<SecurityEvent[]> => {
  if (typeof params === 'number') {
    return client.get(`/events/live?limit=${params}`).then((r) => r.data)
  }
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.severity) q.set('severity', params.severity)
  if (params?.sensor_source) q.set('sensor_source', params.sensor_source)
  if (params?.search) q.set('search', params.search)
  const qs = q.toString() ? `?${q.toString()}` : ''
  return client.get(`/events/live${qs}`).then((r) => r.data)
}

// ──────────────────────────────────────────────
// Suricata Telemetry
// ──────────────────────────────────────────────
export interface SuricataStats {
  total_events: number
  alerts: number
  critical: number
  high: number
  medium: number
  low: number
}

export const getSuricataEvents = (limit = 50, hours = 24, severity?: string): Promise<SecurityEvent[]> => {
  const q = new URLSearchParams({ limit: String(limit), hours: String(hours) })
  if (severity) q.set('severity', severity)
  return client.get(`/suricata/events?${q.toString()}`).then((r) => r.data)
}

export const getSuricataStats = (hours = 24): Promise<SuricataStats> =>
  client.get(`/suricata/stats?hours=${hours}`).then((r) => r.data)

export interface SuricataControlStatus {
  mode: 'LIVE' | 'PAUSED' | 'OFFLINE'
  is_live: boolean
  is_paused: boolean
  suricata_running: boolean
  suricata_pid: number | null
  collector_running: boolean
  collector_pid: number | null
  interface: string
  sensor_id: string
  ruleset: string
  eve_path: string
  eve_exists: boolean
  eve_size_bytes: number
  eve_size_mb: number
  eve_last_modified: string | null
  events_24h: number
  alerts_24h: number
  last_event_time: string | null
  message?: string
}

export const getSuricataControlStatus = (): Promise<SuricataControlStatus> =>
  client.get('/suricata/control/status').then((r) => r.data)

export const startSuricataEngine = (): Promise<{ success: boolean; mode: string; message: string }> =>
  client.post('/suricata/control/start').then((r) => r.data)

export const pauseSuricataEngine = (): Promise<{ success: boolean; mode: string; message: string }> =>
  client.post('/suricata/control/pause').then((r) => r.data)

export const stopSuricataEngine = (stopSuricata = false): Promise<{ success: boolean; mode: string; message: string }> =>
  client.post(`/suricata/control/stop?stop_suricata=${stopSuricata}`).then((r) => r.data)

export const getSuricataLogs = (limit = 80): Promise<{ logs: string[] }> =>
  client.get(`/suricata/control/logs?limit=${limit}`).then((r) => r.data)

export const simulateSuricataAttack = (attackType = 'log4j'): Promise<any> =>
  client.post(`/suricata/control/simulate?attack_type=${attackType}`).then((r) => r.data)

export const sendSuricataTestFlow = (flowData: any): Promise<any> =>
  client.post('/suricata/flows', flowData, {
    headers: { 'X-Fanos-Suricata-Token': 'ce8eb0468b7d7f8ad89b02b27271e364fbb60518ae194f43c95c6c62addfd318' }
  }).then((r) => r.data)

export const sendSuricataTestEvent = (eventData: any): Promise<any> =>
  client.post('/suricata/events', eventData, {
    headers: { 'X-Fanos-Suricata-Token': 'ce8eb0468b7d7f8ad89b02b27271e364fbb60518ae194f43c95c6c62addfd318' }
  }).then((r) => r.data)

// ──────────────────────────────────────────────
// Incidents
// ──────────────────────────────────────────────
export const getActiveIncidents = (): Promise<Incident[]> =>
  client.get('/incidents/active').then((r) => r.data)

export const getIncidents = (status?: string, search?: string): Promise<Incident[]> => {
  const q = new URLSearchParams()
  if (status && status !== 'ALL') q.set('status', status)
  if (search && search.trim()) q.set('search', search.trim())
  const qs = q.toString() ? `?${q.toString()}` : ''
  return client.get(`/incidents${qs}`).then((r) => r.data)
}

export const createIncident = (data: Partial<Incident>): Promise<Incident> =>
  client.post('/incidents', data).then((r) => r.data)

export const updateIncident = (id: string, data: Partial<Incident>): Promise<Incident> =>
  client.patch(`/incidents/${id}`, data).then((r) => r.data)

// ──────────────────────────────────────────────
// AI Engine
// ──────────────────────────────────────────────
export const getAIEngineStatus = (): Promise<AIEngineStatus> =>
  client.get('/ai/engine/status').then((r) => r.data)

// ──────────────────────────────────────────────
// Sensors
// ──────────────────────────────────────────────
export const getSensors = (): Promise<Sensor[]> =>
  client.get('/infrastructure/sensors').then((r) => r.data)

// ──────────────────────────────────────────────
// Response Actions
// ──────────────────────────────────────────────
export const getResponseActions = (limit = 10): Promise<ResponseAction[]> =>
  client.get(`/prevention/actions?limit=${limit}`).then((r) => r.data)

// ──────────────────────────────────────────────
// Prevention
// ──────────────────────────────────────────────
export const getPreventionStatus = (): Promise<PreventionStatus> =>
  client.get('/prevention/status').then((r) => r.data)

export const getBlockedIPs = (activeOnly = false): Promise<BlockedIP[]> =>
  client.get(`/prevention/blocked-ips?active_only=${activeOnly}`).then((r) => r.data)

export const blockIP = (data: { ip_address: string; reason: string }): Promise<BlockedIP> =>
  client.post('/prevention/blocked-ips', data).then((r) => r.data)

export const unblockIP = (ip_address: string): Promise<void> =>
  client.delete(`/prevention/blocked-ips/${encodeURIComponent(ip_address)}`).then((r) => r.data)

// ──────────────────────────────────────────────
// Web Security
// ──────────────────────────────────────────────
export const getWebSecurityStats = (): Promise<WebSecurityStats> =>
  client.get('/web-security/stats').then((r) => r.data)

// ──────────────────────────────────────────────
// URI Assessment
// ──────────────────────────────────────────────
export const startURIAssessment = (uri: string, scope: string) =>
  client.post('/web-security/assess', { uri, scope }).then((r) => r.data)

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    username: string
    full_name: string
    email: string
    role: 'admin' | 'analyst' | 'customer'
  }
}

export const loginApi = (username: string, password: string): Promise<LoginResponse> =>
  client.post('/auth/login', { username, password }).then((r) => r.data)

// ──────────────────────────────────────────────
// Sensor Lifecycle Control
// ──────────────────────────────────────────────
export interface SensorLifecycleStatus {
  sensor_id: string
  desired_state?: string
  status: string
  suricata_status?: string
  collector_status?: string
  service_status?: string
  last_seen?: string
  last_heartbeat?: string
  process_id?: number
  uptime_seconds?: number
  cpu_percent?: number
  memory_mb?: number
  restart_count?: number
  last_error?: string
  message?: string
}

export const getSensorStatus = (sensorId: string): Promise<SensorLifecycleStatus> =>
  client.get(`/sensors/${sensorId}/status`).then((r) => r.data)

export const startSensor = (sensorId: string) =>
  client.post(`/sensors/${sensorId}/start`).then((r) => r.data)

export const stopSensor = (sensorId: string) =>
  client.post(`/sensors/${sensorId}/stop`).then((r) => r.data)

export const restartSensor = (sensorId: string) =>
  client.post(`/sensors/${sensorId}/restart`).then((r) => r.data)

// ──────────────────────────────────────────────
// URL Threat Detection & Hybrid ML
// ──────────────────────────────────────────────
export interface URLThreatAnalysisResult {
  scan_id?: number
  url: string
  final_verdict: string
  verdict_reasoning: string
  ml_prediction: string
  ml_confidence: number
  ml_probabilities: Record<string, number>
  vt_result: string
  vt_stats?: Record<string, number>
  features: Record<string, any>
  timestamp: string
  source?: string
}

export interface URLScanRecord {
  id: number
  url: string
  final_verdict: string
  ml_prediction: string
  ml_confidence: number
  vt_result: string
  timestamp: string
  source: string
}

export interface ThreatStats {
  total_scans: number
  benign: number
  phishing: number
  malware: number
  defacement: number
  suspicious: number
  vt_active: boolean
  ml_status: boolean
}

export const analyzeURL = (url: string, skip_vt = false): Promise<URLThreatAnalysisResult> =>
  client.post('/threat-detection/analyze', { url, skip_vt }).then((r) => r.data)

export const getURLScans = (limit = 50): Promise<URLScanRecord[]> =>
  client.get(`/threat-detection/scans?limit=${limit}`).then((r) => r.data)

export const getThreatStats = (): Promise<ThreatStats> =>
  client.get('/threat-detection/stats').then((r) => r.data)

export const getScanDetails = (scanId: number): Promise<URLThreatAnalysisResult> =>
  client.get(`/threat-detection/scans/${scanId}`).then((r) => r.data)

export interface UserReportRecord {
  id: number
  url: string
  user_verdict: string
  original_verdict?: string
  scan_id?: number
  notes?: string
  timestamp: string
}

export const getUserReports = (limit = 50, search?: string): Promise<UserReportRecord[]> =>
  client.get(`/threat-detection/reports?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`).then((r) => r.data)

export const submitThreatReport = (payload: {
  url: string
  user_verdict: string
  original_verdict?: string
  scan_id?: number
  notes?: string
}) => client.post('/threat-detection/report', payload).then((r) => r.data)

// ──────────────────────────────────────────────
// Web Security Scanner
// ──────────────────────────────────────────────
export const validateScannerTarget = (target_url: string, allow_private = false) =>
  client.post('/scanner/validate-target', { target_url, allow_private }).then((r) => r.data)

export const startScannerJob = (payload: {
  target_url: string
  allow_private?: boolean
  authorized_by?: string
  scope_config?: any
}) => client.post('/scanner/jobs', payload).then((r) => r.data)

export const getScannerJobs = (limit = 20) =>
  client.get(`/scanner/jobs?limit=${limit}`).then((r) => r.data)

export const getScannerJobDetails = (jobId: string) =>
  client.get(`/scanner/jobs/${jobId}`).then((r) => r.data)

export const getScannerJobFindings = (jobId: string, severity?: string) =>
  client.get(`/scanner/jobs/${jobId}/findings${severity ? `?severity=${severity}` : ''}`).then((r) => r.data)

export const getScannerJobAssets = (jobId: string) =>
  client.get(`/scanner/jobs/${jobId}/assets`).then((r) => r.data)

export const getScannerJobUrls = (jobId: string) =>
  client.get(`/scanner/jobs/${jobId}/urls`).then((r) => r.data)

export const getScannerJobTechnologies = (jobId: string) =>
  client.get(`/scanner/jobs/${jobId}/technologies`).then((r) => r.data)

export const cancelScannerJob = (jobId: string) =>
  client.post(`/scanner/jobs/${jobId}/cancel`).then((r) => r.data)

export const downloadScannerPdfReport = async (jobId: string, targetDomain?: string) => {
  const response = await client.get(`/scanner/jobs/${jobId}/report/pdf`, {
    responseType: 'blob',
  })
  const cleanDomain = (targetDomain || 'target').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `fanos_web_security_assessment_${cleanDomain}_${jobId.slice(0, 8)}.pdf`
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

export const downloadScannerJsonReport = async (jobId: string, targetDomain?: string) => {
  const response = await client.get(`/scanner/jobs/${jobId}/report/json`)
  const cleanDomain = (targetDomain || 'target').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `fanos_web_security_audit_${cleanDomain}_${jobId.slice(0, 8)}.json`
  const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}
