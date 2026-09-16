import { Rocket, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'

const DEPLOYMENTS = [
  { id:'DEP-001', name:'Acme Corp — Full Stack',           org:'Acme Corporation',  sensors:12, region:'AWS eu-west-1',  status:'Running',     progress:100, started:'Jan 15, 2025', version:'v3.2.1' },
  { id:'DEP-002', name:'GlobalBank — WAF + NDR',           org:'GlobalBank Group',  sensors:6,  region:'AWS us-east-1', status:'In Progress', progress:65,  started:'Sep 12, 2026', version:'v3.2.1' },
  { id:'DEP-003', name:'NovaTech — Sensor Expansion',      org:'NovaTech Systems',  sensors:8,  region:'On-Premise',    status:'In Progress', progress:40,  started:'Sep 13, 2026', version:'v3.2.1' },
  { id:'DEP-004', name:'DataGuard — Enterprise Upgrade',   org:'DataGuard Africa',  sensors:15, region:'Azure af-south',status:'Running',     progress:100, started:'Jun 1, 2025',  version:'v3.2.1' },
  { id:'DEP-005', name:'SecureOps — Starter Deployment',   org:'SecureOps Inc',     sensors:2,  region:'AWS eu-west-1', status:'Scheduled',   progress:0,   started:'—',            version:'v3.2.1' },
]

const statusStyle: Record<string,{bg:string;color:string;icon:React.ReactNode}> = {
  'Running':     { bg:'rgba(0,229,160,0.08)',  color:'#00e5a0', icon:<CheckCircle2 size={11}/> },
  'In Progress': { bg:'rgba(0,200,255,0.08)',  color:'#00c8ff', icon:<Clock size={11}/> },
  'Scheduled':   { bg:'rgba(245,158,11,0.08)', color:'#f59e0b', icon:<AlertCircle size={11}/> },
}

export default function Deployments() {
  return (
    <PageShell
      title="Deployments"
      subtitle="Track and manage active sensor and platform deployments"
      badge={{ label: `${DEPLOYMENTS.filter(d=>d.status==='Running').length} RUNNING`, color: 'green' }}
      actions={<button className="fanos-btn"><Plus size={11}/>New Deployment</button>}
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Running',     count: DEPLOYMENTS.filter(d=>d.status==='Running').length,     color:'#00e5a0' },
          { label:'In Progress', count: DEPLOYMENTS.filter(d=>d.status==='In Progress').length, color:'#00c8ff' },
          { label:'Scheduled',   count: DEPLOYMENTS.filter(d=>d.status==='Scheduled').length,   color:'#f59e0b' },
        ].map(s=>(
          <div key={s.label} className="fanos-card p-4">
            <div className="text-[22px] font-bold" style={{color:s.color}}>{s.count}</div>
            <div className="text-[11px] text-fanos-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Deployments */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Rocket size={13} className="text-fanos-green"/>Deployment Tracker</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {DEPLOYMENTS.map(d=>{
            const ss = statusStyle[d.status]
            return (
              <div key={d.id} className="px-4 py-4 hover:bg-white/[0.018] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-bold text-fanos-dim">{d.id}</span>
                      <span className="text-[12px] font-semibold text-white">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-fanos-dim flex-wrap">
                      <span>{d.org}</span>
                      <span>·</span>
                      <span>{d.region}</span>
                      <span>·</span>
                      <span>{d.sensors} sensors</span>
                      <span>·</span>
                      <span>v{d.version}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold"
                      style={{background:ss.bg,color:ss.color,border:`1px solid ${ss.color}25`}}>
                      {ss.icon}{d.status}
                    </div>
                    <div className="text-[9px] text-fanos-dim">{d.started !== '—' ? `Started ${d.started}` : 'Not started'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width:`${d.progress}%`,
                        background: d.progress===100 ? '#00e5a0' : 'linear-gradient(90deg,#00c8ff,#8b5cf6)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold flex-shrink-0"
                    style={{color: d.progress===100 ? '#00e5a0' : '#00c8ff'}}>
                    {d.progress}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
