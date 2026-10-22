/**
 * React Query hooks for all FANOS AI dashboard data.
 * Each hook tries the real API first; on network error it falls back to mock data
 * so the UI is always fully populated during development / offline demos.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDashboardKPIs,
  getThreatActivity,
  getAttackDistribution,
  getLiveEvents,
  getActiveIncidents,
  getIncidents,
  createIncident,
  updateIncident,
  getAIEngineStatus,
  getSensors,
  getResponseActions,
  getPreventionStatus,
  getBlockedIPs,
  blockIP,
  unblockIP,
  getWebSecurityStats,
  LiveEventsParams,
  getSuricataEvents,
  getSuricataStats,
  getSuricataControlStatus,
  startSuricataEngine,
  pauseSuricataEngine,
  stopSuricataEngine,
  simulateSuricataAttack,
  getSuricataLogs,
} from '@/lib/api'
import type { Incident } from '@/types'

// How often live panels refresh (ms)
const LIVE_INTERVAL   = 6_000   // 6 s  — events stream
const KPI_INTERVAL    = 15_000  // 15 s — KPI cards
const CHART_INTERVAL  = 30_000  // 30 s — charts
const SENSOR_INTERVAL = 20_000  // 20 s — sensors

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn:  () => getDashboardKPIs(),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useThreatActivity(hours = 24) {
  return useQuery({
    queryKey: ['dashboard', 'threat-activity', hours],
    queryFn:  () => getThreatActivity(hours),
    refetchInterval: CHART_INTERVAL,
    staleTime: CHART_INTERVAL / 2,
  })
}

export function useAttackDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'attack-distribution'],
    queryFn:  () => getAttackDistribution(),
    refetchInterval: CHART_INTERVAL,
    staleTime: CHART_INTERVAL / 2,
  })
}

export function useLiveEvents(params: number | LiveEventsParams = 20) {
  return useQuery({
    queryKey: ['events', 'live', params],
    queryFn:  () => getLiveEvents(params),
    refetchInterval: LIVE_INTERVAL,
    staleTime: LIVE_INTERVAL / 2,
  })
}

export function useSuricataEvents(limit = 50, hours = 24, severity?: string) {
  return useQuery({
    queryKey: ['suricata', 'events', limit, hours, severity],
    queryFn:  () => getSuricataEvents(limit, hours, severity),
    refetchInterval: LIVE_INTERVAL,
    staleTime: LIVE_INTERVAL / 2,
  })
}

export function useSuricataStats(hours = 24) {
  return useQuery({
    queryKey: ['suricata', 'stats', hours],
    queryFn:  () => getSuricataStats(hours),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useSuricataControlStatus(pollingInterval = 3_000) {
  return useQuery({
    queryKey: ['suricata', 'control', 'status'],
    queryFn:  () => getSuricataControlStatus(),
    refetchInterval: pollingInterval,
    staleTime: 1_500,
  })
}

export function useStartSuricataEngine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startSuricataEngine(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suricata'] })
      queryClient.invalidateQueries({ queryKey: ['sensors'] })
      queryClient.invalidateQueries({ queryKey: ['system', 'health'] })
    },
  })
}

export function usePauseSuricataEngine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => pauseSuricataEngine(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suricata'] })
      queryClient.invalidateQueries({ queryKey: ['sensors'] })
      queryClient.invalidateQueries({ queryKey: ['system', 'health'] })
    },
  })
}

export function useStopSuricataEngine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stopSuricata?: boolean) => stopSuricataEngine(stopSuricata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suricata'] })
      queryClient.invalidateQueries({ queryKey: ['sensors'] })
      queryClient.invalidateQueries({ queryKey: ['system', 'health'] })
    },
  })
}

export function useSimulateSuricataAttack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attackType?: string) => simulateSuricataAttack(attackType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suricata'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useSuricataLogs(limit = 80, enabled = false) {
  return useQuery({
    queryKey: ['suricata', 'control', 'logs', limit],
    queryFn:  () => getSuricataLogs(limit),
    enabled,
    refetchInterval: 3_000,
  })
}

export function useActiveIncidents() {
  return useQuery({
    queryKey: ['incidents', 'active'],
    queryFn:  () => getActiveIncidents(),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useIncidents(status?: string, search?: string) {
  return useQuery({
    queryKey: ['incidents', 'list', status, search],
    queryFn:  () => getIncidents(status, search),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useUpdateIncident() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Incident> }) =>
      updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] })
    },
  })
}

export function useCreateIncident() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Incident>) => createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] })
    },
  })
}

export function useAIEngineStatus() {
  return useQuery({
    queryKey: ['ai', 'engine-status'],
    queryFn:  () => getAIEngineStatus(),
    refetchInterval: SENSOR_INTERVAL,
    staleTime: SENSOR_INTERVAL / 2,
  })
}

export function useSensors() {
  return useQuery({
    queryKey: ['infrastructure', 'sensors'],
    queryFn:  () => getSensors(),
    refetchInterval: SENSOR_INTERVAL,
    staleTime: SENSOR_INTERVAL / 2,
  })
}

export function useResponseActions(limit = 10) {
  return useQuery({
    queryKey: ['prevention', 'actions', limit],
    queryFn:  () => getResponseActions(limit),
    refetchInterval: LIVE_INTERVAL,
    staleTime: LIVE_INTERVAL / 2,
  })
}

export function usePreventionStatus() {
  return useQuery({
    queryKey: ['prevention', 'status'],
    queryFn:  () => getPreventionStatus(),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useBlockedIPs(activeOnly = false) {
  return useQuery({
    queryKey: ['prevention', 'blocked-ips', activeOnly],
    queryFn:  () => getBlockedIPs(activeOnly),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useBlockIP() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { ip_address: string; reason: string }) => blockIP(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevention'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] })
    },
  })
}

export function useUnblockIP() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ip: string) => unblockIP(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevention'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] })
    },
  })
}

export function useWebSecurityStats() {
  return useQuery({
    queryKey: ['web-security', 'stats'],
    queryFn:  () => getWebSecurityStats(),
    refetchInterval: CHART_INTERVAL,
    staleTime: CHART_INTERVAL / 2,
  })
}

/** Invalidate everything — useful for a manual "refresh" button */
export function useRefreshAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'offline'
  backend: boolean
  database: 'online' | 'offline' | 'unknown'
  suricata: 'active' | 'idle' | 'offline'
  suricata_last_seen: string | null
  ml_engine: 'loaded' | 'degraded' | 'offline'
}

