import { Radio, RefreshCw, ShieldAlert, Cpu, Database } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useSensors } from '@/hooks/useDashboard'

export default function Sensors() {
  const { data: sensors = [], isLoading, isError, error, refetch, isFetching } = useSensors()
  const onlineCount = sensors.filter((s) => s.status === 'ONLINE').length
  const degradedCount = sensors.filter((s) => s.status === 'DEGRADED').length
  const totalEvents = sensors.reduce((s, x) => s + (x.events || 0), 0)

  return (
    <PageShell
      title="Security Sensor Fleet"
      subtitle="Real-time telemetry collectors, IDS agents, and ML inference pipelines"
      badge={{
        label: `${onlineCount}/${sensors.length} ACTIVE SENSORS`,
        color: onlineCount >= 2 ? 'green' : 'orange',
      }}
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin text-fanos-accent' : ''} />
          <span>Refresh Fleet</span>
        </button>
      }
    >
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Registered Sensors', value: sensors.length, color: '#38bdf8' },
          { label: 'Online & Ingesting', value: onlineCount, color: '#10b981' },
          { label: 'Degraded / Standby', value: degradedCount, color: '#f59e0b' },
          { label: 'Ingested Telemetry', value: totalEvents.toLocaleString(), color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="bg-[#12161f]/80 border border-white/[0.07] rounded-xl px-4 py-3 backdrop-blur shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{s.label}</div>
            <div className="text-2xl font-bold font-mono mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 flex items-center justify-between text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>Failed to reach sensor fleet manager: {(error as Error)?.message}</span>
          </div>
          <button onClick={() => refetch()} className="fanos-btn text-xs py-1 px-3">
            Retry
          </button>
        </div>
      )}

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fanos-card p-5 animate-pulse">
              <div className="h-4 bg-white/[0.08] rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/[0.05] rounded w-1/2 mb-4" />
              <div className="h-8 bg-white/[0.04] rounded" />
            </div>
          ))
        ) : (
          sensors.map((s) => {
            const isOnline = s.status === 'ONLINE'
            const isDegraded = s.status === 'DEGRADED'

            return (
              <div
                key={s.name}
                className="fanos-card p-5 flex flex-col justify-between hover:border-white/[0.12] transition"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        {s.name.includes('AI') ? (
                          <Cpu size={16} className="text-purple-400" />
                        ) : s.name.includes('Store') || s.name.includes('Pipeline') ? (
                          <Database size={16} className="text-cyan-400" />
                        ) : (
                          <Radio size={16} className="text-fanos-accent" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                        <p className="text-[11px] text-fanos-muted">{s.type}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        isOnline
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : isDegraded
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                          : 'bg-red-500/10 text-red-400 border border-red-500/25'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-[#0a0d14] rounded-lg border border-white/[0.05] my-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-medium block">
                        Captured Records
                      </span>
                      <span className="font-mono text-white font-bold text-sm">
                        {s.events.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-medium block">
                        Status / Heartbeat
                      </span>
                      <span className="font-mono text-gray-300 text-xs truncate block" title={s.uptime}>
                        {s.uptime}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-fanos-dim">
                  <div className="flex items-center gap-1.5">
                    <span className={isOnline ? 'dot-green' : isDegraded ? 'dot-amber' : 'dot-red'} />
                    <span>{isOnline ? 'Streaming' : isDegraded ? 'Standby Socket' : 'Disconnected'}</span>
                  </div>
                  <span className="font-mono text-[10px]">FANOS PROTOCOL</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </PageShell>
  )
}
