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
  desired_state: string
  status: string
  suricata_status: string
  collector_status: string
  service_status: string
  last_seen?: string
  last_heartbeat?: string
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
