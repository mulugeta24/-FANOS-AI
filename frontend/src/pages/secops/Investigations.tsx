/**
 * Security Operations — Investigations
 * Threat hunting and active investigation workspace.
 */
import { Search, Plus, Clock, CheckCircle2, Eye, GitBranch } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const INVESTIGATIONS = [
  {
    id: 'INV-001', title: 'SQL Injection Actor Attribution',
    status: 'Active', priority: 'High', analyst: 'Kidist W.',
    created: 'Sep 15, 2026', updated: '5 min ago',
    indicators: 4, alerts: 8, artifacts: 12,
    summary: 'Investigating source IPs 192.168.56.10 and 172.16.0.88 for coordinated SQL injection campaign. MITRE T1190 confirmed.',
  },
  {
    id: 'INV-002', title: 'Credential Stuffing Campaign Origin',
    status: 'Active', priority: 'High', analyst: 'SOC-1',
    created: 'Sep 15, 2026', updated: '30 min ago',
    indicators: 6, alerts: 12, artifacts: 8,
    summary: 'Correlating brute force attempts from Tor exit nodes against compromised credential dataset. 3 accounts confirmed compromised.',
  },
  {
    id: 'INV-003', title: 'Suspected C2 Beacon Activity',
    status: 'Active', priority: 'Medium', analyst: 'Unassigned',
    created: 'Sep 14, 2026', updated: '2 hr ago',
    indicators: 2, alerts: 3, artifacts: 5,
    summary: 'Zeek TLS analysis flagged periodic beaconing pattern from internal host 10.0.1.22 to 91.105.0.4:443.',
  },
  {
    id: 'INV-004', title: 'Insider Threat Anomaly Review',
    status: 'Closed', priority: 'Low', analyst: 'SOC-2',
    created: 'Sep 12, 2026', updated: '2 days ago',
    indicators: 1, alerts: 2, artifacts: 3,
    summary: 'Unusual login time pattern for user account. Confirmed legitimate business travel. Case closed.',
  },
]

const priorityStyle: Record<string,{bg:string;color:string}> = {
  High:   { bg:'rgba(239,68,68,0.08)',   color:'#ef4444' },
  Medium: { bg:'rgba(245,158,11,0.08)',  color:'#f59e0b' },
  Low:    { bg:'rgba(107,114,128,0.08)', color:'#9ca3af' },
}

const statusStyle: Record<string,{bg:string;color:string;icon:React.ReactNode}> = {
  Active: { bg:'rgba(0,200,255,0.08)', color:'#00c8ff', icon:<Clock size={10}/> },
  Closed: { bg:'rgba(0,229,160,0.08)', color:'#00e5a0', icon:<CheckCircle2 size={10}/> },
}

export default function Investigations() {
  return (
    <PageShell
      title="Investigations"
      subtitle="Active threat hunting and security investigations"
      badge={{ label:`${INVESTIGATIONS.filter(i=>i.status==='Active').length} ACTIVE`, color:'blue' }}
      actions={<button className="fanos-btn"><Plus size={11}/>New Investigation</button>}
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Active',  count: INVESTIGATIONS.filter(i=>i.status==='Active').length,  color:'#00c8ff' },
          { label:'Closed',  count: INVESTIGATIONS.filter(i=>i.status==='Closed').length,  color:'#00e5a0' },
          { label:'Analysts',count: [...new Set(INVESTIGATIONS.map(i=>i.analyst))].filter(a=>a!=='Unassigned').length, color:'#8b5cf6' },
        ].map(s=>(
          <div key={s.label} className="fanos-card p-4">
            <div className="text-[22px] font-bold" style={{color:s.color}}>{s.count}</div>
            <div className="text-[11px] text-fanos-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="fanos-card p-3 flex items-center gap-2.5">
        <Search size={13} className="text-fanos-dim"/>
        <input placeholder="Search investigations…"
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"/>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {INVESTIGATIONS.map(inv=>{
          const ps = priorityStyle[inv.priority]
          const ss = statusStyle[inv.status]
          return (
            <div key={inv.id} className="fanos-card p-4 hover:border-white/10 transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold text-fanos-dim">{inv.id}</span>
                    <h3 className="text-[13px] font-bold text-white">{inv.title}</h3>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{background:ps.bg,color:ps.color,border:`1px solid ${ps.color}25`}}>
                      {inv.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-fanos-dim">
                    <span>Analyst: {inv.analyst}</span>
                    <span>·</span>
                    <span>Created {inv.created}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><Clock size={9}/>Updated {inv.updated}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-semibold"
                  style={{background:ss.bg,color:ss.color,border:`1px solid ${ss.color}25`}}>
                  {ss.icon}{inv.status}
                </div>
              </div>

              <p className="text-[11px] text-fanos-muted mb-3 leading-relaxed">{inv.summary}</p>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-[10px] text-fanos-dim">
                  {[
                    { label:'Indicators', value: inv.indicators },
                    { label:'Alerts',     value: inv.alerts     },
                    { label:'Artifacts',  value: inv.artifacts  },
                  ].map(m=>(
                    <div key={m.label} className="flex flex-col items-center">
                      <span className="text-[14px] font-bold text-fanos-text">{m.value}</span>
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1.5 rounded"
                    style={{background:'rgba(0,200,255,0.1)',color:'#00c8ff',border:'1px solid rgba(0,200,255,0.25)'}}>
                    <Eye size={9}/>View Timeline
                  </button>
                  <button className="flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1.5 rounded"
                    style={{background:'rgba(139,92,246,0.1)',color:'#a78bfa',border:'1px solid rgba(139,92,246,0.25)'}}>
                    <GitBranch size={9}/>MITRE Map
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
