/**
 * React Query hooks for all FANOS AI dashboard data.
 * Each hook tries the real API first; on network error it falls back to mock data
 * so the UI is always fully populated during development / offline demos.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDashboardKPIs,
  getThreatActivity,
  getAttackDistribution,
  getLiveEvents,
  getActiveIncidents,
  getAIEngineStatus,
  getSensors,
  getResponseActions,
  getPreventionStatus,
  getWebSecurityStats,
} from '@/lib/api'
import {
  mockKPIs,
  mockThreatActivity,
  mockAttackDistribution,
  mockEvents,
  mockIncidents,
  mockAIEngine,
  mockSensors,
  mockResponseActions,
  mockPrevention,
  mockWebSecurity,
} from '@/lib/mockData'

// How often live panels refresh (ms)
const LIVE_INTERVAL   = 6_000   // 6 s  — events stream
const KPI_INTERVAL    = 15_000  // 15 s — KPI cards
const CHART_INTERVAL  = 30_000  // 30 s — charts
const SENSOR_INTERVAL = 20_000  // 20 s — sensors

/** Resolve to mock on any API error */
function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback)
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn:  () => withFallback(getDashboardKPIs(), mockKPIs),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useThreatActivity(hours = 24) {
  return useQuery({
    queryKey: ['dashboard', 'threat-activity', hours],
    queryFn:  () => withFallback(getThreatActivity(hours), mockThreatActivity),
    refetchInterval: CHART_INTERVAL,
    staleTime: CHART_INTERVAL / 2,
  })
}

export function useAttackDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'attack-distribution'],
    queryFn:  () => withFallback(getAttackDistribution(), mockAttackDistribution),
    refetchInterval: CHART_INTERVAL,
    staleTime: CHART_INTERVAL / 2,
  })
}

export function useLiveEvents(limit = 20) {
  return useQuery({
    queryKey: ['events', 'live', limit],
    queryFn:  () => withFallback(getLiveEvents(limit), mockEvents),
    refetchInterval: LIVE_INTERVAL,
    staleTime: LIVE_INTERVAL / 2,
  })
}

export function useActiveIncidents() {
  return useQuery({
    queryKey: ['incidents', 'active'],
    queryFn:  () => withFallback(getActiveIncidents(), mockIncidents),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useAIEngineStatus() {
  return useQuery({
    queryKey: ['ai', 'engine-status'],
    queryFn:  () => withFallback(getAIEngineStatus(), mockAIEngine),
    refetchInterval: SENSOR_INTERVAL,
    staleTime: SENSOR_INTERVAL / 2,
  })
}

export function useSensors() {
  return useQuery({
    queryKey: ['infrastructure', 'sensors'],
    queryFn:  () => withFallback(getSensors(), mockSensors),
    refetchInterval: SENSOR_INTERVAL,
    staleTime: SENSOR_INTERVAL / 2,
  })
}

export function useResponseActions(limit = 10) {
  return useQuery({
    queryKey: ['prevention', 'actions', limit],
    queryFn:  () => withFallback(getResponseActions(limit), mockResponseActions),
    refetchInterval: LIVE_INTERVAL,
    staleTime: LIVE_INTERVAL / 2,
  })
}

export function usePreventionStatus() {
  return useQuery({
    queryKey: ['prevention', 'status'],
    queryFn:  () => withFallback(getPreventionStatus(), mockPrevention),
    refetchInterval: KPI_INTERVAL,
    staleTime: KPI_INTERVAL / 2,
  })
}

export function useWebSecurityStats() {
  return useQuery({
    queryKey: ['web-security', 'stats'],
    queryFn:  () => withFallback(getWebSecurityStats(), mockWebSecurity),
    refetchInterval: CHART_INTERVAL,
    staleTime: CHART_INTERVAL / 2,
  })
}

/** Invalidate everything — useful for a manual "refresh" button */
export function useRefreshAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}
