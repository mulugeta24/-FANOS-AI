/**
 * Security Operations — Alerts
 * All security alerts from WAF, Suricata, Zeek, and FANOS AI.
 */
import { Bell, Search, Filter, Eye, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

type Sev = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Alert {
  id: string; sev: Sev; title: string; src: string
  target: string; engine: string; status: string
  risk: number; time: string
}

const ALERTS: Alert[] = [
  { id:'ALT-001', sev:'CRITICAL', title:'SQL Injection Campaign Detected',          src:'192.168.56.10',  target:'/login',           engine:'WAF',      status:'NEW',           risk:96, time:'2 min ago'  },
  { id:'ALT-002', sev:'CRITICAL', title:'Command Injection on /api/exec',           src:'172.16.0.88',   target:'/api/exec',        engine:'Suricata', status:'NEW',           risk:98, time:'5 min ago'  },
  { id:'ALT-003', sev:'HIGH',     title:'Brute Force Attack on SSH Port 22',        src:'185.220.0.14',  target:'10.0.0.5:22',      engine:'Suricata', status:'ACKNOWLEDGED',  risk:88, time:'8 min ago'  },
  { id:'ALT-004', sev:'HIGH',     title:'Network Port Scan Detected (500+ ports)',  src:'192.168.56.31', target:'Internal Network',  engine:'Zeek',     status:'NEW',           risk:84, time:'15 min ago' },
  { id:'ALT-005', sev:'HIGH',     title:'XSS Attack Wave on /comment endpoint',     src:'10.0.0.44',     target:'/comment',         engine:'WAF',      status:'ACKNOWLEDGED',  risk:80, time:'30 min ago' },
  { id:'ALT-006', sev:'MEDIUM',   title:'SSRF Probe — Internal Metadata Service',   src:'45.78.90.12',   target:'/api/fetch',       engine:'WAF',      status:'MONITORING',    risk:72, time:'45 min ago' },
  { id:'ALT-007', sev:'MEDIUM',   title:'Suspicious TLS Certificate — C2 Pattern', src:'91.105.0.4',    target:'External',         engine:'Zeek',     status:'MONITORING',    risk:65, time:'1 hr ago'   },
  { id:'ALT-008', sev:'MEDIUM',   title:'DNS Tunneling Pattern Detected',           src:'10.0.1.22',     target:'8.8.8.8',          engine:'Zeek',     status:'MONITORING',    risk:61, time:'1.5 hr ago' },
  { id:'ALT-009', sev:'LOW',      title:'Unusual HTTP User-Agent String',            src:'10.0.0.88',     target:'/api/v1',          engine:'WAF',      status:'CLOSED',        risk:28, time:'2 hr ago'   },
  { id:'ALT-010', sev:'LOW',      title:'Rate Limit Threshold Reached',             src:'198.51.0.6',    target:'/api/search',      engine:'WAF',      status:'CLOSED',        risk:22, time:'3 hr ago'   },
]

const sevStyle: Record<string,{bg:string;color:string}> = {
  CRITICAL: { bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
  HIGH:     { bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
  MEDIUM:   { bg:'rgba(0,200,255,0.10)',  color:'#00c8ff' },
  LOW:      { bg:'rgba(107,114,128,0.1)', color:'#9ca3af' },
}

const engineColor: Record<string,string> = {
  WAF:      '#00e5a0',
  Suricata: '#00c8ff',
  Zeek:     '#8b5cf6',
}

const statusStyle: Record<string,{bg:string;color:string}> = {
  NEW:          { bg:'rgba(239,68,68,0.1)',   color:'#ef4444' },
  ACKNOWLEDGED: { bg:'rgba(245,158,11,0.1)',  color:'#f59e0b' },
  MONITORING:   { bg:'rgba(0,200,255,0.1)',   color:'#00c8ff' },
  CLOSED:       { bg:'rgba(107,114,128,0.1)', color:'#6b7280' },
}

export default function SecOpsAlerts() {
  const [search,   setSearch]   = useState('')
  const [sevFilter,setSevFilter]= useState<string>('ALL')

  const filtered = ALERTS.filter(a => {
    const matchSev = sevFilter === 'ALL' || a.sev === sevFilter
    const matchStr = !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.src.includes(search) || a.engine.toLowerCase().includes(search.toLowerCase())
    return matchSev && matchStr
  })

  const counts = {
    CRITICAL: ALERTS.filter(a=>a.sev==='CRITICAL').length,
    HIGH:     ALERTS.filter(a=>a.sev==='HIGH').length,
    MEDIUM:   ALERTS.filter(a=>a.sev==='MEDIUM').length,
    LOW:      ALERTS.filter(a=>a.sev==='LOW').length,
  }

  return (
    <PageShell
      title="Alerts"
      subtitle="All security alerts from WAF, Suricata, Zeek, and FANOS AI engine"
      badge={{ label:`${ALERTS.filter(a=>a.status==='NEW').length} NEW`, color:'red' }}
    >
      {/* Severity summary */}
      <div className="grid grid-cols-4 gap-3">
        {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(s => (
          <button key={s}
            onClick={() => setSevFilter(sevFilter===s?'ALL':s)}
            className="fanos-card p-3 text-left transition-all cursor-pointer"
            style={{ borderColor: sevFilter===s ? sevStyle[s].color : '' }}>
            <div className="text-[22px] font-bold" style={{ color: sevStyle[s].color }}>{counts[s]}</div>
            <div className="text-[10px] text-fanos-muted mt-0.5">{s}</div>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="fanos-card p-3 flex items-center gap-2.5">
        <Search size={13} className="text-fanos-dim" />
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search alerts by title, IP, or engine…"
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-fanos-text placeholder:text-fanos-dim" />
        <div className="flex items-center gap-1.5">
          <Filter size={10} className="text-fanos-dim" />
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(f=>(
            <button key={f}
              onClick={()=>setSevFilter(f)}
              className="text-[9px] font-semibold px-2 py-0.5 rounded transition-all"
              style={{
                background: sevFilter===f ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.04)',
                color: sevFilter===f ? '#00c8ff' : '#6b7280',
                border: `1px solid ${sevFilter===f ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><Bell size={13} className="text-fanos-red" />Alert Feed</div>
          <span className="text-[10px] text-fanos-dim">{filtered.length} alerts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['Severity','Alert','Source IP','Target','Engine','Risk','Status','Time','Actions'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(a=>{
                const ss = sevStyle[a.sev]
                const es = statusStyle[a.status] ?? { bg:'rgba(255,255,255,0.04)', color:'#6b7280' }
                const ec = engineColor[a.engine] ?? '#6b7280'
                return (
                  <tr key={a.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{ background:ss.bg, color:ss.color, border:`1px solid ${ss.color}30` }}>
                        {a.sev}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[11px] font-medium text-fanos-text max-w-[220px] truncate">{a.title}</div>
                      <div className="text-[9px] text-fanos-dim">{a.id}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-muted">{a.src}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-dim max-w-[120px] truncate">{a.target}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background:`${ec}15`, color:ec, border:`1px solid ${ec}25` }}>
                        {a.engine}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-bold" style={{ color: a.risk>=90?'#ef4444':a.risk>=70?'#f59e0b':'#00c8ff' }}>
                        {a.risk}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background:es.bg, color:es.color, border:`1px solid ${es.color}25` }}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[9px] text-fanos-dim whitespace-nowrap">{a.time}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                          style={{ background:'rgba(0,200,255,.1)', color:'#00c8ff', border:'1px solid rgba(0,200,255,.25)' }}>
                          <Eye size={9}/>View
                        </button>
                        <button className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded"
                          style={{ background:'rgba(0,229,160,.1)', color:'#00e5a0', border:'1px solid rgba(0,229,160,.25)' }}>
                          <CheckCircle2 size={9}/>Ack
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
    </PageShell>
  )
}
