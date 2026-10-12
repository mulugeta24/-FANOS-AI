import { useMemo } from 'react'
import { AlertTriangle, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useLiveEvents } from '@/hooks/useDashboard'
import { severityClass, riskColor, timeAgo } from '@/lib/utils'

interface ThreatActor {
  id: string
  name: string
  type: string
  sev: string
  src: string
  risk: number
  count: number
  first: string
  last: string
}

export default function Threats() {
  const { data: events = [], isLoading, isError, refetch, isFetching } = useLiveEvents(100)

  // Aggregate threats by adversary Source IP
  const threats = useMemo<ThreatActor[]>(() => {
    if (!events.length) return []

    const map = new Map<string, {
      attackTypes: Set<string>
      maxSev: string
      maxRisk: number
      count: number
      earliest: Date
      latest: Date
    }>()

    const sevWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
      INFO: 0,
    }

    events.forEach((e) => {
      const src = e.source_ip || 'Unknown'
      const time = new Date(e.created_at || e.timestamp || Date.now())

      if (!map.has(src)) {
        map.set(src, {
          attackTypes: new Set([e.attack_type]),
          maxSev: e.severity,
          maxRisk: e.risk_score,
          count: 1,
          earliest: time,
          latest: time,
        })
      } else {
        const item = map.get(src)!
        item.attackTypes.add(e.attack_type)
        if ((sevWeight[e.severity.toUpperCase()] || 0) > (sevWeight[item.maxSev.toUpperCase()] || 0)) {
          item.maxSev = e.severity
        }
        if (e.risk_score > item.maxRisk) {
          item.maxRisk = e.risk_score
        }
        item.count += 1
        if (time < item.earliest) item.earliest = time
        if (time > item.latest) item.latest = time
      }
    })

    return Array.from(map.entries()).map(([src, item], idx) => ({
      id: `THR-${String(idx + 1).padStart(3, '0')}`,
      name: Array.from(item.attackTypes).slice(0, 2).join(' / '),
      type: Array.from(item.attackTypes)[0] || 'Network Anomaly',
      sev: item.maxSev,
      src,
      risk: item.maxRisk,
      count: item.count,
      first: timeAgo(item.earliest),
      last: timeAgo(item.latest),
    }))
  }, [events])

  const criticalCount = threats.filter((t) => t.sev === 'CRITICAL').length
  const highCount = threats.filter((t) => t.sev === 'HIGH').length
  const totalAggEvents = threats.reduce((s, t) => s + t.count, 0)

  return (
    <PageShell
      title="Threat Intelligence"
      subtitle="Adversary source campaign clustering derived from real-time network telemetry"
      badge={{ label: `${threats.length} ADVERSARY HOSTS`, color: criticalCount > 0 ? 'red' : 'blue' }}
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin text-fanos-accent' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Critical Adversaries', value: criticalCount, color: '#ef4444' },
          { label: 'High Threats', value: highCount, color: '#f97316' },
          { label: 'Correlated Events', value: totalAggEvents, color: '#00c8ff' },
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
            <span>Could not correlate threat actors from live telemetry.</span>
          </div>
          <button onClick={() => refetch()} className="fanos-btn text-xs py-1 px-3">
            Retry
          </button>
        </div>
      )}

      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title flex items-center gap-2">
            <AlertTriangle size={14} className="text-fanos-accent" />
            <span>Adversary Origin Clusters</span>
          </div>
          <span className="text-[11px] font-mono text-fanos-dim">TELEMETRY-CORRELATED</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                {[
                  'Cluster ID',
                  'Observed Attack Types',
                  'Primary Vector',
                  'Max Severity',
                  'Adversary IP',
                  'Peak Risk',
                  'Correlated Packets',
                  'First Seen',
                  'Last Activity',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3.5 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-4 py-3 text-center text-xs text-fanos-dim">
                      Correlating threat adversary clusters...
                    </td>
                  </tr>
                ))
              ) : threats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-fanos-dim text-xs">
                    <ShieldCheck size={28} className="mx-auto mb-2 text-gray-600 opacity-60" />
                    No adversary clusters detected in active telemetry window.
                  </td>
                </tr>
              ) : (
                threats.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-[10px] text-fanos-accent">{t.id}</td>
                    <td className="px-3.5 py-2.5 text-[11px] text-fanos-text font-semibold">{t.name}</td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-muted">{t.type}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={severityClass(t.sev)}>{t.sev}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-amber-300">{t.src}</td>
                    <td className={`px-3.5 py-2.5 text-[12px] font-bold font-mono ${riskColor(t.risk)}`}>
                      {t.risk}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] font-semibold text-fanos-text font-mono">
                      {t.count}
                    </td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{t.first}</td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{t.last}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
