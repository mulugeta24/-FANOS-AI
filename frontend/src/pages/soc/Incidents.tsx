import { FileWarning, Plus, Eye } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useActiveIncidents } from '@/hooks/useDashboard'
import { mockIncidents } from '@/lib/mockData'
import { severityClass, statusClass, riskColor, timeAgo } from '@/lib/utils'

export default function Incidents() {
  const { data: incidents = mockIncidents } = useActiveIncidents()
  return (
    <PageShell title="Incidents" subtitle="Security incidents requiring investigation and response"
      badge={{ label:`${incidents.length} OPEN`, color:'orange' }}
      actions={<button className="fanos-btn"><Plus size={11}/>New Incident</button>}>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Critical',     value: incidents.filter(i=>i.severity==='CRITICAL').length, color:'#ef4444' },
          { label:'High',         value: incidents.filter(i=>i.severity==='HIGH').length,     color:'#f97316' },
          { label:'Investigating',value: incidents.filter(i=>i.status==='Investigating').length, color:'#f59e0b' },
          { label:'Contained',    value: incidents.filter(i=>i.status==='Contained').length,  color:'#00e5a0' },
        ].map(s=>(
          <div key={s.label} className="fanos-card px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{s.label}</div>
            <div className="text-[26px] font-bold mt-1" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><FileWarning size={13} className="text-fanos-accent"/>All Incidents</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['ID','Threat','Severity','Source IP','Status','Risk','Assigned','Time','Actions'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {incidents.map(inc=>(
                <tr key={String(inc.id)} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap">{String(inc.id).substring(0,16)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium max-w-[180px]"><span className="truncate block">{inc.threat}</span></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><span className={severityClass(inc.severity)}>{inc.severity}</span></td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent whitespace-nowrap">{inc.source_ip}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><span className={statusClass(inc.status)}>{inc.status}</span></td>
                  <td className={`px-3 py-2.5 text-[12px] font-bold ${riskColor(inc.risk_score)}`}>{inc.risk_score}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-muted whitespace-nowrap">{inc.assigned_to}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{timeAgo(new Date(inc.created_at as string))}</td>
                  <td className="px-3 py-2.5">
                    <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                      style={{background:'rgba(0,200,255,.1)',color:'#00c8ff',border:'1px solid rgba(0,200,255,.25)'}}>
                      <Eye size={9}/>View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
