/**
 * Security Operations — Incidents
 * Full incident management view.
 */
import { FileWarning, Plus, Eye, Edit2, User } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

const INCIDENTS = [
  { id:'INC-001', title:'Multi-stage SQL Injection Campaign',  threat:'SQL Injection',    sev:'CRITICAL', src:'192.168.56.10', status:'Investigating', risk:96, assignee:'Kidist W.',   created:'Sep 15 14:10', updated:'5 min ago',  events:24, alerts:8  },
  { id:'INC-002', title:'Credential Brute Force Campaign',     threat:'Brute Force',      sev:'HIGH',     src:'185.220.0.14', status:'Contained',     risk:88, assignee:'SOC-1',       created:'Sep 15 13:55', updated:'12 min ago', events:156,alerts:12 },
  { id:'INC-003', title:'Lateral Movement via SMB',            threat:'Lateral Movement', sev:'HIGH',     src:'10.0.1.44',    status:'Investigating', risk:84, assignee:'Unassigned',  created:'Sep 15 12:30', updated:'1 hr ago',   events:18, alerts:6  },
  { id:'INC-004', title:'DDoS Amplification Attack',           threat:'DDoS',             sev:'MEDIUM',   src:'Multiple',     status:'Monitoring',   risk:72, assignee:'SOC-2',       created:'Sep 15 11:00', updated:'2 hr ago',   events:892,alerts:3  },
  { id:'INC-005', title:'Path Traversal on File Upload API',   threat:'Path Traversal',   sev:'MEDIUM',   src:'45.78.90.12',  status:'Resolved',     risk:61, assignee:'SOC-1',       created:'Sep 14 16:20', updated:'3 hr ago',   events:4,  alerts:2  },
]

const sevStyle: Record<string,{bg:string;color:string}> = {
  CRITICAL:{ bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
  HIGH:    { bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
  MEDIUM:  { bg:'rgba(0,200,255,0.10)',  color:'#00c8ff' },
}

const statusStyle: Record<string,{bg:string;color:string}> = {
  Investigating:{ bg:'rgba(239,68,68,0.08)',   color:'#ef4444' },
  Contained:    { bg:'rgba(0,229,160,0.08)',   color:'#00e5a0' },
  Monitoring:   { bg:'rgba(0,200,255,0.08)',   color:'#00c8ff' },
  Resolved:     { bg:'rgba(107,114,128,0.08)', color:'#6b7280' },
}

export default function SecOpsIncidents() {
  const [selected, setSelected] = useState<typeof INCIDENTS[0] | null>(null)

  return (
    <PageShell
      title="Incidents"
      subtitle="Active and recent security incidents requiring investigation and response"
      badge={{ label:`${INCIDENTS.filter(i=>i.status==='Investigating').length} ACTIVE`, color:'red' }}
      actions={<button className="fanos-btn"><Plus size={11}/>New Incident</button>}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Incident list */}
        <div className={selected ? 'xl:col-span-2' : 'xl:col-span-3'}>
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label:'Investigating', count: INCIDENTS.filter(i=>i.status==='Investigating').length, color:'#ef4444' },
              { label:'Contained',     count: INCIDENTS.filter(i=>i.status==='Contained').length,     color:'#f59e0b' },
              { label:'Monitoring',    count: INCIDENTS.filter(i=>i.status==='Monitoring').length,     color:'#00c8ff' },
              { label:'Resolved',      count: INCIDENTS.filter(i=>i.status==='Resolved').length,       color:'#6b7280' },
            ].map(s=>(
              <div key={s.label} className="fanos-card p-3">
                <div className="text-[20px] font-bold" style={{color:s.color}}>{s.count}</div>
                <div className="text-[10px] text-fanos-muted">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="fanos-card">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><FileWarning size={13} className="text-fanos-amber"/>Incident Registry</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/10 border-b border-white/[0.05]">
                    {['ID','Title','Severity','Source','Status','Risk','Assignee','Updated','Actions'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {INCIDENTS.map(inc=>{
                    const sv = sevStyle[inc.sev]    ?? { bg:'rgba(255,255,255,0.05)', color:'#6b7280' }
                    const st = statusStyle[inc.status] ?? { bg:'rgba(255,255,255,0.05)', color:'#6b7280' }
                    return (
                      <tr key={inc.id}
                        onClick={()=>setSelected(selected?.id===inc.id?null:inc)}
                        className="hover:bg-white/[0.018] transition-colors cursor-pointer"
                        style={selected?.id===inc.id?{background:'rgba(0,200,255,0.04)'}:{}}
                      >
                        <td className="px-3 py-2.5 text-[10px] font-bold text-fanos-dim">{inc.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="text-[11px] font-medium text-fanos-text max-w-[180px] truncate">{inc.title}</div>
                          <div className="text-[9px] text-fanos-dim">{inc.threat}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                            style={{background:sv.bg,color:sv.color,border:`1px solid ${sv.color}30`}}>
                            {inc.sev}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{inc.src}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded"
                            style={{background:st.bg,color:st.color,border:`1px solid ${st.color}25`}}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-bold"
                          style={{color:inc.risk>=90?'#ef4444':inc.risk>=70?'#f59e0b':'#00c8ff'}}>
                          {inc.risk}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{inc.assignee}</td>
                        <td className="px-3 py-2.5 text-[9px] text-fanos-dim whitespace-nowrap">{inc.updated}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={e=>{e.stopPropagation();setSelected(inc)}}
                              className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                              style={{background:'rgba(0,200,255,.1)',color:'#00c8ff',border:'1px solid rgba(0,200,255,.25)'}}>
                              <Eye size={9}/>View
                            </button>
                            <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                              style={{background:'rgba(139,92,246,.1)',color:'#a78bfa',border:'1px solid rgba(139,92,246,.25)'}}>
                              <Edit2 size={9}/>Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="fanos-card flex flex-col gap-0 overflow-hidden">
            <div className="fanos-panel-header">
              <div className="fanos-panel-title"><FileWarning size={13} className="text-fanos-amber"/>Incident Detail</div>
              <button onClick={()=>setSelected(null)} className="text-[10px] text-fanos-dim hover:text-fanos-accent">✕ Close</button>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-3 overflow-y-auto">
              <div>
                <div className="text-[9px] text-fanos-dim mb-1">{selected.id}</div>
                <div className="text-[14px] font-bold text-white">{selected.title}</div>
              </div>
              {[
                { label:'Threat Type',    value: selected.threat    },
                { label:'Severity',       value: selected.sev       },
                { label:'Source IP',      value: selected.src       },
                { label:'Status',         value: selected.status    },
                { label:'Risk Score',     value: String(selected.risk) },
                { label:'Assignee',       value: selected.assignee  },
                { label:'Created',        value: selected.created   },
                { label:'Last Updated',   value: selected.updated   },
                { label:'Related Events', value: String(selected.events) },
                { label:'Related Alerts', value: String(selected.alerts) },
              ].map(f=>(
                <div key={f.label} className="flex items-start justify-between gap-2 border-b border-white/[0.04] pb-2 last:border-0">
                  <span className="text-[10px] text-fanos-dim flex-shrink-0">{f.label}</span>
                  <span className="text-[10px] text-fanos-text text-right">{f.value}</span>
                </div>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <button className="fanos-btn w-full justify-center"><User size={11}/>Assign to Me</button>
                <button className="fanos-btn w-full justify-center"
                  style={{background:'rgba(139,92,246,0.15)',borderColor:'rgba(139,92,246,0.3)',color:'#a78bfa'}}>
                  <Eye size={11}/>Open Investigation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
