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
