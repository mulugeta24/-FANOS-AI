import { Zap, Filter } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useLiveEvents } from '@/hooks/useDashboard'
import { mockEvents } from '@/lib/mockData'
import { severityClass, statusClass, riskColor, timeAgo } from '@/lib/utils'

export default function DetectionEvents() {
  const { data: events = mockEvents } = useLiveEvents(50)

  return (
    <PageShell title="Detection Events" subtitle="All security events detected across sensors in real-time"
      badge={{ label: `${events.length} EVENTS`, color: 'blue' }}
      actions={<button className="fanos-btn"><Filter size={11}/>Filter</button>}>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Zap size={13} className="text-fanos-accent"/>Live Event Stream</div>
          <span className="dot-green"/>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Event ID','Severity','Attack Type','Source IP','Target','AI Confidence','Risk','Status','Time'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {events.map((e)=>(
                <tr key={String(e.id)} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap">{String(e.id).slice(0,8)}</td>
                  <td className="px-3 py-2.5"><span className={severityClass(e.severity)}>{e.severity}</span></td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium whitespace-nowrap">{e.attack_type}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{e.source_ip}</td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-muted">{e.target}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                        <div className="h-full rounded-full bg-fanos-accent" style={{width:`${e.ai_confidence}%`}}/>
                      </div>
                      <span className="text-[10px] text-fanos-text">{e.ai_confidence.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-[12px] font-bold ${riskColor(e.risk_score)}`}>{e.risk_score}</td>
                  <td className="px-3 py-2.5"><span className={statusClass(e.status)}>{e.status}</span></td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{timeAgo(new Date(e.timestamp ?? new Date().toISOString()))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-white/[0.04] flex justify-between items-center">
          <span className="text-[10px] text-fanos-dim">Showing {events.length} events</span>
          <button className="fanos-btn text-[9px] py-1 px-2.5">Export CSV</button>
        </div>
      </div>
    </PageShell>
  )
}
