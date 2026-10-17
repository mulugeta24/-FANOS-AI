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
export const getLiveEvents = (limit = 20): Promise<SecurityEvent[]> =>
  client.get(`/events/live?limit=${limit}`).then((r) => r.data)

// ──────────────────────────────────────────────
// Incidents
// ──────────────────────────────────────────────
export const getActiveIncidents = (): Promise<Incident[]> =>
  client.get('/incidents/active').then((r) => r.data)

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
// Sensor Lifecycle Control
// ──────────────────────────────────────────────
export interface SensorLifecycleStatus {
  sensor_id: string
  status: string
  desired_state?: string
  suricata_status?: string
  collector_status?: string
  service_status?: string
  last_heartbeat?: string
  last_seen?: string
  process_id?: number
  uptime_seconds?: number
  cpu_percent?: number
  memory_mb?: number
  restart_count?: number
  last_error?: string
}

export const getSensorStatus = (sensorId: string): Promise<SensorLifecycleStatus> =>
  client.get(`/infrastructure/sensors/${sensorId}/status`).then((r) => r.data)

export const startSensor = (sensorId: string) =>
  client.post(`/infrastructure/sensors/${sensorId}/start`).then((r) => r.data)

export const stopSensor = (sensorId: string) =>
  client.post(`/infrastructure/sensors/${sensorId}/stop`).then((r) => r.data)

export const restartSensor = (sensorId: string) =>
  client.post(`/infrastructure/sensors/${sensorId}/restart`).then((r) => r.data)

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

