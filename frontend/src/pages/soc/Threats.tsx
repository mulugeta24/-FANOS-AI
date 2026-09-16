import { AlertTriangle } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { severityClass, riskColor } from '@/lib/utils'

const THREATS = [
  { id:'THR-001', name:'SQL Injection Campaign',    type:'Web Attack',      sev:'CRITICAL', src:'192.168.56.10', risk:96, count:28, first:'2 hr ago',  last:'2 min ago'  },
  { id:'THR-002', name:'Credential Brute Force',    type:'Auth Attack',     sev:'HIGH',     src:'192.168.56.21', risk:88, count:142, first:'5 hr ago', last:'5 min ago'  },
  { id:'THR-003', name:'Network Reconnaissance',    type:'Port Scan',       sev:'HIGH',     src:'192.168.56.31', risk:84, count:891, first:'3 hr ago', last:'15 min ago' },
  { id:'THR-004', name:'Command Injection',         type:'Web Attack',      sev:'CRITICAL', src:'172.16.0.88',   risk:98, count:5,   first:'1 hr ago', last:'20 min ago' },
  { id:'THR-005', name:'Cross-Site Scripting',      type:'Web Attack',      sev:'HIGH',     src:'10.0.0.44',     risk:80, count:22,  first:'4 hr ago', last:'30 min ago' },
  { id:'THR-006', name:'SSRF Metadata Probe',       type:'SSRF',            sev:'HIGH',     src:'192.168.1.100', risk:75, count:8,   first:'6 hr ago', last:'45 min ago' },
  { id:'THR-007', name:'Anomalous Traffic Spike',   type:'DoS Attempt',     sev:'MEDIUM',   src:'192.168.56.55', risk:55, count:44,  first:'8 hr ago', last:'1 hr ago'   },
]

export default function Threats() {
  return (
    <PageShell title="Active Threats" subtitle="Ongoing threat actors and attack campaigns targeting your infrastructure"
      badge={{ label:`${THREATS.filter(t=>t.sev==='CRITICAL').length} CRITICAL`, color:'red' }}>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Critical Threats', value: THREATS.filter(t=>t.sev==='CRITICAL').length, color:'#ef4444' },
          { label:'High Threats',     value: THREATS.filter(t=>t.sev==='HIGH').length,     color:'#f97316' },
          { label:'Total Events',     value: THREATS.reduce((s,t)=>s+t.count,0),           color:'#00c8ff' },
        ].map(s=>(
          <div key={s.label} className="fanos-card px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{s.label}</div>
            <div className="text-[26px] font-bold mt-1" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="fanos-card">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title"><AlertTriangle size={13} className="text-fanos-accent"/>Threat Intelligence</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-white/[0.05]">
                {['ID','Threat Name','Type','Severity','Source IP','Risk','Events','First Seen','Last Seen'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {THREATS.map(t=>(
                <tr key={t.id} className="hover:bg-white/[0.018] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{t.id}</td>
                  <td className="px-3 py-2.5 text-[11px] text-fanos-text font-medium">{t.name}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-muted">{t.type}</td>
                  <td className="px-3 py-2.5"><span className={severityClass(t.sev)}>{t.sev}</span></td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-fanos-accent">{t.src}</td>
                  <td className={`px-3 py-2.5 text-[12px] font-bold ${riskColor(t.risk)}`}>{t.risk}</td>
                  <td className="px-3 py-2.5 text-[11px] font-semibold text-fanos-text">{t.count}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{t.first}</td>
                  <td className="px-3 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">{t.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