/** Truthful disaggregated health check across backend, DB, Suricata, and ML */
export function useSystemHealth() {
  return useQuery<SystemHealthData>({
    queryKey: ['system', 'health-detailed'],
    queryFn: async () => {
      try {
        const res = await fetch('/health', { signal: AbortSignal.timeout(4000) })
        if (!res.ok) {
          return {
            status: 'offline',
            backend: false,
            database: 'offline',
            suricata: 'offline',
            suricata_last_seen: null,
            ml_engine: 'offline',
          }
        }
        const data = await res.json()
        const comps = data.components || {}
        return {
          status: data.status || 'healthy',
          backend: comps.backend === 'online',
          database: comps.database || 'online',
          suricata: comps.suricata_collector || 'idle',
          suricata_last_seen: comps.suricata_last_seen || null,
          ml_engine: comps.ml_engine || 'loaded',
        }
      } catch {
        return {
          status: 'offline',
          backend: false,
          database: 'offline',
          suricata: 'offline',
          suricata_last_seen: null,
          ml_engine: 'offline',
        }
      }
    },
    refetchInterval: 8_000,
    staleTime: 4_000,
  })
}

/** Check backend connectivity via /health */
export function useBackendStatus() {
  const { data } = useSystemHealth()
  return { data: data?.backend ?? false }
}

