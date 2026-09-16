import { Bell, CheckCircle2, Eye } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { severityClass, riskColor } from '@/lib/utils'

const ALERTS = [
  { id:'ALT-001', sev:'CRITICAL', title:'SQL Injection Campaign Detected',         src:'192.168.56.10', risk:96, status:'NEW',         ago:'2 min ago'  },
  { id:'ALT-002', sev:'CRITICAL', title:'Command Injection on /api/exec',           src:'172.16.0.88',  risk:98, status:'NEW',         ago:'5 min ago'  },
  { id:'ALT-003', sev:'HIGH',     title:'Brute Force on /admin/login',              src:'192.168.56.21',risk:88, status:'ACKNOWLEDGED', ago:'8 min ago'  },
  { id:'ALT-004', sev:'HIGH',     title:'Network Port Scan Detected',               src:'192.168.56.31',risk:84, status:'NEW',         ago:'15 min ago' },
  { id:'ALT-005', sev:'HIGH',     title:'XSS Attack Wave on /comment endpoint',     src:'10.0.0.44',    risk:80, status:'ACKNOWLEDGED', ago:'30 min ago' },
  { id:'ALT-006', sev:'MEDIUM',   title:'Suspicious URI Pattern on /search',        src:'192.168.56.42',risk:64, status:'ACKNOWLEDGED', ago:'45 min ago' },
  { id:'ALT-007', sev:'LOW',      title:'Anomalous Traffic Volume from Web Server', src:'192.168.56.55',risk:38, status:'RESOLVED',    ago:'1 hr ago'   },
]

const statusStyle: Record<string,string> = {
  NEW: 'bg-red-500/10 text-fanos-red border border-red-500/25',
  ACKNOWLEDGED: 'bg-amber-500/10 text-fanos-amber border border-amber-500/25',
  RESOLVED: 'bg-emerald-500/10 text-fanos-green border border-emerald-500/25',
}

export default function Alerts() {
  const newCount = ALERTS.filter(a=>a.status==='NEW').length
  return (
    <PageShell title="Security Alerts" subtitle="Prioritized alerts requiring SOC analyst attention"
      badge={{ label:`${newCount} NEW`, color:'red' }}>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'New Alerts',      value: newCount,                                      color:'#ef4444' },
          { label:'Acknowledged',    value: ALERTS.filter(a=>a.status==='ACKNOWLEDGED').length, color:'#f59e0b' },
          { label:'Resolved Today',  value: ALERTS.filter(a=>a.status==='RESOLVED').length,     color:'#00e5a0' },
        ].map(s=>(
          <div key={s.label} className="fanos-card px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{s.label}</div>
            <div className="text-[26px] font-bold mt-1" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Bell size={13} className="text-fanos-accent"/>Alert Queue</div>
          <span className="text-[9px] text-fanos-dim">{ALERTS.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Alert ID','Severity','Title','Source IP','Risk','Status','Time','Actions'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {ALERTS.map(a=>(
                <tr key={a.id} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{a.id}</td>
                  <td className="px-3 py-2.5"><span className={severityClass(a.sev)}>{a.sev}</span></td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium max-w-[240px]"><span className="truncate block">{a.title}</span></td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{a.src}</td>
                  <td className={`px-3 py-2.5 text-[12px] font-bold ${riskColor(a.risk)}`}>{a.risk}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${statusStyle[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{a.ago}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                        style={{background:'rgba(0,200,255,.1)',color:'#00c8ff',border:'1px solid rgba(0,200,255,.25)'}}>
                        <Eye size={9}/>View
                      </button>
                      <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded cursor-pointer"
                        style={{background:'rgba(0,229,160,.1)',color:'#00e5a0',border:'1px solid rgba(0,229,160,.25)'}}>
                        <CheckCircle2 size={9}/>Ack
                      </button>
                    </div>
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
