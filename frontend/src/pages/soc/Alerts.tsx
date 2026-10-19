import { Bell, CheckCircle2, Eye, RefreshCw } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { severityClass, riskColor } from '@/lib/utils'
import { useSecOpsAlerts } from '@/context/SecOpsAlertContext'
import AlertDetailModal from '@/components/secops/AlertDetailModal'

const statusStyle: Record<string, string> = {
  NEW: 'bg-red-500/10 text-fanos-red border border-red-500/25',
  ACKNOWLEDGED: 'bg-amber-500/10 text-fanos-amber border border-amber-500/25',
  INVESTIGATING: 'bg-blue-500/10 text-fanos-accent border border-blue-500/25',
  RESOLVED: 'bg-emerald-500/10 text-fanos-green border border-emerald-500/25',
}

export default function Alerts() {
  const {
    alerts,
    loading,
    refresh,
    acknowledgeAlert,
    resolveAlert,
    newAlertsCount,
    selectedAlert,
    setSelectedAlert,
  } = useSecOpsAlerts()

  const ackCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length
  const resCount = alerts.filter(a => a.status === 'RESOLVED').length

  return (
    <>
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
        />
      )}

      <PageShell
        title="Security Alerts"
        subtitle="Prioritized real-time alerts requiring SOC analyst attention across all defense layers"
        badge={{ label: `${newAlertsCount} NEW`, color: 'red' }}
        actions={
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="fanos-btn text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'New Alerts',     value: newAlertsCount, color: '#ef4444' },
            { label: 'Acknowledged',   value: ackCount,       color: '#f59e0b' },
            { label: 'Resolved Today', value: resCount,       color: '#00e5a0' },
          ].map(s => (
            <div key={s.label} className="fanos-card px-4 py-3">
              <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{s.label}</div>
              <div className="text-[26px] font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title">
              <Bell size={13} className="text-fanos-accent" />
              Alert Queue
            </div>
            <span className="text-[9px] text-fanos-dim">{alerts.length} total alerts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/10 border-b border-white/[0.05]">
                  {['Alert ID', 'Severity', 'Title', 'Source IP', 'Engine', 'Risk', 'Status', 'Time', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {alerts.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedAlert(a)}
                    className="hover:bg-white/[0.018] transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap">{a.id}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={severityClass(a.sev)}>{a.sev}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium max-w-[240px]">
                      <span className="truncate block">{a.title}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap">{a.src}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-green whitespace-nowrap">{a.engine}</td>
                    <td className={`px-3 py-2.5 text-[12px] font-bold ${riskColor(a.risk)}`}>{a.risk}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${statusStyle[a.status] || ''}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{a.relativeTime}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedAlert(a)}
                          className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                          style={{ background: 'rgba(0,200,255,.1)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.25)' }}
                        >
                          <Eye size={9} /> View
                        </button>
                        {a.status === 'NEW' && (
                          <button
                            onClick={() => acknowledgeAlert(a.id)}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                            style={{ background: 'rgba(0,229,160,.1)', color: '#00e5a0', border: '1px solid rgba(0,229,160,.25)' }}
                          >
                            <CheckCircle2 size={9} /> Ack
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageShell>
    </>
  )
}
