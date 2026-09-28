import axios from 'axios'
import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Gauge, RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import {
  getSensorStatus,
  restartSensor,
  startSensor,
  stopSensor,
  type SensorLifecycleStatus,
} from '@/lib/api'

const SENSOR_ID = 'demo-sensor-01'

type ActionType = 'START' | 'STOP' | 'RESTART' | null

const statusPalette: Record<string, { badge: string; dot: string; label: string }> = {
  OFFLINE: { badge: 'status-alert', dot: 'dot-red', label: 'OFFLINE' },
  STARTING: { badge: 'status-monitored', dot: 'dot-accent', label: 'STARTING' },
  ONLINE: { badge: 'status-blocked', dot: 'dot-green', label: 'ONLINE' },
  STOPPING: { badge: 'status-monitored', dot: 'dot-accent', label: 'STOPPING' },
  ERROR: { badge: 'status-alert', dot: 'dot-red', label: 'ERROR' },
  UNKNOWN: { badge: 'status-alert', dot: 'dot-red', label: 'UNKNOWN' },
}

function getApiErrorDetail(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null
  const detail = error.response?.data?.detail
  return typeof detail === 'string' ? detail : null
}

function normalizeLifecycleValue(value: string | null | undefined, fallback: string): string {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return normalized || fallback
}

export default function SensorControl() {
  const [sensor, setSensor] = useState<SensorLifecycleStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<ActionType>(null)

  const refreshSensor = async () => {
    try {
      const data = await getSensorStatus(SENSOR_ID)
      setSensor(data)
      setError(null)
    } catch (err) {
      setError(getApiErrorDetail(err) ?? 'Unable to load sensor state from the FANOS backend.')
      console.error('Sensor status load failed', err)
    }
  }

  useEffect(() => {
    void refreshSensor()
    const timer = window.setInterval(() => {
      void refreshSensor()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  const runAction = async (action: Exclude<ActionType, null>) => {
    setBusyAction(action)
    setLoading(true)
    setError(null)

    try {
      if (action === 'START') {
        await startSensor(SENSOR_ID)
      } else if (action === 'STOP') {
        await stopSensor(SENSOR_ID)
      } else {
        await restartSensor(SENSOR_ID)
      }
      await refreshSensor()
    } catch (err) {
      const detail = getApiErrorDetail(err)
      setError(detail ? `The ${action} request failed: ${detail}` : `The ${action} request failed. Check backend connectivity and permissions.`)
      console.error(`Sensor ${action} failed`, err)
    } finally {
      setBusyAction(null)
      setLoading(false)
    }
  }

  const currentStatus = normalizeLifecycleValue(sensor?.status, 'UNKNOWN')
  const desiredState = normalizeLifecycleValue(sensor?.desired_state, 'STOPPED')
  const statusConfig = statusPalette[currentStatus] ?? statusPalette.UNKNOWN

  return (
    <PageShell
      title="Sensor Control"
      subtitle="Operational control for the authenticated FANOS sensor lifecycle"
      badge={{ label: `${SENSOR_ID}`, color: 'blue' }}
      actions={
        <button
          type="button"
          onClick={() => void refreshSensor()}
          className="fanos-btn gap-2 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="fanos-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-fanos-accent/25 bg-fanos-accent/10">
                <Wifi className="text-fanos-accent" size={18} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-fanos-dim">Sensor Name</div>
                <div className="mt-1 text-xl font-bold text-white">{SENSOR_ID}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={statusConfig.dot} />
              <span className={statusConfig.badge}>{statusConfig.label}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-fanos-dim">
                <Gauge size={12} /> Current Status
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{currentStatus}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-fanos-dim">
                <ShieldCheck size={12} /> Desired State
              </div>
              <div className="mt-2 text-2xl font-bold text-fanos-accent">{desiredState}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-fanos-dim">Suricata</div>
              <div className="mt-2 text-sm font-semibold text-white">{normalizeLifecycleValue(sensor?.suricata_status, 'UNKNOWN')}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-fanos-dim">Collector</div>
              <div className="mt-2 text-sm font-semibold text-white">{normalizeLifecycleValue(sensor?.collector_status, 'UNKNOWN')}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-fanos-dim">Service</div>
              <div className="mt-2 text-sm font-semibold text-white">{normalizeLifecycleValue(sensor?.service_status, 'UNKNOWN')}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="fanos-btn disabled:opacity-50 disabled:cursor-not-allowed bg-fanos-green/10 text-fanos-green border-fanos-green/30"
              onClick={() => void runAction('START')}
              disabled={loading || busyAction !== null || currentStatus === 'STARTING'}
            >
              {busyAction === 'START' ? 'Starting…' : 'START'}
            </button>

            <button
              type="button"
              className="fanos-btn disabled:opacity-50 disabled:cursor-not-allowed bg-fanos-red/10 text-fanos-red border-fanos-red/30"
              onClick={() => void runAction('STOP')}
              disabled={loading || busyAction !== null || currentStatus === 'STOPPING'}
            >
              {busyAction === 'STOP' ? 'Stopping…' : 'STOP'}
            </button>

            <button
              type="button"
              className="fanos-btn disabled:opacity-50 disabled:cursor-not-allowed bg-fanos-accent/10 text-fanos-accent border-fanos-accent/30"
              onClick={() => void runAction('RESTART')}
              disabled={loading || busyAction !== null || currentStatus === 'STARTING' || currentStatus === 'STOPPING'}
            >
              {busyAction === 'RESTART' ? 'Restarting…' : 'RESTART'}
            </button>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-fanos-red/25 bg-fanos-red/10 p-3 text-[12px] text-fanos-red">
              <AlertTriangle size={14} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="fanos-card p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-fanos-dim">
            <Activity size={12} /> Lifecycle Details
          </div>

          <div className="mt-4 space-y-3 text-[12px]">
            <div className="flex items-center justify-between rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="text-fanos-dim">Last seen</span>
              <span className="font-medium text-white">{sensor?.last_seen ? new Date(sensor.last_seen).toLocaleString() : '—'}</span>
            </div>
            <div className="flex items-center justify-between rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="text-fanos-dim">Last heartbeat</span>
              <span className="font-medium text-white">{sensor?.last_heartbeat ? new Date(sensor.last_heartbeat).toLocaleString() : '—'}</span>
            </div>
            <div className="flex items-center justify-between rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="text-fanos-dim">Restart count</span>
              <span className="font-medium text-white">{sensor?.restart_count ?? 0}</span>
            </div>
            <div className="rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="text-fanos-dim">Last error</div>
              <div className="mt-1 text-[11px] text-white">{sensor?.last_error || 'None'}</div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
