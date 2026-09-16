/**
 * Security Operations — Security Events
 * Raw event feed from all security sensors.
 */
import { Zap, Search, Filter, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

type EvSev = 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO'

interface SecEvent {
  id:string; time:string; sev:EvSev; type:string; src:string; target:string
  sensor:string; confidence:number; risk:number; status:string
}

const EVENTS: SecEvent[] = [
  { id:'EVT-001', time:'14:22:11', sev:'CRITICAL', type:'SQL Injection',      src:'192.168.56.10', target:'/login',       sensor:'WAF',      confidence:98.7, risk:96, status:'BLOCKED'   },
  { id:'EVT-002', time:'14:21:55', sev:'CRITICAL', type:'Command Injection',  src:'172.16.0.88',   target:'/api/exec',    sensor:'Suricata', confidence:97.2, risk:98, status:'BLOCKED'   },
  { id:'EVT-003', time:'14:20:33', sev:'HIGH',     type:'Brute Force',        src:'185.220.0.14',  target:'10.0.0.5:22',  sensor:'Suricata', confidence:95.1, risk:88, status:'BLOCKED'   },
  { id:'EVT-004', time:'14:18:07', sev:'HIGH',     type:'Port Scan',          src:'192.168.56.31', target:'Network',      sensor:'Zeek',     confidence:99.2, risk:84, status:'BLOCKED'   },
  { id:'EVT-005', time:'14:15:22', sev:'HIGH',     type:'XSS',                src:'10.0.0.44',     target:'/comment',     sensor:'WAF',      confidence:93.4, risk:80, status:'BLOCKED'   },
  { id:'EVT-006', time:'14:12:18', sev:'MEDIUM',   type:'SSRF',               src:'45.78.90.12',   target:'/api/fetch',   sensor:'WAF',      confidence:91.0, risk:72, status:'MONITORED' },
  { id:'EVT-007', time:'14:10:55', sev:'MEDIUM',   type:'Path Traversal',     src:'103.22.0.5',    target:'/download',    sensor:'WAF',      confidence:90.5, risk:68, status:'BLOCKED'   },
  { id:'EVT-008', time:'14:08:33', sev:'MEDIUM',   type:'TLS Anomaly',        src:'91.105.0.4',    target:'Internal',     sensor:'Zeek',     confidence:87.3, risk:61, status:'ALERT'     },
  { id:'EVT-009', time:'14:05:11', sev:'LOW',      type:'Suspicious URI',     src:'10.0.0.88',     target:'/api/v1',      sensor:'WAF',      confidence:81.2, risk:28, status:'MONITORED' },
  { id:'EVT-010', time:'14:02:44', sev:'INFO',     type:'Normal',             src:'192.168.1.100', target:'/api/health',  sensor:'FANOS AI', confidence:99.9, risk:0,  status:'ALLOWED'   },
  { id:'EVT-011', time:'14:01:09', sev:'MEDIUM',   type:'DNS Tunneling',      src:'10.0.1.22',     target:'8.8.8.8',      sensor:'Zeek',     confidence:85.6, risk:61, status:'ALERT'     },
  { id:'EVT-012', time:'13:58:22', sev:'HIGH',     type:'IDOR / BOLA',        src:'10.0.2.15',     target:'/api/users/4', sensor:'WAF',      confidence:92.1, risk:82, status:'BLOCKED'   },
]

const sevStyle: Record<EvSev,{bg:string;color:string}> = {
  CRITICAL: { bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
  HIGH:     { bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
  MEDIUM:   { bg:'rgba(0,200,255,0.10)',  color:'#00c8ff' },
  LOW:      { bg:'rgba(107,114,128,0.1)', color:'#9ca3af' },
  INFO:     { bg:'rgba(255,255,255,0.06)',color:'#6b7280'  },
}

const statusStyle: Record<string,{bg:string;color:string}> = {
  BLOCKED:   { bg:'rgba(239,68,68,0.1)',   color:'#ef4444' },
  MONITORED: { bg:'rgba(0,200,255,0.1)',   color:'#00c8ff' },
  ALERT:     { bg:'rgba(245,158,11,0.1)',  color:'#f59e0b' },
  ALLOWED:   { bg:'rgba(0,229,160,0.08)',  color:'#00e5a0' },
}

const sensorColor: Record<string,string> = {
  WAF:      '#00e5a0',
  Suricata: '#00c8ff',
  Zeek:     '#8b5cf6',
  'FANOS AI':'#00c8ff',
}

export default function SecurityEvents() {
  const [search, setSearch] = useState('')
  const [sev,    setSev]    = useState('ALL')

  const filtered = EVENTS.filter(e=>{
    const ms = sev==='ALL' || e.sev===sev
    const mq = !search || e.type.toLowerCase().includes(search.toLowerCase()) || e.src.includes(search) || e.target.includes(search)
    return ms && mq
  })

  return (
    <PageShell
      title="Security Events"
      subtitle="Raw event stream from all FANOS security sensors in real time"
      badge={{ label:`${EVENTS.length} EVENTS`, color:'blue' }}
      actions={
        <button className="fanos-btn">
          <RefreshCw size={11}/>Refresh
        </button>
      }
    >
      {/* Filter bar */}
      <div className="fanos-card p-3 flex items-center gap-2.5 flex-wrap">
        <Search size={13} className="text-fanos-dim flex-shrink-0"/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search events, IPs, types…"
          className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim"/>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter size={10} className="text-fanos-dim"/>
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW','INFO'].map(f=>(
            <button key={f} onClick={()=>setSev(f)}
              className="text-[9px] font-semibold px-2 py-0.5 rounded transition-all"
              style={{
                background: sev===f ? 'rgba(0,200,255,0.15)':'rgba(255,255,255,0.04)',
                color:      sev===f ? '#00c8ff':'#6b7280',
                border:     `1px solid ${sev===f ? 'rgba(0,200,255,0.3)':'rgba(255,255,255,0.08)'}`,
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Zap size={13} className="text-fanos-accent"/>Live Event Stream</div>
          <span className="text-[10px] text-fanos-dim">{filtered.length} of {EVENTS.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Time','Severity','Attack Type','Source IP','Target','Sensor','Confidence','Risk','Status'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(e=>{
                const sv = sevStyle[e.sev]
                const st = statusStyle[e.status] ?? {bg:'rgba(255,255,255,0.04)',color:'#6b7280'}
                const sc = sensorColor[e.sensor] ?? '#6b7280'
                return (
                  <tr key={e.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim whitespace-nowrap">{e.time}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{background:sv.bg,color:sv.color,border:`1px solid ${sv.color}30`}}>
                        {e.sev}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium">{e.type}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{e.src}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim">{e.target}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{background:`${sc}15`,color:sc,border:`1px solid ${sc}25`}}>
                        {e.sensor}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-mono"
                      style={{color:e.confidence>=95?'#00e5a0':e.confidence>=85?'#f59e0b':'#6b7280'}}>
                      {e.confidence}%
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-bold"
                        style={{color:e.risk>=90?'#ef4444':e.risk>=70?'#f59e0b':e.risk>0?'#00c8ff':'#6b7280'}}>
                        {e.risk || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{background:st.bg,color:st.color,border:`1px solid ${st.color}25`}}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
